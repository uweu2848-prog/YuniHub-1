'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const cfgMod = require('./config');
const builder = require('./build');
const apply = require('./apply');
const adblock = require('./adblock');
const bridge = require('./bridge');
const u = require('./util');

const ROOT = path.join(__dirname, '..');

const HELP = `
${u.bold('YuniSpot')}: themes, extensions and a command palette for the Spotify desktop client

${u.bold('Usage')}  yunispot <command>

  init                      Create ~/.yunispot and copy the bundled themes/extensions
  apply                     Back up Spotify, inject YuniSpot, enable developer mode
  restore                   Put Spotify back exactly how it was
  doctor                    Diagnose problems (run this after a Spotify update)
  watch                     Rebuild on every change to themes/extensions/runtime

  status                    Show the current setup at a glance
  safe on|off|status        Start Spotify with safe visuals (no blur, no glass player). Use it if the screen is blank
  adblock status|install|uninstall  Manage Windows SpotX from its latest official source
  accent <#hex | reset>     Override the theme's accent colour
  new theme|ext <name>      Scaffold a new theme or extension
  export <file> | import <file>   Back up / restore your config

  theme list | set <name> | reset <name> | install <folder> | remove <name>
  ext list | enable <name> | disable <name> | install <folder> | remove <name>
  config [key] [value]      Show or change settings (e.g. config features.stats false)

${u.bold('Environment')}  YUNISPOT_HOME, YUNISPOT_APPS, YUNISPOT_PREFS, YUNISPOT_DEBUG=1
`;

// Hashes of the bundled themes/extensions shipped in v0.2/v0.3.0. A copy in ~/.yunispot that still
// matches one of these (or its own .yuni-origin marker) was never edited, so it is safe to upgrade.
const LEGACY = new Set(['5d7d795d35b9c9d1', '812dc430514961fe', '5dd717a7c0edf5d7', '348ad546549283f9']);
const MARK = '.yuni-origin';

function listFiles(dir, base = dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) listFiles(p, base, out);
    else out.push(path.relative(base, p).split(path.sep).join('/'));
  }
  return out;
}
function hashDir(dir) {
  const h = crypto.createHash('sha256');
  for (const f of listFiles(dir).filter((x) => x !== MARK).sort()) {
    h.update(f + '\0'); h.update(fs.readFileSync(path.join(dir, f))); h.update('\0');
  }
  return h.digest('hex').slice(0, 16);
}
function installBundled(src, dest) {
  u.rm(dest);
  u.copyDir(src, dest);
  fs.writeFileSync(path.join(dest, MARK), hashDir(src) + '\n');
}

function init() {
  const d = builder.dirs();
  const report = { updated: [], customized: [] };
  fs.mkdirSync(cfgMod.dataDir, { recursive: true });
  for (const [kind, target] of [['themes', d.themes], ['extensions', d.extensions]]) {
    fs.mkdirSync(target, { recursive: true });
    for (const name of builder.listDirs(path.join(ROOT, kind))) {
      const src = path.join(ROOT, kind, name), dest = path.join(target, name);
      if (!fs.existsSync(dest)) { installBundled(src, dest); continue; }
      const bundled = hashDir(src), current = hashDir(dest);
      if (bundled === current) { try { fs.writeFileSync(path.join(dest, MARK), bundled + '\n'); } catch { /* ignore */ } continue; }
      let origin = null;
      try { origin = fs.readFileSync(path.join(dest, MARK), 'utf8').trim(); } catch { /* legacy copy */ }
      if (origin ? origin === current : LEGACY.has(current)) { installBundled(src, dest); report.updated.push(`${kind}/${name}`); }
      else report.customized.push(`${kind}/${name}`);
    }
  }
  if (!fs.existsSync(cfgMod.file)) cfgMod.save(cfgMod.defaults());
  return report;
}

function report(r) {
  if (!r) return;
  r.updated.forEach((n) => u.ok(`Updated bundled ${n} to the latest version`));
  r.customized.forEach((n) => u.warn(`${n} has your edits, so it was left alone. Use \`yunispot ${n.startsWith('themes') ? 'theme' : 'ext'} reset ${n.split('/')[1]}\` to get the new bundled version`));
}

function coerce(v) { try { return JSON.parse(v); } catch { return v; } }

function configCmd(args) {
  const cfg = cfgMod.load();
  if (!args[0]) return console.log(JSON.stringify(cfg, null, 2));
  const keys = args[0].split('.');
  if (args.length === 1) {
    return console.log(JSON.stringify(keys.reduce((o, k) => (o == null ? o : o[k]), cfg), null, 2));
  }
  let o = cfg;
  keys.slice(0, -1).forEach((k) => { if (typeof o[k] !== 'object' || o[k] === null) o[k] = {}; o = o[k]; });
  o[keys[keys.length - 1]] = coerce(args.slice(1).join(' '));
  cfgMod.save(cfg);
  u.ok(`${args[0]} = ${JSON.stringify(o[keys[keys.length - 1]])}`);
}

