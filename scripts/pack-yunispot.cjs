'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const projectRoot = path.resolve(__dirname, '..', 'yunispot');
const outputRoot = path.resolve(__dirname, '..', 'release-assets');
const npmCli = process.env.npm_execpath;

if (!fs.existsSync(path.join(projectRoot, 'package.json'))) {
  throw new Error('YuniSpot source is missing from this repository.');
}
if (!npmCli) {
  throw new Error('Run this packer through an npm script so npm_execpath is available.');
}

fs.mkdirSync(outputRoot, { recursive: true });
execFileSync(process.execPath, [npmCli, 'pack', '--pack-destination', outputRoot], {
  cwd: projectRoot,
  stdio: 'inherit'
});
