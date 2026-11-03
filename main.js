'use strict';
const { app, BrowserWindow, ipcMain, dialog, shell, Menu, Tray, globalShortcut, nativeImage, screen, safeStorage } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const { spawn, execFile } = require('child_process');
const { promisify } = require('util');
const execFileAsync = promisify(execFile);
const workspaceFiles = require('./workspace-files.cjs');
const { diagnoseWorkspace } = require('./workspace-diagnostics.cjs');
const { buildStudioCommandInput } = require('./studio-terminal.cjs');
const chokidar = require('chokidar');
const { autoUpdater } = require('electron-updater');

const isWin = process.platform === 'win32';
const isMac = process.platform === 'darwin';
const isLinux = process.platform === 'linux';
const APP_MODE = process.argv.includes('--dev') ? 'dev' : 'release';
const AUTH_SERVER_URL = (process.env.YUNIHUB_AUTH_URL || process.env.AUTH_SERVER_URL || 'https://yunihub-production-5c47.up.railway.app').replace(/\/$/, '');
const DEFAULT_DISCORD_APP_ID = '1511173773204652092';
let yuniSpotOperation = false;

const THEMES = {
  dark: { color: '#05070d', symbolColor: '#d9dcff' },
  rei: { color: '#e8f1fa', symbolColor: '#1b3550' },
  dehbify: { color: '#0a0712', symbolColor: '#ff63b6' },
  berrybaby: { color: '#f8eeeb', symbolColor: '#385440' },
  custom: { color: '#101114', symbolColor: '#ffffff' }
};
const validHexColor = (value) => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
function resolveTheme(theme, customBackground) {
  const base = THEMES[theme] || THEMES.dark;
  if (theme !== 'custom' || !validHexColor(customBackground)) return base;
  const channels = customBackground.slice(1).match(/.{2}/g).map((part) => parseInt(part, 16) / 255);
  const luminance = .2126 * channels[0] + .7152 * channels[1] + .0722 * channels[2];
  return { ...base, color: customBackground, symbolColor: luminance > .56 ? '#1b1719' : '#ffffff' };
}

function detectSystemProfile() {
  const timezoneCityMap = {
    'America/New_York': 'New York', 'America/Chicago': 'Chicago', 'America/Denver': 'Denver',
    'America/Los_Angeles': 'Los Angeles', 'America/Phoenix': 'Phoenix', 'America/Toronto': 'Toronto',
    'Europe/London': 'London', 'Europe/Paris': 'Paris', 'Europe/Berlin': 'Berlin', 'Europe/Madrid': 'Madrid',
    'Europe/Rome': 'Rome', 'Europe/Athens': 'Athens', 'Europe/Istanbul': 'Istanbul', 'Asia/Tokyo': 'Tokyo',
    'Asia/Singapore': 'Singapore', 'Asia/Dubai': 'Dubai', 'Asia/Kolkata': 'Mumbai', 'Asia/Seoul': 'Seoul',
    'Asia/Shanghai': 'Shanghai', 'Australia/Sydney': 'Sydney', 'Pacific/Auckland': 'Auckland'
  };

  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    const city = timezoneCityMap[tz] || 'New York';
    const name = (os.hostname && os.hostname()) || (os.userInfo && typeof os.userInfo === 'function' ? os.userInfo().username : '') || 'User';
    return { name, city };
  } catch {
    return { name: os.hostname() || 'User', city: 'New York' };
  }
}

const PNG_APP_ICON = path.join(__dirname, 'build', 'icon.png');
const SVG_APP_ICON = path.join(__dirname, 'build', 'yunihub-icon.svg');
const ETHERIUM_APP_ICON = path.join(__dirname, 'build', 'yunihub-icon-dehbify.svg');
const BERRY_BABY_APP_ICON = path.join(__dirname, 'build', 'yunihub-icon-berrybaby.svg');
const ICON = fs.existsSync(PNG_APP_ICON) ? PNG_APP_ICON : SVG_APP_ICON;
const themeIconPath = (theme) => theme === 'dehbify' ? ETHERIUM_APP_ICON : (theme === 'berrybaby' ? BERRY_BABY_APP_ICON : ICON);
const savedThemeIconPath = () => path.join(app.getPath('userData'), 'theme-icon.png');
const HOTKEY = 'CommandOrControl+Alt+H';

let win = null;
let tray = null;
let studioTerminal = null;
let orbCompleterProcess = null;
let nextStudioTerminalId = 0;
let quitting = false;
let prefs = { closeToTray: false, hotkey: false };
let updateState = { status: 'idle', version: '', percent: 0, message: 'Updates are checked when YuniHub starts.' };

autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

function setUpdateState(status, message, details = {}) {
  updateState = { ...updateState, ...details, status, message };
  if (win && !win.isDestroyed()) win.webContents.send('update:status', updateState);
}

function updateNativeIcon(theme, dataUrl = '') {
  let icon = null;
  if (typeof dataUrl === 'string' && dataUrl.length <= 250000 && /^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(dataUrl)) {
    const image = nativeImage.createFromDataURL(dataUrl);
    if (!image.isEmpty()) {
      icon = image;
      try {
        const iconPath = savedThemeIconPath();
        fs.mkdirSync(path.dirname(iconPath), { recursive: true });
        fs.writeFileSync(iconPath, image.toPNG());
      } catch { /* keep the live icon even if persisting it fails */ }
    }
  }
  if (!icon) {
    icon = nativeImage.createFromPath(themeIconPath(theme));
    if (icon.isEmpty()) icon = nativeImage.createFromPath(ICON);
  }
  if (win && !win.isDestroyed()) win.setIcon(icon);
  if (tray) tray.setImage(icon.resize({ width: 16, height: 16 }));
  if (app.dock) app.dock.setIcon(icon);
}

autoUpdater.on('checking-for-update', () => setUpdateState('checking', 'Checking GitHub Releases for an update...'));
autoUpdater.on('update-available', (release) => setUpdateState('available', `YuniHub ${release.version} is available.`, { version: release.version, percent: 0 }));
autoUpdater.on('update-not-available', (release) => setUpdateState('current', 'YuniHub is up to date.', { version: release.version || app.getVersion(), percent: 0 }));
autoUpdater.on('download-progress', (progress) => setUpdateState('downloading', `Downloading update: ${Math.round(progress.percent)}%`, { percent: progress.percent }));
autoUpdater.on('update-downloaded', (release) => setUpdateState('downloaded', `YuniHub ${release.version} is ready to install.`, { version: release.version, percent: 100 }));
autoUpdater.on('error', (error) => setUpdateState('error', error && error.message ? error.message : 'The update check failed.'));

const dataFile = () => path.join(app.getPath('userData'), 'hub.json');
const backupDir = () => path.join(app.getPath('userData'), 'backups');
const boundsFile = () => path.join(app.getPath('userData'), 'window.json');

/* ---------- storage ---------- */

function loadData() {
  try {
    const raw = fs.readFileSync(dataFile(), 'utf8');
    const data = JSON.parse(raw);
    return data && typeof data === 'object' ? data : null;
  } catch {
    return null;
  }
}

// Keeps one copy of the previous data per day, for the last 7 days.
function dailyBackup() {
  try {
    const file = dataFile();
    if (!fs.existsSync(file)) return;
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const dir = backupDir();
    const target = path.join(dir, `hub-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.json`);
    if (fs.existsSync(target)) return;
    fs.mkdirSync(dir, { recursive: true });
    fs.copyFileSync(file, target);
    const all = fs.readdirSync(dir).filter((n) => /^hub-\d{4}-\d{2}-\d{2}\.json$/.test(n)).sort();
    while (all.length > 7) fs.unlinkSync(path.join(dir, all.shift()));
  } catch { /* backups are best effort */ }
}

function saveData(data) {
  if (!data || typeof data !== 'object' || !Array.isArray(data.projects)) return false;
  const json = JSON.stringify(data, null, 2);
  if (json.length > 5 * 1024 * 1024) return false;
  const file = dataFile();
  const tmp = file + '.tmp';
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    dailyBackup();
    fs.writeFileSync(tmp, json, 'utf8');
    fs.renameSync(tmp, file); // atomic replace, so a crash never leaves half a file
    return true;
  } catch {
    return false;
  }
}

/* ---------- launching ---------- */

const str = (v, max = 2000) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const isDir = (p) => {
  try { return fs.statSync(p).isDirectory(); } catch { return false; }
};

function yuniSpotPaths() {
  const root = app.isPackaged
    ? path.join(process.resourcesPath, 'yunispot')
    : path.resolve(__dirname, '..', 'yunispot');
  const node = app.isPackaged
    ? path.join(root, 'node.exe')
    : process.env.npm_node_execpath || process.env.NODE_EXECUTABLE || '';
  return { root, node, cli: path.join(root, 'bin', 'yunispot.js') };
}

