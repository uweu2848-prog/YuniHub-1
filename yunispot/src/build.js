'use strict';
// Builds the single JS + CSS bundle that gets injected into Spotify.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const cfgMod = require('./config');
const pkg = require('../package.json');

const RUNTIME_DIR = path.join(__dirname, '..', 'runtime');
const PERMISSIONS = ['player', 'ui', 'storage', 'network', 'platform'];

const dirs = () => ({
  themes: path.join(cfgMod.dataDir, 'themes'),
  extensions: path.join(cfgMod.dataDir, 'extensions'),
});

const listDirs = (d) => {
  try { return fs.readdirSync(d, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name); }
  catch { return []; }
};

const cssValue = (v) => String(v).replace(/[;{}<>]/g, '');

const COLOR_MAP = {
  base: ['--background-base'],
  highlight: ['--background-highlight'],
  press: ['--background-press'],
  elevated: ['--background-elevated-base'],
  elevatedHighlight: ['--background-elevated-highlight'],
  text: ['--text-base'],
  subdued: ['--text-subdued'],
  accent: ['--essential-bright-accent', '--text-bright-accent', '--yuni-accent'],
};

const hexRgb = (hex) => {
  const h = String(hex).replace('#', '');
  const f = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return /^[0-9a-f]{6}$/i.test(f) ? [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16)) : null;
};
const mix = (rgb, to, t) => rgb.map((c) => Math.round(c + (to - c) * t));
const toHex = (rgb) => '#' + rgb.map((c) => c.toString(16).padStart(2, '0')).join('');

// Derived accent variables, so every themed surface (buttons, glows, our own windows) follows one colour.
const hueOf = ([r, g, b]) => {
  const [R, G, B] = [r / 255, g / 255, b / 255];
  const mx = Math.max(R, G, B), mn = Math.min(R, G, B), d = mx - mn;
  if (!d) return 0;
  const h = mx === R ? ((G - B) / d) % 6 : mx === G ? (B - R) / d + 2 : (R - G) / d + 4;
  return Math.round(((h * 60) + 360) % 360);
};

function accentVars(hex) {
  const rgb = hexRgb(hex);
  if (!rgb) return '';
  return [
    // Spotify's green equaliser GIF sits at hue ~141, so rotate it onto the accent's hue.
    `  --yuni-eq-rotate: ${hueOf(rgb) - 141}deg !important;`,
    `  --yuni-accent-rgb: ${rgb.join(',')} !important;`,
    `  --yuni-btn-top: ${toHex(mix(rgb, 255, 0.12))} !important;`,
    `  --yuni-btn-bottom: ${toHex(mix(rgb, 0, 0.22))} !important;`,
  ].join('\n');
}

function buildTheme(name) {
  const dir = path.join(dirs().themes, name);
  const cssFile = path.join(dir, 'theme.css');
  if (!fs.existsSync(cssFile)) throw new Error(`Theme "${name}" not found in ${dirs().themes}`);
  let colors = {};
  try { colors = JSON.parse(fs.readFileSync(path.join(dir, 'config.json'), 'utf8')).colors || {}; } catch { /* optional */ }
  const decls = Object.entries(COLOR_MAP)
    .filter(([k]) => colors[k])
    .map(([k, vars]) => vars.map((v) => `  ${v}: ${cssValue(colors[k])} !important;`).join('\n'))
    .join('\n') + '\n' + accentVars(colors.accent);
  const vars = `:root, body, .encore-dark-theme, .encore-light-theme, .encore-inverted-light-theme, .encore-base-set, [class*="encore-"][class*="-set"], [class*="encore-"][class*="-theme"] {\n${decls}\n}`;
  return `/* YuniSpot theme: ${name} */\n${vars}\n\n${fs.readFileSync(cssFile, 'utf8')}\n`;
}

const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;
const normHex = (v) => (HEX.test(String(v)) ? '#' + String(v).replace('#', '').toLowerCase() : null);

// A user-chosen accent colour that overrides whatever the theme sets.
function accentCss(accent) {
  const hex = normHex(accent);
  if (!hex) return '';
  return `\n/* accent override */\n:root, body, .encore-dark-theme, .encore-base-set, [class*="encore-"][class*="-set"], [class*="encore-"][class*="-theme"] {\n  --essential-bright-accent: ${hex} !important;\n  --text-bright-accent: ${hex} !important;\n  --yuni-accent: ${hex} !important;\n${accentVars(hex)}\n}\n`;
}

function loadExtension(name) {
  const dir = path.join(dirs().extensions, name);
  let manifest;
  try { manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8')); }
  catch { throw new Error('missing or invalid manifest.json'); }
  if (!manifest.name || !manifest.version) throw new Error('manifest needs "name" and "version"');
  manifest.permissions = manifest.permissions || [];
  const bad = manifest.permissions.filter((p) => !PERMISSIONS.includes(p));
  if (bad.length) throw new Error(`unknown permission(s): ${bad.join(', ')} (allowed: ${PERMISSIONS.join(', ')})`);
  const code = fs.readFileSync(path.join(dir, 'index.js'), 'utf8');
  try { new vm.Script('(function(api){' + code + '\n})', { filename: name + '/index.js' }); }
  catch (e) { throw new Error('syntax error: ' + e.message); }
  return { manifest, code };
}

function build(cfg) {
  const warnings = [];
  const css = buildTheme(cfg.theme) + accentCss(cfg.accent);

  const loaded = [];
  const extBlocks = [];
  for (const name of cfg.extensions) {
    try {
      const ext = loadExtension(name);
      loaded.push(name);
      extBlocks.push(
        `/* extension: ${name} */\n{\nconst Y = window.YuniSpot;\nY.registerExtension(${JSON.stringify(ext.manifest)}, function(api){\n${ext.code}\n});\n}`
      );
    } catch (e) {
      warnings.push(`Extension "${name}" skipped: ${e.message}`);
    }
  }

  const files = fs.readdirSync(RUNTIME_DIR).filter((f) => f.endsWith('.js')).sort();
  const startFile = files.filter((f) => f.startsWith('99'));
  const runtimeFiles = files.filter((f) => !f.startsWith('99'));
  const block = (f) => `/* runtime/${f} */\n{\n${fs.readFileSync(path.join(RUNTIME_DIR, f), 'utf8')}\n}`;

  let bridge = null;
  try { bridge = JSON.parse(fs.readFileSync(path.join(cfgMod.dataDir, 'bridge.json'), 'utf8')); } catch { /* bridge not installed */ }
  const boot = { version: pkg.version, theme: cfg.theme, features: cfg.features, safe: !!cfg.safe, bridge, builtAt: Date.now() };
  const js = [
    `/* YuniSpot ${pkg.version}: generated file, edit the sources instead */`,
    '(function(){',
    "'use strict';",
    `window.__YUNI_BOOT__ = ${JSON.stringify(boot)};`,
    ...runtimeFiles.map(block),
    ...extBlocks,
    ...startFile.map(block),
    '})();',
    '',
  ].join('\n');

  try { new vm.Script(js, { filename: 'yunispot.js' }); }
  catch (e) { throw new Error('Generated bundle has a syntax error: ' + e.message); }

  return { js, css, warnings, extensions: loaded };
}

module.exports = { build, dirs, listDirs, PERMISSIONS, normHex };
