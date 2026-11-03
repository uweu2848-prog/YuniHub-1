'use strict';
// End-to-end smoke test: fake Spotify install -> apply -> verify -> doctor -> restore.
// Also executes the built runtime bundle in a stubbed browser to catch top-level runtime errors.
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const zlib = require('zlib');
const assert = require('assert');
const http = require('http');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'yunispot-test-'));
process.env.YUNISPOT_HOME = path.join(tmp, 'home');
process.env.YUNISPOT_APPS = path.join(tmp, 'Spotify', 'Apps');
process.env.YUNISPOT_PREFS = path.join(tmp, 'Spotify', 'prefs');

const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = (b) => { let c = 0xffffffff; for (const x of b) c = crcTable[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };

function makeZip(files) {
  const locals = [], centrals = [];
  let offset = 0;
  for (const [name, content] of Object.entries(files)) {
    const nameB = Buffer.from(name), raw = Buffer.from(content), data = zlib.deflateRawSync(raw), crc = crc32(raw);
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(8, 8);
    lh.writeUInt32LE(crc, 14); lh.writeUInt32LE(data.length, 18); lh.writeUInt32LE(raw.length, 22); lh.writeUInt16LE(nameB.length, 26);
    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(8, 10);
    ch.writeUInt32LE(crc, 16); ch.writeUInt32LE(data.length, 20); ch.writeUInt32LE(raw.length, 24); ch.writeUInt16LE(nameB.length, 28); ch.writeUInt32LE(offset, 42);
    locals.push(lh, nameB, data); centrals.push(ch, nameB);
    offset += 30 + nameB.length + data.length;
  }
  const cd = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(Object.keys(files).length, 8); end.writeUInt16LE(Object.keys(files).length, 10);
  end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, cd, end]);
}

// --- fake Spotify install ---
const apps = process.env.YUNISPOT_APPS;
fs.mkdirSync(apps, { recursive: true });
const spa = path.join(apps, 'xpui.spa');
fs.writeFileSync(spa, makeZip({
  'index.html': '<!doctype html><html><head><title>x</title></head><body><div id="main"></div></body></html>',
  'xpui.js': 'console.log("spotify");',
  'css/x.css': 'body{}',
}));
const original = fs.readFileSync(spa);
fs.writeFileSync(process.env.YUNISPOT_PREFS, 'audio.volume=1\n');
const spotifyUserPrefs = path.join(path.dirname(process.env.YUNISPOT_PREFS), 'Users', 'test-user', 'prefs');
fs.mkdirSync(path.dirname(spotifyUserPrefs), { recursive: true });
fs.writeFileSync(spotifyUserPrefs, 'ui.track_os_notifications_enabled=true\n');

const zipMod = require('../src/zip');
const { init } = require('../src/cli');
const cfgMod = require('../src/config');
const apply = require('../src/apply');
const builder = require('../src/build');
const adblock = require('../src/adblock');
const bridge = require('../src/bridge');
const spotifyUpdate = require('../src/spotify-update');

{
  const spotxApps = path.join(tmp, 'spotx', 'Spotify', 'Apps');
  fs.mkdirSync(spotxApps, { recursive: true });
  assert(!adblock.isSpotXInstalled(spotxApps), 'SpotX is absent without its backup markers');
  const spotxArgs = adblock.spotxInstallArgs({ run: 'C:\\SpotX\\run.ps1' }, { apps: 'C:\\Spotify\\Apps' });
  assert(spotxArgs.includes('-block_update_on') && !spotxArgs.includes('-block_update_off'), 'SpotX install pauses automatic Spotify updates');
  assert.strictEqual(adblock.SPOTX_REPOSITORY, 'SpotX-Official/SpotX', 'SpotX is fetched from its official upstream repository');
  fs.writeFileSync(path.join(spotxApps, 'xpui.bak'), '');
  fs.writeFileSync(path.join(path.dirname(spotxApps), 'Spotify.dll.bak'), '');
  assert(adblock.isSpotXInstalled(spotxApps), 'SpotX is detected from its UI and binary backups');
  fs.rmSync(spotxApps, { recursive: true, force: true });
  console.log('ok  SpotX backup state detection');
}