function getYuniSpotStatus() {
  const paths = yuniSpotPaths();
  if (!paths.node || !fs.existsSync(paths.node) || !fs.existsSync(paths.cli)) {
    return { available: false, spotify: false, yuniSpot: false, error: 'Bundled YuniSpot is unavailable in this build.' };
  }
  try {
    const config = require(path.join(paths.root, 'src', 'config'));
    const adblock = require(path.join(paths.root, 'src', 'adblock'));
    return { available: true, ...adblock.status(config.load()) };
  } catch (error) {
    return { available: false, spotify: false, yuniSpot: false, error: error.message || 'Could not check YuniSpot status.' };
  }
}

function manageYuniSpot(action) {
  if (!['apply', 'restore'].includes(action)) return Promise.resolve({ ok: false, error: 'Unknown YuniSpot action.' });
  if (yuniSpotOperation) return Promise.resolve({ ok: false, error: 'A YuniSpot operation is already running.' });
  const status = getYuniSpotStatus();
  if (!status.available) return Promise.resolve({ ok: false, error: status.error });
  yuniSpotOperation = true;
  const { root, node, cli } = yuniSpotPaths();
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let child;
    try {
      child = spawn(node, [cli, action], { cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (error) {
      yuniSpotOperation = false;
      resolve({ ok: false, error: error.message || 'Could not start YuniSpot.' });
      return;
    }
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (data) => { if (stdout.length < 100000) stdout += data; });
    child.stderr.on('data', (data) => { if (stderr.length < 100000) stderr += data; });
    child.once('error', (error) => {
      yuniSpotOperation = false;
      resolve({ ok: false, error: 'Could not start YuniSpot: ' + error.message });
    });
    child.once('close', (code) => {
      yuniSpotOperation = false;
      if (code !== 0) {
        resolve({ ok: false, error: (stderr.trim() || stdout.trim() || `YuniSpot exited with status ${code}.`) });
        return;
      }
      resolve({ ok: true, output: stdout.trim() });
    });
  });
}

function watchSpawn(child, okAfterMs = 400) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (r) => { if (!done) { done = true; resolve(r); } };
    child.once('error', (e) => finish({ ok: false, error: e.message }));
    child.once('exit', (code) => {
      if (code && code !== 0) finish({ ok: false, error: `The command exited with code ${code}.` });
    });
    setTimeout(() => finish({ ok: true }), okAfterMs);
  });
}

async function launchProject({ mode, target, cwd }) {
  target = str(target, 1000);
  cwd = str(cwd, 1000);
  if (!target) return { ok: false, error: 'No launch target yet. Add one in the project details.' };
  if (cwd && !isDir(cwd)) return { ok: false, error: 'The project folder could not be found.' };

  if (mode === 'app') {
    if (target === 'spotify:') {
      try {
        await shell.openExternal(target);
        return { ok: true };
      } catch (e) {
        return { ok: false, error: `Could not open Spotify: ${e.message}` };
      }
    }
    if (!fs.existsSync(target)) return { ok: false, error: `Cannot find ${target}` };
    const err = await shell.openPath(target);
    return err ? { ok: false, error: err } : { ok: true };
  }

  if (mode !== 'command') return { ok: false, error: 'Unknown launch mode.' };

  try {
    let child;
    if (isWin) {
      // Opens a new terminal window that stays open, running the command in the project folder.
      const escaped = target.replace(/([&|<>^])/g, '^$1');
      child = spawn('cmd.exe', ['/d', '/c', 'start', '"YuniHub"', 'cmd.exe', '/k', escaped], {
        cwd: cwd || undefined, detached: true, stdio: 'ignore', windowsVerbatimArguments: true
      });
    } else if (isMac) {
      const full = (cwd ? `cd '${cwd.replace(/'/g, "'\\''")}'; ` : '') + target;
      child = spawn('osascript', ['-e', `tell application "Terminal" to do script ${JSON.stringify(full)}`, '-e', 'tell application "Terminal" to activate'], {
        detached: true, stdio: 'ignore'
      });
    } else {
      child = spawn('x-terminal-emulator', ['-e', 'bash', '-lc', `${target}; exec bash`], {
        cwd: cwd || undefined, detached: true, stdio: 'ignore'
      });
    }
    child.unref();
    return await watchSpawn(child);
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function detectStudioToolchains() {
  const probes = [
    ['Git', 'git', ['--version']], ['Node.js', 'node', ['--version']], ['npm', 'npm', ['--version']],
    ['Python', 'python', ['--version']], ['.NET SDK', 'dotnet', ['--version']], ['Java', 'java', ['-version']],
    ['Go', 'go', ['version']], ['Rust', 'rustc', ['--version']], ['CMake', 'cmake', ['--version']],
    ['C compiler', 'clang', ['--version']], ['C compiler', 'gcc', ['--version']], ['C++ compiler', 'g++', ['--version']],
    ['MSVC compiler', 'cl', []], ['PHP', 'php', ['--version']], ['Ruby', 'ruby', ['--version']],
    ['Perl', 'perl', ['--version']], ['Lua', 'lua', ['-v']], ['Swift', 'swift', ['--version']],
    ['Dart', 'dart', ['--version']], ['Flutter', 'flutter', ['--version']], ['Deno', 'deno', ['--version']],
    ['Bun', 'bun', ['--version']], ['Gradle', 'gradle', ['--version']], ['Maven', 'mvn', ['--version']],
    ['Android Debug Bridge', 'adb', ['version']]
  ];
  const tools = (await Promise.all(probes.map(async ([name, command, args]) => {
    try {
      const { stdout, stderr } = await execFileAsync(command, args, { encoding: 'utf8', timeout: 2500, windowsHide: true });
      const output = stdout || stderr || '';
      return { name, version: str(output.split(/\r?\n/).find(Boolean), 120) || 'Installed' };
    } catch {
      return null;
    }
  }))).filter(Boolean);

  const codeExecutable = findCodeExecutable();
  if (codeExecutable) {
    try {
      const options = { encoding: 'utf8', timeout: 2500, windowsHide: true };
      const { stdout, stderr } = isWin && codeExecutable === 'code'
        ? await execFileAsync('cmd.exe', ['/d', '/s', '/c', 'code --version'], options)
        : await execFileAsync(codeExecutable, ['--version'], options);
      const output = stdout || stderr || '';
      tools.push({ name: 'VS Code', version: str(output.split(/\r?\n/).find(Boolean), 120) || 'Installed' });
    } catch { /* VS Code did not respond to its version command. */ }
  }

  let visualStudio = null;
  if (isWin) {
    const installer = path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'Microsoft Visual Studio', 'Installer', 'vswhere.exe');
    try {
      const options = { encoding: 'utf8', timeout: 3000, windowsHide: true };
      const { stdout } = await execFileAsync(installer, ['-latest', '-products', '*', '-version', '[17.0,18.0)', '-property', 'installationPath'], options);
      const installPath = stdout.trim();
      const { stdout: version } = await execFileAsync(installer, ['-latest', '-products', '*', '-version', '[17.0,18.0)', '-property', 'installationVersion'], options);
      const executable = path.join(installPath, 'Common7', 'IDE', 'devenv.exe');
      if (installPath && fs.existsSync(executable)) visualStudio = { name: 'Visual Studio 2022', version: version.trim(), path: executable };
    } catch { /* Visual Studio Installer may not be installed. */ }
  }
  return { tools, visualStudio };
}

function runStudioCommand({ command, cwd }) {
  command = str(command, 2000);
  cwd = str(cwd, 1000);
  if (!command) return Promise.resolve({ ok: false, error: 'Enter a command first.' });
  if (!cwd || !isDir(cwd)) return Promise.resolve({ ok: false, error: 'Choose an existing project folder first.' });

  const executable = isWin ? 'powershell.exe' : (isMac ? '/bin/zsh' : '/bin/bash');
  const args = isWin ? ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', command] : ['-lc', command];
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let settled = false;
    let timer;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ ...result, stdout: stdout.slice(-48000), stderr: stderr.slice(-48000), output: `${stdout}${stderr ? `\n${stderr}` : ''}`.slice(-48000) });
    };
    let child;
    try {
      child = spawn(executable, args, { cwd, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (error) {
      finish({ ok: false, error: error.message });
      return;
    }
    child.stdout.on('data', (chunk) => { stdout = (stdout + chunk.toString()).slice(-48000); });
    child.stderr.on('data', (chunk) => { stderr = (stderr + chunk.toString()).slice(-48000); });
    child.once('error', (error) => finish({ ok: false, error: error.message }));
    child.once('close', (code) => finish(code === 0 ? { ok: true } : { ok: false, error: `Command exited with code ${code}.` }));
    timer = setTimeout(() => {
      child.kill();
      finish({ ok: false, error: 'Command timed out after 60 seconds.' });
    }, 60000);
  });
}

