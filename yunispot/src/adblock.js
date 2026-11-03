'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const paths = require('./paths');
const spotify = require('./spotify');
const apply = require('./apply');
const u = require('./util');

function isSpotXInstalled(apps) {
  if (!apps) return false;
  const spotifyDir = path.dirname(apps);
  return fs.existsSync(path.join(apps, 'xpui.bak')) &&
    (fs.existsSync(path.join(spotifyDir, 'Spotify.dll.bak')) || fs.existsSync(path.join(spotifyDir, 'Spotify.bak')));
}

function isYuniSpotApplied(apps) {
  return !!apps && fs.existsSync(path.join(apps, 'xpui')) && fs.existsSync(path.join(apps, 'xpui.spa.yuni-bak'));
}

function requireWindows() {
  if (process.platform !== 'win32') throw new Error('The integrated SpotX commands are for Windows only.');
}

const SPOTX_REPOSITORY = 'SpotX-Official/SpotX';

function spotxScripts(root) {
  const run = path.join(root, 'run.ps1');
  const uninstall = path.join(root, 'Uninstall.bat');
  if (!fs.existsSync(run) || !fs.existsSync(uninstall) || !fs.existsSync(path.join(root, 'LICENSE'))) {
    throw new Error('The latest SpotX source from GitHub is missing required installer files.');
  }
  return { root, run, uninstall };
}

function withLatestSpotX(operation) {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'yunispot-spotx-'));
  try {
    const powershell = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
    const script = [
      "$ErrorActionPreference = 'Stop'",
      "$ProgressPreference = 'SilentlyContinue'",
      "$headers = @{ 'User-Agent' = 'YuniSpot' }",
      `$commit = (Invoke-RestMethod -UseBasicParsing -Headers $headers -Uri 'https://api.github.com/repos/${SPOTX_REPOSITORY}/commits/main').sha`,
      "if ($commit -notmatch '^[a-f0-9]{40}$') { throw 'SpotX returned an invalid upstream commit.' }",
      "$archive = Join-Path $env:YUNISPOT_SPOTX_TEMP 'source.zip'",
      "$unpacked = Join-Path $env:YUNISPOT_SPOTX_TEMP 'source'",
      `Invoke-WebRequest -UseBasicParsing -Headers $headers -Uri ('https://api.github.com/repos/${SPOTX_REPOSITORY}/zipball/' + $commit) -OutFile $archive`,
      "if ((Get-Item -LiteralPath $archive).Length -gt 100MB) { throw 'The SpotX source archive is unexpectedly large.' }",
      "Expand-Archive -LiteralPath $archive -DestinationPath $unpacked -Force",
      'Write-Output $commit',
    ].join('; ');
    const result = spawnSync(powershell, [
      '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script,
    ], {
      encoding: 'utf8',
      env: { ...process.env, YUNISPOT_SPOTX_TEMP: temp },
      windowsHide: true,
    });
    if (result.error) throw new Error('Could not download the latest SpotX source: ' + result.error.message);
    if (result.status !== 0) {
      throw new Error('Could not download the latest SpotX source from GitHub: ' + (result.stderr.trim() || `PowerShell exited with status ${result.status}.`));
    }

    const sourceDir = path.join(temp, 'source');
    const root = fs.readdirSync(sourceDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(sourceDir, entry.name))
      .find((dir) => ['run.ps1', 'Uninstall.bat', 'LICENSE'].every((name) => fs.existsSync(path.join(dir, name))));
    if (!root) throw new Error('The latest SpotX source archive is missing required installer files.');
    const commit = result.stdout.trim();
    if (!/^[a-f0-9]{40}$/i.test(commit)) throw new Error('SpotX source download did not report a valid upstream commit.');
    return operation({ ...spotxScripts(root), commit });
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

function spotifyLocation(cfg) {
  const s = paths.detect(cfg);
  if (!s) throw new Error('Could not find the supported Spotify desktop client.');
  if (spotify.isRunning()) throw new Error('Close Spotify before changing native patches.');
  return s;
}

function withYuniSpotRestored(cfg, operation) {
  const s = spotifyLocation(cfg);
  const wasApplied = isYuniSpotApplied(s.apps);
  if (wasApplied) apply.restore(cfg);
  let result, failure;
  try { result = operation(s); }
  catch (e) { failure = e; }
  if (wasApplied) {
    try { apply.apply(cfg); }
    catch (e) {
      const message = 'YuniSpot could not be reapplied after the SpotX operation: ' + e.message;
      failure = failure ? new Error(failure.message + '\n' + message) : new Error(message);
    }
  }
  if (failure) throw failure;
  return result;
}

function runProcess(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit' });
  if (result.error) throw new Error('Could not start SpotX: ' + result.error.message);
  if (result.status !== 0) throw new Error('SpotX exited with status ' + result.status + '.');
}

function spotxInstallArgs(source, s) {
  return [
    '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', source.run,
    '-SpotifyPath', path.dirname(s.apps),
    '-defender_exclusions_off', '-block_update_on', '-no_pause',
  ];
}

function uninstallSpotX(s, source) {
  const defaultApps = path.join(process.env.APPDATA || '', 'Spotify', 'Apps');
  if (path.resolve(s.apps).toLowerCase() !== path.resolve(defaultApps).toLowerCase()) {
    throw new Error('SpotX Uninstall.bat only supports the standard %APPDATA%\\Spotify install path.');
  }
  if (!isSpotXInstalled(s.apps)) throw new Error('SpotX backup files were not found; nothing to uninstall.');
  const command = process.env.ComSpec || 'cmd.exe';
  const batch = '"' + source.uninstall.replace(/"/g, '""') + '"';
  const result = spawnSync(command, ['/d', '/s', '/c', '"' + batch + '"'], { stdio: 'inherit' });
  if (result.error) throw new Error('Could not start SpotX uninstall: ' + result.error.message);
  if (result.status !== 0) throw new Error('SpotX uninstall exited with status ' + result.status + '.');
  if (isSpotXInstalled(s.apps)) throw new Error('SpotX backup files remain after uninstall; check the SpotX output.');
}

function install(cfg) {
  requireWindows();
  return withYuniSpotRestored(cfg, (s) => {
    return withLatestSpotX((source) => {
      const defaultApps = path.join(process.env.APPDATA || '', 'Spotify', 'Apps');
      if (isSpotXInstalled(s.apps) && path.resolve(s.apps).toLowerCase() === path.resolve(defaultApps).toLowerCase()) {
        uninstallSpotX(s, source);
      }
      const powershell = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
      runProcess(powershell, spotxInstallArgs(source, s));
      if (!isSpotXInstalled(s.apps)) throw new Error('SpotX finished without leaving its expected Spotify backup files.');
      u.ok('SpotX ad blocking is installed.');
      u.info('Installed SpotX from upstream commit ' + source.commit.slice(0, 7) + '.');
    });
  });
}

function uninstall(cfg) {
  requireWindows();
  return withYuniSpotRestored(cfg, (s) => {
    return withLatestSpotX((source) => {
      uninstallSpotX(s, source);
      u.ok('SpotX patches removed.');
      u.info('Used SpotX upstream commit ' + source.commit.slice(0, 7) + '.');
    });
  });
}

function status(cfg) {
  requireWindows();
  const s = paths.detect(cfg);
  if (!s) return { spotify: false, spotx: false, yuniSpot: false };
  return { spotify: true, spotx: isSpotXInstalled(s.apps), yuniSpot: isYuniSpotApplied(s.apps) };
}

module.exports = { install, uninstall, status, isSpotXInstalled, isYuniSpotApplied, spotxInstallArgs, SPOTX_REPOSITORY };