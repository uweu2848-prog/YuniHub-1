'use strict';
const fs = require('fs');
const path = require('path');
const cfgMod = require('./config');
const paths = require('./paths');
const zip = require('./zip');
const builder = require('./build');
const sp = require('./spotify');
const patches = require('./patches');
const u = require('./util');

const STATE_FILE = path.join(cfgMod.dataDir, 'state.json');
const BACKUP_DIR = path.join(cfgMod.dataDir, 'backup');
const BACKUP_SPA = path.join(BACKUP_DIR, 'xpui.spa');
const TRACK_NOTIFICATION_PREF = 'ui.track_os_notifications_enabled';

const readState = () => { try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch { return {}; } };
const writeState = (s) => { fs.mkdirSync(cfgMod.dataDir, { recursive: true }); fs.writeFileSync(STATE_FILE, JSON.stringify(s, null, 2)); };

function layout(s) {
  const spa = path.join(s.apps, 'xpui.spa');
  return { spa, bak: spa + '.yuni-bak', dir: path.join(s.apps, 'xpui') };
}

function requireSpotify(cfg) {
  const s = paths.detect(cfg);
  if (!s) {
    throw new Error(
      'Could not find the Spotify desktop client.\n' +
      '  Windows: install from spotify.com/download (the Microsoft Store version is not supported).\n' +
      '  Or point YuniSpot at it:  yunispot config spotifyAppsPath "/path/to/Spotify/Apps"'
    );
  }
  return s;
}

function assertWritable(s) {
  try { fs.accessSync(s.apps, fs.constants.W_OK); }
  catch {
    const hint = process.platform === 'darwin'
      ? `  Run:  sudo chmod a+wr /Applications/Spotify.app && sudo chmod -R a+wr ${s.apps}`
      : process.platform === 'linux'
        ? `  Run:  sudo chmod a+wr ${path.dirname(s.apps)} && sudo chmod -R a+wr ${s.apps}`
        : '  Make sure the Spotify folder is writable.';
    throw new Error(`No write permission for ${s.apps}\n${hint}`);
  }
}

function injectHtml(html) {
  if (html.includes('yunispot/yunispot.js')) return html;
  if (!/<\/head>/i.test(html)) throw new Error('index.html has no </head>; Spotify layout changed (run `yunispot doctor`).');
  html = html.replace(/<\/head>/i, '<link rel="stylesheet" href="yunispot/yunispot.css">\n</head>');
  const tag = '<script defer src="yunispot/yunispot.js"></script>';
  return /<\/body>/i.test(html) ? html.replace(/<\/body>/i, tag + '\n</body>') : html + '\n' + tag + '\n';
}

function writeBundle(dir, cfg) {
  const out = builder.build(cfg);
  const target = path.join(dir, 'yunispot');
  fs.mkdirSync(target, { recursive: true });
  fs.writeFileSync(path.join(target, 'yunispot.js'), out.js);
  fs.writeFileSync(path.join(target, 'yunispot.css'), out.css);
  return out;
}

function apply(cfg) {
  const s = requireSpotify(cfg);
  assertWritable(s);
  const { spa, bak, dir } = layout(s);
  if (sp.isRunning()) u.warn('Spotify is running. Close it before applying (or restart it afterwards).');

  try {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    if (fs.existsSync(spa)) {
      // Fresh install or Spotify just updated: this is the pristine client. Back it up.
      fs.copyFileSync(spa, BACKUP_SPA);
      if (fs.existsSync(bak)) fs.rmSync(bak);
      fs.renameSync(spa, bak);
    } else if (!fs.existsSync(bak)) {
      throw new Error('xpui.spa not found in ' + s.apps);
    }

    u.rm(dir);
    zip.extract(bak, dir);

    const indexPath = path.join(dir, 'index.html');
    if (!fs.existsSync(indexPath)) throw new Error('index.html missing after extraction; Spotify layout changed.');
    fs.writeFileSync(indexPath, injectHtml(fs.readFileSync(indexPath, 'utf8')));

    const out = writeBundle(dir, cfg);
    const patchResults = patches.run(dir);
    const dev = sp.enableDevMode(s.prefs);

    const prev = readState();
    const trackNotificationPrefs = process.platform === 'win32' ? sp.userPrefsPath(s.prefs) : null;
    const currentTrackNotifications = trackNotificationPrefs ? sp.getPreference(trackNotificationPrefs, TRACK_NOTIFICATION_PREF) : null;
    const previousTrackNotifications = prev.trackNotificationPreference;
    const trackNotificationPreference = previousTrackNotifications && previousTrackNotifications.path === trackNotificationPrefs && currentTrackNotifications && currentTrackNotifications.exists && currentTrackNotifications.value === 'false'
      ? previousTrackNotifications
      : currentTrackNotifications ? { path: trackNotificationPrefs, original: currentTrackNotifications } : null;
    writeState({
      appliedAt: new Date().toISOString(),
      appsPath: s.apps,
      theme: cfg.theme,
      extensions: out.extensions,
      devModeAdded: !!prev.devModeAdded || dev === 'added',
      trackNotificationPreference,
    });
    if (trackNotificationPreference) sp.setPreference(trackNotificationPreference.path, TRACK_NOTIFICATION_PREF, 'false');

    u.ok(`Applied theme "${cfg.theme}" to ${s.apps}`);
    out.extensions.forEach((n) => u.ok(`Extension loaded: ${n}`));
    out.warnings.forEach((w) => u.warn(w));
    patchResults.forEach((r) => (r.ok ? u.ok(`Patch ${r.name}: ${r.applied} file(s)`) : u.warn(`Required patch did not match: ${r.name}`)));
    if (dev === 'missing') u.warn('Spotify prefs file not found yet. Launch Spotify once, then run apply again to enable dev mode.');
    u.info('Start Spotify. Press Ctrl+K (Cmd+K on Mac) for the command palette.');
  } catch (e) {
    try { restore(cfg, true); } catch { /* best effort */ }
    throw e;
  }
}