function resetBundled(kind, name) {
  const src = path.join(ROOT, kind, name);
  if (!SLUG.test(name) || !fs.existsSync(src)) throw new Error(`"${name}" is not a bundled ${kind.slice(0, -1)}`);
  installBundled(src, path.join(kind === 'themes' ? builder.dirs().themes : builder.dirs().extensions, name));
  u.ok(`${name} reset to the bundled version. Run \`yunispot apply\`.`);
}

function themeCmd(args) {
  const cfg = cfgMod.load();
  const names = builder.listDirs(builder.dirs().themes);
  if (!args[0] || args[0] === 'list') {
    names.forEach((n) => console.log((n === cfg.theme ? '* ' : '  ') + n));
    return;
  }
  if (args[0] === 'install') return installFrom('themes', args[1]);
  if (args[0] === 'remove') return removeInstalled('themes', args[1]);
  if (args[0] === 'reset' && args[1]) return resetBundled('themes', args[1]);
  if (args[0] === 'set' && args[1]) {
    if (!names.includes(args[1])) throw new Error(`No theme "${args[1]}". Available: ${names.join(', ')}`);
    cfg.theme = args[1];
    cfgMod.save(cfg);
    return u.ok(`Theme set to "${args[1]}". Run \`yunispot apply\` to use it.`);
  }
  throw new Error('Usage: yunispot theme list | set <name>');
}

function installFrom(kind, src) {
  if (!src) throw new Error(`Usage: yunispot ${kind === 'themes' ? 'theme' : 'ext'} install <folder>`);
  const abs = path.resolve(src);
  if (!fs.existsSync(abs) || !fs.statSync(abs).isDirectory()) throw new Error(`${abs} is not a folder`);
  const name = path.basename(abs);
  if (!SLUG.test(name)) throw new Error('Folder name may only contain letters, numbers, - and _');
  if (kind === 'extensions') {
    let m;
    try { m = JSON.parse(fs.readFileSync(path.join(abs, 'manifest.json'), 'utf8')); } catch { throw new Error('missing or invalid manifest.json'); }
    if (!m.name || !m.version) throw new Error('manifest needs "name" and "version"');
    const bad = (m.permissions || []).filter((p) => !builder.PERMISSIONS.includes(p));
    if (bad.length) throw new Error(`unknown permission(s): ${bad.join(', ')} (allowed: ${builder.PERMISSIONS.join(', ')})`);
    if (!fs.existsSync(path.join(abs, 'index.js'))) throw new Error('missing index.js');
    u.info(`Permissions requested: ${(m.permissions || []).join(', ') || 'none'}`);
  } else {
    if (!fs.existsSync(path.join(abs, 'theme.css'))) throw new Error('missing theme.css');
    try { JSON.parse(fs.readFileSync(path.join(abs, 'config.json'), 'utf8')); } catch { throw new Error('missing or invalid config.json'); }
  }
  const dest = path.join(kind === 'themes' ? builder.dirs().themes : builder.dirs().extensions, name);
  if (fs.existsSync(dest)) throw new Error(`${name} is already installed. Remove it first.`);
  u.copyDir(abs, dest);
  u.ok(`Installed ${name}. ${kind === 'themes' ? `Use it with: yunispot theme set ${name}` : `Turn it on with: yunispot ext enable ${name}`}`);
}

function removeInstalled(kind, name) {
  if (!name || !SLUG.test(name)) throw new Error('Usage: yunispot ' + (kind === 'themes' ? 'theme' : 'ext') + ' remove <name>');
  if (builder.listDirs(path.join(ROOT, kind)).includes(name)) throw new Error(`${name} is bundled with YuniSpot. ${kind === 'themes' ? 'Switch to another theme instead' : 'Use "ext disable" instead'}.`);
  const dir = path.join(kind === 'themes' ? builder.dirs().themes : builder.dirs().extensions, name);
  if (!fs.existsSync(dir)) throw new Error(`${name} is not installed`);
  const cfg = cfgMod.load();
  if (kind === 'themes' && cfg.theme === name) throw new Error(`${name} is your current theme. Switch themes first.`);
  u.rm(dir);
  if (kind === 'extensions') { cfg.extensions = cfg.extensions.filter((n) => n !== name); cfgMod.save(cfg); }
  u.ok(`Removed ${name}. Run \`yunispot apply\` to update Spotify.`);
}