{
  const zipPath = path.join(tmp, 'root-entry.zip');
  const dest = path.join(tmp, 'root-entry-out');
  fs.writeFileSync(zipPath, makeZip({ '/': '', 'nested/ok.txt': 'hello' }));
  assert.doesNotThrow(() => zipMod.extract(zipPath, dest), 'root directory entries are allowed');
  assert.strictEqual(fs.readFileSync(path.join(dest, 'nested', 'ok.txt'), 'utf8'), 'hello');
  console.log('ok  root directory zip entries');
}

init();
const cfg = cfgMod.load();

// 1. bundle builds & parses
const out = builder.build(cfg);
assert(out.js.includes('YuniSpot') && out.css.includes('--essential-bright-accent'));
assert.strictEqual(cfg.theme, 'yunihub');
assert(out.css.includes('Root__main-view::before') && out.css.includes('--yuni-eq-rotate'), 'sleek black main view + accent vars');
assert(out.css.includes('yuni-ico-play') && out.css.includes('mask:') && out.css.includes('control-button-playpause'), 'play/pause glyphs are drawn by the theme');
assert(out.css.includes('backdrop-filter') && out.css.includes('#ff2b2b'), 'yunihub theme is the default');
assert.deepStrictEqual(out.extensions, ['hello-yuni']);
console.log('ok  bundle builds');

// 2. apply
apply.apply(cfg);
assert(adblock.isYuniSpotApplied(apps), 'YuniSpot active layer is detected');
const dir = path.join(apps, 'xpui');
assert(!fs.existsSync(spa) && fs.existsSync(spa + '.yuni-bak'), 'spa should be moved aside');
const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
assert(html.includes('yunispot/yunispot.js') && html.includes('yunispot/yunispot.css'));
assert(fs.existsSync(path.join(dir, 'css', 'x.css')) && fs.existsSync(path.join(dir, 'yunispot', 'yunispot.js')));
assert(/app\.enable-developer-mode=true/.test(fs.readFileSync(process.env.YUNISPOT_PREFS, 'utf8')));
assert(/ui\.track_os_notifications_enabled=false/.test(fs.readFileSync(spotifyUserPrefs, 'utf8')), 'Spotify native track notifications are disabled in the active user prefs');
console.log('ok  apply');

// 3. idempotent re-apply
apply.apply(cfg);
assert.strictEqual((fs.readFileSync(path.join(dir, 'index.html'), 'utf8').match(/yunispot\.js/g) || []).length, 1);
console.log('ok  apply is idempotent');

// 4. doctor
assert.strictEqual(apply.doctor(cfg), 0);

// 5. simulate Spotify update restoring a fresh spa, then re-apply
fs.writeFileSync(spa, makeZip({ 'index.html': '<html><head></head><body>v2</body></html>', 'xpui.js': '' }));
apply.apply(cfg);
assert(fs.readFileSync(path.join(dir, 'index.html'), 'utf8').includes('v2'));
console.log('ok  survives a Spotify update');

// 5b. `yunispot safe on|off` rewrites the bundle so the next Spotify start is safe, even if the UI is unusable
{
  const { spawnSync } = require('child_process');
  const cli = (...a) => spawnSync(process.execPath, [path.join(__dirname, '..', 'bin', 'yunispot.js'), ...a], { encoding: 'utf8', env: process.env });
  const bundle = () => fs.readFileSync(path.join(dir, 'yunispot', 'yunispot.js'), 'utf8');
  assert(bundle().includes('\"safe\":false'), 'bundle starts with safe visuals off');
  let r = cli('safe', 'on'); assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  assert(bundle().includes('\"safe\":true'), 'safe on rewrites the injected bundle');
  assert(/ON/.test(cli('safe', 'status').stdout) && /safe mode\s+ON/.test(cli('status').stdout));
  r = cli('safe', 'off'); assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  assert(bundle().includes('\"safe\":false') && /off/.test(cli('safe', 'status').stdout));
  assert.notStrictEqual(cli('safe', 'banana').status, 0, 'bad argument is rejected');
  console.log('ok  yunispot safe on/off/status');
}

