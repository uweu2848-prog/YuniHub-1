'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const FLAG = 'app.enable-developer-mode=true';
const FLAG_RE = /^app\.enable-developer-mode=.*$/m;

function isRunning() {
  try {
    if (process.platform === 'win32') {
      return /Spotify\.exe/i.test(execFileSync('tasklist', ['/FI', 'IMAGENAME eq Spotify.exe'], { encoding: 'utf8' }));
    }
    return execFileSync('pgrep', ['-ix', 'spotify'], { encoding: 'utf8' }).trim().length > 0;
  } catch { return false; }
}

function devModeState(prefs) {
  if (!prefs || !fs.existsSync(prefs)) return 'missing';
  return /^app\.enable-developer-mode=true\s*$/m.test(fs.readFileSync(prefs, 'utf8')) ? 'on' : 'off';
}

/** Returns 'missing' | 'already' | 'added'. */
function enableDevMode(prefs) {
  const s = devModeState(prefs);
  if (s === 'missing') return 'missing';
  if (s === 'on') return 'already';
  let t = fs.readFileSync(prefs, 'utf8');
  t = FLAG_RE.test(t) ? t.replace(FLAG_RE, FLAG) : t.replace(/\s*$/, '\n') + FLAG + '\n';
  fs.writeFileSync(prefs, t);
  return 'added';
}

function disableDevMode(prefs) {
  if (!prefs || !fs.existsSync(prefs)) return;
  const t = fs.readFileSync(prefs, 'utf8');
  fs.writeFileSync(prefs, t.replace(/^app\.enable-developer-mode=.*\r?\n?/m, ''));
}

function getPreference(prefs, key) {
  if (!prefs || !fs.existsSync(prefs)) return null;
  const prefix = key + '=';
  const line = fs.readFileSync(prefs, 'utf8').split(/\r?\n/).find((item) => item.startsWith(prefix));
  return line ? { exists: true, value: line.slice(prefix.length) } : { exists: false, value: null };
}

function userPrefsPath(prefs) {
  if (!prefs) return null;
  const usersDir = path.join(path.dirname(prefs), 'Users');
  let profiles = [];
  try { profiles = fs.readdirSync(usersDir, { withFileTypes: true }).filter((entry) => entry.isDirectory()); } catch { /* use global prefs */ }
  const candidates = profiles.map((entry) => path.join(usersDir, entry.name, 'prefs')).filter((file) => fs.existsSync(file));
  candidates.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return candidates[0] || prefs;
}

function setPreference(prefs, key, value) {
  if (!prefs || !fs.existsSync(prefs)) return false;
  const prefix = key + '=';
  const text = fs.readFileSync(prefs, 'utf8');
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const hadTrailingNewline = /\r?\n$/.test(text);
  const lines = text.split(/\r?\n/).filter((line) => line.length > 0 || !hadTrailingNewline);
  const next = [];
  let found = false;
  for (const line of lines) {
    if (!line.startsWith(prefix)) { next.push(line); continue; }
    if (!found && value !== null) next.push(prefix + String(value));
    found = true;
  }
  if (!found && value !== null) next.push(prefix + String(value));
  fs.writeFileSync(prefs, next.join(eol) + (hadTrailingNewline || value !== null ? eol : ''));
  return true;
}

function restorePreference(prefs, key, original, managedValue) {
  if (!original) return;
  const current = getPreference(prefs, key);
  if (!current || !current.exists || current.value !== String(managedValue)) return;
  setPreference(prefs, key, original.exists ? original.value : null);
}

module.exports = { isRunning, devModeState, enableDevMode, disableDevMode, userPrefsPath, getPreference, setPreference, restorePreference };