function extCmd(args) {
  if (args[0] === 'install') return installFrom('extensions', args[1]);
  if (args[0] === 'remove') return removeInstalled('extensions', args[1]);
  const cfg = cfgMod.load();
  const names = builder.listDirs(builder.dirs().extensions);
  const sub = args[0] || 'list';
  if (sub === 'reset' && args[1]) return resetBundled('extensions', args[1]);
  if (sub === 'list') {
    names.forEach((n) => console.log((cfg.extensions.includes(n) ? '[x] ' : '[ ] ') + n));
    return;
  }
  const name = args[1];
  if (!['enable', 'disable'].includes(sub) || !name) throw new Error('Usage: yunispot ext list | enable <name> | disable <name>');
  if (sub === 'enable') {
    if (!names.includes(name)) throw new Error(`No extension "${name}" in ${builder.dirs().extensions}`);
    if (!cfg.extensions.includes(name)) cfg.extensions.push(name);
  } else {
    cfg.extensions = cfg.extensions.filter((n) => n !== name);
  }
  cfgMod.save(cfg);
  u.ok(`${name} ${sub}d. Run \`yunispot apply\` to take effect.`);
}

function statusCmd() {
  const cfg = cfgMod.load();
  const d = builder.dirs();
  console.log(`${u.bold('YuniSpot')} ${require('../package.json').version}`);
  console.log(`  data dir   ${cfgMod.dataDir}`);
  console.log(`  theme      ${cfg.theme}${cfg.accent ? '  (accent ' + cfg.accent + ')' : ''}`);
  console.log(`  extensions ${cfg.extensions.join(', ') || 'none'}  (${builder.listDirs(d.extensions).length} installed)`);
  console.log(`  features   ${Object.entries(cfg.features).map(([k, v]) => k + '=' + v).join(' ')}`);
  console.log(`  safe mode  ${cfg.safe ? 'ON (yunispot safe off to leave)' : 'off'}`);
}

function accentCmd(args) {
  const cfg = cfgMod.load();
  if (!args[0]) return console.log(cfg.accent || '(theme default)');
  if (args[0] === 'reset') { cfg.accent = null; cfgMod.save(cfg); return u.ok('Accent reset. Run `yunispot apply`.'); }
  const hex = builder.normHex(args[0]);
  if (!hex) throw new Error('Usage: yunispot accent <#rrggbb | reset>');
  cfg.accent = hex;
  cfgMod.save(cfg);
  u.ok(`Accent set to ${hex}. Run \`yunispot apply\` to use it.`);
}

function safeCmd(args) {
  const cfg = cfgMod.load();
  const want = (args[0] || 'status').toLowerCase();
  if (want === 'status') return console.log(cfg.safe ? 'Safe visuals: ON (run `yunispot safe off` to go back to the full look)' : 'Safe visuals: off');
  if (!['on', 'off'].includes(want)) throw new Error('Usage: yunispot safe on|off|status');
  cfg.safe = want === 'on';
  cfgMod.save(cfg);
  try { apply.refresh(cfg); u.ok(`Safe visuals ${cfg.safe ? 'ON' : 'off'}. Restart Spotify to see the change.`); }
  catch (e) { u.ok(`Safe visuals ${cfg.safe ? 'ON' : 'off'} in your config.`); u.warn(`${e.message} Run \`yunispot apply\` to use it.`); }
  if (cfg.safe) u.info('Still stuck? `yunispot restore` puts Spotify back exactly as it was.');
}

function adblockCmd(args) {
  const cfg = cfgMod.load();
  const action = (args[0] || 'status').toLowerCase();
  if (action === 'status') {
    const s = adblock.status(cfg);
    if (!s.spotify) return u.warn('Spotify desktop client not found.');
    console.log(`SpotX ad blocking: ${s.spotx ? 'installed' : 'not installed'}`);
    console.log(`Spotify automatic updates: ${s.spotx ? 'paused by SpotX' : 'not paused'}`);
    console.log(`YuniSpot: ${s.yuniSpot ? 'applied' : 'not applied'}`);
    u.info('SpotX source is downloaded from the official GitHub repository when you install or remove it.');
    return;
  }
  if (action !== 'install' && action !== 'uninstall') throw new Error('Usage: yunispot adblock status | install | uninstall');
  if (action === 'install') return adblock.install(cfg);
  return adblock.uninstall(cfg);
}

const SLUG = /^[a-z0-9][a-z0-9-_]{0,40}$/i;

