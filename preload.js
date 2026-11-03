'use strict';
const { contextBridge, ipcRenderer, webUtils } = require('electron');

const call = (channel, ...args) => ipcRenderer.invoke(channel, ...args);

// The renderer only ever sees this small, fixed API. No Node access leaks through.
contextBridge.exposeInMainWorld('hub', {
  load: () => call('store:load'),
  save: (data) => call('store:save', data),
  pick: (kind) => call('dialog:pick', kind),
  pickCustomFont: () => call('appearance:pickFont'),
  readCustomFont: (fontPath) => call('appearance:readFont', fontPath),
  spotifyConnect: (clientId) => call('spotify:connect', clientId),
  spotifyStatus: (clientId) => call('spotify:status', clientId),
  spotifyDisconnect: () => call('spotify:disconnect'),
  onSpotifyAuth: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('spotify:auth-result', listener);
    return () => ipcRenderer.removeListener('spotify:auth-result', listener);
  },
  launch: (opts) => call('project:launch', opts),
  yuniSpotStatus: () => call('yunispot:status'),
  manageYuniSpot: (action) => call('yunispot:manage', action),
  openOrbCompleter: () => call('orb-completer:launch'),
  reveal: (folder) => call('project:reveal', folder),
  runStudioCommand: (request) => call('studio:runCommand', request),
  startStudioTerminal: (folder) => call('studio:terminalStart', folder),
  writeStudioTerminal: (request) => call('studio:terminalWrite', request),
  writeStudioTerminalInput: (request) => call('studio:terminalInput', request),
  stopStudioTerminal: (sessionId) => call('studio:terminalStop', sessionId),
  onStudioTerminalData: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('studio:terminal:data', listener);
    return () => ipcRenderer.removeListener('studio:terminal:data', listener);
  },
  detectStudioToolchains: () => call('studio:toolchains'),
  listStudioPorts: () => call('studio:ports'),
  listWorkspaceFiles: (folder) => call('workspace:listFiles', folder),
  diagnoseWorkspace: (folder) => call('workspace:diagnose', folder),
  readWorkspaceFile: (request) => call('workspace:readFile', request),
  saveWorkspaceFile: (request) => call('workspace:saveFile', request),
  createWorkspaceFile: (request) => call('workspace:createFile', request),
  openUrl: (url) => call('app:openUrl', url),
  info: () => call('app:info'),
  updateState: () => call('update:state'),
  checkUpdates: () => call('update:check'),
  downloadUpdate: () => call('update:download'),
  installUpdate: () => call('update:install'),
  onUpdateStatus: (callback) => {
    const listener = (_event, status) => callback(status);
    ipcRenderer.on('update:status', listener);
    return () => ipcRenderer.removeListener('update:status', listener);
  },
  getMode: () => call('app:info').then((d) => d && d.buildMode ? d.buildMode : 'release'),
  setLogin: (on) => call('app:setLogin', on),
  setPrefs: (prefs) => call('app:setPrefs', prefs),
  setTheme: (theme, customBackground, iconDataUrl) => call('app:setTheme', theme, customBackground, iconDataUrl),
  openBackups: () => call('app:openBackups'),
  exportData: (json) => call('data:export', json),
  importData: () => call('data:import'),
  dirOf: (p) => call('path:dir', p),
  weather: (city) => call('tool:weather', city),
  listScripts: (userFolder) => call('tool:listScripts', userFolder),
  readScript: (selection, userFolder) => call('tool:readScript', selection, userFolder),
  listManagedScripts: () => call('tool:listManagedScripts'),
  removeManagedScript: (destination, name) => call('tool:removeManagedScript', destination, name),
  openScriptBackups: () => call('tool:openScriptBackups'),
  acknowledgeScriptBundle: (version) => call('tool:ackScriptBundle', version),
  watchScripts: (userFolder) => call('tool:watchScripts', userFolder),
  copyScripts: (request) => call('tool:copyScripts', request),
  onScriptsChanged: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('scripts:changed', listener);
    return () => ipcRenderer.removeListener('scripts:changed', listener);
  },
  onScriptsWatchError: (callback) => {
    const listener = (_event, message) => callback(message);
    ipcRenderer.on('scripts:watch-error', listener);
    return () => ipcRenderer.removeListener('scripts:watch-error', listener);
  },
  discordAuth: () => call('app:discordAuth'),
  discordExchange: (ticket) => call('app:discordExchange', ticket),
  discordSession: (sessionToken) => call('app:discordSession', sessionToken),
  onDiscordAuth: (cb) => ipcRenderer.on('discord:auth-result', (_event, payload) => cb(payload)),
  rpcConnect: (id) => call('rpc:connect', id),
  rpcDisconnect: () => call('rpc:disconnect'),
  setActivity: (activity) => call('rpc:activity', activity),
  setBeacons: (b) => call('beacon:set', b),
  saveUserscript: () => call('beacon:script'),
  // Turns a dropped File into its real path (File.path was removed in newer Electron).
  pathFor: (file) => {
    try { return webUtils.getPathForFile(file) || ''; } catch { return ''; }
  }
});
