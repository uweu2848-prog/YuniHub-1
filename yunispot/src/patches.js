'use strict';
// Signature-based patch engine. Patches match on code *structure* (regex), never on minified
// variable names, so they survive Spotify rebuilds. Add entries to LIST, then `yunispot apply`.
//
//   { name, file: /regex on relative path/, find: /regex/, replace: string|fn, enabled, required }
const fs = require('fs');
const path = require('path');

const LIST = [
  {
    name: 'example (disabled): no-op demo patch',
    file: /^xpui\.js$/,
    find: /^/,
    replace: '',
    enabled: false,
    required: false,
  },
];

function walk(dir, base = dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== 'yunispot') walk(p, base, out); }
    else if (e.name.endsWith('.js')) out.push(path.relative(base, p).split(path.sep).join('/'));
  }
  return out;
}

function run(dir) {
  const files = walk(dir);
  const results = [];
  for (const p of LIST.filter((x) => x.enabled)) {
    let applied = 0;
    for (const rel of files.filter((f) => p.file.test(f))) {
      const full = path.join(dir, rel);
      const text = fs.readFileSync(full, 'utf8');
      const next = text.replace(p.find, p.replace);
      if (next !== text) { fs.writeFileSync(full, next); applied++; }
    }
    results.push({ name: p.name, applied, required: !!p.required, ok: applied > 0 || !p.required });
  }
  return results;
}

module.exports = { run, LIST };
