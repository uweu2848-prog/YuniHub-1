'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');

const dataDir = process.env.YUNISPOT_HOME || path.join(os.homedir(), '.yunispot');
const file = path.join(dataDir, 'config.json');

const defaults = () => ({
  theme: 'yunihub',
  extensions: ['hello-yuni'],
  accent: null,
  safe: false,
  features: { palette: true, stats: true, sleepTimer: true },
  spotifyAppsPath: null,
  spotifyPrefsPath: null,
});

function load() {
  const d = defaults();
  let raw;
  try { raw = fs.readFileSync(file, 'utf8'); } catch { return d; }
  try {
    const u = JSON.parse(raw);
    return { ...d, ...u, features: { ...d.features, ...(u.features || {}) } };
  } catch (e) {
    throw new Error(`${file} is not valid JSON: ${e.message}`);
  }
}

function save(cfg) {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(cfg, null, 2) + '\n');
}

module.exports = { dataDir, file, load, save, defaults };