function stopStudioTerminal(sessionId, reason = 'Terminal stopped.') {
  const session = studioTerminal;
  if (!session || (sessionId && session.id !== sessionId)) return { ok: true };
  studioTerminal = null;
  if (isWin) {
    try {
      const killer = spawn('taskkill.exe', ['/PID', String(session.child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
      killer.unref();
    } catch { /* terminate the shell itself below */ }
    session.child.kill();
  } else {
    try { process.kill(-session.child.pid, 'SIGTERM'); }
    catch { session.child.kill('SIGTERM'); }
  }
  if (win && !win.isDestroyed()) win.webContents.send('studio:terminal:data', { sessionId: session.id, type: 'stopped', text: reason });
  return { ok: true };
}

function startStudioTerminal(folder) {
  folder = str(folder, 1000);
  if (!folder || !isDir(folder)) return { ok: false, error: 'Choose an existing project folder first.' };
  if (studioTerminal && studioTerminal.cwd === folder && !studioTerminal.child.killed) return { ok: true, sessionId: studioTerminal.id };
  if (studioTerminal) stopStudioTerminal(studioTerminal.id, 'Previous terminal stopped.');

  const id = `terminal-${Date.now()}-${++nextStudioTerminalId}`;
  const executable = isWin ? 'powershell.exe' : (isMac ? '/bin/zsh' : '/bin/bash');
  const args = isWin
    ? ['-NoLogo', '-NoProfile', '-NoExit', '-Command', '$OutputEncoding = [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()']
    : (isMac ? ['-l'] : ['--noprofile', '--norc', '-i']);
  try {
    const child = spawn(executable, args, { cwd: folder, detached: !isWin, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    const session = { id, child, cwd: folder, owner: win && win.webContents };
    studioTerminal = session;
    const emit = (type, data) => {
      if (studioTerminal === session && win && !win.isDestroyed() && session.owner === win.webContents) {
        win.webContents.send('studio:terminal:data', { sessionId: id, type, text: data.toString() });
      }
    };
    child.stdout.on('data', (data) => emit('stdout', data));
    child.stderr.on('data', (data) => emit('stderr', data));
    child.once('error', (error) => emit('error', error.message));
    child.once('close', (code) => {
      emit('exit', `Shell exited${code == null ? '' : ` with code ${code}`}.`);
      if (studioTerminal === session) studioTerminal = null;
    });
    return { ok: true, sessionId: id };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

function writeStudioTerminal({ sessionId, command, marker }) {
  const session = studioTerminal;
  command = str(command, 10000);
  marker = str(marker, 80);
  if (!session || session.id !== sessionId) return { ok: false, error: 'The terminal session is not running.' };
  if (!command) return { ok: false, error: 'Enter a command first.' };
  try {
    const input = buildStudioCommandInput(command, marker, process.platform);
    session.child.stdin.write(input);
    return { ok: true, marker };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

function writeStudioTerminalInput({ sessionId, text }) {
  const session = studioTerminal;
  text = str(text, 5000);
  if (!session || session.id !== sessionId) return { ok: false, error: 'The terminal session is not running.' };
  if (!text) return { ok: false, error: 'Enter debugger input first.' };
  try {
    session.child.stdin.write(text + (isWin ? '\r\n' : '\n'));
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

async function listStudioPorts() {
  try {
    let output = '';
    const ports = [];
    if (isWin) {
      ({ stdout: output } = await execFileAsync('netstat.exe', ['-ano', '-p', 'tcp'], { encoding: 'utf8', timeout: 5000, windowsHide: true }));
      for (const line of output.split(/\r?\n/)) {
        const match = line.match(/^\s*TCP\s+(.+):(\d+)\s+\S+\s+LISTENING\s+(\d+)/i);
        if (match) ports.push({ address: match[1], port: Number(match[2]), process: match[3] });
      }
    } else if (isMac) {
      ({ stdout: output } = await execFileAsync('lsof', ['-nP', '-iTCP', '-sTCP:LISTEN'], { encoding: 'utf8', timeout: 5000 }));
      for (const line of output.split(/\r?\n/).slice(1)) {
        const match = line.match(/^(\S+)\s+(\d+).*?\sTCP\s+(.+):(\d+)\s+\(LISTEN\)/);
        if (match) ports.push({ address: match[3], port: Number(match[4]), process: `${match[1]} (${match[2]})` });
      }
    } else {
      ({ stdout: output } = await execFileAsync('ss', ['-ltnp'], { encoding: 'utf8', timeout: 5000 }));
      for (const line of output.split(/\r?\n/).slice(1)) {
        const match = line.match(/\s(\S+):(\d+)\s+\S+:\S+.*?pid=(\d+)/);
        if (match) ports.push({ address: match[1], port: Number(match[2]), process: match[3] });
      }
    }
    const unique = Array.from(new Map(ports.map((port) => [`${port.address}:${port.port}:${port.process}`, port])).values());
    return { ok: true, ports: unique.sort((a, b) => a.port - b.port) };
  } catch (error) {
    return { ok: false, error: error.message || 'Could not inspect listening ports.' };
  }
}

function findCodeExecutable() {
  if (!isWin) return 'code';
  const candidates = [
    path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Microsoft VS Code', 'Code.exe'),
    path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Microsoft VS Code', 'Code.exe'),
    path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'Microsoft VS Code', 'Code.exe')
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) || 'code';
}

function sendDiscordAuthResult(payload) {
  if (win && win.webContents) win.webContents.send('discord:auth-result', payload);
}

function parseDiscordProtocolUrl(rawUrl) {
  try {
    const url = new URL(String(rawUrl || ''));
    if (url.protocol !== 'yunihub:' || url.hostname !== 'discord-auth') return null;
    return {
      ticket: url.searchParams.get('ticket') || '',
      error: url.searchParams.get('error') || ''
    };
  } catch {
    return null;
  }
}

async function exchangeDiscordTicket(ticket) {
  ticket = str(ticket, 200);
  if (!ticket) return { ok: false, error: 'No sign-in ticket was returned by Discord.' };
  try {
    const res = await fetch(`${AUTH_SERVER_URL}/auth/discord/exchange`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ticket })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data || !data.user) {
      const msg = data && data.error ? data.error : 'Discord sign-in could not be completed.';
      return { ok: false, error: msg };
    }
    return { ok: true, user: data.user, sessionToken: data.sessionToken || '' };
  } catch (e) {
    return { ok: false, error: e && e.message ? e.message : 'Discord sign-in failed.' };
  }
}

async function handleDiscordProtocol(rawUrl) {
  const parsed = parseDiscordProtocolUrl(rawUrl);
  if (!parsed) return;
  if (parsed.error) {
    const message = parsed.error === 'discord_consent_denied' ? 'Discord sign-in was cancelled.' : 'Discord sign-in failed.';
    sendDiscordAuthResult({ ok: false, error: message });
    return;
  }
  const result = await exchangeDiscordTicket(parsed.ticket);
  if (result && result.ok && result.sessionToken) {
    const payload = { ok: true, user: result.user, sessionToken: result.sessionToken };
    sendDiscordAuthResult(payload);
    return;
  }
  sendDiscordAuthResult(result);
}

async function refreshDiscordSession(sessionToken) {
  sessionToken = str(sessionToken, 200);
  if (!sessionToken) return { ok: false, error: 'No active Discord session was found.' };
  try {
    const res = await fetch(`${AUTH_SERVER_URL}/auth/discord/session`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sessionToken })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data || !data.user) {
      const msg = data && data.error ? data.error : 'Discord session expired.';
      return { ok: false, error: msg };
    }
    return { ok: true, user: data.user };
  } catch (e) {
    return { ok: false, error: e && e.message ? e.message : 'Discord session refresh failed.' };
  }
}

/* ---------- IPC ---------- */

function launchOrbCompleter() {
  if (!isWin) return { ok: false, error: 'Orb Completer is currently available on Windows only.' };
  const executable = app.isPackaged
    ? path.join(process.resourcesPath, 'orb-completer', 'Discord Quest Completer.exe')
    : path.join(__dirname, 'orb-completer', 'Discord Quest Completer.exe');
  if (!fs.existsSync(executable)) return { ok: false, error: 'The Orb Completer companion is missing from this YuniHub install.' };
  if (orbCompleterProcess && orbCompleterProcess.exitCode === null && !orbCompleterProcess.killed) {
    return { ok: true, alreadyRunning: true };
  }

  return new Promise((resolve) => {
    let child;
    let settled = false;
    try {
      child = spawn(executable, [], { detached: true, stdio: 'ignore', windowsHide: false });
    } catch (error) {
      resolve({ ok: false, error: error.message });
      return;
    }
    orbCompleterProcess = child;
    child.once('error', (error) => {
      if (orbCompleterProcess === child) orbCompleterProcess = null;
      if (!settled) { settled = true; resolve({ ok: false, error: error.message }); }
    });
    child.once('spawn', () => {
      child.once('exit', () => { if (orbCompleterProcess === child) orbCompleterProcess = null; });
      child.unref();
      settled = true;
      resolve({ ok: true });
    });
  });
}

// Only our own window may talk to the main process.
function handle(channel, fn) {
  ipcMain.handle(channel, (event, ...args) => {
    if (!win || event.sender !== win.webContents) throw new Error('Blocked sender');
    return fn(...args);
  });
}

/* ---------- tools: weather, Discord presence (local IPC), browser beacons ---------- */
const net = require('net');
const http = require('http');
const BEACON_PORT = 47321;
let rpc = { sock: null, user: null, startedAt: 0 };
let beacons = { youtube: false, twitch: false };
let beaconServer = null;

const USERSCRIPT = `// ==UserScript==
// @name         Yuniku Broswer RPC
// @match        https://www.youtube.com/*
// @match        https://www.twitch.tv/*
// @grant        GM_xmlhttpRequest
// @connect      127.0.0.1
// ==/UserScript==
(function () {
  const site = location.hostname.includes('twitch') ? 'twitch' : 'youtube';
  const text = (sel) => ((document.querySelector(sel) || {}).textContent || '').trim();
  setInterval(() => {
    if (document.hidden) return;
    const title = site === 'twitch' ? document.title.replace(/ - Twitch$/, '') : (text('h1.ytd-watch-metadata') || document.title.replace(/ - YouTube$/, ''));
    const channel = text(site === 'twitch' ? 'h1' : 'ytd-channel-name a');
    GM_xmlhttpRequest({ method: 'POST', url: 'http://127.0.0.1:${BEACON_PORT}/beacon', data: JSON.stringify({ site, title, channel }) });
  }, 15000);
})();
`;

const rpcFrame = (op, data) => {
  const j = Buffer.from(JSON.stringify(data));
  const h = Buffer.alloc(8);
  h.writeInt32LE(op, 0); h.writeInt32LE(j.length, 4);
  return Buffer.concat([h, j]);
};

function rpcDisconnect() {
  if (rpc.sock) { try { rpc.sock.destroy(); } catch { /* ignore */ } }
  rpc = { sock: null, user: null, startedAt: 0 };
}

function rpcConnect(clientId) {
  rpcDisconnect();
  return new Promise((resolve) => {
    const normalizedClientId = str(clientId, 30) || (APP_MODE === 'dev'
      ? (process.env.YUNIHUB_DISCORD_APP_ID_DEV || process.env.DISCORD_APP_ID_DEV || process.env.DISCORD_APP_ID || DEFAULT_DISCORD_APP_ID)
      : (process.env.YUNIHUB_DISCORD_APP_ID || process.env.DISCORD_APP_ID || DEFAULT_DISCORD_APP_ID));

    if (!/^\d{15,25}$/.test(normalizedClientId)) return resolve({ ok: false, error: 'Discord presence is not configured for this build.' });

    let i = 0, done = false, buf = Buffer.alloc(0);
    const finish = (r) => { if (!done) { done = true; resolve(r); } };
    const pipe = (n) => (isWin ? `\\\\?\\pipe\\discord-ipc-${n}` : path.join(process.env.XDG_RUNTIME_DIR || process.env.TMPDIR || '/tmp', `discord-ipc-${n}`));
    const attempt = () => {
      if (i > 9) return finish({ ok: false, error: 'Discord is not running.' });
      const s = net.createConnection(pipe(i++));
      s.once('error', attempt);
      s.once('connect', () => {
        s.removeListener('error', attempt);
        rpc.sock = s;
        s.write(rpcFrame(0, { v: 1, client_id: normalizedClientId }));
        s.on('error', () => finish({ ok: false, error: 'Discord connection failed.' }));
        s.on('data', (d) => {
          buf = Buffer.concat([buf, d]);
          while (buf.length >= 8) {
            const len = buf.readInt32LE(4);
            if (buf.length < 8 + len) break;
            let msg = {};
            try { msg = JSON.parse(buf.subarray(8, 8 + len).toString('utf8')); } catch { /* ignore */ }
            buf = buf.subarray(8 + len);
            if (msg.evt === 'READY' && msg.data) {
              rpc.user = msg.data.user;
              rpc.startedAt = Math.floor(Date.now() / 1000);
              setActivity(buildActivity({ details: 'Exploring YuniHub', state: 'Building something new' }));
              finish({ ok: true, user: rpc.user });
            }
          }
        });
        s.on('close', () => { if (rpc.sock === s) rpc = { sock: null, user: null }; finish({ ok: false, error: 'Discord closed the connection.' }); });
        setTimeout(() => finish({ ok: false, error: 'Discord did not respond.' }), 4000);
      });
    };
    attempt();
  });
}

const ASSET_KEY = /^[a-z0-9_]{1,32}$/;
function buildActivity(input) {
  const x = input || {};
  const activity = { timestamps: { start: rpc.startedAt || (rpc.startedAt = Math.floor(Date.now() / 1000)) } };
  const details = str(x.details, 128), state = str(x.state, 128);
  if (details.length >= 2) activity.details = details;
  if (state.length >= 2) activity.state = state;
  const assets = {
    large_image: ASSET_KEY.test(x.largeImage || '') ? x.largeImage : 'yunihub',
    large_text: str(x.largeText, 128) || 'YuniHub by S.M.T Modding Team'
  };
  if (ASSET_KEY.test(x.smallImage || '')) {
    assets.small_image = x.smallImage;
    const smallText = str(x.smallText, 128);
    if (smallText.length >= 2) assets.small_text = smallText;
  }
  activity.assets = assets;
  return activity;
}
function setActivity(activity) {
  if (!rpc.sock) return false;
  try {
    rpc.sock.write(rpcFrame(1, { cmd: 'SET_ACTIVITY', args: { pid: process.pid, activity }, nonce: String(Date.now()) }));
    return true;
  } catch {
    return false;
  }
}
function startBeacons() {
  if (beaconServer) return;
  beaconServer = http.createServer((req, res) => {
    if (req.method !== 'POST' || req.url !== '/beacon') { res.writeHead(404); res.end(); return; }
    let body = '';
    req.on('data', (c) => { body += c; if (body.length > 4096) req.destroy(); });
    req.on('end', () => {
      res.writeHead(204); res.end();
      try {
        const b = JSON.parse(body);
        const site = b.site === 'twitch' ? 'twitch' : 'youtube';
        if (!beacons[site]) return;
        setActivity({
          details: str(b.title, 120) || 'Watching',
          state: str(b.channel, 80) || (site === 'twitch' ? 'Twitch' : 'YouTube'),
          timestamps: { start: Math.floor(Date.now() / 1000) }
        });
      } catch { /* ignore bad payloads */ }
    });
  });
  beaconServer.on('error', () => { beaconServer = null; });
  beaconServer.listen(BEACON_PORT, '127.0.0.1');
}

async function getWeather(city) {
  city = str(city, 80);
  if (!city) {
    const detected = detectSystemProfile();
    city = detected.city;
  }
  if (!city) return { ok: false, error: 'Weather location not detected' };
  try {
    const g = await (await fetch('https://geocoding-api.open-meteo.com/v1/search?count=1&name=' + encodeURIComponent(city))).json();
    const p = g.results && g.results[0];
    if (!p) return { ok: false, error: 'City not found' };
    const w = await (await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${p.latitude}&longitude=${p.longitude}&current=temperature_2m,weather_code&temperature_unit=fahrenheit`)).json();
    const c = w.current.weather_code;
    const label = c === 0 ? 'Clear' : c < 4 ? 'Cloudy' : c < 50 ? 'Fog' : c < 70 ? 'Rain' : c < 80 ? 'Snow' : c < 90 ? 'Showers' : 'Storm';
    return { ok: true, text: `${Math.round(w.current.temperature_2m)}\u00b0F \u00b7 ${label}` };
  } catch {
    return { ok: false, error: 'Weather unavailable' };
  }
}

const SCRIPT_EXTENSIONS = /\.(lua|luau|txt)$/i;
const BUILTIN_SCRIPTS_DIR = path.join(__dirname, 'yuniku-scripts');
const SCRIPT_CATALOG_FILE = path.join(BUILTIN_SCRIPTS_DIR, 'catalog.json');
const SCRIPT_BUNDLE_STATE_FILE = () => path.join(app.getPath('userData'), 'script-bundle-state.json');
const MANAGED_SCRIPTS_FILE = () => path.join(app.getPath('userData'), 'managed-scripts.json');
let scriptWatcher = null;
let scriptChangeTimer = null;

function stringList(value, limit = 20) {
  return (Array.isArray(value) ? value : []).map((item) => str(item, 50)).filter(Boolean).slice(0, limit);
}

function readScriptCatalog() {
  try {
    const stat = fs.statSync(SCRIPT_CATALOG_FILE);
    if (!stat.isFile() || stat.size > 1024 * 1024) throw new Error('Invalid catalog size.');
    const catalog = JSON.parse(fs.readFileSync(SCRIPT_CATALOG_FILE, 'utf8'));
    return {
      version: str(catalog.version, 40) || '0.0.0',
      changes: stringList(catalog.changes, 30),
      scripts: Array.isArray(catalog.scripts) ? catalog.scripts.slice(0, 500) : []
    };
  } catch {
    return { version: '0.0.0', changes: [], scripts: [] };
  }
}

function normalizeScriptMetadata(metadata, name) {
  const value = metadata && typeof metadata === 'object' ? metadata : {};
  return {
    title: str(value.title, 100) || name,
    description: str(value.description, 1000),
    version: str(value.version, 40) || 'Unversioned',
    author: str(value.author, 100) || 'Unknown',
    games: stringList(value.games),
    supportedExecutors: stringList(value.supportedExecutors),
    tags: stringList(value.tags)
  };
}

function readUserScriptMetadata(directory, name) {
  const sidecar = path.join(directory, `${name}.json`);
  try {
    if (!fs.lstatSync(sidecar).isFile() || fs.statSync(sidecar).size > 32 * 1024) return {};
    return JSON.parse(fs.readFileSync(sidecar, 'utf8'));
  } catch {
    return {};
  }
}

function supportsExecutorAutoload(filePath) {
  if (!/\.(lua|luau)$/i.test(filePath)) return false;
  let fd;
  try {
    fd = fs.openSync(filePath, 'r');
    const header = Buffer.alloc(16 * 1024);
    const bytesRead = fs.readSync(fd, header, 0, header.length, 0);
    return header.subarray(0, bytesRead).toString('utf8').split(/\r?\n/, 25)
      .some((line) => /^\s*--\s*YUNIHUB_AUTOLOAD_SUPPORTED:\s*true\s*$/i.test(line));
  } catch {
    return false;
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
}

function listScriptDirectory(directory, source, catalog = { scripts: [] }) {
  if (!isDir(directory)) return [];
  try {
    const bundledMetadata = new Map(catalog.scripts
      .filter((item) => item && typeof item.file === 'string')
      .map((item) => [item.file, item]));
    return fs.readdirSync(directory, { withFileTypes: true })
      .filter((entry) => entry.isFile() && SCRIPT_EXTENSIONS.test(entry.name) && (source !== 'builtin' || bundledMetadata.has(entry.name)))
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 100)
      .map((entry) => {
        const filePath = path.join(directory, entry.name);
        const metadata = source === 'builtin' ? bundledMetadata.get(entry.name) : readUserScriptMetadata(directory, entry.name);
        return {
          source,
          name: entry.name,
          ...normalizeScriptMetadata(metadata, entry.name),
          supportsAutoload: supportsExecutorAutoload(filePath)
        };
      });
  } catch {
    return [];
  }
}

function listScripts(userFolder) {
  userFolder = str(userFolder, 1000);
  const catalog = readScriptCatalog();
  const scripts = listScriptDirectory(BUILTIN_SCRIPTS_DIR, 'builtin', catalog);
  const userFolderValid = !userFolder || isDir(userFolder);
  if (userFolderValid && userFolder) scripts.push(...listScriptDirectory(userFolder, 'user'));
  scripts.sort((a, b) => (a.source === b.source ? a.name.localeCompare(b.name) : a.source === 'builtin' ? -1 : 1));
  let seenVersion = '';
  try { seenVersion = str(JSON.parse(fs.readFileSync(SCRIPT_BUNDLE_STATE_FILE(), 'utf8')).version, 40); } catch { /* first launch */ }
  return {
    ok: true,
    scripts,
    userFolderValid,
    bundle: { version: catalog.version, changes: catalog.changes, updateAvailable: catalog.version !== '0.0.0' && seenVersion !== catalog.version }
  };
}

function resolveScript(selection, userFolder) {
  if (!selection || !['builtin', 'user'].includes(selection.source)) return null;
  const name = str(selection.name, 255);
  if (!name || name !== path.basename(name) || !SCRIPT_EXTENSIONS.test(name)) return null;
  const directory = selection.source === 'builtin' ? BUILTIN_SCRIPTS_DIR : str(userFolder, 1000);
  if (!directory || !isDir(directory)) return null;
  const filePath = path.join(directory, name);
  try {
    if (!fs.lstatSync(filePath).isFile()) return null;
    const catalog = selection.source === 'builtin' ? readScriptCatalog() : null;
    const metadata = selection.source === 'builtin'
      ? catalog.scripts.find((item) => item && item.file === name)
      : readUserScriptMetadata(directory, name);
    if (selection.source === 'builtin' && !metadata) return null;
    return { filePath, source: selection.source, name, metadata: normalizeScriptMetadata(metadata, name), supportsAutoload: supportsExecutorAutoload(filePath) };
  } catch {
    return null;
  }
}

function readManagedScripts() {
  try {
    const parsed = JSON.parse(fs.readFileSync(MANAGED_SCRIPTS_FILE(), 'utf8'));
    return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item === 'object') : [];
  } catch {
    return [];
  }
}

function writeManagedScripts(items) {
  const file = MANAGED_SCRIPTS_FILE();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(items, null, 2), 'utf8');
}

function listManagedScripts() {
  const items = readManagedScripts().filter((item) => {
    const name = str(item.name, 255);
    const destination = str(item.destination, 1000);
    return name && name === path.basename(name) && SCRIPT_EXTENSIONS.test(name) && isDir(destination) && fs.existsSync(path.join(destination, name));
  });
  return { ok: true, scripts: items };
}

function removeManagedScript(destination, name) {
  destination = str(destination, 1000);
  name = str(name, 255);
  if (!destination || !name || name !== path.basename(name)) return { ok: false, error: 'Invalid managed script.' };
  const items = readManagedScripts();
  const match = items.find((item) => item.destination === destination && item.name === name);
  if (!match) return { ok: false, error: 'YuniHub can only remove scripts it previously installed.' };
  const file = path.join(destination, name);
  try {
    if (fs.lstatSync(file).isFile()) fs.unlinkSync(file);
    writeManagedScripts(items.filter((item) => item !== match));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

function readScriptSource(selection, userFolder) {
  const script = resolveScript(selection, userFolder);
  if (!script) return { ok: false, error: 'That script is no longer available.' };
  try {
    const stat = fs.statSync(script.filePath);
    if (stat.size > 256 * 1024) return { ok: false, error: 'Script previews are limited to 256 KB.' };
    return { ok: true, script: { ...script.metadata, source: script.source, name: script.name, supportsAutoload: script.supportsAutoload }, text: fs.readFileSync(script.filePath, 'utf8') };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

function acknowledgeScriptBundle(version) {
  const catalog = readScriptCatalog();
  if (str(version, 40) !== catalog.version) return { ok: false, error: 'The script bundle changed. Refresh the library and try again.' };
  try {
    fs.mkdirSync(path.dirname(SCRIPT_BUNDLE_STATE_FILE()), { recursive: true });
    fs.writeFileSync(SCRIPT_BUNDLE_STATE_FILE(), JSON.stringify({ version }, null, 2), 'utf8');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

function copySelectedScripts(selection, userFolder, autoexecFolder, executorPath, action, replaceExisting) {
  if (!Array.isArray(selection) || !selection.length || selection.length > 50) {
    return { ok: false, error: 'Select between 1 and 50 scripts.' };
  }
  const mode = action === 'autoload' ? 'autoload' : 'executor';
  let destination = '';
  if (mode === 'autoload') {
    destination = str(autoexecFolder, 1000);
    if (!destination || !isDir(destination)) return { ok: false, error: 'Choose an existing executor autoload folder in Settings.' };
  } else {
    executorPath = str(executorPath, 1000);
    try {
      if (!executorPath || !fs.statSync(executorPath).isFile()) return { ok: false, error: 'Choose a valid executor application in Settings.' };
      destination = path.dirname(executorPath);
    } catch {
      return { ok: false, error: 'Choose a valid executor application in Settings.' };
    }
  }

  const scripts = selection.map((item) => resolveScript(item, userFolder));
  if (scripts.some((item) => !item)) return { ok: false, error: 'A selected script is no longer available. Refresh the library and try again.' };
  if (mode === 'autoload' && scripts.some((item) => !item.supportsAutoload)) {
    return { ok: false, error: 'One or more selected scripts do not declare executor autoload support.' };
  }
  if (new Set(scripts.map((item) => item.name.toLowerCase())).size !== scripts.length) {
    return { ok: false, error: 'Selected scripts contain duplicate filenames.' };
  }
  const existing = scripts.filter((item) => fs.existsSync(path.join(destination, item.name)));
  if (existing.length && !replaceExisting) return { ok: false, conflict: true, conflicts: existing.map((item) => item.name) };

  try {
    const replacements = [];
    if (existing.length) {
      const backupDir = path.join(app.getPath('userData'), 'script-backups', `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
      fs.mkdirSync(backupDir, { recursive: true });
      for (const item of existing) {
        const target = path.join(destination, item.name);
        if (!fs.lstatSync(target).isFile()) return { ok: false, error: `Cannot replace non-file destination ${item.name}.` };
        fs.copyFileSync(target, path.join(backupDir, item.name), fs.constants.COPYFILE_EXCL);
        replacements.push({ name: item.name, backup: path.join(backupDir, item.name) });
      }
    }
    const replacedNames = new Set(existing.map((item) => item.name));
    for (const script of scripts) {
      const flags = replacedNames.has(script.name) ? 0 : fs.constants.COPYFILE_EXCL;
      fs.copyFileSync(script.filePath, path.join(destination, script.name), flags);
    }
    const managed = readManagedScripts().filter((item) => !(item.destination === destination && scripts.some((script) => script.name === item.name)));
    managed.push(...scripts.map((item) => ({ destination, name: item.name, source: item.source, action, installedAt: Date.now() })));
    writeManagedScripts(managed);
    return { ok: true, count: scripts.length, files: scripts.map((item) => item.name), replacements };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function watchUserScripts(userFolder) {
  userFolder = str(userFolder, 1000);
  if (scriptWatcher) {
    await scriptWatcher.close();
    scriptWatcher = null;
  }
  clearTimeout(scriptChangeTimer);
  if (!userFolder || !isDir(userFolder)) return { ok: true, watching: false };
  scriptWatcher = chokidar.watch(userFolder, {
    ignoreInitial: true,
    depth: 0,
    awaitWriteFinish: { stabilityThreshold: 250, pollInterval: 100 }
  });
  const changed = () => {
    clearTimeout(scriptChangeTimer);
    scriptChangeTimer = setTimeout(() => {
      if (win && !win.isDestroyed()) win.webContents.send('scripts:changed');
    }, 250);
  };
  for (const event of ['add', 'change', 'unlink']) scriptWatcher.on(event, changed);
  scriptWatcher.on('error', (error) => {
    if (win && !win.isDestroyed()) win.webContents.send('scripts:watch-error', str(error.message, 300));
  });
  return { ok: true, watching: true };
}

const SPOTIFY_REDIRECT_URI = 'http://127.0.0.1:43821/callback';
const SPOTIFY_TOKEN_FILE = () => path.join(app.getPath('userData'), 'spotify-refresh-token.dat');
let spotifyAuthServer = null;
let spotifyAuthTimeout = null;
let spotifyAuthState = '';
let spotifyCodeVerifier = '';
let spotifyAuthClientId = '';
let spotifyAccessToken = '';
let spotifyAccessExpiresAt = 0;
let spotifyAccessClientId = '';

function closeSpotifyAuthServer() {
  clearTimeout(spotifyAuthTimeout);
  spotifyAuthTimeout = null;
  spotifyAuthState = '';
  spotifyCodeVerifier = '';
  if (spotifyAuthServer) {
    const server = spotifyAuthServer;
    spotifyAuthServer = null;
    server.close();
  }
}

function readSpotifyRefreshToken() {
  if (!safeStorage.isEncryptionAvailable()) return '';
  try { return safeStorage.decryptString(fs.readFileSync(SPOTIFY_TOKEN_FILE())); }
  catch { return ''; }
}

function saveSpotifyRefreshToken(token) {
  if (!safeStorage.isEncryptionAvailable()) throw new Error('Secure token storage is unavailable on this device.');
  fs.mkdirSync(path.dirname(SPOTIFY_TOKEN_FILE()), { recursive: true });
  fs.writeFileSync(SPOTIFY_TOKEN_FILE(), safeStorage.encryptString(token), { mode: 0o600 });
}

async function spotifyTokenRequest(values) {
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(values)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error_description || data.error || `Spotify token request failed (${response.status}).`);
  return data;
}

async function startSpotifyAuthorization(clientId) {
  clientId = str(clientId, 80);
  if (!/^[A-Za-z0-9]{32}$/.test(clientId)) return { ok: false, error: 'Enter a valid 32-character Spotify Client ID.' };
  if (!safeStorage.isEncryptionAvailable()) return { ok: false, error: 'Secure token storage is unavailable on this device.' };
  closeSpotifyAuthServer();

  spotifyAuthClientId = clientId;
  spotifyAuthState = crypto.randomBytes(24).toString('hex');
  spotifyCodeVerifier = crypto.randomBytes(48).toString('base64url');
  const challenge = crypto.createHash('sha256').update(spotifyCodeVerifier).digest('base64url');
  const state = spotifyAuthState;
  const server = http.createServer(async (request, response) => {
    const callback = new URL(request.url || '/', SPOTIFY_REDIRECT_URI);
    const finishPage = (status, title, message) => {
      response.writeHead(status, { 'content-type': 'text/html; charset=utf-8' });
      response.end(`<!doctype html><html><meta charset="utf-8"><title>YuniHub Spotify</title><body style="font:16px Segoe UI,sans-serif;padding:40px;background:#101114;color:#f6f1f2"><h1>${title}</h1><p>${message}</p><p>You can return to YuniHub.</p></body></html>`);
    };
    if (callback.pathname !== '/callback') { finishPage(404, 'Not found', 'This is not the YuniHub Spotify callback.'); return; }
    if (callback.searchParams.get('state') !== state) { finishPage(400, 'Sign-in expired', 'The Spotify sign-in state did not match. Start again in YuniHub.'); closeSpotifyAuthServer(); return; }
    const code = callback.searchParams.get('code');
    const authError = callback.searchParams.get('error');
    if (!code || authError) {
      finishPage(400, 'Spotify connection cancelled', authError || 'No authorization code was returned.');
      if (win && !win.isDestroyed()) win.webContents.send('spotify:auth-result', { ok: false, error: authError || 'Spotify authorization was cancelled.' });
      closeSpotifyAuthServer();
      return;
    }
    const verifier = spotifyCodeVerifier;
    const authClientId = spotifyAuthClientId;
    try {
      const token = await spotifyTokenRequest({
        client_id: authClientId,
        grant_type: 'authorization_code',
        code,
        redirect_uri: SPOTIFY_REDIRECT_URI,
        code_verifier: verifier
      });
      if (!token.refresh_token) throw new Error('Spotify did not return a refresh token. Disconnect any previous YuniHub app authorization and try again.');
      saveSpotifyRefreshToken(token.refresh_token);
      spotifyAccessToken = token.access_token || '';
      spotifyAccessExpiresAt = Date.now() + Math.max(0, Number(token.expires_in) || 3600) * 1000;
      spotifyAccessClientId = authClientId;
      finishPage(200, 'Spotify connected', 'YuniHub can now read your current track and update Discord Rich Presence.');
      if (win && !win.isDestroyed()) win.webContents.send('spotify:auth-result', { ok: true });
    } catch (error) {
      finishPage(400, 'Spotify connection failed', error.message || 'Could not finish Spotify sign-in.');
      if (win && !win.isDestroyed()) win.webContents.send('spotify:auth-result', { ok: false, error: error.message || 'Could not finish Spotify sign-in.' });
    } finally {
      closeSpotifyAuthServer();
    }
  });

  spotifyAuthServer = server;
  return new Promise((resolve) => {
    let settled = false;
    const finish = (result) => { if (!settled) { settled = true; resolve(result); } };
    server.once('error', (error) => {
      closeSpotifyAuthServer();
      finish({ ok: false, error: `Could not open the Spotify callback at ${SPOTIFY_REDIRECT_URI}: ${error.message}` });
    });
    server.listen(43821, '127.0.0.1', async () => {
      const authorize = new URL('https://accounts.spotify.com/authorize');
      authorize.search = new URLSearchParams({
        client_id: clientId,
        response_type: 'code',
        redirect_uri: SPOTIFY_REDIRECT_URI,
        scope: 'user-read-currently-playing user-read-playback-state',
        code_challenge_method: 'S256',
        code_challenge: challenge,
        state
      }).toString();
      try {
        await shell.openExternal(authorize.toString());
        finish({ ok: true, redirectUri: SPOTIFY_REDIRECT_URI });
      } catch (error) {
        closeSpotifyAuthServer();
        finish({ ok: false, error: error.message || 'Could not open Spotify sign-in.' });
      }
    });
    spotifyAuthTimeout = setTimeout(() => {
      if (win && !win.isDestroyed()) win.webContents.send('spotify:auth-result', { ok: false, error: 'Spotify sign-in timed out.' });
      closeSpotifyAuthServer();
    }, 5 * 60 * 1000);
  });
}

async function spotifyAccessFor(clientId) {
  if (spotifyAccessToken && spotifyAccessClientId === clientId && spotifyAccessExpiresAt > Date.now() + 60000) return spotifyAccessToken;
  const refreshToken = readSpotifyRefreshToken();
  if (!refreshToken) throw new Error('Connect Spotify to read your current track.');
  const token = await spotifyTokenRequest({ client_id: clientId, grant_type: 'refresh_token', refresh_token: refreshToken });
  if (token.refresh_token) saveSpotifyRefreshToken(token.refresh_token);
  spotifyAccessToken = token.access_token || '';
  spotifyAccessExpiresAt = Date.now() + Math.max(0, Number(token.expires_in) || 3600) * 1000;
  spotifyAccessClientId = clientId;
  return spotifyAccessToken;
}

async function readSpotifyNowPlaying(clientId) {
  clientId = str(clientId, 80);
  if (!/^[A-Za-z0-9]{32}$/.test(clientId)) return { ok: false, connected: false, error: 'Set a valid Spotify Client ID first.' };
  try {
    const accessToken = await spotifyAccessFor(clientId);
    const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: { authorization: `Bearer ${accessToken}` }
    });
    if (response.status === 204) return { ok: true, connected: true, track: null };
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return { ok: false, connected: response.status !== 401, error: data.error && data.error.message || `Spotify request failed (${response.status}).` };
    const item = data.item;
    if (!item) return { ok: true, connected: true, track: null };
    return {
      ok: true,
      connected: true,
      track: {
        name: str(item.name, 200),
        artists: Array.isArray(item.artists) ? item.artists.map((artist) => str(artist.name, 100)).filter(Boolean).join(', ') : '',
        album: str(item.album && item.album.name, 200),
        image: str(item.album && item.album.images && item.album.images[0] && item.album.images[0].url, 1000),
        url: str(item.external_urls && item.external_urls.spotify, 1000),
        progressMs: Math.max(0, Number(data.progress_ms) || 0),
        durationMs: Math.max(0, Number(item.duration_ms) || 0),
        isPlaying: !!data.is_playing
      }
    };
  } catch (error) {
    return { ok: false, connected: false, error: error.message || 'Could not read Spotify playback.' };
  }
}

function disconnectSpotify() {
  spotifyAccessToken = '';
  spotifyAccessExpiresAt = 0;
  spotifyAccessClientId = '';
  try { fs.unlinkSync(SPOTIFY_TOKEN_FILE()); } catch { /* no token to remove */ }
  return { ok: true };
}

function registerIpc() {
  handle('store:load', () => loadData());
  handle('store:save', (data) => saveData(data));

  handle('dialog:pick', async (kind) => {
    const props = kind === 'folder' ? ['openDirectory', 'createDirectory'] : ['openFile'];
    const r = await dialog.showOpenDialog(win, { properties: props });
    return r.canceled || !r.filePaths[0] ? null : r.filePaths[0];
  });

  handle('appearance:pickFont', async () => {
    const result = await dialog.showOpenDialog(win, {
      properties: ['openFile'],
      filters: [{ name: 'Font files', extensions: ['woff2', 'woff', 'ttf', 'otf'] }]
    });
    return result.canceled || !result.filePaths[0] ? null : result.filePaths[0];
  });
  handle('appearance:readFont', (fontPath) => {
    fontPath = str(fontPath, 1000);
    const mimeByExtension = { '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.otf': 'font/otf' };
    const mime = mimeByExtension[path.extname(fontPath).toLowerCase()];
    if (!mime || !fs.existsSync(fontPath)) return { ok: false, error: 'Choose an existing WOFF, WOFF2, TTF, or OTF font file.' };
    try {
      const stat = fs.statSync(fontPath);
      if (!stat.isFile() || stat.size <= 0 || stat.size > 8 * 1024 * 1024) return { ok: false, error: 'Font files must be smaller than 8 MB.' };
      const data = fs.readFileSync(fontPath);
      return { ok: true, dataUrl: `data:${mime};base64,${data.toString('base64')}` };
    } catch (error) {
      return { ok: false, error: error.message || 'Could not load that font file.' };
    }
  });
  handle('spotify:connect', (clientId) => startSpotifyAuthorization(clientId));
  handle('spotify:status', (clientId) => readSpotifyNowPlaying(clientId));
  handle('spotify:disconnect', () => disconnectSpotify());

  handle('project:launch', (opts) => launchProject(opts || {}));
  handle('yunispot:status', () => getYuniSpotStatus());
  handle('yunispot:manage', (action) => manageYuniSpot(str(action, 20)));
  handle('orb-completer:launch', () => launchOrbCompleter());

  handle('project:reveal', async (folder) => {
    folder = str(folder, 1000);
    if (!folder || !fs.existsSync(folder)) return { ok: false, error: 'The project folder could not be found.' };
    const err = await shell.openPath(folder);
    return err ? { ok: false, error: err } : { ok: true };
  });

  handle('studio:runCommand', (request) => runStudioCommand(request || {}));
  handle('studio:terminalStart', (folder) => startStudioTerminal(folder));
  handle('studio:terminalWrite', (request) => writeStudioTerminal(request || {}));
  handle('studio:terminalInput', (request) => writeStudioTerminalInput(request || {}));
  handle('studio:terminalStop', (sessionId) => stopStudioTerminal(sessionId));
  handle('studio:toolchains', () => detectStudioToolchains());
  handle('studio:ports', () => listStudioPorts());
  handle('workspace:listFiles', (folder) => {
    try { return { ok: true, files: workspaceFiles.listWorkspaceFiles(folder) }; }
    catch (error) { return { ok: false, error: error.message }; }
  });
  handle('workspace:diagnose', (folder) => {
    try { return { ok: true, ...diagnoseWorkspace(folder) }; }
    catch (error) { return { ok: false, error: error.message }; }
  });
  handle('workspace:readFile', (request) => {
    try { return { ok: true, content: workspaceFiles.readWorkspaceFile(request && request.folder, request && request.path) }; }
    catch (error) { return { ok: false, error: error.message }; }
  });
  handle('workspace:saveFile', (request) => {
    try {
      const filePath = workspaceFiles.writeWorkspaceFile(request && request.folder, request && request.path, request && request.content);
      return { ok: true, path: filePath };
    } catch (error) { return { ok: false, error: error.message }; }
  });
  handle('workspace:createFile', (request) => {
    try {
      const filePath = workspaceFiles.createWorkspaceFile(request && request.folder, request && request.path, request && request.content || '');
      return { ok: true, path: filePath };
    } catch (error) { return { ok: false, error: error.message }; }
  });

  handle('tool:weather', (city) => getWeather(city));
  handle('tool:listScripts', (userFolder) => listScripts(userFolder));
  handle('tool:readScript', (selection, userFolder) => readScriptSource(selection, userFolder));
  handle('tool:listManagedScripts', () => listManagedScripts());
  handle('tool:removeManagedScript', (destination, name) => removeManagedScript(destination, name));
  handle('tool:openScriptBackups', async () => {
    const directory = path.join(app.getPath('userData'), 'script-backups');
    fs.mkdirSync(directory, { recursive: true });
    const error = await shell.openPath(directory);
    return error ? { ok: false, error } : { ok: true };
  });
  handle('tool:ackScriptBundle', (version) => acknowledgeScriptBundle(version));
  handle('tool:watchScripts', (userFolder) => watchUserScripts(userFolder));
  handle('tool:copyScripts', (request) => {
    const r = request || {};
    return copySelectedScripts(r.selection, r.userFolder, r.autoexecFolder, r.executorPath, r.action, r.replaceExisting);
  });
  handle('rpc:connect', (id) => rpcConnect(str(id, 30)));
  handle('rpc:disconnect', () => { rpcDisconnect(); return true; });
  handle('rpc:activity', (activity) => {
    const details = str(activity && activity.details, 128);
    const state = str(activity && activity.state, 128);
    if (!details && !state) return false;
    return setActivity(buildActivity(activity));
  });
  handle('beacon:set', (b) => {
    beacons = { youtube: !!(b && b.youtube), twitch: !!(b && b.twitch) };
    if (beacons.youtube || beacons.twitch) startBeacons();
    return { ok: true, port: BEACON_PORT };
  });
  handle('beacon:script', async () => {
    const r = await dialog.showSaveDialog(win, { defaultPath: 'yuniku-hub-beacon.user.js', filters: [{ name: 'Userscript', extensions: ['js'] }] });
    if (r.canceled || !r.filePath) return { ok: false, canceled: true };
    try { fs.writeFileSync(r.filePath, USERSCRIPT, 'utf8'); return { ok: true }; } catch (e) { return { ok: false, error: e.message }; }
  });

  handle('app:info', () => {
    const system = detectSystemProfile();
    return {
      version: app.getVersion(),
      platform: process.platform,
      dataFile: dataFile(),
      backupDir: backupDir(),
      openAtLogin: app.getLoginItemSettings().openAtLogin,
      userName: system.name,
      weatherCity: system.city,
      buildMode: APP_MODE,
      presenceConfigured: /^\d{15,25}$/.test(DEFAULT_DISCORD_APP_ID)
    };
  });

  handle('update:state', () => updateState);
  handle('update:check', async () => {
    if (!app.isPackaged) return { ok: false, error: 'Update checks are available in installed builds.' };
    try { await autoUpdater.checkForUpdates(); return { ok: true }; }
    catch (error) { return { ok: false, error: error.message || 'Could not check for updates.' }; }
  });
  handle('update:download', async () => {
    if (!app.isPackaged || updateState.status !== 'available') return { ok: false, error: 'There is no update ready to download.' };
    try { await autoUpdater.downloadUpdate(); return { ok: true }; }
    catch (error) { return { ok: false, error: error.message || 'Could not download the update.' }; }
  });
  handle('update:install', () => {
    if (!app.isPackaged || updateState.status !== 'downloaded') return { ok: false, error: 'Download an update before installing it.' };
    autoUpdater.quitAndInstall(true, true);
    return { ok: true };
  });

  handle('app:setPrefs', (p) => ({ hotkeyOk: applyPrefs(p || {}) }));

  handle('app:openBackups', async () => {
    fs.mkdirSync(backupDir(), { recursive: true });
    const err = await shell.openPath(backupDir());
    return err ? { ok: false, error: err } : { ok: true };
  });

  handle('app:openUrl', async (url) => {
    try {
      const u = new URL(String(url));
      if (u.protocol !== 'https:' && u.protocol !== 'http:') return { ok: false, error: 'Only web links can be opened.' };
      await shell.openExternal(u.toString());
      return { ok: true };
    } catch {
      return { ok: false, error: 'That link is not valid.' };
    }
  });

  handle('app:discordAuth', async () => {
    try {
      const url = `${AUTH_SERVER_URL}/auth/discord`;
      await shell.openExternal(url);
      return { ok: true, url };
    } catch (e) {
      return { ok: false, error: e && e.message ? e.message : 'Could not open the Discord sign-in page.' };
    }
  });

  handle('app:discordExchange', async (ticket) => exchangeDiscordTicket(ticket));
  handle('app:discordSession', async (sessionToken) => refreshDiscordSession(sessionToken));

  // Dropped files give a path. For the "project folder" field we want the folder itself.
  handle('path:dir', (p) => {
    p = str(p, 1000);
    if (!p) return '';
    return isDir(p) ? p : path.dirname(p);
  });

  handle('app:setLogin', (on) => {
    app.setLoginItemSettings({ openAtLogin: !!on });
    return app.getLoginItemSettings().openAtLogin;
  });

  handle('app:setTheme', (theme, customBackground, iconDataUrl) => {
    const t = resolveTheme(theme, customBackground);
    if (win && !isLinux && win.setTitleBarOverlay) {
      try { win.setTitleBarOverlay({ color: t.color, symbolColor: t.symbolColor, height: 40 }); } catch { /* window has no titlebar overlay */ }
    }
    if (win) win.setBackgroundColor(t.color);
    updateNativeIcon(theme, iconDataUrl);
    return true;
  });

  handle('data:export', async (json) => {
    if (typeof json !== 'string') return { ok: false, error: 'Nothing to export.' };
    const r = await dialog.showSaveDialog(win, { defaultPath: 'yunihub-backup.json', filters: [{ name: 'JSON', extensions: ['json'] }] });
    if (r.canceled || !r.filePath) return { ok: false, canceled: true };
    try { fs.writeFileSync(r.filePath, json, 'utf8'); return { ok: true, path: r.filePath }; }
    catch (e) { return { ok: false, error: e.message }; }
  });

  handle('data:import', async () => {
    const r = await dialog.showOpenDialog(win, { properties: ['openFile'], filters: [{ name: 'JSON', extensions: ['json'] }] });
    if (r.canceled || !r.filePaths[0]) return { ok: false, canceled: true };
    try {
      const file = r.filePaths[0];
      if (fs.statSync(file).size > 5 * 1024 * 1024) return { ok: false, error: 'That file is too large to be a backup.' };
      return { ok: true, data: JSON.parse(fs.readFileSync(file, 'utf8')) };
    } catch {
      return { ok: false, error: 'That file is not a valid backup.' };
    }
  });
}

/* ---------- window, tray, shortcut ---------- */

function showWin() {
  if (!win) { createWindow(); return; }
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
}

function toggleWin() {
  if (!win) { createWindow(); return; }
  if (win.isVisible() && win.isFocused() && !win.isMinimized()) {
    if (prefs.closeToTray) win.hide(); else win.minimize();
  } else {
    showWin();
  }
}

// Returns false only when the global shortcut could not be registered.
function applyPrefs(p) {
  prefs = { closeToTray: !!p.closeToTray, hotkey: !!p.hotkey };

  if (prefs.closeToTray && !tray) {
    try {
      tray = new Tray(nativeImage.createFromPath(ICON).resize({ width: 16, height: 16 }));
      tray.setToolTip('YuniHub');
      tray.setContextMenu(Menu.buildFromTemplate([
        { label: 'Open YuniHub', click: showWin },
        { type: 'separator' },
        { label: 'Quit', click: () => { quitting = true; app.quit(); } }
      ]));
      tray.on('click', showWin);
    } catch { tray = null; prefs.closeToTray = false; }
  } else if (!prefs.closeToTray && tray) {
    tray.destroy();
    tray = null;
  }

  globalShortcut.unregister(HOTKEY);
  if (!prefs.hotkey) return true;
  try { return globalShortcut.register(HOTKEY, toggleWin); } catch { return false; }
}

function loadBounds() {
  try {
    const b = JSON.parse(fs.readFileSync(boundsFile(), 'utf8'));
    const ok = ['x', 'y', 'width', 'height'].every((k) => Number.isFinite(b[k]));
    if (!ok || b.width < 760 || b.height < 500) return null;
    // Only reuse the position if it is still on a connected screen.
    const visible = screen.getAllDisplays().some((d) => {
      const a = d.workArea;
      return b.x < a.x + a.width - 80 && b.x + b.width > a.x + 80 && b.y < a.y + a.height - 80 && b.y + 80 < a.y + a.height && b.y >= a.y - 20;
    });
    return visible ? b : { width: b.width, height: b.height, maximized: b.maximized };
  } catch {
    return null;
  }
}

function saveBounds() {
  if (!win) return;
  try {
    const b = win.getNormalBounds();
    fs.writeFileSync(boundsFile(), JSON.stringify({ ...b, maximized: win.isMaximized() }));
  } catch { /* not important */ }
}

function createWindow() {
  const saved = loadData();
  const settings = saved && saved.settings || {};
  const theme = ['rei', 'dehbify', 'berrybaby', 'custom'].includes(settings.theme) ? settings.theme : 'dark';
  const t = resolveTheme(theme, settings.customTheme && settings.customTheme.background);
  const b = loadBounds() || {};

  win = new BrowserWindow({
    width: b.width || 1240,
    height: b.height || 800,
    ...(Number.isFinite(b.x) ? { x: b.x, y: b.y } : {}),
    minWidth: 760,
    minHeight: 500,
    show: false,
    title: 'YuniHub',
    backgroundColor: t.color,
    autoHideMenuBar: true,
    icon: fs.existsSync(savedThemeIconPath()) ? savedThemeIconPath() : ICON,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false
    }
  });
  const windowContents = win.webContents;

  win.loadFile(path.join(__dirname, 'renderer', 'index.html'), { query: { theme } });
  win.once('ready-to-show', () => {
    if (b.maximized) win.maximize();
    win.show();
  });

  // The app is fully local: never open new windows or navigate away from it.
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (e) => e.preventDefault());

  win.on('close', (e) => {
    saveBounds();
    if (prefs.closeToTray && !quitting) { e.preventDefault(); win.hide(); }
  });
  win.on('closed', () => {
    if (studioTerminal && studioTerminal.owner === windowContents) stopStudioTerminal(studioTerminal.id, 'Window closed.');
    win = null;
  });
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', (_event, argv) => {
    const incoming = argv.find((arg) => /^yunihub:\/\//.test(arg));
    if (incoming) handleDiscordProtocol(incoming);
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  app.whenReady().then(() => {
    try {
      if (app.isPackaged) {
        app.setAsDefaultProtocolClient('yunihub');
      } else {
        const appEntry = path.resolve(process.argv[1] || '.');
        const protocolArgs = [appEntry, ...(APP_MODE === 'dev' ? ['--dev'] : [])];
        app.setAsDefaultProtocolClient('yunihub', process.execPath, protocolArgs);
      }
    } catch { /* protocol registration is best effort */ }
    Menu.setApplicationMenu(null);
    registerIpc();
    createWindow();
    if (app.isPackaged) autoUpdater.checkForUpdates().catch(() => {});
    const saved = loadData();
    if (saved && saved.settings) applyPrefs(saved.settings);
    const initialUrl = process.argv.find((arg) => /^yunihub:\/\//.test(arg));
    if (initialUrl) setTimeout(() => handleDiscordProtocol(initialUrl), 150);
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('open-url', (event, url) => {
    event.preventDefault();
    handleDiscordProtocol(url);
  });

  app.on('before-quit', () => {
    quitting = true;
    if (scriptWatcher) { scriptWatcher.close(); scriptWatcher = null; }
    clearTimeout(scriptChangeTimer);
  });
  app.on('will-quit', () => { globalShortcut.unregisterAll(); rpcDisconnect(); if (beaconServer) beaconServer.close(); });

  app.on('window-all-closed', () => {
    if (!isMac) app.quit();
  });
}
