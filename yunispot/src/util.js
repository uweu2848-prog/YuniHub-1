'use strict';
const fs = require('fs');
const c = (n, s) => (process.stdout.isTTY ? `\x1b[${n}m${s}\x1b[0m` : s);
module.exports = {
  ok: (s) => console.log(c(32, '✓') + ' ' + s),
  warn: (s) => console.log(c(33, '!') + ' ' + s),
  fail: (s) => console.log(c(31, '✗') + ' ' + s),
  info: (s) => console.log(c(36, '›') + ' ' + s),
  dim: (s) => c(2, s),
  bold: (s) => c(1, s),
  rm: (p) => fs.rmSync(p, { recursive: true, force: true }),
  copyDir: (src, dest) => fs.cpSync(src, dest, { recursive: true }),
};
