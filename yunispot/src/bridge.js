'use strict';
const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const path = require('path');
const { spawn, spawnSync } = require('child_process');
const cfgMod = require('./config');
const paths = require('./paths');
const spotify = require('./spotify');
const adblock = require('./adblock');
const spotifyUpdate = require('./spotify-update');

const BRIDGE_FILE = path.join(cfgMod.dataDir, 'bridge.json');
const STATE_FILE = path.join(cfgMod.dataDir, 'bridge-state.json');
const CLI_FILE = path.join(__dirname, '..', 'bin', 'yunispot.js');

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}

function validConfig(value) {
  return value && Number.isInteger(value.port) && value.port >= 1024 && value.port <= 65535 && /^[a-f0-9]{64}$/i.test(value.token || '');
}

function ensure(cfg) {
  if (process.platform !== 'win32') return false;
  fs.mkdirSync(cfgMod.dataDir, { recursive: true });
  let info = readJson(BRIDGE_FILE, null);
  if (!validConfig(info)) {
    info = { port: crypto.randomInt(40000, 60000), token: crypto.randomBytes(32).toString('hex') };
    fs.writeFileSync(BRIDGE_FILE, JSON.stringify(info, null, 2));
  }
  cfg.bridge = info;
  const child = spawn(process.execPath, [CLI_FILE, 'bridge'], { detached: true, stdio: 'ignore', windowsHide: true });
  child.unref();
  return true;
}

function isSpotifyOrigin(origin) {
  try {
    const url = new URL(origin);
    return url.protocol === 'https:' && (url.hostname === 'spotify.com' || url.hostname.endsWith('.spotify.com'));
  } catch { return false; }
}

function authorized(req, info) {
  const value = req.headers.authorization || '';
  const supplied = Buffer.from(value.replace(/^Bearer\s+/i, ''));
  const expected = Buffer.from(info.token);
  return /^Bearer\s+/i.test(value) && supplied.length === expected.length && crypto.timingSafeEqual(supplied, expected);
}

function send(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
}

function readJsonBody(req, limit = 4096) {
  return new Promise((resolve, reject) => {
    let body = '';
    let size = 0;
    let tooLarge = false;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) { tooLarge = true; return; }
      if (!tooLarge) body += chunk.toString('utf8');
    });
    req.on('end', () => {
      if (tooLarge) return reject(Object.assign(new Error('Request body is too large.'), { status: 413 }));
      try { resolve(JSON.parse(body)); }
      catch { reject(Object.assign(new Error('Request body must be valid JSON.'), { status: 400 })); }
    });
    req.on('error', reject);
  });
}