function newCmd(args) {
  const [kind, name] = args;
  if (!['theme', 'ext'].includes(kind) || !name) throw new Error('Usage: yunispot new theme|ext <name>');
  if (!SLUG.test(name)) throw new Error('Name may only contain letters, numbers, - and _');
  const d = builder.dirs();
  const dir = path.join(kind === 'theme' ? d.themes : d.extensions, name);
  if (fs.existsSync(dir)) throw new Error(`${dir} already exists`);
  fs.mkdirSync(dir, { recursive: true });
  if (kind === 'theme') {
    fs.writeFileSync(path.join(dir, 'config.json'), JSON.stringify({ name, colors: { base: '#000000', highlight: '#111111', press: '#000000', elevated: '#181818', elevatedHighlight: '#222222', text: '#ffffff', subdued: '#aaaaaa', accent: '#ff6b6b' } }, null, 2) + '\n');
    fs.writeFileSync(path.join(dir, 'theme.css'), `/* ${name}: add your CSS here */\n`);
  } else {
    fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify({ name, version: '0.1.0', permissions: ['player', 'ui'] }, null, 2) + '\n');
    fs.writeFileSync(path.join(dir, 'index.js'), `// Body of a function that receives \`api\`.\napi.ui.registerCommand({ id: 'hi', title: '${name}: say hi', run: () => api.ui.toast('Hello from ${name}') });\n`);
  }
  u.ok(`Created ${dir}`);
  u.info(kind === 'theme' ? `Then: yunispot theme set ${name} && yunispot apply` : `Then: yunispot ext enable ${name} && yunispot apply`);
}

function exportCmd(args) {
  if (!args[0]) throw new Error('Usage: yunispot export <file>');
  fs.writeFileSync(args[0], JSON.stringify(cfgMod.load(), null, 2) + '\n');
  u.ok(`Config written to ${args[0]}`);
}

function importCmd(args) {
  if (!args[0]) throw new Error('Usage: yunispot import <file>');
  let incoming;
  try { incoming = JSON.parse(fs.readFileSync(args[0], 'utf8')); }
  catch (e) { throw new Error(`Cannot read ${args[0]}: ${e.message}`); }
  if (typeof incoming !== 'object' || incoming === null || Array.isArray(incoming)) throw new Error('Not a YuniSpot config file');
  const cfg = { ...cfgMod.defaults(), ...incoming, features: { ...cfgMod.defaults().features, ...(incoming.features || {}) } };
  if (!Array.isArray(cfg.extensions)) cfg.extensions = [];
  cfgMod.save(cfg);
  u.ok('Config imported. Run `yunispot apply`.');
}

function watchCmd() {
  init();
  apply.refresh(cfgMod.load());
  const d = builder.dirs();
  const targets = [d.themes, d.extensions, path.join(ROOT, 'runtime')];
  let timer;
  const trigger = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      try {
        apply.refresh(cfgMod.load());
        u.ok(`Rebuilt at ${new Date().toLocaleTimeString()}. Reload Spotify's UI (Ctrl+Shift+R with developer mode on).`);
      } catch (e) { u.fail(e.message); }
    }, 300);
  };
  for (const t of targets) {
    try { fs.watch(t, { recursive: true }, trigger); }
    catch { try { fs.watch(t, trigger); } catch { /* ignore */ } }
  }
  u.info('Watching for changes. Ctrl+C to stop.');
}

async function main(argv) {
  const [cmd, ...rest] = argv;
  try {
    switch (cmd) {
      case 'init': report(init()); u.ok(`Initialised ${cfgMod.dataDir}`); break;
      case 'apply': {
        report(init());
        const cfg = cfgMod.load();
        bridge.ensure(cfg);
        apply.apply(cfg);
        break;
      }
      case 'restore': {
        const cfg = cfgMod.load();
        await bridge.stop(cfg);
        apply.restore(cfg);
        break;
      }
      case 'doctor': report(init()); process.exitCode = apply.doctor(cfgMod.load()); break;
      case 'watch': watchCmd(); break;
      case 'status': report(init()); statusCmd(); break;
      case 'safe': init(); safeCmd(rest); break;
      case 'adblock': init(); adblockCmd(rest); break;
      case 'bridge': bridge.start(); break;
      case 'accent': init(); accentCmd(rest); break;
      case 'new': init(); newCmd(rest); break;
      case 'export': exportCmd(rest); break;
      case 'import': init(); importCmd(rest); break;
      case 'theme': report(init()); themeCmd(rest); break;
      case 'ext': report(init()); extCmd(rest); break;
      case 'config': configCmd(rest); break;
      case undefined: case 'help': case '--help': case '-h': console.log(HELP); break;
      default: console.log(`Unknown command "${cmd}"`); console.log(HELP); process.exitCode = 1;
    }
  } catch (e) {
    u.fail(e.message);
    if (process.env.YUNISPOT_DEBUG) console.error(e.stack);
    process.exitCode = 1;
  }
}

module.exports = { main, init };
