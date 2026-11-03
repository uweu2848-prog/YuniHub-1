'use strict';
// Minimal zip extractor (stored + deflate). Enough for Spotify's xpui.spa. No dependencies.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function extract(zipPath, destDir) {
  const buf = fs.readFileSync(zipPath);
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('Not a valid zip archive: ' + zipPath);

  const count = buf.readUInt16LE(eocd + 10);
  let off = buf.readUInt32LE(eocd + 16);
  const root = path.resolve(destDir);
  fs.mkdirSync(root, { recursive: true });

  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(off) !== 0x02014b50) throw new Error('Corrupt zip central directory');
    const method = buf.readUInt16LE(off + 10);
    const csize = buf.readUInt32LE(off + 20);
    const nameLen = buf.readUInt16LE(off + 28);
    const extraLen = buf.readUInt16LE(off + 30);
    const commLen = buf.readUInt16LE(off + 32);
    const lho = buf.readUInt32LE(off + 42);
    const name = buf.toString('utf8', off + 46, off + 46 + nameLen);
    off += 46 + nameLen + extraLen + commLen;

    const normalized = name.replace(/\\/g, '/').replace(/\/+/g, '/');
    const safePath = normalized.split('/').filter((part) => part && part !== '.');
    if (!safePath.length) continue; // root directory marker like '/' or '.'
    if (normalized.startsWith('/') || /^[A-Za-z]:/.test(normalized) || safePath[0] === '..') {
      throw new Error('Unsafe path in archive: ' + name); // zip-slip guard
    }

    const target = path.resolve(root, safePath.join(path.sep));
    const rel = path.relative(root, target);
    if (rel === '..' || rel.startsWith('..' + path.sep) || path.isAbsolute(rel)) {
      throw new Error('Unsafe path in archive: ' + name); // zip-slip guard
    }
    if (normalized.endsWith('/')) { fs.mkdirSync(target, { recursive: true }); continue; }

    const lnl = buf.readUInt16LE(lho + 26);
    const lel = buf.readUInt16LE(lho + 28);
    const start = lho + 30 + lnl + lel;
    const data = buf.subarray(start, start + csize);
    let out;
    if (method === 0) out = data;
    else if (method === 8) out = zlib.inflateRawSync(data);
    else throw new Error('Unsupported zip compression method ' + method);

    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, out);
  }
}

module.exports = { extract };