// 6. restore
apply.restore(cfg);
assert(fs.existsSync(spa) && !fs.existsSync(dir) && !fs.existsSync(spa + '.yuni-bak'));
assert(!adblock.isYuniSpotApplied(apps), 'YuniSpot active layer clears on restore');
assert(!/developer-mode/.test(fs.readFileSync(process.env.YUNISPOT_PREFS, 'utf8')));
assert(/ui\.track_os_notifications_enabled=true/.test(fs.readFileSync(spotifyUserPrefs, 'utf8')), 'Spotify notification preference is restored in the active user prefs');
console.log('ok  restore');

// 7. bad extension is skipped, not fatal
const bad = path.join(builder.dirs().extensions, 'broken');
fs.mkdirSync(bad, { recursive: true });
fs.writeFileSync(path.join(bad, 'manifest.json'), JSON.stringify({ name: 'broken', version: '1', permissions: ['player'] }));
fs.writeFileSync(path.join(bad, 'index.js'), 'this is not ( valid js');
const r2 = builder.build({ ...cfg, extensions: ['hello-yuni', 'broken'] });
assert(r2.warnings.length === 1 && r2.extensions.length === 1);
console.log('ok  broken extension is skipped');

// 7b. accent override, scaffolding, export/import
assert(builder.build({ ...cfg, accent: '#12ab34' }).css.includes('--essential-bright-accent: #12ab34'));
assert(!builder.build({ ...cfg, accent: 'javascript:x' }).css.includes('accent override'), 'bad accent ignored');
const cli = require('../src/cli');
const cliTest = (async () => {
  await cli.main(['new', 'theme', 'tmptheme']); await cli.main(['new', 'ext', 'tmpext']);
  assert(fs.existsSync(path.join(builder.dirs().themes, 'tmptheme', 'theme.css')));
  assert(builder.build({ ...cfg, theme: 'tmptheme', extensions: ['tmpext'] }).extensions.includes('tmpext'), 'scaffolded ext builds');
  const f = path.join(tmp, 'cfg.json');
  await cli.main(['accent', '#abcdef']); await cli.main(['export', f]);
  await cli.main(['accent', 'reset']); await cli.main(['import', f]);
  assert.strictEqual(cfgMod.load().accent, '#abcdef');
  await cli.main(['accent', 'reset']);
  // legacy (unedited) bundled theme gets upgraded; an edited one is left alone
  const th = path.join(builder.dirs().themes, 'yunihub');
  fs.rmSync(th, { recursive: true, force: true }); fs.cpSync(path.join(__dirname, '..', 'themes', 'yunihub'), th, { recursive: true });
  fs.appendFileSync(path.join(th, 'theme.css'), '\n/* my edit */\n');
  const r = cli.init();
  assert(r.customized.includes('themes/yunihub') && fs.readFileSync(path.join(th, 'theme.css'), 'utf8').includes('my edit'), 'edited theme is preserved');
  await cli.main(['theme', 'reset', 'yunihub']);
  assert(!fs.readFileSync(path.join(th, 'theme.css'), 'utf8').includes('my edit'), 'theme reset restores bundled copy');
  assert(builder.build({ ...cfg, theme: 'aero' }).css.includes('--yuni-accent-rgb: 61,184,255'), 'aero theme builds with accent vars');
  // install / remove third-party extension + theme from a folder
  const src = path.join(tmp, 'myext'); fs.mkdirSync(src, { recursive: true });
  fs.writeFileSync(path.join(src, 'manifest.json'), JSON.stringify({ name: 'myext', version: '1.0.0', permissions: ['ui'] }));
  fs.writeFileSync(path.join(src, 'index.js'), "api.ui.toast('x');");
  await cli.main(['ext', 'install', src]);
  assert(builder.listDirs(builder.dirs().extensions).includes('myext'), 'ext installed');
  const fails = async (args) => { process.exitCode = 0; await cli.main(args); const f = process.exitCode === 1; process.exitCode = 0; return f; };
  assert(await fails(['ext', 'install', src]), 'duplicate install is refused');
  fs.writeFileSync(path.join(src, 'manifest.json'), JSON.stringify({ name: 'bad', version: '1', permissions: ['root'] }));
  const bad = path.join(tmp, 'badext'); fs.cpSync(src, bad, { recursive: true });
  assert(await fails(['ext', 'install', bad]), 'unknown permission is refused');
  assert(await fails(['ext', 'remove', 'hello-yuni']), 'bundled extension cannot be removed');
  await cli.main(['ext', 'remove', 'myext']);
  assert(!builder.listDirs(builder.dirs().extensions).includes('myext'), 'ext removed');
  console.log('ok  accent, new, export/import, theme upgrade, ext install/remove');
})().catch((e) => { console.error(e); process.exit(1); });

