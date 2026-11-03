'use strict';

const fs = require('node:fs');
const path = require('node:path');

if (process.platform !== 'win32') {
  throw new Error('The bundled YuniSpot runtime is currently packaged for Windows only.');
}

const projectRoot = path.resolve(__dirname, '..', 'yunispot');
const stagingRoot = path.resolve(__dirname, '..', 'build', 'staged-yunispot');
const directories = ['bin', 'extensions', 'runtime', 'src', 'themes'];
const files = ['package.json', 'yunispot.js'];

for (const name of [...directories, ...files]) {
  if (!fs.existsSync(path.join(projectRoot, name))) {
    throw new Error(`YuniSpot source is missing ${name}.`);
  }
}
if (!process.versions.node || !fs.existsSync(process.execPath)) {
  throw new Error('A standalone Node.js executable is required to stage YuniSpot.');
}

fs.rmSync(stagingRoot, { recursive: true, force: true });
fs.mkdirSync(stagingRoot, { recursive: true });
for (const name of directories) {
  fs.cpSync(path.join(projectRoot, name), path.join(stagingRoot, name), { recursive: true });
}
for (const name of files) {
  fs.copyFileSync(path.join(projectRoot, name), path.join(stagingRoot, name));
}
fs.copyFileSync(process.execPath, path.join(stagingRoot, 'node.exe'));

console.log('Staged YuniSpot and its standalone Node.js runtime for the YuniHub installer.');