function statusData(cfg) {
  return {
    ...adblock.status(cfg),
    busy: !!readJson(STATE_FILE, {}).busy,
    lastOperation: readJson(STATE_FILE, {}).lastOperation || null,
    spotifyUpdate: spotifyUpdate.status(),
  };
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function wait(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

async function closeSpotify() {
  spawnSync('taskkill.exe', ['/IM', 'Spotify.exe'], { stdio: 'ignore' });
  for (let i = 0; i < 24 && spotify.isRunning(); i++) await wait(250);
  if (spotify.isRunning()) {
    spawnSync('taskkill.exe', ['/F', '/T', '/IM', 'Spotify.exe'], { stdio: 'ignore' });
    for (let i = 0; i < 20 && spotify.isRunning(); i++) await wait(250);
  }
  if (spotify.isRunning()) throw new Error('Spotify could not be closed.');
}

function launchSpotify(cfg) {
  const s = paths.detect(cfg);
  if (!s) return;
  const executable = path.join(path.dirname(s.apps), 'Spotify.exe');
  if (!fs.existsSync(executable)) return;
  const child = spawn(executable, [], { cwd: path.dirname(executable), detached: true, stdio: 'ignore', windowsHide: true });
  child.unref();
}

async function runOperation(action) {
  const cfg = cfgMod.load();
  const state = { busy: true, lastOperation: { action, state: 'restarting', at: new Date().toISOString() } };
  saveState(state);
  let result;
  try {
    await closeSpotify();
    if (action === 'install') {
      adblock.install(cfg);
      result = { action, state: 'complete', message: 'The latest SpotX source was installed; Spotify automatic updates are paused.', at: new Date().toISOString() };
    } else if (action === 'uninstall') {
      adblock.uninstall(cfg);
      result = { action, state: 'complete', message: 'SpotX patches removed.', at: new Date().toISOString() };
    } else {
      const reapplied = await updateSpotify(cfg);
      const patchNames = [];
      if (reapplied.yuniSpot) patchNames.push('YuniSpot');
      if (reapplied.spotx) patchNames.push('SpotX');
      result = { action, state: 'complete', message: 'Spotify updated' + (patchNames.length ? '; ' + patchNames.join(' and ') + ' reapplied.' : '.'), at: new Date().toISOString() };
    }
  } catch (e) {
    result = { action, state: 'failed', message: e.message, at: new Date().toISOString() };
  } finally {
    launchSpotify(cfg);
    saveState({ busy: false, lastOperation: result || { action, state: 'failed', message: 'Operation ended unexpectedly.' } });
  }
}

async function updateSpotify(cfg) {
  const s = paths.detect(cfg);
  if (!s) throw new Error('Could not find the supported Spotify desktop client.');
  const previousVersion = spotifyUpdate.installedVersion(cfg);
  const wasApplied = adblock.isYuniSpotApplied(s.apps);
  const hadSpotX = adblock.isSpotXInstalled(s.apps);

  const errors = [];
  if (wasApplied) {
    try { apply.restore(cfg); } catch (e) { throw new Error('Could not restore YuniSpot before updating Spotify: ' + e.message); }
  }
  if (hadSpotX) {
    try { adblock.uninstall(cfg); }
    catch (e) {
      if (wasApplied) {
        try { apply.apply(cfg); } catch (reapplyError) { errors.push('YuniSpot could not be reapplied: ' + reapplyError.message); }
      }
      throw new Error([e.message, ...errors].join('\n'));
    }
  }

  let updateError = null;
  try {
    spotifyUpdate.install();
    const updatedVersion = spotifyUpdate.installedVersion(cfg);
    if (updatedVersion === previousVersion) {
      throw new Error('Spotify’s installer finished without changing the installed version. The update may have been canceled.');
    }
  } catch (e) {
    updateError = e;
  }

  if (spotify.isRunning()) {
    try { await closeSpotify(); } catch (e) { errors.push('Spotify could not be closed after its installer ran: ' + e.message); }
  }
  if (hadSpotX) {
    try { adblock.install(cfg); }
    catch (e) { errors.push('SpotX could not be reapplied: ' + e.message); }
  }
  if (wasApplied) {
    try { apply.apply(cfg); }
    catch (e) { errors.push('YuniSpot could not be reapplied: ' + e.message); }
  }
  if (updateError) errors.unshift(updateError.message);
  if (errors.length) throw new Error(errors.join('\n'));
  spotifyUpdate.markInstalled();
  return { yuniSpot: wasApplied, spotx: hadSpotX };
}

function createServer(info) {
  const server = http.createServer((req, res) => {
    const origin = req.headers.origin || '';
    if (!isSpotifyOrigin(origin)) return send(res, 403, { error: 'Spotify origin required.' });
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    res.setHeader('Access-Control-Allow-Private-Network', 'true');
    if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
    if (!authorized(req, info)) return send(res, 401, { error: 'Unauthorized.' });
    if (req.method === 'GET' && req.url === '/status') return send(res, 200, statusData(cfgMod.load()));
    if (req.method === 'GET' && req.url === '/spotify/update') {
      spotifyUpdate.check().then((status) => send(res, 200, status), (e) => send(res, 502, { error: e.message }));
      return;
    }
    if (req.method === 'POST' && req.url === '/shutdown') {
      send(res, 200, { ok: true });
      setTimeout(() => server.close(() => process.exit(0)), 50);
      return;
    }
    if (req.method === 'POST' && (/^\/adblock\/(install|uninstall)$/.test(req.url || '') || req.url === '/spotify/update')) {
      const action = req.url === '/spotify/update' ? 'spotify-update' : req.url.split('/').pop();
      const current = readJson(STATE_FILE, {});
      if (current.busy) return send(res, 409, { error: 'A Spotify maintenance operation is already running.' });
      if (action === 'spotify-update') {
        if (!spotifyUpdate.status().available) return send(res, 409, { error: 'No Spotify update is waiting to be installed. Check for updates first.' });
      }
      send(res, 202, { accepted: true, action, message: 'Spotify will close and restart to apply this change.' });
      setTimeout(() => runOperation(action), 250);
      return;
    }
    send(res, 404, { error: 'Unknown Store bridge action.' });
  });
  return server;
}

function start() {
  if (process.platform !== 'win32') throw new Error('The YuniSpot Store bridge is for Windows only.');
  const info = readJson(BRIDGE_FILE, null);
  if (!validConfig(info)) throw new Error('Store bridge is not configured. Run `yunispot apply` first.');
  const server = createServer(info);
  server.listen(info.port, '127.0.0.1');
  server.on('error', (e) => { console.error('YuniSpot Store bridge:', e.message); process.exitCode = 1; });
}

function stop(cfg) {
  const info = cfg.bridge || readJson(BRIDGE_FILE, null);
  if (!validConfig(info)) return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => { try { fs.rmSync(BRIDGE_FILE, { force: true }); } catch { /* ignore */ } resolve(); };
    const req = http.request({
      hostname: '127.0.0.1', port: info.port, path: '/shutdown', method: 'POST',
      headers: { Origin: 'https://open.spotify.com', Authorization: 'Bearer ' + info.token },
      timeout: 1000,
    }, (res) => { res.resume(); res.on('end', done); });
    req.on('error', done);
    req.on('timeout', () => { req.destroy(); done(); });
    req.end();
  });
}

module.exports = { ensure, start, stop, createServer, isSpotifyOrigin, validConfig, runOperation, updateSpotify, readJsonBody };