// 8. run the bundle in a stubbed browser
function stubEl() {
  const e = new Proxy({}, {
    get(_, k) {
      if (k === 'then') return undefined;
      if (k === 'nodeType') return 1;
      if (k === 'textContent') return '';
      if (k === 'classList') return { toggle() {}, add() {}, remove() {}, contains() { return false; } };
      if (k === 'style') return {};
      if (k === 'children') return [];
      if (k === 'querySelectorAll') return () => [];
      if (k === 'getAttribute') return () => '';
      return () => e;
    },
  });
  return e;
}
const store = {};
const win = {
  localStorage: { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => delete store[k], get length() { return Object.keys(store).length; }, key: (i) => Object.keys(store)[i] || null },
  addEventListener() {}, removeEventListener() {},
};
win.window = win;
win.document = {
  readyState: 'complete', head: stubEl(), body: stubEl(), documentElement: stubEl(),
  getElementById: () => null, querySelector: () => stubEl(), querySelectorAll: () => [],
  addEventListener() {}, removeEventListener() {}, createElement: () => stubEl(), createTextNode: () => stubEl(),
};
win.navigator = { clipboard: { writeText: () => Promise.resolve() } };
win.MutationObserver = class { observe() {} disconnect() {} };
win.setInterval = () => 0; win.clearInterval = () => {};
win.setTimeout = setTimeout; win.clearTimeout = clearTimeout;
win.confirm = () => true; win.location = { reload() {} };
const ctx = vm.createContext(win);
vm.runInContext(out.js, ctx, { filename: 'yunispot.js' });
const Y = win.YuniSpot;
const bridgeTest = (async () => {
  let releaseId = '"spotify-release-1"';
  let latestVersion = '1.2.0';
  let currentVersion = '1.2.0';
  const checkRelease = () => Promise.resolve({ releaseId, lastModified: 'Tue, 03 Nov 2026 10:00:00 GMT' });
  const checkSpotifyRelease = () => spotifyUpdate.check(checkRelease, () => currentVersion, () => Promise.resolve(latestVersion));
  assert.strictEqual((await checkSpotifyRelease()).available, false, 'current Spotify version is up to date');
  assert.strictEqual((await checkSpotifyRelease()).available, false, 'same official installer does not trigger an update');
  releaseId = '"spotify-release-2"';
  latestVersion = '1.3.0';
  assert.strictEqual((await checkSpotifyRelease()).available, true, 'newer official installer is detected');
  assert.strictEqual((await checkSpotifyRelease()).available, true, 'available update stays available until installed');
  assert.strictEqual(spotifyUpdate.compareVersions('1.2.10.1', '1.2.9.9'), 1, 'Spotify versions compare by numeric components');
  spotifyUpdate.markInstalled();
  assert.strictEqual(spotifyUpdate.status().available, false, 'successful update clears the pending release');

  const token = 'a'.repeat(64);
  const server = bridge.createServer({ port: 0, token });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const request = (origin, authorization, method = 'GET', route = '/status') => new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '127.0.0.1', port, path: route, method,
      headers: { Origin: origin, ...(authorization ? { Authorization: authorization } : {}) },
    }, (res) => {
      let body = '';
      res.setEncoding('utf8'); res.on('data', (part) => { body += part; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });
    req.on('error', reject); req.end();
  });
  try {
    const ok = await request('https://xpui.app.spotify.com', 'Bearer ' + token);
    const noToken = await request('https://open.spotify.com', 'Bearer wrong');
    const badOrigin = await request('https://evil.example', 'Bearer ' + token);
    const preflight = await request('https://xpui.app.spotify.com', null, 'OPTIONS');
    assert.strictEqual(ok.status, 200, 'Spotify origin with the bridge token can read status');
    assert.strictEqual(noToken.status, 401, 'bridge rejects incorrect tokens');
    assert.strictEqual(badOrigin.status, 403, 'bridge rejects non-Spotify origins');
    assert.strictEqual(preflight.status, 204, 'bridge answers browser preflights');
    assert.strictEqual(preflight.headers['access-control-allow-private-network'], 'true', 'bridge permits the Chromium loopback preflight');
    const updateWithoutRelease = await request('https://open.spotify.com', 'Bearer ' + token, 'POST', '/spotify/update');
    assert.strictEqual(updateWithoutRelease.status, 409, 'bridge refuses to launch an update unless a release is pending');
  } finally { await new Promise((resolve) => server.close(resolve)); }
  console.log('ok  Spotify update detection and Store bridge origin, token, and preflight checks');
})();
assert(Y && Y.commands.list().length >= 15, 'built-in commands registered');
assert(Y.commands.list().some((c) => c.id === 'yunispot.dashboard'), 'dashboard command registered');
Promise.all([cliTest, Y.ready, bridgeTest]).then(() => {
  const ext = Y.extensions.list();
  assert.strictEqual(ext.loaded.length, 1, JSON.stringify(ext));
  assert.strictEqual(ext.failed.length, 0, JSON.stringify(ext));
  assert(Y.commands.list().some((c) => c.id === 'hello-yuni.hello'), 'extension command registered');
  console.log('ok  runtime boots, ' + Y.commands.list().length + ' commands, extension loaded');

  // exercise the UI code paths in the stub DOM (catches typos / undefined refs)
  Y.dashboard.open(); Y.dashboard.close();
  Y.palette.open(); Y.palette.close();
  Y.stats.show();
  Y.appearance.toggleGlass(); Y.appearance.toggleMono();
  Y.ui.toast('hi');
  Y.commands.run('yunispot.diagnostics');
  for (const id of ['history', 'notify', 'focus', 'compact', 'stats.export', 'history.export']) Y.commands.run('yunispot.' + id);
  Y.welcome.open({ first: true }); Y.welcome.open({ first: false }); Y.commands.run('yunispot.welcome');
  assert.strictEqual(Y.storage.get('welcome:seen'), Y.version, 'welcome marks version as seen');
  Y.store.open(); Y.appearance.setAccent('#3db8ff'); assert.strictEqual(Y.appearance.accent(), '#3db8ff'); Y.appearance.setAccent(null); assert.strictEqual(Y.appearance.accent(), null);
  Y.notify.show({ id: 'x', title: 't', body: 'b', actions: [{ label: 'a', run() {} }] }); Y.ui.toast('hi'); Y.notify.cyclePosition(); Y.notify.cycleDuration(); Y.notify.clear();
  assert(Y.store.switches().length >= 8, 'store lists the features');
  Y.dock.set(true); Y.dock.set(false); Y.dock.toggle(); Y.commands.run('yunispot.store');
  for (const n of ['play', 'pause', 'shuffle', 'repeat', 'queue', 'lyrics', 'volume', 'mute', 'cart', 'heart', 'heartO']) assert(Y.icons[n], 'icon ' + n);
  for (const id of ['report', 'shortcuts', 'settings.export', 'safe']) Y.commands.run('yunispot.' + id);
  assert(Y.report().includes('Selectors:') && !/title|artist/i.test(Y.report().split('Selectors:')[0]), 'report has no track data');
  Y.storage.set('ui:accent', '#112233'); Y.storage.set('stats', { secret: 1 });
  const exp = Y.settings.export(); assert(exp['ui:accent'] === '#112233' && !('stats' in exp), 'settings export is look/feature only');
  assert.strictEqual(Y.settings.import('not json'), 0); assert.strictEqual(Y.settings.import({ 'ui:accent': '#445566', evil: 1 }), 1, 'import ignores unknown keys');
  Y.settings.reset(); assert.strictEqual(Y.storage.get('ui:accent', null), null);
  assert(Y.stats.goal.minutes() >= 30 && Y.stats.goal.streak() >= 0); Y.stats.goal.cycle();
  Y.sleep.start(1); Y.sleep.cancel();
  Y.player.adjustVolume(0.05);
  assert(Y.nav.pin({ kind: 'artist', name: 'X', path: '/artist/4Z8W4fKeB5YxbusRsdQVPb' }) && Y.nav.isPinned('/artist/4Z8W4fKeB5YxbusRsdQVPb'), 'pin works');
  assert(!Y.nav.pin({ kind: 'artist', name: 'X', path: '/artist/4Z8W4fKeB5YxbusRsdQVPb' }), 'no duplicate pins');
  assert(!Y.nav.pin({ kind: 'artist', name: 'bad', path: '/artist/x y' }), 'bad path rejected');
  assert(Y.commands.list().some((c) => c.id.startsWith('yunispot.pin.')), 'pins become palette commands');
  Y.nav.hub('pinned'); Y.commands.run('yunispot.pins'); Y.dashboard.open(); Y.dashboard.close(); Y.stats.show();
  Y.nav.unpin('/artist/4Z8W4fKeB5YxbusRsdQVPb'); assert(!Y.nav.isPinned('/artist/4Z8W4fKeB5YxbusRsdQVPb'));
  Y.nowPlaying.open(); assert(Y.nowPlaying.isOpen()); Y.nowPlaying.close(); Y.commands.run('yunispot.nowplaying'); Y.commands.run('yunispot.nowplaying');
  { const sl = Y.slider(() => {}, null, { label: 't' }); sl.set(0.5); assert.strictEqual(sl.dragging(), false); }
  Y.mini.open(); Y.mini.close(); Y.nav.hub('all'); Y.commands.run('yunispot.browse.artists');
  assert.strictEqual(Y.nav.parseLink('https://open.spotify.com/artist/4Z8W4fKeB5YxbusRsdQVPb?si=abc'), '/artist/4Z8W4fKeB5YxbusRsdQVPb');
  assert.strictEqual(Y.nav.parseLink('spotify:playlist:37i9dQZF1DXcBWIGoYBM5M'), '/playlist/37i9dQZF1DXcBWIGoYBM5M');
  assert.strictEqual(Y.nav.parseLink('https://evil.example/artist/4Z8W4fKeB5YxbusRsdQVPb'), null, 'foreign links rejected');
  assert.strictEqual(Y.nav.parseLink('javascript:alert(1)'), null);
  Y.focusTimer.start(1, 1); assert(Y.focusTimer.status()); Y.focusTimer.stop(true);
  Y.history.add({ key: 'a::b', title: 'a', artist: 'b' }); Y.history.add({ key: 'a::b', title: 'a', artist: 'b' });
  assert.strictEqual(Y.history.list().length, 1, 'history dedupes consecutive repeats');
  assert.strictEqual(Y.stats.today().plays, 0);
  // v0.8: welcome wizard, guided tour, rescue, passive diagnostics
  Y.welcome.open({ first: true }); assert(Y.welcome.isOpen(), 'wizard opens'); Y.welcome.close(); assert(!Y.welcome.isOpen());
  Y.welcome.open({ first: false }); Y.welcome.close();
  Y.tour.start(); assert(Y.tour.isOpen(), 'tour starts'); Y.tour.next(); Y.tour.back(); Y.tour.stop(false); assert(!Y.tour.isOpen());
  assert(Y.tour.steps().length >= 10, 'tour has steps'); assert.strictEqual(Y.storage.get('tour:done'), Y.version, 'tour marks itself done');
  Y.commands.run('yunispot.tour'); Y.tour.stop(true);
  assert(Y.commands.list().some((c) => c.id === 'yunispot.rescue'), 'rescue command registered');
  Y.rescue.run('test', false); assert.strictEqual(Y.storage.get('ui:lite'), true, 'rescue switches glass off'); assert.strictEqual(Y.storage.get('dock:on', null), null, 'rescue leaves the removed dock setting untouched'); Y.rescue.undo();
  assert.strictEqual(Y.finder.moduleCount(), 0, 'diagnostics do not hook webpack'); assert.strictEqual(Y.finder.hooked(), false);
  console.log('ok  dashboard, palette, stats and diagnostics render without errors');

  // permission gating
  const probe = [];
  Y.registerExtension({ name: 'noperm', version: '1', permissions: ['ui'] }, (api) => {
    try { api.player.toggle(); } catch (e) { probe.push(e.message); }
  });
  Y.extensions.runAll();
  assert(probe[0] && /needs the "player" permission/.test(probe[0]));
  console.log('ok  extension permissions are enforced');

  fs.rmSync(tmp, { recursive: true, force: true });
  console.log('\nAll tests passed.');
  process.exit(0);
}).catch((e) => { console.error(e); process.exit(1); });