function restore(cfg, quiet) {
  const s = requireSpotify(cfg);
  const { spa, bak, dir } = layout(s);
  u.rm(dir);
  if (fs.existsSync(spa)) {
    if (fs.existsSync(bak)) fs.rmSync(bak); // Spotify updated; the new spa is pristine
  } else if (fs.existsSync(bak)) {
    fs.renameSync(bak, spa);
  } else if (fs.existsSync(BACKUP_SPA)) {
    fs.copyFileSync(BACKUP_SPA, spa);
  } else if (!quiet) {
    throw new Error('Nothing to restore (no backup found). Reinstall Spotify to get a clean client.');
  }
  const st = readState();
  if (st.devModeAdded) sp.disableDevMode(s.prefs);
    if (st.trackNotificationPreference && st.trackNotificationPreference.path) {
      sp.restorePreference(st.trackNotificationPreference.path, TRACK_NOTIFICATION_PREF, st.trackNotificationPreference.original, 'false');
    } else {
      sp.restorePreference(s.prefs, TRACK_NOTIFICATION_PREF, st.trackNotificationPreference, 'false');
    }
  writeState({});
  if (!quiet) u.ok('Spotify restored to its original state.');
}

/** Rebuild just the bundle (used by `watch`). */
function refresh(cfg) {
  const s = requireSpotify(cfg);
  const { dir } = layout(s);
  if (!fs.existsSync(dir)) throw new Error('Not applied yet. Run `yunispot apply` first.');
  const out = writeBundle(dir, cfg);
  out.warnings.forEach((w) => u.warn(w));
  return out;
}

function doctor(cfg) {
  let bad = 0;
  const ok = (m) => u.ok(m);
  const warn = (m) => u.warn(m);
  const fail = (m) => { bad++; u.fail(m); };

  console.log(u.bold('YuniSpot doctor') + '\n');
  const major = Number(process.versions.node.split('.')[0]);
  major >= 18 ? ok(`Node ${process.versions.node}`) : fail(`Node ${process.versions.node} is too old (need 18+)`);

  const s = paths.detect(cfg);
  if (!s) {
    fail('Spotify desktop client not found.');
    if (process.platform === 'win32') warn('Microsoft Store builds are not supported. Install the regular installer from spotify.com/download.');
    return 1;
  }
  ok(`Spotify Apps folder: ${s.apps}`);
  try { fs.accessSync(s.apps, fs.constants.W_OK); ok('Folder is writable'); }
  catch { fail('Folder is NOT writable (macOS/Linux: see README "Permissions")'); }

  const { spa, bak, dir } = layout(s);
  const st = readState();
  if (fs.existsSync(spa) && fs.existsSync(bak)) {
    warn('Spotify updated and restored its original files. Run `yunispot apply` again.');
  } else if (fs.existsSync(dir) && fs.existsSync(bak)) {
    ok(`Applied${st.appliedAt ? ' at ' + st.appliedAt : ''}`);
    const html = path.join(dir, 'index.html');
    fs.existsSync(html) && fs.readFileSync(html, 'utf8').includes('yunispot/yunispot.js')
      ? ok('index.html is injected') : fail('index.html is not injected. Run `yunispot apply`.');
    fs.existsSync(path.join(dir, 'yunispot', 'yunispot.js'))
      ? ok('Runtime bundle present') : fail('Runtime bundle missing. Run `yunispot apply`.');
  } else {
    warn('Not applied yet. Run `yunispot apply`.');
  }

  const dm = sp.devModeState(s.prefs);
  dm === 'on' ? ok('Developer mode enabled (Ctrl+Shift+I opens DevTools)')
    : dm === 'off' ? warn('Developer mode is off. Close Spotify, then run `yunispot apply`.')
      : warn('Spotify prefs not found (launch Spotify once).');

  sp.isRunning() ? warn('Spotify is running right now. Close it before apply/restore.') : ok('Spotify is not running');

  try {
    const out = builder.build(cfg);
    ok(`Theme "${cfg.theme}" builds fine`);
    out.extensions.forEach((n) => ok(`Extension OK: ${n}`));
    out.warnings.forEach((w) => fail(w));
  } catch (e) { fail(e.message); }

  if (cfg.safe) warn('Safe visuals are ON (yunispot safe off to leave).');
  console.log('\n' + (bad ? `${bad} problem(s) found.` : 'No blocking problems found.'));
  console.log(u.dim('Tip: in Spotify press Ctrl+K and run "YuniSpot: Diagnostics" to check the in-app selectors.'));
  console.log(u.dim('Blank or broken screen? In Spotify press Ctrl+Alt+Shift+R, or run `yunispot safe on` and restart Spotify. `yunispot restore` undoes everything.'));
  return bad ? 1 : 0;
}

module.exports = { apply, restore, refresh, doctor, requireSpotify };
