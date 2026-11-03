'use strict';
const fs = require('fs');
const https = require('https');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const cfgMod = require('./config');

const INSTALLER_URL = 'https://download.scdn.co/SpotifySetup.exe';
const STATE_FILE = path.join(cfgMod.dataDir, 'spotify-update.json');
const MAX_REDIRECTS = 5;
let checkPromise = null;

function readState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch { return {}; }
}

function writeState(state) {
  fs.mkdirSync(cfgMod.dataDir, { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function installerMetadata(url = INSTALLER_URL, redirects = 0) {
  return new Promise((resolve, reject) => {
    const request = https.request(url, { method: 'HEAD', timeout: 15000 }, (response) => {
      if ([301, 302, 303, 307, 308].includes(response.statusCode) && response.headers.location) {
        response.resume();
        if (redirects >= MAX_REDIRECTS) return reject(new Error('Spotify installer redirected too many times.'));
        const next = new URL(response.headers.location, url);
        if (next.protocol !== 'https:') return reject(new Error('Spotify installer redirected to an insecure URL.'));
        return resolve(installerMetadata(next, redirects + 1));
      }
      response.resume();
      if (response.statusCode !== 200) return reject(new Error('Spotify installer check failed with HTTP ' + response.statusCode + '.'));
      const etag = response.headers.etag;
      const modified = response.headers['last-modified'];
      const length = response.headers['content-length'];
      const releaseId = etag || (modified && length ? modified + ':' + length : null);
      if (!releaseId) return reject(new Error('Spotify installer response did not include a release identifier.'));
      resolve({ releaseId, lastModified: modified || null });
    });
    request.on('timeout', () => request.destroy(new Error('Spotify installer check timed out.')));
    request.on('error', reject);
    request.end();
  });
}

function versionParts(value) {
  const match = String(value || '').match(/\d+(?:\.\d+){0,3}/);
  return match ? match[0].split('.').map(Number) : null;
}

function compareVersions(installed, latest) {
  const currentParts = versionParts(installed);
  const latestParts = versionParts(latest);
  if (!currentParts || !latestParts) throw new Error('Could not compare Spotify version values.');
  for (let i = 0; i < Math.max(currentParts.length, latestParts.length); i++) {
    const currentPart = currentParts[i] || 0;
    const latestPart = latestParts[i] || 0;
    if (currentPart !== latestPart) return currentPart < latestPart ? -1 : 1;
  }
  return 0;
}

function check(fetchMetadata = installerMetadata, getInstalledVersion = () => installedVersion(cfgMod.load()), getInstallerVersion = installerVersion) {
  if (checkPromise) return checkPromise;
  checkPromise = checkOnce(fetchMetadata, getInstalledVersion, getInstallerVersion).finally(() => { checkPromise = null; });
  return checkPromise;
}

async function checkOnce(fetchMetadata, getInstalledVersion, getInstallerVersion) {
  const metadata = await fetchMetadata();
  const previous = readState();
  const currentVersion = getInstalledVersion();
  const latestVersion = previous.releaseId === metadata.releaseId && previous.latestVersion
    ? previous.latestVersion
    : await getInstallerVersion();
  const available = compareVersions(currentVersion, latestVersion) < 0;
  const current = {
    ...previous,
    releaseId: metadata.releaseId,
    lastModified: metadata.lastModified,
    lastCheckedAt: new Date().toISOString(),
    currentVersion,
    latestVersion,
    available,
    availableId: available ? metadata.releaseId : null,
  };
  writeState(current);
  return {
    available: current.available,
    releaseId: current.availableId,
    currentVersion,
    latestVersion,
    lastModified: current.lastModified,
  };
}

function runPowerShell(script, env, capture = false) {
  const powershell = powershellPath();
  const result = spawnSync(powershell, ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script], capture ? {
    encoding: 'utf8',
    env: { ...process.env, ...env },
    windowsHide: true,
  } : {
    stdio: 'inherit',
    env: { ...process.env, ...env },
    windowsHide: true,
  });
  if (result.error) throw new Error('Could not start Spotify update helper: ' + result.error.message);
  if (result.status !== 0) throw new Error(capture && result.stderr ? result.stderr.trim() : 'Spotify update helper exited with status ' + result.status + '.');
  return capture ? result.stdout.trim() : '';
}

function powershellPath() {
  return path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
}

function installedVersion(cfg) {
  if (process.platform !== 'win32') throw new Error('Spotify update checks are available on Windows only.');
  const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
  const standardApps = path.join(appData, 'Spotify', 'Apps');
  const apps = process.env.YUNISPOT_APPS || cfg.spotifyAppsPath || standardApps;
  if (path.resolve(apps).toLowerCase() !== path.resolve(standardApps).toLowerCase()) {
    throw new Error('Spotify update management supports the standard %APPDATA%\\Spotify installation only.');
  }
  const spotifyDir = path.dirname(apps);
  const executable = path.join(spotifyDir, 'Spotify.exe');
  if (!fs.existsSync(executable)) throw new Error('Spotify.exe was not found at ' + executable);
  const version = runPowerShell(
    "$ErrorActionPreference = 'Stop'; $version = [System.Diagnostics.FileVersionInfo]::GetVersionInfo($env:YUNISPOT_SPOTIFY_EXE).ProductVersion; if (-not $version) { throw 'Spotify version metadata is missing.' }; Write-Output $version",
    { YUNISPOT_SPOTIFY_EXE: executable },
    true,
  );
  if (!version) throw new Error('Spotify version metadata is missing.');
  return version;
}

function downloadInstaller(file) {
  const script = [
    "$ErrorActionPreference = 'Stop'",
    "$ProgressPreference = 'SilentlyContinue'",
    "Invoke-WebRequest -UseBasicParsing -Uri '" + INSTALLER_URL + "' -OutFile $env:YUNISPOT_UPDATE_FILE",
    '$signature = Get-AuthenticodeSignature -LiteralPath $env:YUNISPOT_UPDATE_FILE',
    "if ($signature.Status -ne 'Valid' -or $signature.SignerCertificate.Subject -notmatch 'Spotify AB') { throw 'The downloaded installer is not signed by Spotify AB.' }",
  ].join('; ');
  runPowerShell(script, { YUNISPOT_UPDATE_FILE: file });
}

function installerVersion() {
  if (process.platform !== 'win32') throw new Error('Spotify update checks are available on Windows only.');
  const installer = path.join(os.tmpdir(), 'YuniSpot-SpotifySetup-check-' + process.pid + '-' + Date.now() + '.exe');
  try {
    downloadInstaller(installer);
    return runPowerShell(
      "$ErrorActionPreference = 'Stop'; $version = [System.Diagnostics.FileVersionInfo]::GetVersionInfo($env:YUNISPOT_UPDATE_FILE).ProductVersion; if (-not $version) { throw 'Spotify installer version metadata is missing.' }; Write-Output $version",
      { YUNISPOT_UPDATE_FILE: installer },
      true,
    );
  } finally {
    try { fs.rmSync(installer, { force: true }); } catch { /* temporary installer cleanup */ }
  }
}

function install() {
  if (process.platform !== 'win32') throw new Error('Spotify updates through the Store are available on Windows only.');
  const installer = path.join(os.tmpdir(), 'YuniSpot-SpotifySetup-' + process.pid + '-' + Date.now() + '.exe');
  try {
    downloadInstaller(installer);
    const result = spawnSync(installer, [], { stdio: 'inherit', windowsHide: false });
    if (result.error) throw new Error('Could not start Spotify’s official installer: ' + result.error.message);
    if (result.status !== 0) throw new Error('Spotify’s installer exited with status ' + result.status + '.');
  } finally {
    try { fs.rmSync(installer, { force: true }); } catch { /* temporary installer cleanup */ }
  }
}

function markInstalled(releaseId) {
  const state = readState();
  writeState({
    ...state,
    releaseId: releaseId || state.releaseId,
    available: false,
    availableId: null,
    lastUpdatedAt: new Date().toISOString(),
  });
}

function status() {
  const state = readState();
  return {
    available: !!state.available,
    releaseId: state.availableId || null,
    currentVersion: state.currentVersion || null,
    latestVersion: state.latestVersion || null,
    lastModified: state.lastModified || null,
    lastCheckedAt: state.lastCheckedAt || null,
    lastUpdatedAt: state.lastUpdatedAt || null,
  };
}

module.exports = { check, install, markInstalled, status, installerMetadata, installedVersion, installerVersion, compareVersions };
