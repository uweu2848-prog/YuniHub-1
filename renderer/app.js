import { createScriptSearch } from './script-search.mjs';
import { buildDiscordPresencePayload } from './discord-presence.mjs';
import { navigateStudioCommandHistory, stripTerminalControlSequences } from '../studio-terminal.cjs';
import { setPlexus } from './plexus.js';
import { basicSetup, EditorView } from 'codemirror';
import { addCursorAbove, addCursorBelow, copyLineDown, copyLineUp, moveLineDown, moveLineUp, redo, selectAll, shrinkSelection, toggleBlockComment, toggleLineComment, undo } from '@codemirror/commands';
import { gotoLine, openSearchPanel, search, selectNextOccurrence } from '@codemirror/search';
import { StreamLanguage } from '@codemirror/language';
import { javascript, json, typescript } from '@codemirror/legacy-modes/mode/javascript';
import { cpp, csharp, java, kotlin } from '@codemirror/legacy-modes/mode/clike';
import { css } from '@codemirror/legacy-modes/mode/css';
import { go } from '@codemirror/legacy-modes/mode/go';
import { lua } from '@codemirror/legacy-modes/mode/lua';
import { powerShell } from '@codemirror/legacy-modes/mode/powershell';
import { python } from '@codemirror/legacy-modes/mode/python';
import { rust } from '@codemirror/legacy-modes/mode/rust';
import { shell } from '@codemirror/legacy-modes/mode/shell';
import { sqlite } from '@codemirror/legacy-modes/mode/sql';
import { swift } from '@codemirror/legacy-modes/mode/swift';
import { xml } from '@codemirror/legacy-modes/mode/xml';
import { yaml } from '@codemirror/legacy-modes/mode/yaml';

'use strict';
(function () {
  /* ---------- bridge (falls back to a browser-only demo so index.html also opens in a plain browser) ---------- */
  const API = window.hub || makeDemoApi();

  function makeDemoApi() {
    const KEY = 'yunihub-demo';
    const no = async () => ({ ok: false, error: 'This works in the desktop app.' });
    return {
      load: async () => { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } },
      save: async (d) => { try { localStorage.setItem(KEY, JSON.stringify(d)); return true; } catch { return false; } },
      pick: async () => null, launch: no, reveal: no, openBackups: no,
      yuniSpotStatus: async () => ({ available: false, spotify: false, yuniSpot: false, error: 'Bundled YuniSpot is available in the desktop app.' }),
      manageYuniSpot: no,
      openUrl: async (u) => { window.open(u, '_blank', 'noopener'); return { ok: true }; },
      info: async () => ({ version: 'dev', platform: 'browser', dataFile: 'browser storage', backupDir: '', openAtLogin: false, buildMode: 'dev' }),
      updateState: async () => ({ status: 'unsupported', message: 'Update checks are available in installed builds.' }),
      checkUpdates: no, downloadUpdate: no, installUpdate: no, onUpdateStatus: () => () => {},
      setLogin: async (v) => v, setTheme: async () => true, setPrefs: async () => ({ hotkeyOk: true }),
      pickCustomFont: no, readCustomFont: no,
      spotifyConnect: no, spotifyStatus: async () => ({ ok: false, connected: false, error: 'Spotify integration is available in the desktop app.' }), spotifyDisconnect: async () => ({ ok: true }), onSpotifyAuth: () => () => {},
      exportData: no, importData: no, dirOf: async (p) => p, pathFor: () => '',
      weather: async () => ({ ok: false, error: 'Desktop app only' }),
      listScripts: async () => ({ ok: true, scripts: [], userFolderValid: true, bundle: {} }),
      readScript: no, listManagedScripts: async () => ({ ok: true, scripts: [] }), removeManagedScript: no,
      openScriptBackups: no, runStudioCommand: no,
      startStudioTerminal: no, writeStudioTerminal: no, writeStudioTerminalInput: no, stopStudioTerminal: no, onStudioTerminalData: () => () => {},
      detectStudioToolchains: async () => ({ tools: [], visualStudio: null }),
      listStudioPorts: async () => ({ ok: false, ports: [], error: 'Port inspection is available in the desktop app.' }),
      listWorkspaceFiles: no, readWorkspaceFile: no, saveWorkspaceFile: no, createWorkspaceFile: no, diagnoseWorkspace: no,
      acknowledgeScriptBundle: async () => ({ ok: true }), watchScripts: async () => ({ ok: true }),
      onScriptsChanged: () => () => {}, onScriptsWatchError: () => () => {}, copyScripts: no,
      discordAuth: async () => ({ ok: true, url: 'https://yunihub-production-5c47.up.railway.app/auth/discord' }),
      discordExchange: async () => ({ ok: false, error: 'Desktop app only' }),
      discordSession: async () => ({ ok: false, error: 'Desktop app only' }),
      openOrbCompleter: no,
      onDiscordAuth: () => {}, rpcConnect: no,
      rpcDisconnect: async () => true, setActivity: async () => false, setBeacons: async () => ({ ok: true }), saveUserscript: no
    };
  }

  /* ---------- icons ---------- */
  const ICONS = {
    headphones: '<path d="M4 15v-3a8 8 0 0 1 16 0v3"/><rect x="3" y="14" width="4" height="6" rx="1.5"/><rect x="17" y="14" width="4" height="6" rx="1.5"/>',
    home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    phone: '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
    monitor: '<rect x="2.5" y="4" width="19" height="12.5" rx="2.5"/><path d="M8 21h8M12 16.5V21"/>',
    sliders: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
    play: '<path d="M7.5 4.8v14.4a.6.6 0 0 0 .9.5l11.5-7.2a.6.6 0 0 0 0-1L8.4 4.3a.6.6 0 0 0-.9.5z"/>',
    folder: '<path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H9l2 2h7.5A2.5 2.5 0 0 1 21 9.5v8A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5z"/>',
    code: '<path d="m8 8-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    trash: '<path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l.8 12.5h9.4L17.5 7"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    arrow: '<path d="M9 5l7 7-7 7"/>',
    star: '<path d="M12 3.6l2.6 5.3 5.8.9-4.2 4.1 1 5.8L12 17l-5.2 2.7 1-5.8L3.6 9.8l5.8-.9z"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    pencil: '<path d="M4 20l1-4L16.5 4.5a2 2 0 0 1 3 3L8 19z"/><path d="M14.5 6.5l3 3"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
    grip: '<circle cx="9" cy="6" r="1.1"/><circle cx="15" cy="6" r="1.1"/><circle cx="9" cy="12" r="1.1"/><circle cx="15" cy="12" r="1.1"/><circle cx="9" cy="18" r="1.1"/><circle cx="15" cy="18" r="1.1"/>',
    external: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
    theme: '<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/>',
    camera: '<rect x="3" y="6.5" width="18" height="13" rx="3.5"/><circle cx="12" cy="13" r="3.4"/><path d="M8.5 6.5 10 4.5h4l1.5 2"/>',
    video: '<rect x="3" y="5" width="18" height="14" rx="4.5"/><path d="M10.2 9.2v5.6l4.8-2.8z"/>',
    package: '<path d="M12 3 3.5 7.5v9L12 21l8.5-4.5v-9z"/><path d="M3.5 7.5 12 12l8.5-4.5M12 12v9"/>',
    orb: '<circle cx="12" cy="12" r="8.5"/><path d="M7.8 10.2A5 5 0 0 1 12 7.2"/>',
    toolbox: '<rect x="3" y="8" width="18" height="12" rx="2.5"/><path d="M9 8V5.5h6V8M3 13.5h18"/>',
    chat: '<path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-7l-4 3.5V17H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"/>',
    bolt: '<path d="M13 3 5 13.5h6L10 21l8-10.5h-6z"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18"/>',
    gamepad: '<path d="M6.4 9h11.2a4 4 0 0 1 3.8 5l-.7 2.3a2.4 2.4 0 0 1-3.9 1l-2.1-1.7H9.3l-2.1 1.7a2.4 2.4 0 0 1-3.9-1L2.6 14a4 4 0 0 1 3.8-5z"/><path d="M7 11.5v4M5 13.5h4M16 12h.01M18 14h.01"/>',
    file: '<path d="M6 3.5h8l4 4V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1z"/><path d="M14 3.5v5h5M8 13h8M8 16.5h8"/>'
  };
  const PICKABLE = ['camera', 'video', 'package', 'orb', 'toolbox', 'phone', 'monitor', 'code', 'chat', 'bolt', 'globe'];
  const svg = (k) => `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[k] || ''}</svg>`;

  const STATUSES = ['Idea', 'Building', 'Testing', 'Shipped', 'Blocked'];
  const TRACKS = ['Android', 'PC'];
  const SORTS = [['manual', 'Pinned first'], ['recent', 'Recently opened'], ['progress', 'Most progress'], ['name', 'Name A to Z']];
  const TEMPLATES = {
    blank: { label: 'Blank', tasks: [] },
    android: { label: 'Android app', tasks: ['Set up the Android Studio project', 'Design the main screen', 'Build the first feature', 'Test on a real phone', 'Build a release APK'] },
    desktop: { label: 'Desktop app', tasks: ['Pick a framework', 'Sketch the window', 'Build the first feature', 'Add settings', 'Package an installer'] },
    script: { label: 'Script or tool', tasks: ['Write down the goal', 'Get a first version running', 'Add settings', 'Share it'] }
  };

  /* ---------- helpers ---------- */
  const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
  const clip = (v, n) => String(v == null ? '' : v).trim().slice(0, n);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function relTime(ts) {
    if (!ts) return '';
    const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
    if (s < 60) return 'just now';
    if (s < 3600) return Math.floor(s / 60) + 'm ago';
    if (s < 86400) return Math.floor(s / 3600) + 'h ago';
    if (s < 86400 * 7) return Math.floor(s / 86400) + 'd ago';
    return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function cleanUrl(u) {
    u = clip(u, 500);
    if (!u) return '';
    if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
    try { return new URL(u).toString(); } catch { return ''; }
  }

  /* ---------- data ---------- */
  const DEFAULT_CUSTOM_THEME = { background: '#101114', accent: '#ff5264', surface: '#1b1d22' };
  const EXTRA = { city: '', exe: '', scripts: '', autoexec: '', executorProfiles: [], activeExecutorProfile: '', customTheme: { ...DEFAULT_CUSTOM_THEME }, savedThemes: [], discordUser: null, presenceAutoUpdate: true, spotifyClientId: '', yuniSaverPath: '', yuniStrapperPath: '', beacons: { youtube: false, twitch: false } };
  const validHex = (value, fallback) => /^#[0-9a-f]{6}$/i.test(value || '') ? value.toUpperCase() : fallback;
  let appMode = 'release';
  let yuniSpotStatus = null;
  const canEditProjects = () => appMode === 'dev';
  const canEditProject = (p) => canEditProjects() || !p || !p.isStarter;
  const gateProjectEditor = (msg = 'This feature is available in developer mode only.', p = null) => {
    if (canEditProject(p)) return true;
    toast(msg || 'This starter template is locked to developer mode.', 'err');
    return false;
  };

  function mkProject(name, desc, track, icon, tasks) {
    return normProject({
      name, desc, track, icon,
      tasks: tasks.map((t, i) => ({ id: uid(), t, d: i === 0 }))
    });
  }
  function yuniSpotProject() {
    return {
      ...mkProject('YuniSpot', 'Launch Spotify with your YuniSpot setup. Apply YuniSpot to Spotify first if it is not already installed.', 'PC', 'monitor', []),
      id: 'yunispot-launcher',
      status: 'Shipped',
      isStarter: true,
      launch: { mode: 'app', target: 'spotify:' }
    };
  }
  function defaultStudioWorkspace() {
    let folder = '';
    try { folder = localStorage.getItem('yunihub-studio-folder') || ''; } catch { /* browser storage is optional */ }
    return {
      activeFile: '',
      openFiles: [],
      files: [],
      fileQuery: '',
      fileLimit: 200,
      folder,
      loaded: false,
      loading: false,
      content: '',
      dirty: false,
      newFileOpen: false,
      toolchains: [],
      visualStudio: null,
      running: false,
      debugMode: false,
      terminalSessionId: '',
      terminalConnecting: false,
      terminalStartPromise: null,
      terminalEarlyEvents: [],
      terminalText: '',
      terminalCarry: '',
      terminalMarker: '',
      currentCommand: '',
      commandOutput: '',
      commandHistory: [],
      commandHistoryIndex: 0,
      commandHistoryDraft: '',
      openMenu: '',
      activePanel: 'terminal',
      panelVisible: true,
      output: [],
      outputSource: 'commands',
      debugOutput: [],
      problems: [],
      sourceProblems: [],
      diagnosticsChecked: 0,
      diagnosticsTruncated: false,
      ports: [],
      portsError: '',
      portsLoading: false,
      terminal: ['Choose a project folder to enable the local command console.']
    };
  }

  function defaults() {
    return {
      version: 2,
      settings: { name: '', hubName: 'YuniHub', theme: 'dark', sort: 'manual', closeToTray: false, hotkey: false, compactMode: false, reduceMotion: false, presenceShowProject: true, welcomeSeen: false, welcomeVersion: 0, yuniSpotProjectAdded: true, ...EXTRA, beacons: { ...EXTRA.beacons }, discordUser: null },
      projects: [
        { ...mkProject('Instagram Client', 'Your own Android client for browsing Instagram.', 'Android', 'camera', ['Add it to the hub', 'Pick the app architecture', 'Sign-in and session storage', 'Home feed screen', 'Profile screen', 'Photo and video viewer', 'Direct messages', 'Settings and theming']), pinned: true, status: 'Building', isStarter: true },
        { ...mkProject('YouTube Client', 'A ReVanced-style YouTube app with the extras built in.', 'Android', 'video', ['Add it to the hub', 'Pick the player library', 'Search and results', 'Video playback screen', 'Subscriptions feed', 'Background playback', 'Downloads', 'Settings']), pinned: true, status: 'Building', isStarter: true },
        { ...mkProject('APK Installer', 'Open an APK, check it, and install it in a few taps.', 'Android', 'package', ['Add it to the hub', 'Read app name, version and icon', 'Install through the system installer', 'Install progress screen', 'Split APK and bundle support', 'Installed apps list', 'Update and uninstall']), pinned: true, status: 'Idea', isStarter: true },
        { ...mkProject('Discord Orb Completer', 'A desktop helper for Discord orbs.', 'PC', 'orb', ['Add it to the hub', 'Write down what it should do', 'Sketch the window layout', 'Settings storage', 'First working version']), pinned: false, status: 'Idea', isStarter: true },
        { ...mkProject('PC Toolbox', 'A home for the smaller desktop utilities to come.', 'PC', 'toolbox', ['Add it to the hub', 'List the first three tools', 'Pick a shared look', 'Package it as an installer']), pinned: false, status: 'Idea', isStarter: true },
        yuniSpotProject()
      ]
    };
  }
  function normProject(p) {
    const o = p && typeof p === 'object' ? p : {};
    const l = o.launch && typeof o.launch === 'object' ? o.launch : {};
    const tasks = (Array.isArray(o.tasks) ? o.tasks : []).slice(0, 300)
      .map((t) => ({ id: clip(t && t.id, 20) || uid(), t: clip(t && t.t, 160), d: !!(t && t.d) }))
      .filter((t) => t.t);
    const links = (Array.isArray(o.links) ? o.links : []).slice(0, 30)
      .map((k) => ({ id: clip(k && k.id, 20) || uid(), label: clip(k && k.label, 60), url: cleanUrl(k && k.url) }))
      .filter((k) => k.url)
      .map((k) => ({ ...k, label: k.label || hostOf(k.url) }));
    return {
      id: clip(o.id, 40) || uid(),
      name: clip(o.name, 60) || 'Untitled',
      desc: clip(o.desc, 200),
      track: o.track === 'PC' ? 'PC' : 'Android',
      icon: PICKABLE.includes(o.icon) ? o.icon : 'package',
      status: STATUSES.includes(o.status) ? o.status : 'Idea',
      pinned: !!o.pinned,
      isStarter: !!o.isStarter,
      tasks, links,
      notes: String(o.notes == null ? '' : o.notes).slice(0, 20000),
      folder: clip(o.folder, 500),
      launch: { mode: l.mode === 'command' ? 'command' : 'app', target: clip(l.target, 500) },
      opened: Number(o.opened) || 0,
      created: Number(o.created) || Date.now()
    };
  }
  function hostOf(u) { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; } }
  function normalize(d) {
    if (!d || typeof d !== 'object' || !Array.isArray(d.projects)) return null;
    const s = d.settings && typeof d.settings === 'object' ? d.settings : {};
    return {
      version: 2,
      settings: {
        name: clip(s.name, 40), hubName: clip(s.hubName, 30) || 'YuniHub',
        theme: ['dark', 'rei', 'dehbify', 'berrybaby', 'custom'].includes(s.theme) ? s.theme : 'dark',
        customTheme: {
          background: validHex(s.customTheme && s.customTheme.background, DEFAULT_CUSTOM_THEME.background),
          accent: validHex(s.customTheme && s.customTheme.accent, DEFAULT_CUSTOM_THEME.accent),
          surface: validHex(s.customTheme && s.customTheme.surface, DEFAULT_CUSTOM_THEME.surface)
        },
        savedThemes: (Array.isArray(s.savedThemes) ? s.savedThemes : []).slice(0, 30).map((x) => ({
          id: clip(x && x.id, 40) || uid(), name: clip(x && x.name, 30) || 'Saved theme', desc: clip(x && x.desc, 90),
          background: validHex(x && x.background, DEFAULT_CUSTOM_THEME.background),
          accent: validHex(x && x.accent, DEFAULT_CUSTOM_THEME.accent),
          surface: validHex(x && x.surface, DEFAULT_CUSTOM_THEME.surface),
          pinned: !!(x && x.pinned)
        })),
        sort: SORTS.some((x) => x[0] === s.sort) ? s.sort : 'manual',
        closeToTray: !!s.closeToTray, hotkey: !!s.hotkey, welcomeSeen: !!s.welcomeSeen,
        yuniSpotProjectAdded: !!s.yuniSpotProjectAdded,
        compactMode: !!s.compactMode, reduceMotion: !!s.reduceMotion, presenceShowProject: s.presenceShowProject !== false,
        presenceAutoUpdate: s.presenceAutoUpdate !== false,
        interfaceScale: Math.max(.9, Math.min(1.1, Number.isFinite(Number(s.interfaceScale)) ? Number(s.interfaceScale) : 1)),
        cardStyle: ['glass', 'flat', 'tinted'].includes(s.cardStyle) ? s.cardStyle : 'glass',
        fontPreset: ['system', 'rounded', 'serif', 'mono', 'custom'].includes(s.fontPreset) ? s.fontPreset : 'system',
        customFontPath: clip(s.customFontPath, 1000),
        backgroundIntensity: Math.max(.5, Math.min(1.5, Number.isFinite(Number(s.backgroundIntensity)) ? Number(s.backgroundIntensity) : 1)),
        backgroundSpeed: Math.max(.5, Math.min(1.75, Number.isFinite(Number(s.backgroundSpeed)) ? Number(s.backgroundSpeed) : 1)),
        berryCursor: s.berryCursor !== false,
        rgbAccents: !!s.rgbAccents,
        studioFontSize: Math.max(10, Math.min(20, Number.isFinite(Number(s.studioFontSize)) ? Number(s.studioFontSize) : 13)),
        studioWordWrap: s.studioWordWrap !== false,
        welcomeVersion: s.welcomeVersion === 1 ? 1 : 0,
        city: clip(s.city, 80), exe: clip(s.exe, 500), scripts: clip(s.scripts, 500), autoexec: clip(s.autoexec, 500),
        executorProfiles: (Array.isArray(s.executorProfiles) ? s.executorProfiles : []).slice(0, 20).map((profile) => ({
          id: clip(profile && profile.id, 40) || uid(),
          name: clip(profile && profile.name, 50) || 'Executor profile',
          executorPath: clip(profile && profile.executorPath, 500),
          autoexecFolder: clip(profile && profile.autoexecFolder, 500)
        })),
        activeExecutorProfile: clip(s.activeExecutorProfile, 40),
        discordUser: s.discordUser && typeof s.discordUser === 'object' ? {
          id: clip(s.discordUser.id, 40), username: clip(s.discordUser.username, 40), global_name: clip(s.discordUser.global_name, 80), avatar: s.discordUser.avatar || null
        } : null,
        discordSession: clip(s.discordSession, 200),
        spotifyClientId: clip(s.spotifyClientId, 64),
        yuniSaverPath: clip(s.yuniSaverPath, 1000),
        yuniStrapperPath: clip(s.yuniStrapperPath, 1000),
        beacons: { youtube: !!(s.beacons && s.beacons.youtube), twitch: !!(s.beacons && s.beacons.twitch) }
      },
      projects: d.projects.slice(0, 201).map(normProject)
    };
  }

  function activeExecutorProfile() {
    return S.settings.executorProfiles.find((profile) => profile.id === S.settings.activeExecutorProfile) || null;
  }

  function syncActiveExecutorProfile() {
    const profile = activeExecutorProfile();
    if (!profile) return;
    profile.executorPath = S.settings.exe;
    profile.autoexecFolder = S.settings.autoexec;
  }

  function saveExecutorProfile() {
    const name = clip(document.getElementById('s-profile-name')?.value, 50);
    if (!name) { toast('Enter a name for this executor profile.', 'err'); return; }
    let profile = activeExecutorProfile();
    if (!profile) {
      profile = { id: uid(), name, executorPath: S.settings.exe, autoexecFolder: S.settings.autoexec };
      S.settings.executorProfiles.push(profile);
      S.settings.activeExecutorProfile = profile.id;
    } else {
      profile.name = name;
      profile.executorPath = S.settings.exe;
      profile.autoexecFolder = S.settings.autoexec;
    }
    touch(); render(); toast('Executor profile saved.', 'ok');
  }

  function createExecutorProfile() {
    if (S.settings.executorProfiles.length >= 20) { toast('You can save up to 20 executor profiles.', 'err'); return; }
    const profile = { id: uid(), name: `Executor ${S.settings.executorProfiles.length + 1}`, executorPath: '', autoexecFolder: '' };
    S.settings.executorProfiles.push(profile);
    S.settings.activeExecutorProfile = profile.id;
    S.settings.exe = '';
    S.settings.autoexec = '';
    selectedScripts.clear();
    touch(); render();
    const nameField = document.getElementById('s-profile-name');
    if (nameField) { nameField.focus(); nameField.select(); }
  }

  async function switchExecutorProfile(id) {
    if (!id) {
      S.settings.activeExecutorProfile = '';
      touch(); render();
      return;
    }
    const profile = S.settings.executorProfiles.find((item) => item.id === id);
    if (!profile) return;
    S.settings.activeExecutorProfile = profile.id;
    S.settings.exe = profile.executorPath;
    S.settings.autoexec = profile.autoexecFolder;
    selectedScripts.clear();
    watchedScriptsPath = null;
    touch();
    await refreshScripts();
    render();
  }

  function deleteExecutorProfile() {
    const profile = activeExecutorProfile();
    if (!profile) return;
    S.settings.executorProfiles = S.settings.executorProfiles.filter((item) => item.id !== profile.id);
    S.settings.activeExecutorProfile = S.settings.executorProfiles[0]?.id || '';
    const next = activeExecutorProfile();
    S.settings.exe = next ? next.executorPath : '';
    S.settings.autoexec = next ? next.autoexecFolder : '';
    selectedScripts.clear();
    watchedScriptsPath = null;
    touch(); render();
  }

  /* ---------- state ---------- */
  let S = defaults();
  let info = { version: '', platform: '', dataFile: '', backupDir: '', openAtLogin: false };
  let updateInfo = { status: 'idle', version: '', percent: 0, message: 'Checking for updates...' };
  const ui = { view: 'home', id: null, projectReturnView: 'home', settingsFilter: '', modal: false, confirmDel: false, q: '', editTask: null, welcomeStep: 0, scriptDetails: null, scriptConflicts: null, studio: null };
  let renderedView = null;
  const drafts = {};
  const pal = { open: false, q: '', sel: 0 };
  const selectedScripts = new Map();
  let scriptCatalog = { scripts: [], userFolderValid: true, bundle: { version: '', changes: [], updateAvailable: false } };
  let scriptSearch = () => [];
  let scriptEditor = null;
  let studioEditor = null;
  let watchedScriptsPath = null;
  let installedScripts = [];
  let presenceConnected = false;
  let presenceBusy = false;
  let presenceMessage = 'Presence is not connected.';
  let spotifyConnected = false;
  let spotifyBusy = false;
  let spotifyTrack = null;
  let spotifyMessage = 'Connect Spotify to show the current track.';
  let spotifyPollTimer = null;
  let presenceRetryTimer = null;
  let presenceRetryCount = 0;
  let presenceManualDisconnect = false;
  let scriptQuery = '';
  let gameFilter = '';
  let executorFilter = '';
  let searchUpdateFrame = 0;
  let rpcUser = null;
  let weather = 'Syncing...';
  let saveTimer = null;
  let dirty = false;
  let presenceStartedAt = Date.now();

  const find = (id) => S.projects.find((p) => p.id === id);
  const progress = (p) => {
    const t = p.tasks.length, d = p.tasks.filter((x) => x.d).length;
    return { t, d, pct: t ? Math.round((100 * d) / t) : 0 };
  };

  function touch() {
    dirty = true;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flush, 350);
  }
  async function flush() {
    clearTimeout(saveTimer);
    if (!dirty) return;
    dirty = false;
    const ok = await API.save(S);
    if (!ok) toast('Could not save your changes.', 'err');
  }
  function migrateYuniSpotProject() {
    if (S.settings.yuniSpotProjectAdded) return false;
    if (!S.projects.some((project) => project.id === 'yunispot-launcher' || project.name.toLowerCase() === 'yunispot')) {
      if (S.projects.length >= 201) return false;
      S.projects.push(yuniSpotProject());
    }
    S.settings.yuniSpotProjectAdded = true;
    return true;
  }
  window.addEventListener('blur', flush);
  window.addEventListener('pagehide', flush);

  const nativeIconCache = new Map();
  let nativeIconRequest = 0;
  const FONT_STACKS = {
    system: '"Segoe UI", "Segoe UI Variable Text", system-ui, sans-serif',
    rounded: '"Trebuchet MS", "Segoe UI", sans-serif',
    serif: 'Georgia, "Times New Roman", serif',
    mono: '"Cascadia Code", Consolas, monospace'
  };
  const customFontCache = new Map();
  let customFontRequest = 0;
  let customFontLoadingPath = '';

  function themeLogoPath(theme) {
    if (theme === 'dehbify') return '../build/yunihub-icon-dehbify.svg';
    if (theme === 'berrybaby') return '../build/yunihub-icon-berrybaby.svg';
    return '../build/yunihub-icon.svg';
  }

  function applyAppearanceSettings() {
    const root = document.documentElement;
    const scale = Math.max(.9, Math.min(1.1, Number(S.settings.interfaceScale) || 1));
    root.style.setProperty('--ui-scale', String(scale));
    root.style.setProperty('--ui-inverse', `${100 / scale}%`);
    root.dataset.cardStyle = S.settings.cardStyle || 'glass';
    root.dataset.berryCursor = String(S.settings.theme === 'berrybaby' && S.settings.berryCursor);
    root.dataset.rgbAccents = String(!!S.settings.rgbAccents);
    root.style.setProperty('--studio-font-size', `${S.settings.studioFontSize || 13}px`);
    setPlexus(S.settings.theme === 'dehbify' || S.settings.theme === 'berrybaby', S.settings.reduceMotion, S.settings.theme, {
      intensity: S.settings.backgroundIntensity,
      speed: S.settings.backgroundSpeed
    });

    const preset = S.settings.fontPreset || 'system';
    const fontPath = S.settings.customFontPath;
    const useCustom = preset === 'custom' && !!fontPath;
    if (!useCustom) {
      customFontRequest++;
      customFontLoadingPath = '';
      root.style.removeProperty('--custom-font-source');
      root.style.setProperty('--font', FONT_STACKS[preset] || FONT_STACKS.system);
      return;
    }

    const cachedFont = customFontCache.get(fontPath);
    if (cachedFont) {
      root.style.setProperty('--custom-font-source', `url("${cachedFont}")`);
      root.style.setProperty('--font', '"Yuni Custom", "Segoe UI", sans-serif');
      return;
    }
    root.style.removeProperty('--custom-font-source');
    root.style.setProperty('--font', FONT_STACKS.system);
    if (!API.readCustomFont || customFontLoadingPath === fontPath) return;
    const request = ++customFontRequest;
    customFontLoadingPath = fontPath;
    Promise.resolve(API.readCustomFont(fontPath)).then((result) => {
      if (request !== customFontRequest || S.settings.customFontPath !== fontPath || S.settings.fontPreset !== 'custom') return;
      customFontLoadingPath = '';
      if (!result || !result.ok || typeof result.dataUrl !== 'string') return;
      customFontCache.set(fontPath, result.dataUrl);
      root.style.setProperty('--custom-font-source', `url("${result.dataUrl}")`);
      root.style.setProperty('--font', '"Yuni Custom", "Segoe UI", sans-serif');
    }).catch(() => { customFontLoadingPath = ''; });
  }

  function createThemeIconData(theme) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 128;
          canvas.height = 128;
          const context = canvas.getContext('2d');
          if (!context) throw new Error('Canvas is unavailable.');
          if (theme === 'custom') {
            const hue = getComputedStyle(document.documentElement).getPropertyValue('--logo-hue').trim();
            context.filter = hue ? `hue-rotate(${hue})` : 'none';
          }
          context.drawImage(image, 0, 0, 128, 128);
          resolve(canvas.toDataURL('image/png'));
        } catch (error) { reject(error); }
      };
      image.onerror = () => reject(new Error('Could not load the theme logo.'));
      image.src = themeLogoPath(theme);
    });
  }

  function syncNativeTheme(theme, background) {
    const request = ++nativeIconRequest;
    const accent = theme === 'custom' ? S.settings.customTheme.accent : '';
    const key = `${theme}:${accent}`;
    let iconData = nativeIconCache.get(key);
    if (!iconData) {
      iconData = createThemeIconData(theme);
      nativeIconCache.set(key, iconData);
      if (nativeIconCache.size > 8) nativeIconCache.delete(nativeIconCache.keys().next().value);
    }
    iconData.then((dataUrl) => {
      if (request === nativeIconRequest && S.settings.theme === theme) API.setTheme(theme, background, dataUrl);
    }).catch(() => {
      if (request === nativeIconRequest && S.settings.theme === theme) API.setTheme(theme, background);
    });
  }

  function applyTheme() {
    const root = document.documentElement;
    const theme = S.settings.theme;
    root.setAttribute('data-theme', theme);
    applyAppearanceSettings();
    const brandIcon = document.querySelector('.brand-icon');
    if (brandIcon) brandIcon.src = themeLogoPath(theme);
    const favicon = document.querySelector('link[rel="icon"]');
    if (favicon) favicon.href = themeLogoPath(theme);
    root.setAttribute('data-density', S.settings.compactMode ? 'compact' : 'comfortable');
    root.setAttribute('data-motion', S.settings.reduceMotion ? 'reduced' : 'full');
    const customProperties = ['--bg', '--glow1', '--glow2', '--glass', '--glass-2', '--glass-3', '--line', '--line-2', '--text', '--muted', '--faint', '--a1', '--a2', '--btn', '--btn-text', '--btn-shadow', '--eye', '--shadow', '--input', '--modal', '--scroll', '--edge', '--tint', '--tint-deep', '--logo-hue'];
    if (theme === 'custom') {
      const palette = S.settings.customTheme;
      const rgb = (color) => color.match(/[\da-f]{2}/gi).map((part) => parseInt(part, 16));
      const rgba = (color, alpha) => `rgba(${rgb(color).join(',')},${alpha})`;
      const luminance = (color) => {
        const [red, green, blue] = rgb(color).map((part) => part / 255);
        return .2126 * red + .7152 * green + .0722 * blue;
      };
      const shade = (color, factor) => `#${rgb(color).map((part) => Math.round(part * factor).toString(16).padStart(2, '0')).join('')}`;
      const hueOf = (color) => {
        const [r, g, b] = rgb(color).map((part) => part / 255);
        const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
        if (!d) return 350;
        const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
        return (h * 60 + 360) % 360;
      };
      const light = luminance(palette.background) > .56;
      const lightAccent = luminance(palette.accent) > .62;
      root.style.colorScheme = light ? 'light' : 'dark';
      const values = {
        '--bg': palette.background,
        '--glow1': rgba(palette.accent, .16),
        '--glow2': rgba(palette.accent, .07),
        '--glass': rgba(palette.surface, light ? .72 : .46),
        '--glass-2': rgba(palette.surface, light ? .84 : .68),
        '--glass-3': rgba(palette.surface, light ? .94 : .86),
        '--line': light ? rgba(palette.accent, .14) : 'rgba(255,255,255,.09)',
        '--line-2': rgba(palette.accent, .42),
        '--text': light ? '#21171A' : '#F6F1F2',
        '--muted': light ? '#654C52' : '#B7A6A9',
        '--faint': light ? '#886B71' : '#8E7076',
        '--a1': palette.accent,
        '--a2': shade(palette.accent, .72),
        '--btn': `linear-gradient(135deg, ${palette.accent}, ${shade(palette.accent, .72)})`,
        '--btn-text': lightAccent ? '#21171A' : '#FFFFFF',
        '--btn-shadow': rgba(palette.accent, .30),
        '--eye': palette.accent,
        '--shadow': light ? '0 16px 44px rgba(45,15,22,.16)' : '0 18px 50px rgba(0,0,0,.48)',
        '--input': rgba(palette.surface, light ? .92 : .58),
        '--modal': palette.surface,
        '--scroll': rgba(palette.accent, .28),
        '--edge': rgba(palette.accent, .45),
        '--tint': rgb(palette.accent).join(','),
        '--tint-deep': rgb(shade(palette.accent, .72)).join(','),
        '--logo-hue': `${Math.round(hueOf(palette.accent) - 350)}deg`
      };
      for (const [property, value] of Object.entries(values)) root.style.setProperty(property, value);
      root.querySelectorAll('.swatch.s-custom').forEach((swatch) => {
        swatch.style.setProperty('--custom-bg', palette.background);
        swatch.style.setProperty('--custom-surface', palette.surface);
        swatch.style.setProperty('--custom-accent', palette.accent);
      });
    } else {
      root.style.removeProperty('color-scheme');
      for (const property of customProperties) root.style.removeProperty(property);
    }
    syncNativeTheme(theme, theme === 'custom' ? S.settings.customTheme.background : undefined);
  }

  /* ---------- toast (with optional action, used for undo) ---------- */
  let toastTimer = null;
  let toastAction = null;
  function toast(msg, kind, action) {
    const el = document.getElementById('toast');
    el.innerHTML = '<span></span>' + (action ? `<button type="button" class="toast-btn">${esc(action.label)}</button>` : '');
    el.firstChild.textContent = msg;
    el.className = 'show ' + (kind || '') + (action ? ' has-action' : '');
    toastAction = action ? action.fn : null;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.className = ''; toastAction = null; }, action ? 7000 : 3400);
  }
  document.getElementById('toast').addEventListener('click', (e) => {
    if (e.target.closest('.toast-btn') && toastAction) {
      const fn = toastAction;
      toastAction = null;
      document.getElementById('toast').className = '';
      fn();
    }
  });

  /* ---------- views ---------- */
  function greeting() {
    const h = new Date().getHours();
    const g = h < 5 ? 'Good evening' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
    const n = S.settings.name || 'User';
    return `${g}${n ? ', ' + esc(n) : ''}. Welcome to ${esc(S.settings.hubName)}.`;
  }

  function overall() {
    let t = 0, d = 0;
    S.projects.forEach((p) => { const x = progress(p); t += x.t; d += x.d; });
    return { t, d, pct: t ? Math.round((100 * d) / t) : 0 };
  }

  function nextUp() {
    let best = null;
    S.projects.forEach((p) => {
      if (p.status === 'Shipped') return;
      const open = p.tasks.find((t) => !t.d);
      if (!open) return;
      const rank = (p.status === 'Building' || p.status === 'Testing' ? 100 : 0) + progress(p).pct;
      if (!best || rank > best.rank) best = { rank, p, task: open.t };
    });
    return best;
  }

  function visible(track) {
    let items = S.projects.filter((p) => !track || p.track === track);
    const q = ui.q.trim().toLowerCase();
    if (q) items = items.filter((p) => (p.name + ' ' + p.desc + ' ' + p.status + ' ' + p.track).toLowerCase().includes(q));
    const cmps = {
      manual: () => 0,
      recent: (a, b) => (b.opened || 0) - (a.opened || 0),
      progress: (a, b) => progress(b).pct - progress(a).pct,
      name: (a, b) => a.name.localeCompare(b.name)
    };
    const cmp = cmps[S.settings.sort] || cmps.manual;
    return items.map((p, i) => ({ p, i }))
      .sort((a, b) => ((+!!b.p.pinned) - (+!!a.p.pinned)) || cmp(a.p, b.p) || a.i - b.i)
      .map((x) => x.p);
  }

  /* ---------- tools ---------- */
  const TOOLS = [
    { id: 'yunispot', cat: 'Spotify', icon: 'headphones', name: 'YuniSpot', label: 'Install / update', desc: 'Optional Spotify customization. Install or update the bundled YuniSpot tools, then apply or restore the Spotify patch.' },
    { id: 'autoload', cat: 'Roblox', icon: 'toolbox', name: 'Script Library', label: 'Open library', desc: 'Browse bundled Yuniku scripts and your own library. Choose exactly what to copy into your executor.' },
    { id: 'executor', cat: 'Roblox', icon: 'bolt', name: 'Executor Launcher', label: 'Launch', desc: 'Quick-launch your executor directly from the hub.' },
    { id: 'ps4-package-sender', cat: 'PS4', icon: 'gamepad', name: 'PS4 Remote Package Sender', soon: true, desc: 'A planned FTP-based package transfer utility for sending packages to a configured PS4.' },
    { id: 'yunisave', cat: 'PS4', icon: 'toolbox', name: 'YuniSaver', label: 'Launch', desc: 'Open the YuniSaver builder to create PS4 save-editor packages.' },
    { id: 'yunistrapper', cat: 'Roblox', icon: 'globe', name: 'YuniStrapper', label: 'Launch', desc: 'Open the YuniStrapper Roblox custom bootstrapper.' },
    { id: 'youtube', cat: 'Discord', icon: 'video', name: 'YouTube Beacon', toggle: true, desc: 'Requires Tampermonkey + the Yuniku Hub userscript installed in your browser. Then this updates your Discord Rich Presence while watching YouTube.' },
    { id: 'twitch', cat: 'Discord', icon: 'chat', name: 'Twitch Beacon', toggle: true, desc: 'Requires Tampermonkey + the Yuniku Hub userscript installed in your browser. Then this updates your Discord Rich Presence while watching or streaming on Twitch.' }
  ];

  function toolCard(t) {
    const on = t.toggle && S.settings.beacons[t.id];
    const appPathKey = t.id === 'yunisave' ? 'yuniSaverPath' : t.id === 'yunistrapper' ? 'yuniStrapperPath' : null;
    const label = t.soon ? 'Coming soon' : t.toggle ? (on ? 'Disable' : 'Enable')
      : t.id === 'yunispot' ? (yuniSpotStatus && yuniSpotStatus.yuniSpot ? 'Update YuniSpot' : 'Install YuniSpot')
        : appPathKey && !S.settings[appPathKey] ? 'Choose & launch' : t.label;
    const extraAction = t.id === 'yunispot' && yuniSpotStatus && yuniSpotStatus.yuniSpot
      ? `<button class="btn" data-act="tool" data-id="yunispot-restore" data-k="tool-yunispot-restore">Restore Spotify</button>` : '';
    return `<article class="card"><div class="card-top"><div class="tile">${svg(t.icon)}</div>
      <div class="card-head"><h3>${esc(t.name)}</h3><span class="pill ${t.soon ? 'st-Idea' : 'st-Shipped'}">${t.soon ? 'coming soon' : on ? 'on' : 'available'}</span></div></div>
      <p class="desc">${esc(t.desc)}</p>
      <div class="actions"><button class="btn${t.soon ? '' : ' primary'}" data-act="tool" data-id="${t.id}" data-k="tool-${t.id}"${t.soon ? ' disabled' : ''}>${label}</button>${extraAction}</div></article>`;
  }
  const toolGrid = (cat) => `<div class="grid tools-grid">${TOOLS.filter((t) => !cat || t.cat === cat).map(toolCard).join('')}</div>`;

  function filteredScripts() {
    return scriptSearch(scriptQuery, gameFilter, executorFilter);
  }

  function scriptRowsMarkup(items, source, empty) {
    if (!items.length) return `<p class="help script-empty">${empty}</p>`;
    return items.map((script, index) => {
      const key = `${script.source}:${script.name}`;
      const detailsKey = `${source}-${index}`;
      return `<div class="script-row">
        <input class="chk script-check" type="checkbox" aria-label="Select ${esc(script.title)}" data-source="${script.source}" data-name="${esc(script.name)}" data-k="script-${source}-${index}"${selectedScripts.has(key) ? ' checked' : ''}>
        <span class="script-mark">${svg('code')}</span>
        <span class="script-copy"><button class="script-title" data-act="script-details" data-source="${script.source}" data-name="${esc(script.name)}" data-k="detail-${detailsKey}">${esc(script.title)}</button><small>${esc(script.name)} &middot; v${esc(script.version)} &middot; ${esc(script.author)}</small></span>
        <span class="pill ${script.supportsAutoload ? 'st-Shipped' : 'st-Idea'}">${script.supportsAutoload ? 'autoload ready' : 'manual load'}</span>
      </div>`;
    }).join('');
  }

  function scriptGroupsMarkup(filtered) {
    const builtins = filtered.filter((script) => script.source === 'builtin');
    const users = filtered.filter((script) => script.source === 'user');
    return { builtins, users, html: `<section class="script-group"><h4>Yuniku scripts <span>${builtins.length}</span></h4>${scriptRowsMarkup(builtins, 'builtin', 'No bundled Yuniku scripts match these filters.')}</section>
      <section class="script-group"><h4>Your scripts <span>${users.length}</span></h4>
        ${!scriptCatalog.userFolderValid ? '<p class="help script-error">The selected user scripts folder could not be found. Choose another folder in Settings.</p>' : scriptRowsMarkup(users, 'user', S.settings.scripts ? 'No user scripts match these filters.' : 'Choose a user scripts folder in Settings to scan your scripts.')}
      </section>` };
  }

  function updateScriptResults() {
    const groups = document.getElementById('script-groups');
    if (!groups) return;
    const filtered = filteredScripts();
    groups.innerHTML = scriptGroupsMarkup(filtered).html;
    const count = document.getElementById('script-result-count');
    if (count) count.textContent = `${filtered.length} of ${scriptCatalog.scripts.length}`;
  }

  function scriptLibraryMarkup() {
    const filtered = filteredScripts();
    const groups = scriptGroupsMarkup(filtered);
    const selected = Array.from(selectedScripts.values());
    const canAutoload = selected.length > 0 && selected.every((script) => script.supportsAutoload);
    const games = Array.from(new Set(scriptCatalog.scripts.flatMap((script) => script.games))).sort();
    const executors = Array.from(new Set(scriptCatalog.scripts.flatMap((script) => script.supportedExecutors))).sort();
    const bundle = scriptCatalog.bundle || {};
    return `<section class="panel script-library" id="script-library">
      <div class="script-head"><div><span class="label">ROBLOX TOOLS</span><h3>Script library <small id="script-result-count">${filtered.length} of ${scriptCatalog.scripts.length}</small></h3></div>
        <button class="icon-btn" data-act="script-refresh" data-k="script-refresh" aria-label="Refresh script library" title="Refresh script library">${svg('arrow')}</button></div>
      ${bundle.updateAvailable ? `<div class="bundle-notice"><div><b>Yuniku scripts updated to v${esc(bundle.version)}</b><ul>${(bundle.changes || []).map((change) => `<li>${esc(change)}</li>`).join('')}</ul></div><button class="btn" data-act="script-bundle-ack" data-v="${esc(bundle.version)}" data-k="bundle-ack">Got it</button></div>` : ''}
      <div class="script-filters"><label class="search">${svg('search')}<input id="script-search" class="in" placeholder="Search name, game, tag, executor" value="${esc(scriptQuery)}" autocomplete="off"></label>
        <select id="script-game-filter" class="in sel" aria-label="Filter by game"><option value="">All games</option>${games.map((game) => `<option value="${esc(game)}"${gameFilter === game ? ' selected' : ''}>${esc(game)}</option>`).join('')}</select>
        <select id="script-executor-filter" class="in sel" aria-label="Filter by executor"><option value="">All executors</option>${executors.map((executor) => `<option value="${esc(executor)}"${executorFilter === executor ? ' selected' : ''}>${esc(executor)}</option>`).join('')}</select>
      </div>
      <div class="script-groups" id="script-groups">${groups.html}</div>
      <div class="script-actions"><span class="help">${selected.length} selected</span>
        <div class="actions"><button class="btn" data-act="script-copy" data-mode="executor" data-k="script-copy"${selected.length ? '' : ' disabled'}>Copy to executor</button>
          <button class="btn primary" data-act="script-copy" data-mode="autoload" data-k="script-autoload"${canAutoload && S.settings.autoexec ? '' : ' disabled'}>Add to autoload</button></div>
      </div>
      ${!S.settings.autoexec ? '<p class="help">Set an executor autoload folder in Settings. Only supported scripts can be added.</p>' : ''}
      <section class="installed-scripts"><div class="installed-head"><h4>Installed scripts <span>${installedScripts.length}</span></h4><button class="textbtn" data-act="script-backups" data-k="script-backups">Open backups</button></div>
        ${installedScripts.length ? installedScripts.map((script, index) => `<div class="installed-row"><div><b>${esc(script.name)}</b><small>${script.action === 'autoload' ? 'Autoload' : 'Executor'} &middot; ${esc(script.destination)}</small></div><button class="btn danger" data-act="script-remove" data-name="${esc(script.name)}" data-destination="${esc(script.destination)}" data-k="remove-script-${index}">Remove</button></div>`).join('') : '<p class="help">YuniHub-managed copies will appear here.</p>'}
      </section>
    </section>`;
  }

  function scriptDetailsModal() {
    const detail = ui.scriptDetails;
    if (!detail) return '';
    const script = detail.script;
    const item = (label, values) => values && values.length ? `<div class="script-detail"><span class="label">${label}</span><span>${values.map(esc).join(', ')}</span></div>` : '';
    return `<div class="scrim script-preview-scrim" data-act="script-preview-scrim"><section class="script-preview modal" role="dialog" aria-modal="true" aria-labelledby="script-preview-title">
      <div class="script-preview-head"><div><span class="label">${script.source === 'builtin' ? 'YUNIKU SCRIPT' : 'USER SCRIPT'}</span><h2 id="script-preview-title">${esc(script.title)}</h2><p class="help">${esc(script.description || 'No description provided.')}</p></div><button class="icon-btn" data-act="script-details-close" data-k="script-details-close" aria-label="Close script preview" title="Close">${svg('x')}</button></div>
      <div class="script-details-grid"><div class="script-detail"><span class="label">Version</span><span>${esc(script.version)}</span></div><div class="script-detail"><span class="label">Author</span><span>${esc(script.author)}</span></div><div class="script-detail"><span class="label">Autoload</span><span>${script.supportsAutoload ? 'Supported' : 'Not declared'}</span></div>${item('Games', script.games)}${item('Executors', script.supportedExecutors)}${item('Tags', script.tags)}</div>
      <div class="script-source-head"><span class="label">Source preview · read only</span><span class="mono">${esc(script.name)}</span></div><div class="script-editor" id="script-editor" aria-label="Read-only script source"></div>
      <div class="actions"><button class="btn" data-act="script-details-close" data-k="script-details-close">Close</button></div>
    </section></div>`;
  }

  async function mountScriptEditor(mount, detail) {
    const { createScriptEditor } = await import('./script-preview.js');
    if (mount.isConnected && ui.scriptDetails === detail) scriptEditor = createScriptEditor(mount, detail);
  }

  const STUDIO_MODES = {
    c: cpp, cc: cpp, cpp, h: cpp, hpp: cpp, cs: csharp, java, kt: kotlin,
    css, scss: css, go, js: javascript, jsx: javascript, mjs: javascript, cjs: javascript,
    ts: typescript, tsx: typescript, json, lua, luau: lua, ps1: powerShell, py: python,
    rs: rust, sh: shell, bash: shell, zsh: shell, sql: sqlite, swift, html: xml, svg: xml,
    xml, yml: yaml, yaml
  };
  const studioTheme = EditorView.theme({
    '&': { height: '100%', backgroundColor: 'transparent', color: 'var(--text)', fontSize: 'var(--studio-font-size, 13px)' },
    '.cm-scroller': { overflow: 'auto', fontFamily: 'var(--font)' },
    '.cm-gutters': { backgroundColor: 'transparent', color: 'var(--faint)', borderRight: '1px solid var(--line)' },
    '.cm-activeLine, .cm-activeLineGutter': { backgroundColor: 'rgba(255,255,255,.04)' },
    '.cm-cursor': { borderLeftColor: 'var(--a1)' },
    '&.cm-focused': { outline: 'none' }
  });

  function mountStudioEditor(mount, studio) {
    if (!mount) return;
    const extension = STUDIO_MODES[(studio.activeFile.split('.').pop() || '').toLowerCase()];
    const extensions = [basicSetup, search(), studioTheme];
    if (S.settings.studioWordWrap) extensions.push(EditorView.lineWrapping);
    extensions.push(EditorView.updateListener.of((update) => {
      if (ui.studio !== studio || (!update.docChanged && !update.selectionSet)) return;
      if (update.docChanged) {
        studio.content = update.state.doc.toString();
        studio.dirty = true;
      }
      const line = update.state.doc.lineAt(update.state.selection.main.head);
      const cursorStatus = document.getElementById('studio-cursor-status');
      if (cursorStatus) cursorStatus.textContent = `Ln ${line.number}, Col ${update.state.selection.main.head - line.from + 1}`;
      const status = document.getElementById('studio-save-status');
      if (status) status.textContent = studio.dirty ? 'Unsaved' : 'Saved';
      const save = document.querySelector('[data-act="studio-save"]');
      if (save) save.disabled = !studio.dirty;
    }));
    if (extension) extensions.push(StreamLanguage.define(extension));
    studioEditor = new EditorView({ doc: studio.content || '', extensions, parent: mount });
  }

  function scriptConflictModal() {
    if (!ui.scriptConflicts) return '';
    return `<div class="scrim"><section class="modal script-conflict" role="dialog" aria-modal="true" aria-labelledby="script-conflict-title">
      <span class="label">FILE CONFLICT</span><h2 id="script-conflict-title">These filenames already exist</h2>
      <p class="help">YuniHub will back up each existing file before replacing it. No files will be overwritten unless you confirm.</p>
      <ul class="script-conflict-list">${ui.scriptConflicts.conflicts.map((name) => `<li>${esc(name)}</li>`).join('')}</ul>
      <div class="actions"><button class="btn" data-act="script-conflict-cancel" data-k="script-conflict-cancel">Keep existing files</button>
        <button class="btn primary" data-act="script-conflict-replace" data-k="script-conflict-replace">Back up and replace</button></div>
    </section></div>`;
  }

  async function openScriptDetails(selection) {
    const result = await API.readScript(selection, S.settings.scripts);
    if (!result || !result.ok) { toast((result && result.error) || 'Could not read this script.', 'err'); return; }
    ui.scriptDetails = result;
    render();
  }

  async function refreshScripts(notify = false) {
    if (!API.listScripts) return;
    const result = await API.listScripts(S.settings.scripts);
    if (!result || !result.ok) {
      if (notify) toast((result && result.error) || 'Could not scan script folders.', 'err');
      return;
    }
    scriptCatalog = { scripts: result.scripts || [], userFolderValid: result.userFolderValid !== false, bundle: result.bundle || {} };
    scriptSearch = createScriptSearch(scriptCatalog.scripts);
    const available = new Map(scriptCatalog.scripts.map((script) => [`${script.source}:${script.name}`, script]));
    for (const [key, selected] of selectedScripts) {
      const current = available.get(key);
      if (!current) selectedScripts.delete(key);
      else selectedScripts.set(key, { ...selected, supportsAutoload: current.supportsAutoload });
    }
    if (API.listManagedScripts) {
      const managed = await API.listManagedScripts();
      installedScripts = managed && managed.ok ? managed.scripts || [] : [];
    }
    if (watchedScriptsPath !== S.settings.scripts && API.watchScripts) {
      watchedScriptsPath = S.settings.scripts;
      const watcher = await API.watchScripts(S.settings.scripts);
      if (!watcher || !watcher.ok) {
        watchedScriptsPath = null;
        if (notify) toast('Could not watch this script folder. Manual refresh is still available.', 'err');
      }
    }
    if (ui.view === 'Roblox') render();
    if (notify) toast(`Found ${scriptCatalog.scripts.length} script${scriptCatalog.scripts.length === 1 ? '' : 's'}.`, 'ok');
  }

  function viewTools(cat) {
      function spotifyPlayerMarkup() {
        const track = spotifyTrack;
        const progress = track && track.durationMs ? Math.min(100, Math.max(0, track.progressMs / track.durationMs * 100)) : 0;
        const clientId = S.settings.spotifyClientId || '';
        const artwork = track && track.image;
        return `<section class="spotify-player panel">
          <div class="spotify-player-heading"><div><span class="label">YUNISPOT · NOW PLAYING</span><h3>Spotify player</h3></div><span class="discord-status-pill${spotifyConnected ? ' online' : ''}"><i></i>${spotifyConnected ? 'Connected' : 'Disconnected'}</span></div>
          ${track ? `<div class="spotify-now-playing"><div class="spotify-artwork">${artwork ? `<img src="${esc(artwork)}" alt="">` : svg('headphones')}</div><div class="spotify-track-copy"><b>${esc(track.name)}</b><span>${esc(track.artists || 'Unknown artist')}</span><small>${esc(track.album || '')}${track.isPlaying ? ' · Playing' : ' · Paused'}</small></div></div><div class="spotify-progress"><i style="--progress:${progress}%"></i></div>` : `<div class="spotify-empty"><span class="spotify-artwork">${svg('headphones')}</span><div><b>${spotifyConnected ? 'Nothing is playing right now' : 'Connect your Spotify account'}</b><small>${esc(spotifyMessage)}</small></div></div>`}
          <div class="spotify-actions"><button class="btn primary" data-act="spotify-refresh" data-k="spotify-refresh"${spotifyConnected ? '' : ' disabled'}>Refresh track</button><button class="btn" data-act="spotify-open" data-k="spotify-open">Open Spotify</button>${spotifyConnected ? '<button class="btn danger" data-act="spotify-disconnect" data-k="spotify-disconnect">Disconnect</button>' : ''}</div>
          ${!spotifyConnected ? `<div class="spotify-connect"><label class="appearance-select"><span>Spotify Client ID</span><input class="in" id="spotify-client-id" value="${esc(clientId)}" maxlength="32" placeholder="32-character Client ID" autocomplete="off" spellcheck="false"></label><p class="help">Create an app in the Spotify Developer Dashboard and add this redirect URI:</p><code>http://127.0.0.1:43821/callback</code><button class="btn primary" data-act="spotify-connect" data-k="spotify-connect"${spotifyBusy ? ' disabled' : ''}>${spotifyBusy ? 'Waiting for Spotify…' : 'Connect Spotify'}</button></div>` : ''}
          <p class="spotify-premium-note">Free account mode reads the current track and shares it on Discord. Spotify requires Premium for remote play, pause, and skip controls.</p>
        </section>`;
      }

      async function refreshSpotifyStatus({ notify = false } = {}) {
        if (spotifyBusy) return false;
        const clientId = S.settings.spotifyClientId;
        if (!clientId || !API.spotifyStatus) {
          spotifyConnected = false;
          spotifyTrack = null;
          spotifyMessage = 'Add your Spotify Client ID to connect.';
          if (ui.view === 'Spotify') render();
          return false;
        }
        spotifyBusy = true;
        let result;
        try { result = await API.spotifyStatus(clientId); }
        catch (error) { result = { ok: false, connected: false, error: error.message || 'Spotify status request failed.' }; }
        spotifyBusy = false;
        const previous = JSON.stringify(spotifyTrack);
        spotifyConnected = !!(result && result.ok && result.connected);
        spotifyTrack = spotifyConnected ? result.track || null : null;
        spotifyMessage = spotifyConnected
          ? (spotifyTrack ? `${spotifyTrack.isPlaying ? 'Playing' : 'Paused'} on Spotify.` : 'Spotify is connected. Start playback to see the current track.')
          : ((result && result.error) || 'Connect Spotify to read the current track.');
        if (spotifyConnected && !spotifyPollTimer) spotifyPollTimer = setInterval(() => { if (spotifyConnected) refreshSpotifyStatus(); }, 15000);
        if (!spotifyConnected && spotifyPollTimer) { clearInterval(spotifyPollTimer); spotifyPollTimer = null; }
        if (previous !== JSON.stringify(spotifyTrack)) updateDiscordActivity();
        if (ui.view === 'Spotify') render();
        if (notify) toast(spotifyConnected ? 'Spotify status refreshed.' : spotifyMessage, spotifyConnected ? 'ok' : 'err');
        return spotifyConnected;
      }

      function discordConnectionMarkup() {
        const user = S.settings.discordUser || rpcUser;
        const linked = !!S.settings.discordSession;
        const avatar = discordAvatarUrl(user);
        const displayName = user && (user.global_name || user.username) || 'No Discord account connected';
        const activity = presencePayload();
        return `<section class="discord-connection-grid">
          <article class="panel discord-connection-card">
            <div class="discord-connection-heading"><span class="label">ACCOUNT</span><span class="discord-status-pill${linked ? ' online' : ''}"><i></i>${linked ? 'Linked' : 'Not linked'}</span></div>
            <div class="discord-account-row">${avatar ? `<img class="discord-account-avatar" src="${esc(avatar)}" alt="">` : `<span class="discord-account-avatar fallback">${svg('chat')}</span>`}<div class="discord-account-copy"><b>${esc(displayName)}</b><small>${linked ? 'Profile and name are synced from Discord.' : 'Local projects still work without linking.'}</small></div></div>
            <div class="discord-unlock-list"><span>${svg('check')}Profile name and avatar sync</span><span>${svg('check')}Project and theme-matched Rich Presence</span><span>${svg('check')}Optional YouTube and Twitch activity</span></div>
            <div class="actions">${linked ? `<button class="btn" data-act="discord-profile-refresh" data-k="discord-profile-refresh">Sync profile</button>${user && user.id ? `<button class="btn" data-act="discord-profile-open" data-id="${esc(user.id)}" data-k="discord-profile-open">Open profile</button>` : ''}<button class="btn danger" data-act="rpcout" data-k="discord-account-disconnect">Disconnect account</button>` : '<button class="btn primary" data-act="rpclink" data-k="discord-account-connect">Connect Discord account</button>'}</div>
          </article>
          <article class="panel discord-connection-card discord-presence-card">
            <div class="discord-connection-heading"><span class="label">RICH PRESENCE</span><span class="discord-status-pill${presenceConnected ? ' online' : ''}"><i></i>${presenceConnected ? 'Live' : presenceBusy ? 'Connecting' : 'Disconnected'}</span></div>
            <div class="discord-activity-preview"><img src="${themeLogoPath(S.settings.theme)}" alt=""><div><span>${esc(S.settings.hubName || 'YuniHub')}</span><b>${esc(activity.details || 'YuniHub')}</b><small>${esc(activity.state || 'Ready to share your activity')}</small></div></div>
            <p class="help">${esc(presenceMessage)}</p>
            <label class="discord-privacy-control"><span><b>Keep activity current</b><small>Update your status as you move between projects and tools.</small></span><input type="checkbox" class="switch" data-act="presenceAutoUpdate"${S.settings.presenceAutoUpdate ? ' checked' : ''} aria-label="Keep Discord activity current"></label>
            <label class="discord-privacy-control"><span><b>Show project names</b><small>Hide the current project name from your Discord status.</small></span><input type="checkbox" class="switch" data-act="presenceShowProject"${S.settings.presenceShowProject ? ' checked' : ''} aria-label="Show project names on Discord"></label>
            <div class="actions">${presenceConnected
              ? '<button class="btn" data-act="discord-presence-refresh" data-k="discord-presence-refresh">Refresh activity</button><button class="btn danger" data-act="rpc-presence-disconnect" data-k="discord-presence-disconnect">Disconnect Rich Presence</button>'
              : `<button class="btn primary" data-act="rpc-presence-connect" data-k="discord-presence-connect"${!linked || presenceBusy ? ' disabled' : ''}>${presenceBusy ? 'Connecting...' : 'Start Rich Presence'}</button>`}</div>
            ${!linked ? '<span class="help">Link your account first to start live Rich Presence.</span>' : ''}
          </article>
        </section>`;
      }

    const extra = cat === 'Discord' ? `<section class="panel" style="margin-top:16px"><h3>Browser userscript</h3>
      <p class="help">Install Tampermonkey, then add this script. It sends the current video title to the hub on this PC only (127.0.0.1), and the hub shows it on Discord. Link Discord in the sidebar first.</p>
      <div class="actions"><button class="btn" data-act="ut" data-k="ut">Export userscript</button></div></section>` : '';
    const orbCompleter = cat === 'Discord' ? `<section class="panel discord-orb-card">
      <div class="discord-orb-heading"><span class="discord-orb-icon">${svg('orb')}</span><h3>YuiOrb Quest Completer</h3></div>
      <p class="help">Open the bundled Windows companion to browse detectable games and manage local quest timers. It opens in its own window.</p>
      <div class="actions"><button class="btn primary" data-act="orb-completer-launch" data-k="orb-completer-launch">${svg('play')}Open Orb Completer</button></div>
    </section>` : '';
    const discordHub = cat === 'Discord' ? discordConnectionMarkup() : '';
    const spotifyHub = cat === 'Spotify' ? spotifyPlayerMarkup() : '';
    const scripts = cat === 'Roblox' ? scriptLibraryMarkup() : '';
    return `<div class="sec-head"><h2>${cat === 'Discord' ? 'Discord' : cat === 'Spotify' ? 'YuniSpot' : cat}</h2></div>${spotifyHub}${discordHub}${cat === 'Spotify' ? '' : toolGrid(cat)}${scripts}${orbCompleter}${extra}`;
  }

  function studioName(relativePath) { return String(relativePath || '').split('/').pop() || ''; }

  function dependencyInstallCommand(studio) {
    const rootFiles = new Set(studio.files.filter((entry) => !entry.path.includes('/')).map((entry) => entry.name.toLowerCase()));
    if (rootFiles.has('package.json')) {
      if (rootFiles.has('pnpm-lock.yaml')) return 'pnpm install --frozen-lockfile';
      if (rootFiles.has('yarn.lock')) return 'yarn install --frozen-lockfile';
      if (rootFiles.has('package-lock.json')) return 'npm ci';
      return 'npm install';
    }
    if (rootFiles.has('requirements.txt')) return 'python -m pip install -r requirements.txt';
    if (rootFiles.has('pyproject.toml')) return 'python -m pip install -e .';
    if (rootFiles.has('cargo.toml')) return 'cargo build';
    if (rootFiles.has('go.mod')) return 'go mod download';
    if (rootFiles.has('pubspec.yaml')) return 'flutter pub get';
    if (rootFiles.has('composer.json')) return 'composer install';
    if (rootFiles.has('gemfile')) return 'bundle install';
    if (rootFiles.has('pom.xml')) return 'mvn dependency:resolve';
    if (rootFiles.has('build.gradle') || rootFiles.has('build.gradle.kts')) return 'gradle dependencies';
    return '';
  }

  async function refreshStudioFiles(studio) {
    const result = await API.listWorkspaceFiles(studio.folder);
    if (!result || !result.ok) { toast((result && result.error) || 'Could not scan this workspace.', 'err'); return false; }
    studio.files = result.files.map((filePath) => ({ id: filePath, path: filePath, name: studioName(filePath) }));
    return true;
  }

  async function refreshStudioDiagnostics(studio) {
    const folder = studio.folder;
    const result = await API.diagnoseWorkspace(folder);
    if (studio.folder !== folder || !result || !result.ok) return;
    studio.sourceProblems = result.diagnostics.map((item) => `${item.file}:${item.line}:${item.column} ${item.message}`);
    studio.diagnosticsChecked = result.checked;
    studio.diagnosticsTruncated = !!result.truncated;
    if (ui.view === 'Studio' && studio.activePanel === 'problems') {
      const findings = [...studio.sourceProblems, ...studio.problems];
      const title = document.querySelector('.studio-panel-title');
      const output = document.querySelector('.studio-panel-console pre');
      if (title) title.textContent = `${findings.length} issue${findings.length === 1 ? '' : 's'} · checked ${studio.diagnosticsChecked} supported files`;
      if (output) output.textContent = findings.join('\n') || `No JS, ESM, JSX, TypeScript, TSX, or JSON syntax errors in ${studio.diagnosticsChecked} checked files. Other languages need their analyzer.`;
    }
  }

  async function loadStudioWorkspace(studio) {
    if (!studio.folder || studio.loaded || studio.loading) return;
    const folder = studio.folder;
    studio.loading = true;
    const result = await API.listWorkspaceFiles(folder);
    if (studio.folder !== folder) return;
    studio.loading = false;
    studio.loaded = true;
    if (!result || !result.ok) {
      toast((result && result.error) || 'Could not scan this workspace.', 'err');
      render();
      return;
    }
    studio.files = result.files.map((filePath) => ({ id: filePath, path: filePath, name: studioName(filePath) }));
    refreshStudioDiagnostics(studio);
    if (studio.files.length && !studio.activeFile) await openStudioFile(studio, studio.files[0].path);
    else if (ui.view === 'Studio') render();
  }

  async function saveStudioFile(studio, announce = true) {
    if (!studio.dirty || !studio.activeFile) return true;
    const result = await API.saveWorkspaceFile({ folder: studio.folder, path: studio.activeFile, content: studio.content });
    if (!result || !result.ok) { toast((result && result.error) || 'Could not save this file.', 'err'); return false; }
    studio.dirty = false;
    refreshStudioDiagnostics(studio);
    if (announce) toast(`Saved ${studio.activeFile}.`, 'ok');
    return true;
  }

  async function openStudioFile(studio, relativePath) {
    if (relativePath === studio.activeFile) return;
    if (!await saveStudioFile(studio, false)) return;
    const result = await API.readWorkspaceFile({ folder: studio.folder, path: relativePath });
    if (!result || !result.ok) { toast((result && result.error) || 'Could not open this file.', 'err'); return; }
    studio.activeFile = relativePath;
    studio.content = result.content;
    studio.dirty = false;
    if (!studio.openFiles.includes(relativePath)) studio.openFiles.push(relativePath);
    render();
  }

  async function closeStudioTab(studio, closing) {
    if (closing === studio.activeFile && !await saveStudioFile(studio, false)) return;
    studio.openFiles = studio.openFiles.filter((filePath) => filePath !== closing);
    if (closing === studio.activeFile) {
      studio.activeFile = '';
      studio.content = '';
      studio.dirty = false;
      if (studio.openFiles.length) await openStudioFile(studio, studio.openFiles[studio.openFiles.length - 1]);
      else render();
    } else render();
  }

  async function chooseStudioFolder(studio) {
    if (!await saveStudioFile(studio, false)) return;
    const folder = await API.pick('folder');
    if (!folder) return;
    if (studio.terminalSessionId) await API.stopStudioTerminal(studio.terminalSessionId);
    studio.terminalSessionId = '';
    studio.terminalConnecting = false;
    studio.terminalStartPromise = null;
    studio.terminalEarlyEvents = [];
    studio.folder = folder;
    studio.loaded = false;
    studio.loading = false;
    try { localStorage.setItem('yunihub-studio-folder', folder); } catch { /* browser storage is optional */ }
    studio.files = [];
    studio.openFiles = [];
    studio.activeFile = '';
    studio.content = '';
    studio.dirty = false;
    studio.fileQuery = '';
    studio.fileLimit = 200;
    studio.terminal = [`Working directory: ${folder}`];
    await loadStudioWorkspace(studio);
    render();
  }

  async function refreshStudioPorts(studio) {
    studio.portsLoading = true;
    studio.portsError = '';
    render();
    const result = await API.listStudioPorts();
    studio.portsLoading = false;
    studio.ports = result && result.ok ? result.ports : [];
    studio.portsError = result && result.ok ? '' : ((result && result.error) || 'Could not inspect listening ports.');
    render();
  }

  function appendStudioTerminalText(studio, text) {
    studio.terminalText = (studio.terminalText + text).slice(-48000);
    const output = document.querySelector('.studio-terminal pre');
    if (output && studio.activePanel === 'terminal') {
      output.textContent = studio.terminalText || studio.terminal.join('\n');
      output.scrollTop = output.scrollHeight;
    }
  }

  function updateStudioTerminalChrome(studio) {
    const status = document.querySelector('.studio-terminal .terminal-header > span');
    if (status) status.textContent = studio.running ? 'Running command' : (studio.terminalConnecting ? 'Starting shell...' : (studio.folder || 'folder required'));
    const actions = document.querySelector('.studio-terminal .terminal-header .tools');
    if (actions) actions.innerHTML = `${studio.running ? '<button class="btn danger" data-act="studio-stop">Stop</button>' : ''}<button class="icon-btn" data-act="studio-clear" aria-label="Clear terminal output" title="Clear terminal output">${svg('trash')}</button>`;
    const input = document.getElementById('studio-command');
    const run = document.querySelector('#studio-command-form button[type="submit"]');
    if (input) input.disabled = (studio.running && !studio.debugMode) || !studio.folder;
    if (run) run.disabled = (studio.running && !studio.debugMode) || !studio.folder;
  }

  function handleStudioTerminalData(payload) {
    const studio = ui.studio;
    if (!studio || !payload) return;
    if (!studio.terminalSessionId && studio.terminalConnecting) {
      studio.terminalEarlyEvents.push(payload);
      return;
    }
    if (payload.sessionId !== studio.terminalSessionId) return;

    if (payload.type === 'stderr' || payload.type === 'error') {
      const text = stripTerminalControlSequences(payload.text || '');
      appendStudioTerminalText(studio, text);
      studio.commandOutput += text;
      studio.debugOutput = [...studio.debugOutput, ...text.split(/\r?\n/).filter(Boolean)].slice(-160);
      const problems = text.split(/\r?\n/).filter((line) => /\b(?:fatal error|error|warning|exception)\b/i.test(line));
      if (problems.length) studio.problems = [...studio.problems, ...problems].slice(-160);
    } else if (payload.type === 'stdout') {
      const marker = studio.terminalMarker;
      let combined = studio.terminalCarry + stripTerminalControlSequences(payload.text || '');
      studio.terminalCarry = '';
      if (marker) {
        const matchPattern = new RegExp(`${marker}:(-?\\d+)\\r?\\n`);
        const match = matchPattern.exec(combined);
        if (!match) {
          const keep = marker.length + 16;
          const safeLength = Math.max(0, combined.length - keep);
          const safeText = combined.slice(0, safeLength);
          studio.terminalCarry = combined.slice(safeLength);
          const visible = safeText.replace(new RegExp(`[\\s\\S]*?${marker}[^\\r\\n]*(?:\\r?\\n|$)`), '');
          appendStudioTerminalText(studio, visible);
          studio.commandOutput += safeText;
          if (studio.debugMode) studio.debugOutput = [...studio.debugOutput, ...visible.split(/\r?\n/).filter(Boolean)].slice(-160);
          if (studio.activePanel === 'output') {
            const output = document.querySelector('.studio-panel-console pre');
            if (output) output.textContent = [studio.output.join('\n'), `> ${studio.currentCommand}\n${studio.commandOutput}`].filter(Boolean).join('\n');
          } else if (studio.activePanel === 'debug') {
            const output = document.querySelector('.studio-panel-console pre');
            if (output) output.textContent = studio.debugOutput.join('\n');
          }
          return;
        }
        const before = combined.slice(0, match.index);
        const after = combined.slice(match.index + match[0].length);
        const visibleBefore = before.replace(new RegExp(`(?:^|\\r?\\n)[^\\r\\n]*${marker}[^\\r\\n]*(?:\\r?\\n|$)`), '\n');
        const visibleAfter = after.replace(new RegExp(`^[^\\r\\n]*${marker}[^\\r\\n]*(?:\\r?\\n|$)`), '');
        const visible = visibleBefore + visibleAfter;
        appendStudioTerminalText(studio, visible);
        studio.commandOutput += visible;
        if (studio.debugMode) studio.debugOutput = [...studio.debugOutput, ...visible.split(/\r?\n/).filter(Boolean)].slice(-160);
        const outputLines = studio.commandOutput.trimEnd();
        studio.output = [...studio.output, `> ${studio.currentCommand}`, outputLines].filter(Boolean).slice(-160);
        const problems = outputLines.split(/\r?\n/).filter((line) => /\b(?:fatal error|error|warning|exception)\b/i.test(line));
        if (problems.length) studio.problems = [...studio.problems, ...problems].slice(-160);
        if (Number(match[1]) !== 0) studio.problems = [...studio.problems, `${studio.currentCommand} exited with code ${match[1]}`].slice(-160);
        studio.terminalMarker = '';
        studio.currentCommand = '';
        studio.commandOutput = '';
        studio.running = false;
        studio.debugMode = false;
        const input = document.getElementById('studio-command');
        updateStudioTerminalChrome(studio);
        if (input) input.focus();
      } else {
        appendStudioTerminalText(studio, combined);
        studio.commandOutput += combined;
        if (studio.debugMode) studio.debugOutput = [...studio.debugOutput, ...combined.split(/\r?\n/).filter(Boolean)].slice(-160);
      }
    } else if (payload.type === 'exit' || payload.type === 'stopped') {
      studio.terminalSessionId = '';
      studio.terminalConnecting = false;
      studio.running = false;
      studio.debugMode = false;
      studio.terminalMarker = '';
      appendStudioTerminalText(studio, `\n${payload.text || 'Shell stopped.'}\n`);
      const input = document.getElementById('studio-command');
      const run = document.querySelector('#studio-command-form button[type="submit"]');
      if (input) input.disabled = !studio.folder;
      if (run) run.disabled = !studio.folder;
    }
    if (studio.activePanel === 'output') {
      const output = document.querySelector('.studio-panel-console pre');
      const activeOutput = studio.running && studio.currentCommand ? `> ${studio.currentCommand}\n${studio.commandOutput}` : '';
      if (output) output.textContent = [studio.output.join('\n'), activeOutput].filter(Boolean).join('\n') || 'Command output will appear here.';
    } else if (studio.activePanel === 'debug') {
      const output = document.querySelector('.studio-panel-console pre');
      if (output) output.textContent = studio.debugOutput.join('\n') || 'No debugger is attached. Standard error from commands appears here.';
    } else if (studio.activePanel === 'problems') {
      const output = document.querySelector('.studio-panel-console pre');
      if (output) output.textContent = studio.problems.join('\n') || 'No error or warning lines were reported by recent commands.';
    }
    updateStudioTerminalChrome(studio);
  }

  if (API.onStudioTerminalData) API.onStudioTerminalData(handleStudioTerminalData);

  async function ensureStudioTerminal(studio) {
    if (!studio.folder) return '';
    if (studio.terminalSessionId) return studio.terminalSessionId;
    if (studio.terminalStartPromise) return studio.terminalStartPromise;
    studio.terminalConnecting = true;
    updateStudioTerminalChrome(studio);
    const folder = studio.folder;
    const startPromise = (async () => {
      const result = await API.startStudioTerminal(folder);
      if (studio.folder !== folder) {
        if (result && result.sessionId) await API.stopStudioTerminal(result.sessionId);
        return '';
      }
      studio.terminalConnecting = false;
      if (!result || !result.ok) {
        appendStudioTerminalText(studio, `\n${(result && result.error) || 'Could not start the terminal shell.'}\n`);
        updateStudioTerminalChrome(studio);
        return '';
      }
      studio.terminalSessionId = result.sessionId;
      updateStudioTerminalChrome(studio);
      const earlyEvents = studio.terminalEarlyEvents.splice(0);
      for (const event of earlyEvents) handleStudioTerminalData(event);
      return result.sessionId;
    })();
    studio.terminalStartPromise = startPromise;
    const sessionId = await startPromise;
    if (studio.terminalStartPromise === startPromise) studio.terminalStartPromise = null;
    return sessionId;
  }

  function debugCommandForStudio(studio) {
    const filePath = studio.activeFile;
    if (!filePath) return '';
    const extension = filePath.split('.').pop().toLowerCase();
    const quotedPath = info.platform === 'win32'
      ? `'${filePath.replace(/'/g, "''")}'`
      : `'${filePath.replace(/'/g, "'\\''")}'`;
    if (['js', 'cjs', 'mjs'].includes(extension)) return `node inspect ${quotedPath}`;
    if (extension === 'py') return `python -m pdb ${quotedPath}`;
    return '';
  }

  function runCommandForStudio(studio) {
    const filePath = studio.activeFile;
    if (!filePath) return '';
    const extension = filePath.split('.').pop().toLowerCase();
    const quotedPath = info.platform === 'win32'
      ? `'${filePath.replace(/'/g, "''")}'`
      : `'${filePath.replace(/'/g, "'\\''")}'`;
    const runners = { js: 'node', cjs: 'node', mjs: 'node', py: 'python', lua: 'lua', luau: 'lua', go: 'go run', php: 'php', rb: 'ruby', sh: 'bash', ps1: 'powershell -File' };
    return runners[extension] ? `${runners[extension]} ${quotedPath}` : '';
  }

  async function sendStudioDebuggerInput(studio, command) {
    if (!command || !studio.debugMode || !studio.terminalSessionId) return;
    const result = await API.writeStudioTerminalInput({ sessionId: studio.terminalSessionId, text: command });
    if (!result || !result.ok) { toast((result && result.error) || 'Could not send debugger input.', 'err'); return; }
    rememberStudioCommand(studio, command);
    studio.terminalText += `debug> ${command}\n`;
    studio.debugOutput = [...studio.debugOutput, `> ${command}`].slice(-160);
    const output = document.querySelector('.studio-terminal pre');
    if (output) { output.textContent = studio.terminalText; output.scrollTop = output.scrollHeight; }
  }

  function rememberStudioCommand(studio, command) {
    if (!command) return;
    if (studio.commandHistory[studio.commandHistory.length - 1] !== command) studio.commandHistory.push(command);
    studio.commandHistory = studio.commandHistory.slice(-100);
    studio.commandHistoryIndex = studio.commandHistory.length;
    studio.commandHistoryDraft = '';
  }

  async function executeStudioCommand(studio, command, { debugging = false } = {}) {
    if (!command || studio.running || !studio.folder) return;
    await ensureStudioTerminal(studio);
    if (!studio.terminalSessionId) return;
    rememberStudioCommand(studio, command);
    studio.activePanel = debugging ? 'debug' : 'terminal';
    studio.panelVisible = true;
    studio.running = true;
    studio.debugMode = debugging;
    studio.terminalMarker = `__YUNIHUB_DONE_${Date.now()}_${Math.random().toString(36).slice(2, 8)}__`;
    studio.currentCommand = command;
    studio.commandOutput = '';
    studio.terminalText = `${studio.terminalText}$ ${command}\n`;
    render();
    const result = await API.writeStudioTerminal({ sessionId: studio.terminalSessionId, command, marker: studio.terminalMarker });
    if (!result || !result.ok) {
      studio.running = false;
      studio.terminalMarker = '';
      studio.terminalText += `${(result && result.error) || 'Could not send command to the terminal.'}\n`;
      render();
    }
  }

  async function runStudioTask(studio, build = false) {
    let command = '';
    const packageFile = studio.files.find((entry) => entry.path === 'package.json');
    if (packageFile) {
      const result = await API.readWorkspaceFile({ folder: studio.folder, path: packageFile.path });
      try {
        const scripts = result && result.ok ? JSON.parse(result.content).scripts || {} : {};
        const names = Object.keys(scripts);
        if (names.length) {
          const suggested = build && names.includes('build') ? 'build' : (names.includes('test') ? 'test' : names[0]);
          const selected = window.prompt(`Package script to run:\n${names.join(', ')}`, suggested);
          if (!selected) return;
          if (!Object.hasOwn(scripts, selected)) { toast('That script is not declared in package.json.', 'err'); return; }
          command = `npm run ${JSON.stringify(selected)}`;
        }
      } catch (error) { toast(`Could not read package scripts: ${error.message}`, 'err'); return; }
    }
    const rootFiles = new Set(studio.files.filter((entry) => !entry.path.includes('/')).map((entry) => entry.name.toLowerCase()));
    if (!command && rootFiles.has('cargo.toml')) command = build ? 'cargo build' : 'cargo test';
    if (!command && rootFiles.has('go.mod')) command = build ? 'go build ./...' : 'go test ./...';
    if (!command && rootFiles.has('pom.xml')) command = build ? 'mvn package' : 'mvn test';
    if (!command && (rootFiles.has('build.gradle') || rootFiles.has('build.gradle.kts'))) command = build ? 'gradle build' : 'gradle test';
    if (!command) { toast('No supported task manifest was found at the workspace root.', 'err'); return; }
    await executeStudioCommand(studio, command);
  }

  async function runStudioMenuAction(studio, action) {
    studio.openMenu = '';
    if (action === 'new') {
      studio.newFileOpen = true;
      render();
      document.getElementById('studio-new-path')?.focus();
    } else if (action === 'folder') {
      await chooseStudioFolder(studio);
    } else if (action === 'open-file') {
      studio.openMenu = '';
      render();
      document.getElementById('studio-file-search')?.focus();
    } else if (action === 'save') {
      if (await saveStudioFile(studio)) render();
    } else if (action === 'save-all') {
      if (await saveStudioFile(studio)) { toast('All open files are saved.', 'ok'); render(); }
    } else if (action === 'save-as' && studio.activeFile) {
      const targetPath = window.prompt('Save as workspace-relative path', studio.activeFile);
      if (!targetPath) return;
      const result = await API.createWorkspaceFile({ folder: studio.folder, path: targetPath, content: studio.content });
      if (!result || !result.ok) { toast((result && result.error) || 'Could not save a copy.', 'err'); return; }
      await refreshStudioFiles(studio);
      await openStudioFile(studio, result.path);
    } else if (action === 'close-tab' && studio.activeFile) {
      await closeStudioTab(studio, studio.activeFile);
    } else if (action === 'install-deps') {
      const command = dependencyInstallCommand(studio);
      if (!command) toast('No supported dependency manifest was found at the workspace root.', 'err');
      else if (window.confirm(`Run "${command}" in this workspace? Package scripts may execute code from downloaded dependencies.`)) await executeStudioCommand(studio, command);
    } else if (action === 'debug-file' || action === 'run-file') {
      const command = action === 'debug-file' ? debugCommandForStudio(studio) : runCommandForStudio(studio);
      if (!command) toast('This file type does not have a built-in run/debug adapter.', 'err');
      else await executeStudioCommand(studio, command, { debugging: action === 'debug-file' });
    } else if (action === 'stop-debug') {
      studio.debugMode = false;
      await API.stopStudioTerminal(studio.terminalSessionId);
    } else if (action === 'undo' && studioEditor) {
      undo(studioEditor);
    } else if (action === 'redo' && studioEditor) {
      redo(studioEditor);
    } else if (action === 'line-comment' && studioEditor) {
      toggleLineComment(studioEditor);
    } else if (action === 'block-comment' && studioEditor) {
      toggleBlockComment(studioEditor);
    } else if (action === 'select-all' && studioEditor) {
      const end = studioEditor.state.doc.length;
      studioEditor.dispatch({ selection: { anchor: 0, head: end } });
      studioEditor.focus();
    } else if ((action === 'find' || action === 'replace') && studioEditor) {
      openSearchPanel(studioEditor);
    } else if (action.startsWith('clipboard-') && studioEditor) {
      const selection = studioEditor.state.selection.main;
      try {
        if (action === 'clipboard-paste') {
          const text = await navigator.clipboard.readText();
          studioEditor.dispatch({ changes: { from: selection.from, to: selection.to, insert: text }, selection: { anchor: selection.from + text.length } });
        } else {
          const text = studioEditor.state.sliceDoc(selection.from, selection.to);
          if (!text) { toast('Select text first.', 'err'); return; }
          await navigator.clipboard.writeText(text);
          if (action === 'clipboard-cut') studioEditor.dispatch({ changes: { from: selection.from, to: selection.to, insert: '' }, selection: { anchor: selection.from } });
        }
      } catch { toast('Clipboard access was not available.', 'err'); }
    } else if (action === 'duplicate-selection' && studioEditor) {
      const selection = studioEditor.state.selection.main;
      if (selection.empty) { toast('Select text to duplicate.', 'err'); return; }
      const text = studioEditor.state.sliceDoc(selection.from, selection.to);
      studioEditor.dispatch({ changes: { from: selection.to, insert: text }, selection: { anchor: selection.from, head: selection.to + text.length } });
      studioEditor.focus();
    } else if (action === 'copy-line-up' && studioEditor) copyLineUp(studioEditor);
    else if (action === 'copy-line-down' && studioEditor) copyLineDown(studioEditor);
    else if (action === 'move-line-up' && studioEditor) moveLineUp(studioEditor);
    else if (action === 'move-line-down' && studioEditor) moveLineDown(studioEditor);
    else if (action === 'cursor-above' && studioEditor) addCursorAbove(studioEditor);
    else if (action === 'cursor-below' && studioEditor) addCursorBelow(studioEditor);
    else if (action === 'next-occurrence' && studioEditor) selectNextOccurrence(studioEditor);
    else if (action === 'go-line' && studioEditor) gotoLine(studioEditor);
    else if (action === 'run-task' || action === 'run-build-task') {
      await runStudioTask(studio, action === 'run-build-task');
    } else if (action === 'new-terminal') {
      if (studio.terminalSessionId) await API.stopStudioTerminal(studio.terminalSessionId);
      studio.terminalSessionId = '';
      studio.terminalText = '';
      studio.terminalEarlyEvents = [];
      await ensureStudioTerminal(studio);
      studio.panelVisible = true;
      studio.activePanel = 'terminal';
      render();
    } else if (action.startsWith('panel-')) {
      studio.activePanel = action.slice(6);
      studio.panelVisible = true;
      render();
    } else if (action === 'scan-problems') {
      await refreshStudioDiagnostics(studio);
      render();
    } else if (action === 'toggle-panel') {
      studio.panelVisible = !studio.panelVisible;
      render();
    } else if (action === 'focus-files') {
      render();
      document.getElementById('studio-file-search')?.focus();
    } else if (action === 'focus-terminal') {
      studio.activePanel = 'terminal';
      studio.panelVisible = true;
      render();
      document.getElementById('studio-command')?.focus();
    } else if (action === 'clear-terminal') {
      studio.terminal = [];
      studio.terminalText = '';
      render();
    } else if (action === 'refresh-ports') {
      studio.activePanel = 'ports';
      studio.panelVisible = true;
      studio.portsOptIn = true;
      await refreshStudioPorts(studio);
    } else if ((action === 'next-tab' || action === 'previous-tab') && studio.openFiles.length > 1) {
      const current = studio.openFiles.indexOf(studio.activeFile);
      const offset = action === 'next-tab' ? 1 : -1;
      const next = (current + offset + studio.openFiles.length) % studio.openFiles.length;
      await openStudioFile(studio, studio.openFiles[next]);
    }
  }

  function viewStudio() {
    const studio = ui.studio || (ui.studio = defaultStudioWorkspace());
    const terminal = studio.terminalText || (studio.terminal || []).slice(-18).join('\n');
    const file = studio.files.find((entry) => entry.path === studio.activeFile);
    const fileExtension = file ? (file.path.split('.').pop() || '').toLowerCase() : '';
    const language = ({ js: 'JavaScript', jsx: 'JavaScript JSX', ts: 'TypeScript', tsx: 'TypeScript JSX', py: 'Python', lua: 'Lua', luau: 'Luau', json: 'JSON', css: 'CSS', html: 'HTML', rs: 'Rust', go: 'Go', ps1: 'PowerShell', sh: 'Shell' })[fileExtension] || (fileExtension ? fileExtension.toUpperCase() : 'No file');
    const toolchains = studio.toolchains.length ? studio.toolchains.map((tool) => `<span class="studio-tool">${esc(tool.name)} <small>${esc(tool.version)}</small></span>`).join('') : '<span class="help">Toolchains have not been checked.</span>';
    const tabs = studio.openFiles.map((filePath) => `<div class="studio-tab-group"><button class="studio-tab${studio.activeFile === filePath ? ' active' : ''}" data-act="studio-tab" data-id="${esc(filePath)}" data-k="studio-tab-${esc(filePath)}" title="${esc(filePath)}">${esc(studioName(filePath))}</button><button class="studio-tab-close" data-act="studio-close-tab" data-id="${esc(filePath)}" aria-label="Close ${esc(filePath)}" title="Close tab">${svg('x')}</button></div>`).join('');
    const matchingFiles = studio.files.filter((entry) => !studio.fileQuery || entry.path.toLowerCase().includes(studio.fileQuery.toLowerCase()));
    const visibleFiles = matchingFiles.slice(0, studio.fileLimit);
    const files = visibleFiles.map((entry) => {
      const extension = entry.path.toLowerCase().split('.').pop();
      const icon = ['json', 'jsonc', 'yaml', 'yml', 'toml'].includes(extension)
        ? 'package'
        : ['js', 'cjs', 'mjs', 'jsx', 'ts', 'tsx', 'py', 'lua', 'luau', 'go', 'rs', 'css', 'html', 'htm', 'sh', 'ps1'].includes(extension) ? 'code' : 'file';
      return `<button class="studio-file${entry.path === studio.activeFile ? ' active' : ''}" data-act="studio-file" data-id="${esc(entry.path)}" data-k="studio-file-${esc(entry.path)}" title="${esc(entry.path)}"><span class="studio-file-icon">${svg(icon)}</span><span class="studio-file-name">${esc(entry.path)}</span></button>`;
    }).join('');
    const menus = {
      File: [['New File', 'new'], ['Open File', 'open-file'], ['Open Folder', 'folder'], ['Save', 'save'], ['Save As', 'save-as'], ['Save All', 'save-all'], ['Close Editor', 'close-tab'], ...(dependencyInstallCommand(studio) ? [['Install Declared Dependencies', 'install-deps']] : [])],
      Edit: [['Undo', 'undo'], ['Redo', 'redo'], ['Cut', 'clipboard-cut'], ['Copy', 'clipboard-copy'], ['Paste', 'clipboard-paste'], ['Find', 'find'], ['Replace', 'replace'], ['Toggle Line Comment', 'line-comment'], ['Toggle Block Comment', 'block-comment']],
      Selection: [['Select All', 'select-all'], ['Duplicate Selection', 'duplicate-selection'], ['Copy Line Up', 'copy-line-up'], ['Copy Line Down', 'copy-line-down'], ['Move Line Up', 'move-line-up'], ['Move Line Down', 'move-line-down'], ['Add Cursor Above', 'cursor-above'], ['Add Cursor Below', 'cursor-below'], ['Add Next Occurrence', 'next-occurrence']],
      View: [['Problems', 'panel-problems'], ['Rescan Problems', 'scan-problems'], ['Output', 'panel-output'], ['Debug Console', 'panel-debug'], ['Terminal', 'panel-terminal'], ['Ports', 'panel-ports'], ['Toggle Bottom Panel', 'toggle-panel']],
      Go: [['Go to File', 'focus-files'], ['Go to Line', 'go-line'], ['Next Tab', 'next-tab'], ['Previous Tab', 'previous-tab']],
      Run: [['Start Debugging', 'debug-file'], ['Run Without Debugging', 'run-file'], ['Run Active File', 'run-file'], ['Run Build Task', 'run-build-task'], ['Run Task', 'run-task'], ['Stop Debugging', 'stop-debug']],
      Terminal: [['New Terminal', 'new-terminal'], ['Focus Terminal', 'focus-terminal'], ['Run Build Task', 'run-build-task'], ['Run Task', 'run-task'], ['Clear Terminal', 'clear-terminal'], ['Refresh Ports', 'refresh-ports']]
    };
    const menuBar = Object.entries(menus).map(([name, items]) => `<div class="studio-menu"><button class="studio-menu-button${studio.openMenu === name ? ' active' : ''}" data-act="studio-menu" data-id="${name}" aria-haspopup="true" aria-expanded="${studio.openMenu === name}">${name}</button>${studio.openMenu === name ? `<div class="studio-menu-popover">${items.map(([label, action]) => `<button data-act="studio-menu-action" data-v="${action}">${label}</button>`).join('')}</div>` : ''}</div>`).join('');
    const allProblems = [...studio.sourceProblems, ...studio.problems];
    const problemsMessage = studio.diagnosticsChecked
      ? `No JS, ESM, JSX, TypeScript, TSX, or JSON syntax errors in ${studio.diagnosticsChecked} checked files. Other languages need their analyzer.`
      : 'No source scan has completed yet.';
    const panelTabs = [['problems', 'Problems', allProblems.length], ['output', 'Output', 0], ['debug', 'Debug Console', 0], ['terminal', 'Terminal', 0], ['ports', 'Ports', studio.ports.length]];
    const outputSources = [['commands', 'Terminal Commands'], ['diagnostics', 'Workspace Diagnostics'], ['debug', 'Debug Console'], ['toolchains', 'Toolchain Detection'], ['ports', 'Ports']];
    const outputText = studio.outputSource === 'diagnostics'
      ? [...studio.sourceProblems, ...studio.problems].join('\n') || problemsMessage
      : studio.outputSource === 'debug'
        ? studio.debugOutput.join('\n') || 'No debugger output has been recorded.'
        : studio.outputSource === 'toolchains'
          ? studio.toolchains.map((tool) => `${tool.name}: ${tool.version}`).concat(studio.visualStudio ? [`${studio.visualStudio.name}: ${studio.visualStudio.version}`] : []).join('\n') || 'No toolchain scan has been run.'
          : studio.outputSource === 'ports'
            ? studio.portsOptIn ? studio.ports.map((port) => `${port.port}\t${port.address}\t${port.process}`).join('\n') || 'No listening ports in the last scan.' : 'Port scan is off until you explicitly request it.'
            : studio.output.join('\n') || 'Terminal command output will appear here.';
    const panelBody = studio.activePanel === 'problems'
      ? `<div class="studio-panel-console"><div class="studio-panel-title">${allProblems.length} issue${allProblems.length === 1 ? '' : 's'} · checked ${studio.diagnosticsChecked} supported files${studio.diagnosticsTruncated ? ' · scan limit reached' : ''}</div><pre>${esc(allProblems.join('\n') || problemsMessage)}</pre></div>`
      : studio.activePanel === 'output'
        ? `<div class="studio-panel-console"><div class="studio-output-header"><label for="studio-output-source">Show output from</label><select class="sel" id="studio-output-source">${outputSources.map(([id, label]) => `<option value="${id}"${studio.outputSource === id ? ' selected' : ''}>${label}</option>`).join('')}</select></div><pre>${esc(outputText)}</pre></div>`
        : studio.activePanel === 'debug'
          ? `<div class="studio-panel-console studio-debug-console"><div class="studio-panel-title">${studio.debugMode ? 'Debugger input · next, step, continue, where' : 'Debug Console · no debugger attached'}</div><pre>${esc(studio.debugOutput.join('\n') || 'Start debugging a supported JavaScript or Python file to see debugger output.')}</pre>${studio.debugMode ? `<form class="studio-command" id="studio-command-form"><label for="studio-command">debug&gt;</label><input class="in" id="studio-command" autocomplete="off" placeholder="Debugger command (next, step, continue, where)"${studio.running ? '' : ' disabled'}><button class="btn primary" type="submit"${studio.running ? '' : ' disabled'}>Send</button></form>` : ''}</div>`
              : `<div class="studio-panel-console"><div class="studio-panel-title">Port access</div>${!studio.portsOptIn ? '<p class="help">Port inspection is off. Scan only when you need to find a local service to forward.</p><button class="btn" data-act="studio-ports-scan">Scan listening ports</button>' : `${studio.portsLoading ? '<p class="help">Scanning listening ports...</p>' : ''}${studio.portsError ? `<p class="help">${esc(studio.portsError)}</p>` : `<div class="studio-port-list">${studio.ports.map((port) => `<div class="studio-port"><b>${esc(port.port)}</b><span>${esc(port.address)}</span><small>${esc(port.process)}</small></div>`).join('') || (!studio.portsLoading ? '<p class="help">No listening ports detected.</p>' : '')}</div>`}<button class="textbtn" data-act="studio-ports-scan">Refresh scan</button>`}</div>`;
            const terminalPanel = `<div class="studio-terminal"><div class="terminal-header"><span>${studio.debugMode ? 'Debugger active' : (studio.running ? 'Running command' : (studio.terminalConnecting ? 'Starting shell...' : (studio.folder || 'folder required')))}</span><div class="tools">${studio.running ? '<button class="btn danger" data-act="studio-stop">Stop</button>' : ''}<button class="icon-btn" data-act="studio-clear" aria-label="Clear terminal output" title="Clear terminal output">${svg('trash')}</button></div></div><pre>${esc(studio.terminalText || terminal)}</pre><form class="studio-command" id="studio-command-form"><label for="studio-command">${studio.debugMode ? 'debug&gt;' : '&gt;'}</label><input class="in" id="studio-command" autocomplete="off" placeholder="${studio.debugMode ? 'Debugger command (next, step, continue, where)' : 'Run a command in the selected folder'}"${(studio.running && !studio.debugMode) || !studio.folder ? ' disabled' : ''}><button class="btn primary" type="submit"${(studio.running && !studio.debugMode) || !studio.folder ? ' disabled' : ''}>${studio.debugMode ? 'Send' : 'Run'}</button></form></div>`;
    return `<div class="sec-head"><h2>Studio</h2><div class="tools"><span id="studio-save-status" class="help">${studio.dirty ? 'Unsaved' : (file ? 'Saved' : '')}</span><button class="btn" data-act="studio-save" data-k="studio-save"${studio.dirty ? '' : ' disabled'}>Save</button><button class="btn primary" data-act="studio-new" data-k="studio-new"${studio.folder ? '' : ' disabled'}>New file</button></div></div>
      <div class="studio-menubar" role="menubar">${menuBar}</div>
      <div class="studio-shell">
        <aside class="studio-sidebar">
          <div class="panel studio-panel">
            <h3>Workspace</h3>
            <div class="studio-project">${svg('folder')}<span title="${esc(studio.folder)}">${esc(studio.folder || 'No project folder')}</span></div>
            <div class="actions"><button class="btn" data-act="studio-folder" data-k="studio-folder">Choose folder</button><button class="btn" data-act="studio-detect" data-k="studio-detect">Check tools</button></div>
            <div class="studio-toolchains">${toolchains}${studio.visualStudio ? `<span class="studio-tool">Visual Studio 2022 <small>${esc(studio.visualStudio.version || 'detected')}</small></span>` : ''}</div>
            <div class="studio-file-heading"><span>Files · ${studio.files.length}${studio.fileQuery ? ` / ${matchingFiles.length}` : ''}</span><button class="icon-btn" data-act="studio-new" data-k="studio-new-file" aria-label="Create file" title="Create file"${studio.folder ? '' : ' disabled'}>${svg('plus')}</button></div>
            <input class="in studio-file-search" id="studio-file-search" value="${esc(studio.fileQuery)}" placeholder="Filter files" aria-label="Filter workspace files"${studio.files.length ? '' : ' disabled'}>
            ${studio.newFileOpen ? `<form class="studio-new-file" id="studio-create-form"><input class="in" id="studio-new-path" placeholder="src/main.py" autocomplete="off" required><button class="icon-btn" aria-label="Create file" title="Create file">${svg('plus')}</button><button class="icon-btn" type="button" data-act="studio-cancel-new" aria-label="Cancel" title="Cancel">${svg('x')}</button></form>` : '<span class="studio-new-file-placeholder" aria-hidden="true"></span>'}
            <div class="studio-file-list">${files || `<p class="help">${studio.loading ? 'Loading files...' : (studio.folder ? 'No matching text files.' : 'Choose a project folder to browse its files.')}</p>`}</div>
            ${visibleFiles.length < matchingFiles.length ? `<button class="textbtn studio-more-files" data-act="studio-more">Show ${Math.min(200, matchingFiles.length - visibleFiles.length)} more · ${matchingFiles.length - visibleFiles.length} remaining</button>` : ''}
          </div>
        </aside>
        <section class="studio-main${studio.panelVisible ? '' : ' panel-hidden'}">
          <div class="studio-toolbar">${tabs}<span class="studio-toolbar-spacer"></span>${file ? `<span class="studio-current-path">${esc(file.path)}</span>` : ''}</div>
          ${file ? '<div class="studio-editor" id="studio-editor" aria-label="Code editor"></div>' : '<div class="studio-empty">Open or create a project file to start editing.</div>'}
          <div class="studio-statusbar"><span id="studio-cursor-status">Ln 1, Col 1</span><span>${esc(language)}</span><span>UTF-8</span><span>${studio.dirty ? 'Modified' : 'Ready'}</span></div>
          <div class="studio-bottom-panel"><div class="studio-panel-tabs">${panelTabs.map(([id, label, count]) => `<button class="studio-panel-tab${studio.activePanel === id ? ' active' : ''}" data-act="studio-panel" data-v="${id}">${label}${count ? `<small>${count}</small>` : ''}</button>`).join('')}<span class="studio-toolbar-spacer"></span><button class="icon-btn" data-act="studio-panel-toggle" aria-label="Hide bottom panel" title="Hide bottom panel">${svg('x')}</button></div>${studio.activePanel === 'terminal' ? terminalPanel : panelBody}</div>
        </section>
      </div>`;
  }

  function discordAvatarUrl(user) {
    if (!user || !user.id || !user.avatar) return '';
    const format = user.avatar.startsWith('a_') ? 'gif' : 'png';
    return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${format}?size=256`;
  }

  function discordApplicationId() {
    return '';
  }

  function welcomeMarkup() {
    const step = Math.max(0, Math.min(2, ui.welcomeStep));
    const hasDiscordApp = !!(S.settings.discordUser || rpcUser || S.settings.discordSession);
    const content = [
      {
        label: 'A HOME FOR WHAT YOU BUILD',
        title: 'Welcome to YuniHub.',
        copy: 'Keep the projects you care about, the next steps, and the tools to launch them together.',
        visual: `<div class="welcome-brand-panel"><img src="../yunihub-logo-wordmark.svg" alt="YuniHub" /><span>All In One Hub For Anything. <i></i> Competieve. <i></i> More To Come.</span></div>`
      },
      {
        label: 'MAKE PROGRESS VISIBLE',
        title: 'Turn big ideas into next steps.',
        copy: 'Group your work by project, track tasks and status, and keep launch shortcuts close. Your workspace stays right here on your PC.',
        visual: `<div class="welcome-preview" aria-hidden="true"><div class="preview-top"><span></span><span></span><span></span><b>YOUR WORKSPACE</b></div><div class="preview-project"><i class="preview-icon">${svg('package')}</i><div><b>Project Atlas</b><span>Building · 4 of 6 tasks</span></div><div class="preview-meter"><i></i></div></div><div class="preview-project"><i class="preview-icon alt">${svg('code')}</i><div><b>Studio tools</b><span>Idea · 2 next steps</span></div><div class="preview-meter low"><i></i></div></div><div class="preview-footer"><span>2 projects</span><span>6 tasks complete</span></div></div>`
      },
      {
        label: 'OPTIONAL DISCORD CONNECTION',
        title: 'Bring your current project along.',
        copy: 'Connect Discord to show what you are working on in your profile and sync your linked display name and avatar in YuniHub. You can skip this and connect later in Settings.',
        visual: `<div class="welcome-presence" aria-hidden="true"><div class="presence-avatar">${svg('chat')}<i></i></div><div class="presence-copy"><span>DISCORD PRESENCE</span><b>Building Project Atlas</b><small>YuniHub · Project workspace</small></div><i class="presence-live"></i></div><p class="welcome-privacy">Connection is optional. YuniHub never asks for your Discord password.</p>`
      }
    ][step];
    return `<div class="splash-glow"></div><section class="welcome-card" role="dialog" aria-modal="true" aria-labelledby="welcome-title">
      <div class="welcome-art" data-step="${step}">${content.visual}</div>
      <div class="welcome-content">
        <span class="welcome-kicker">${content.label}</span>
        <h1 id="welcome-title">${content.title}</h1>
        <p class="welcome-intro">${content.copy}</p>
        <div class="welcome-progress" aria-label="Step ${step + 1} of 3">
          ${[0, 1, 2].map((index) => `<i${index === step ? ' class="active"' : ''}></i>`).join('')}
          <span>${step + 1} / 3</span>
        </div>
        <div class="welcome-actions">
          ${step > 0 ? '<button class="btn" data-act="welcome-back">Back</button>' : '<button class="textbtn" data-act="welcome-continue">Skip tour</button>'}
          ${step < 2
            ? '<button class="btn primary" data-act="welcome-next">Continue</button>'
            : `<button class="btn primary" data-act="${hasDiscordApp ? 'welcome-discord' : 'welcome-settings'}">${hasDiscordApp ? 'Connect Discord' : 'Discord settings'}</button><button class="textbtn" data-act="welcome-continue">Finish without Discord</button>`}
        </div>
      </div>
    </section>`;
  }

  function finishWelcome() {
    S.settings.welcomeSeen = true;
    S.settings.welcomeVersion = 1;
    touch();
    const splash = document.getElementById('splash');
    if (splash) splash.classList.add('hidden');
  }

  function intPanel() {
    const s = S.settings;
    const detectedCity = s.city || info.weatherCity || 'Detecting your weather city...';
    const profile = activeExecutorProfile();
    const f = (label, key, ph, kind) => `<div class="field"><label class="label" for="s-${key}">${label}</label><div class="row nowrap">
      <input class="in" id="s-${key}" data-set="${key}" value="${esc(s[key])}" placeholder="${ph}" spellcheck="false">
      ${kind ? `<button class="btn" data-act="setpick" data-f="${key}" data-v="${kind}" data-k="pk-${key}">Browse</button>` : ''}</div></div>`;
    return `<section class="panel"><h3>Desktop setup</h3>
      <div class="field"><label class="label">Detected weather city</label>
        <input class="in" value="${esc(detectedCity)}" readonly aria-readonly="true"></div>
      <div class="field"><label class="label" for="s-profile-select">Executor profile</label>
        <div class="row nowrap"><select class="in sel" id="s-profile-select" aria-label="Active executor profile"><option value="">Current paths (unsaved)</option>${s.executorProfiles.map((item) => `<option value="${esc(item.id)}"${item.id === s.activeExecutorProfile ? ' selected' : ''}>${esc(item.name)}</option>`).join('')}</select>
          <button class="btn" data-act="profile-new" data-k="profile-new">New</button></div>
        <div class="row nowrap"><input class="in" id="s-profile-name" value="${esc(profile ? profile.name : '')}" placeholder="Profile name" maxlength="50" aria-label="Executor profile name">
          <button class="btn" data-act="profile-save" data-k="profile-save">Save</button>
          <button class="icon-btn" data-act="profile-delete" data-k="profile-delete" aria-label="Delete active profile" title="Delete active profile"${profile ? '' : ' disabled'}>${svg('trash')}</button></div>
      </div>
      ${f('Executor', 'exe', 'Path to your executor .exe', 'file')}
      ${f('Your scripts folder', 'scripts', 'Folder containing your own Lua scripts', 'folder')}
      ${f('Executor autoload folder', 'autoexec', 'Optional folder used by your executor for autoload scripts', 'folder')}
      <p class="help">Yuniku scripts ship inside YuniHub. Your folder is scanned separately; choose only the scripts you want to copy.</p>
      </section>`;
  }

  async function connectRpc() {
    if (!API.discordAuth) return;
    const auth = await API.discordAuth();
    if (auth && auth.ok) {
      toast('Discord sign-in opened in your browser. Finish the browser flow and then return here.', 'ok');
    } else if (auth && auth.error) {
      toast(auth.error, 'err');
    }
  }

  async function refreshDiscordProfile() {
    if (!S.settings.discordSession || !API.discordSession) return false;
    try {
      const r = await API.discordSession(S.settings.discordSession);
      if (!r || !r.ok || !r.user) {
        if (r && r.error && /expired|session/i.test(r.error)) {
          S.settings.discordSession = '';
          S.settings.discordUser = null;
          rpcUser = null;
          await disconnectDiscordPresence();
          touch();
          render();
        }
        return false;
      }
      const prev = JSON.stringify(S.settings.discordUser || null);
      const next = JSON.stringify(r.user || null);
      S.settings.discordUser = r.user;
      rpcUser = r.user;
      if (prev !== next) {
        touch();
        render();
      }
      if (!presenceConnected && !presenceBusy && !presenceRetryTimer && !presenceManualDisconnect) connectDiscordPresence(false, true);
      updateDiscordActivity();
      return true;
    } catch {
      return false;
    }
  }

  function presencePayload() {
    const useSpotify = spotifyConnected && !!spotifyTrack;
    const p = !useSpotify && ui.view === 'project' ? find(ui.id) : null;
    const payload = buildDiscordPresencePayload({
      project: p,
      view: useSpotify ? 'Spotify' : ui.view,
      spotify: useSpotify ? spotifyTrack : null,
      settings: S.settings,
      overall: overall(),
      sessionStartedAt: presenceStartedAt
    });
    if (!S.settings.presenceAutoUpdate) {
      payload.details = 'Using YuniHub';
      payload.state = 'Automatic activity updates are paused';
    }
    return payload;
  }

  function updateDiscordActivity() {
    if (!presenceConnected) return;
    Promise.resolve(API.setActivity(presencePayload())).then((ok) => {
      if (ok || !presenceConnected) return;
      presenceConnected = false;
      presenceMessage = 'Discord closed the presence connection. Reconnect to try again.';
      render();
      scheduleDiscordPresenceRetry();
    });
  }

  function updatePresenceMessage() {
    const element = document.getElementById('presence-message');
    if (element) element.textContent = presenceMessage;
  }

  function scheduleDiscordPresenceRetry() {
    if (!S.settings.discordSession || presenceManualDisconnect || presenceConnected || presenceRetryTimer) return;
    const delay = Math.min(5000 + presenceRetryCount * 2000, 30000);
    presenceRetryTimer = setTimeout(() => {
      presenceRetryTimer = null;
      presenceRetryCount += 1;
      connectDiscordPresence(false, true);
    }, delay);
  }

  async function connectDiscordPresence(showToast = true, automatic = false) {
    if (presenceBusy || presenceConnected || (automatic && presenceManualDisconnect)) return;
    if (!S.settings.discordSession) {
      presenceMessage = 'Sign in with Discord to unlock Rich Presence. Guest mode keeps local projects and tools available.';
      if (showToast) toast('Link your Discord account before connecting Rich Presence.', 'err');
      if (!automatic) render();
      return;
    }
    if (!automatic) {
      presenceManualDisconnect = false;
      presenceRetryCount = 0;
      clearTimeout(presenceRetryTimer);
      presenceRetryTimer = null;
    }
    presenceBusy = true;
    presenceStartedAt = Date.now();
    presenceMessage = automatic ? 'Waiting for the Discord desktop app...' : 'Connecting to the Discord desktop app...';
    if (!automatic) render();
    else updatePresenceMessage();
    const result = await API.rpcConnect('');
    presenceBusy = false;
    presenceConnected = !!(result && result.ok);
    presenceMessage = presenceConnected
      ? `Connected to Discord${result.user && result.user.username ? ` as ${result.user.username}` : ''}.`
      : `${(result && result.error) || 'Could not connect to Discord Rich Presence.'} Retrying automatically.`;
    if (presenceConnected) {
      presenceRetryCount = 0;
      clearTimeout(presenceRetryTimer);
      presenceRetryTimer = null;
      updateDiscordActivity();
    } else if (showToast) toast(presenceMessage, 'err');
    if (!automatic || presenceConnected) render();
    else updatePresenceMessage();
    if (!presenceConnected) scheduleDiscordPresenceRetry();
  }

  async function disconnectDiscordPresence() {
    presenceManualDisconnect = true;
    clearTimeout(presenceRetryTimer);
    presenceRetryTimer = null;
    await API.rpcDisconnect();
    presenceConnected = false;
    presenceBusy = false;
    presenceMessage = 'Presence is disconnected.';
    render();
  }

  async function refreshWeather() {
    if (!S.settings.city) weather = 'Detecting weather...';
    else { const r = await API.weather(S.settings.city); weather = r && r.ok ? r.text : (r && r.error) || 'Unavailable'; }
    const el = document.getElementById('c-weather');
    if (el) el.textContent = weather;
  }

  async function runTool(id) {
    const s = S.settings;
    if (id === 'yunispot' || id === 'yunispot-restore') {
      if (!API.yuniSpotStatus || !API.manageYuniSpot) { toast('YuniSpot management is available in the desktop app.', 'err'); return; }
      try {
        const status = await API.yuniSpotStatus();
        yuniSpotStatus = status;
        if (!status.available) { toast(status.error || 'Bundled YuniSpot is unavailable. Use the standalone installer.', 'err'); return; }
        if (!status.spotify) { toast('Install the official Spotify desktop app before setting up YuniSpot.', 'err'); return; }
        const action = id === 'yunispot-restore' ? 'restore' : 'apply';
        const prompt = action === 'restore'
          ? 'Remove YuniSpot from Spotify? Your SpotX ad blocker will not be removed.'
          : (status.yuniSpot ? 'Update or reapply YuniSpot in Spotify?' : 'Apply YuniSpot to your Spotify desktop app?');
        if (!window.confirm(prompt + ' Close Spotify first.')) return;
        const result = await API.manageYuniSpot(action);
        if (!result || !result.ok) { toast((result && result.error) || 'YuniSpot operation failed.', 'err'); return; }
        yuniSpotStatus = await API.yuniSpotStatus();
        render();
        toast(action === 'restore' ? 'YuniSpot was removed from Spotify.' : 'YuniSpot was applied to Spotify.', 'ok');
      } catch (error) {
        toast(error.message || 'YuniSpot operation failed.', 'err');
      }
      return;
    }
    if (id === 'yunisave' || id === 'yunistrapper') {
      const key = id === 'yunisave' ? 'yuniSaverPath' : 'yuniStrapperPath';
      let target = s[key];
      if (!target) {
        target = await API.pick('file');
        if (!target) return;
        s[key] = target;
        touch();
      }
      const result = await API.launch({ mode: 'app', target, cwd: '' });
      if (result && result.ok) toast(`Launched ${id === 'yunisave' ? 'YuniSaver' : 'YuniStrapper'}.`, 'ok');
      else toast((result && result.error) || `Could not launch ${id === 'yunisave' ? 'YuniSaver' : 'YuniStrapper'}.`, 'err');
      return;
    }
    if (id === 'autoload') {
      go('Roblox');
      requestAnimationFrame(() => document.getElementById('script-library')?.scrollIntoView({ behavior: S.settings.reduceMotion ? 'auto' : 'smooth', block: 'start' }));
      return;
    }
    if (id === 'youtube' || id === 'twitch') {
      s.beacons[id] = !s.beacons[id]; touch();
      await API.setBeacons(s.beacons); render();
      if (s.beacons[id] && !rpcUser) toast('Connect Discord in the sidebar to show your presence.');
      return;
    }
    if (id === 'executor') {
      if (!s.exe) { toast('Set your executor path in Settings.', 'err'); return; }
      const r = await API.launch({ mode: 'app', target: s.exe, cwd: '' });
      if (r && r.ok) toast('Launched your executor.', 'ok'); else toast((r && r.error) || 'Could not launch.', 'err');
      return;
    }
  }

  function sidebar(animateRecent = false) {
    const cnt = (tr) => S.projects.filter((p) => p.track === tr).length;
    const currentProject = ui.view === 'project' ? find(ui.id) : null;
    const cur = currentProject ? (ui.projectReturnView === 'projects' ? 'projects' : currentProject.track) : ui.view;
    const item = (v, label, icon, count) =>
      `<button class="nav-item${cur === v ? ' on' : ''}" data-act="nav" data-v="${v}" data-k="nav-${v}" aria-label="${label}" title="${label}" aria-current="${cur === v ? 'page' : 'false'}">
        <span class="nav-ic">${svg(icon)}</span><span>${label}</span>${count != null ? `<em>${count}</em>` : ''}</button>`;
    const recent = S.projects.filter((p) => p.opened).sort((a, b) => b.opened - a.opened).slice(0, 3);
    const linkedUser = S.settings.discordSession ? S.settings.discordUser : null;
    const isDiscordLinked = !!S.settings.discordSession;
    const avatarUrl = discordAvatarUrl(linkedUser);
    return `<aside class="side">
      <div class="logo" aria-label="YuniHub">
        <img class="brand-icon" src="${themeLogoPath(S.settings.theme)}" alt="" />
        <span class="brand-name"><span>Yuni</span><b>Hub</b></span>
      </div>
      <button class="searchbtn" data-act="palette" data-k="palette">${svg('search')}<span>Search</span><kbd>Ctrl K</kbd></button>
      <nav class="nav" aria-label="Main">
        <div class="nav-group"><span class="nav-label">Workspace</span>
          ${item('home', 'Home', 'home')}
          ${item('projects', 'Projects', 'folder', S.projects.length)}
          ${item('Android', 'Android', 'phone', cnt('Android'))}
          ${item('PC', 'PC', 'monitor', cnt('PC'))}
        </div>
        <div class="nav-group"><span class="nav-label">Tools</span>
          ${item('Studio', 'Studio', 'code')}
          ${item('Spotify', 'Spotify', 'headphones')}
          ${item('Roblox', 'Roblox', 'package')}
          ${item('PS4', 'PS4', 'gamepad')}
          ${item('Discord', 'Discord Status', 'chat')}
        </div>
        <div class="nav-group nav-group-settings">${item('settings', 'Settings', 'sliders', null)}</div>
      </nav>
      ${ui.view !== 'home' && recent.length ? `<div class="recent${animateRecent ? ' recent-enter' : ''}"><span class="label">Recent</span>${recent.map((p) =>
        `<button class="rec${ui.view === 'project' && ui.id === p.id ? ' on' : ''}" data-act="open" data-id="${p.id}" data-k="rc-${p.id}">${svg(p.icon)}<span>${esc(p.name)}</span></button>`).join('')}</div>` : ''}
      <div class="spacer"></div>
      <div class="sync-card">
        <span class="label dot-label"><i class="dot${linkedUser ? '' : ' off'}"></i>${linkedUser ? 'Discord account linked' : 'Guest mode'}</span>
        ${linkedUser
          ? `<div style="display:flex; align-items:center; gap:10px; margin:8px 0 10px;">
              ${avatarUrl ? `<img src="${avatarUrl}" alt="Discord avatar" style="width:34px;height:34px;border-radius:50%;object-fit:cover;display:block;box-shadow:0 0 0 1px rgba(255,255,255,.15);" />` : `<div style="width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(135deg,#5865f2,#7289da);font-size:12px;font-weight:700;">D</div>`}
              <span class="rpc-user" style="max-width:110px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${esc(linkedUser.global_name || linkedUser.username || '')}</span>
            </div>
            <button class="btn danger" data-act="rpcout" data-k="rpcout">Disconnect</button>`
          : `<button class="btn primary" data-act="rpclink" data-k="rpclink">Connect Discord</button>`}
        <div class="help" style="margin-top:10px; line-height:1.5;">${isDiscordLinked ? 'Linked perks: Discord display name and avatar sync, plus automatic project Rich Presence.' : 'Guest mode: local projects and tools remain available. Sign in to sync your Discord profile and enable Rich Presence.'}</div>
        ${isDiscordLinked ? `<span class="label dot-label"><i class="dot${presenceConnected ? '' : ' off'}"></i>${presenceConnected ? 'Rich Presence active' : 'Discord Rich Presence'}</span>
          <div class="help" id="presence-message">${esc(presenceMessage)}</div>
          ${presenceConnected
            ? '<button class="btn danger" data-act="rpc-presence-disconnect" data-k="rpc-presence-disconnect">Disconnect presence</button>'
            : `<button class="btn" data-act="rpc-presence-connect" data-k="rpc-presence-connect"${presenceBusy ? ' disabled' : ''}>${presenceBusy ? 'Connecting...' : 'Connect presence'}</button>`}
          <div class="help presence-config-help">${info.presenceConfigured ? 'Keep the Discord desktop app running for live status.' : 'Rich Presence is not configured for this build.'}</div>` : ''}
      </div>
      <div class="ver">v${esc(info.version || '0.2.0')}</div>
    </aside>`;
  }

  function card(p) {
    const pr = progress(p);
    const ready = !!p.launch.target;
    const lockBadge = p.isStarter && appMode !== 'dev' ? '<span class="pill st-Blocked">starter</span>' : '';
    return `<article class="card">
      <div class="card-top">
        <div class="tile">${svg(p.icon)}</div>
        <div class="card-head"><h3>${esc(p.name)}</h3>
          <span class="head-r">${lockBadge}<span class="pill st-${p.status}">${p.status}</span>
            <button class="icon-btn sm pin${p.pinned ? ' on' : ''}" data-act="pin" data-id="${p.id}" data-k="pin-${p.id}" aria-pressed="${p.pinned}" aria-label="${p.pinned ? 'Unpin' : 'Pin'} ${esc(p.name)}" title="${p.pinned ? 'Unpin' : 'Pin to top'}">${svg('star')}</button></span></div>
      </div>
      <p class="desc">${esc(p.desc) || '<span style="color:var(--faint)">No description yet.</span>'}</p>
      <div class="meter-row">
        <div class="meter-meta"><span>${p.track}${p.opened ? ' &middot; opened ' + relTime(p.opened) : ''}</span><span>${pr.d} of ${pr.t} tasks &middot; ${pr.pct}%</span></div>
        <div class="meter"><i style="--p:${pr.pct}%"></i></div>
      </div>
      <div class="actions">
        ${ready
          ? `<button class="btn primary" data-act="launch" data-id="${p.id}" data-k="l-${p.id}">${svg('play')}Launch</button>`
          : `<button class="btn primary" data-act="open" data-id="${p.id}" data-k="s-${p.id}">${svg('sliders')}Set up</button>`}
        <button class="btn" data-act="open" data-id="${p.id}" data-k="o-${p.id}">Details</button>
      </div>
    </article>`;
  }

  function viewList(track) {
    const items = visible(track);
    const isHome = ui.view === 'home';
    let hero = '';
    if (isHome) {
      const o = overall();
      const nx = nextUp();
      const d = new Date();
      hero = `<section class="hero">
        <div class="hero-top">
          <div><h1>${greeting()}</h1><p>Your workspace, tools, and next steps, gathered in one place.</p></div>
          <div class="chips">
            <div class="info-chip"><span class="label">Now</span><b id="c-date">${d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</b></div>
            <div class="info-chip hot"><span class="label">Time</span><b id="c-time">${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</b></div>
            <div class="info-chip"><span class="label">Weather</span><b id="c-weather">${esc(weather)}</b></div>
            <div class="info-chip"><span class="label">Projects</span><b>${S.projects.length}</b></div>
            <div class="info-chip"><span class="label">Tasks done</span><b>${o.d} / ${o.t}</b></div>
          </div>
        </div>
        <div class="note"><span class="tag">Next up</span>
          <span class="t">${nx ? `<b>${esc(nx.task)}</b> in ${esc(nx.p.name)}` : 'All caught up. Add a new project to keep going.'}</span>
          ${nx ? `<button class="btn primary" data-act="open" data-id="${nx.p.id}" data-k="nx">${svg('play')}Continue</button>` : '<button class="btn" data-act="new" data-k="new">Add project</button>'}
        </div>
      </section>`;
    }
    if (isHome) {
      const recent = S.projects.filter((project) => project.opened).sort((a, b) => b.opened - a.opened).slice(0, 3);
      const recentItems = recent.map((project) => `<button class="home-recent-item" data-act="open" data-id="${project.id}" data-k="home-recent-${project.id}">
        <span class="tile">${svg(project.icon)}</span><span class="home-recent-copy"><b>${esc(project.name)}</b><small>${esc(project.track)} · ${esc(project.status)}</small></span>${svg('arrow')}
      </button>`).join('');
      return `${hero}${toolGrid(null)}<section class="home-recent"><div class="sec-head"><h2>Recent work<small>${recent.length ? 'Pick up where you left off' : 'Your opened projects will appear here'}</small></h2>
        <button class="textbtn" data-act="nav" data-v="projects" data-k="home-all-projects">All projects ${svg('arrow')}</button></div>
        ${recent.length ? `<div class="home-recent-list">${recentItems}</div>` : `<div class="panel home-recent-empty"><p class="help">Open a project to pin it here for quick access.</p><button class="btn" data-act="nav" data-v="projects" data-k="home-browse-projects">Browse projects</button></div>`}
      </section>`;
    }
    const title = track ? `${track} projects` : 'Projects';
    const sortOpts = SORTS.map(([v, l]) => `<option value="${v}"${S.settings.sort === v ? ' selected' : ''}>${l}</option>`).join('');
    const total = S.projects.filter((p) => !track || p.track === track).length;
    return `${hero}
      <div class="sec-head"><h2>${title}<small id="project-result-count">${ui.q ? items.length + ' of ' + total : total}</small></h2>
        <div class="tools">
          <label class="search">${svg('search')}<input id="flt" class="in" placeholder="Filter  ( / )" value="${esc(ui.q)}" aria-label="Filter projects" autocomplete="off"></label>
          <select id="srt" class="in sel" aria-label="Sort projects">${sortOpts}</select>
          <button class="btn primary" data-act="new" data-k="new">${svg('plus')}New project</button>
        </div></div>
      <div id="project-results">${items.length ? `<div class="grid">${items.map(card).join('')}</div>`
        : `<div class="panel"><p class="help">${ui.q ? 'No projects match that filter.' : 'Nothing here yet. Add your first ' + (track || '') + ' project.'}</p></div>`}</div>`;
  }

  function updateProjectResults() {
    const results = document.getElementById('project-results');
    if (!results) return;
    const track = ui.view === 'Android' || ui.view === 'PC' ? ui.view : null;
    const items = visible(track);
    const total = S.projects.filter((project) => !track || project.track === track).length;
    const count = document.getElementById('project-result-count');
    if (count) count.textContent = ui.q ? `${items.length} of ${total}` : String(total);
    results.innerHTML = items.length ? `<div class="grid">${items.map(card).join('')}</div>`
      : `<div class="panel"><p class="help">${ui.q ? 'No projects match that filter.' : 'Nothing here yet. Add your first ' + (track || '') + ' project.'}</p></div>`;
  }

  function scheduleSearchUpdate(update) {
    if (searchUpdateFrame) return;
    searchUpdateFrame = requestAnimationFrame(() => {
      searchUpdateFrame = 0;
      update();
    });
  }

  function taskRow(t) {
    if (ui.editTask === t.id) {
      return `<li class="task editing"><input class="in" id="te" value="${esc(t.t)}" maxlength="160" aria-label="Edit task"></li>`;
    }
    return `<li class="task${t.d ? ' done' : ''}" draggable="true" data-tid="${t.id}">
        <span class="grip" aria-hidden="true">${svg('grip')}</span>
        <label><input type="checkbox" class="chk" data-act="toggle" data-id="${t.id}" data-k="t-${t.id}"${t.d ? ' checked' : ''}><span>${esc(t.t)}</span></label>
        <button class="x" data-act="edittask" data-id="${t.id}" data-k="e-${t.id}" aria-label="Edit task">${svg('pencil')}</button>
        <button class="x" data-act="deltask" data-id="${t.id}" data-k="x-${t.id}" aria-label="Remove task">${svg('x')}</button></li>`;
  }

  function viewProject() {
    const p = find(ui.id);
    if (!p) { ui.view = 'home'; return viewList(null); }
    const returnView = ui.projectReturnView || p.track;
    const pr = progress(p);
    const isLockedStarter = !!p.isStarter && appMode !== 'dev';
    const status = STATUSES.map((s) => `<button data-act="status" data-v="${s}" data-k="st-${s}" class="${s === 'Blocked' ? 'blocked' : ''}" aria-pressed="${p.status === s}" ${isLockedStarter && appMode !== 'dev' ? 'disabled' : ''}>${s}</button>`).join('');
    const isApp = p.launch.mode === 'app';
    const isSpotifyApp = isApp && p.launch.target === 'spotify:';
    const links = p.links.map((k) => `<li class="link"><button class="linkbtn" data-act="openlink" data-id="${k.id}" data-k="lk-${k.id}" title="${esc(k.url)}">${svg('external')}<span><b>${esc(k.label)}</b>${k.label === hostOf(k.url) ? '' : `<small>${esc(hostOf(k.url))}</small>`}</span></button>
        <button class="x on" data-act="dellink" data-id="${k.id}" data-k="dl-${k.id}" aria-label="Remove link">${svg('x')}</button></li>`).join('');
    const canEdit = canEditProjects() || !isLockedStarter;
    return `<button class="btn back" data-act="nav" data-v="${esc(returnView)}" data-k="back">${svg('back')}${esc(returnView === 'projects' ? 'Projects' : returnView)}</button>
    <section class="p-hero">
      <div class="tile">${svg(p.icon)}</div>
      <div class="p-title">
        <input class="name-in" id="f-name" data-bind="name" value="${esc(p.name)}" maxlength="60" aria-label="Project name" ${canEdit || !isLockedStarter ? '' : 'readonly'}>
        <span class="p-sub">${p.track} &middot; ${pr.d} of ${pr.t} tasks done &middot; ${pr.pct}% synced${isLockedStarter ? ' &middot; starter template' : ''}</span>
      </div>
      <button class="icon-btn pin${p.pinned ? ' on' : ''}" data-act="pin" data-id="${p.id}" data-k="pin" aria-pressed="${p.pinned}" aria-label="${p.pinned ? 'Unpin' : 'Pin'}" title="${p.pinned ? 'Unpin' : 'Pin to top'}" ${canEdit || !isLockedStarter ? '' : 'disabled'}>${svg('star')}</button>
      <div class="seg" role="group" aria-label="Status">${status}</div>
    </section>
    <div class="cols">
      <div class="col">
        <section class="panel">
          <h3>Tasks <small>${pr.d} of ${pr.t} done${pr.d && canEdit ? ' &middot; <button class="textbtn" data-act="cleardone" data-k="cleardone">Clear completed</button>' : ''}</small></h3>
          <div class="meter"><i style="--p:${pr.pct}%"></i></div>
          <ul class="tasks" id="tasks">${p.tasks.map(taskRow).join('') || '<li class="empty">No tasks yet. Add the first step below.</li>'}</ul>
          ${canEdit ? `<div class="row nowrap"><input class="in" id="nt" placeholder="Add a task" maxlength="160" value="${esc(drafts.nt || '')}" data-draft="nt" autocomplete="off">
            <button class="btn primary" data-act="addtask" data-k="addtask">${svg('plus')}Add</button></div>` : '<p class="help">Developer mode is required to add or edit tasks.</p>'}
          <p class="help">Drag the dots to reorder. Press the pencil to rename a task.</p>
        </section>
        <section class="panel">
          <h3>Notes</h3>
          <textarea class="ta" id="f-notes" data-bind="notes" placeholder="Links, ideas, things to remember" ${canEdit ? '' : 'readonly'}>${esc(p.notes)}</textarea>
        </section>
      </div>
      <div class="col">
        <section class="panel">
          <h3>Launch</h3>
          <div class="seg" role="group" aria-label="Launch mode">
            <button data-act="mode" data-v="app" data-k="m-app" aria-pressed="${isApp}" ${canEdit || !isLockedStarter ? '' : 'disabled'}>Open app or file</button>
            <button data-act="mode" data-v="command" data-k="m-cmd" aria-pressed="${!isApp}" ${canEdit || !isLockedStarter ? '' : 'disabled'}>Run command</button>
          </div>
          <div class="field"><span class="label">${isApp ? 'App or file' : 'Command'}</span>
            <div class="row nowrap" data-drop="target"><input class="in" id="f-target" data-bind="target" value="${esc(p.launch.target)}" placeholder="${isApp ? 'Pick or drop an .exe, shortcut or file' : 'npm run dev'}" spellcheck="false" ${canEdit || !isLockedStarter ? '' : 'readonly'}>
              ${isApp && (canEdit || !isLockedStarter) ? `<button class="btn" data-act="pick" data-v="file" data-k="pk-file">Browse</button>` : ''}</div></div>
          <div class="field"><span class="label">Project folder</span>
            <div class="row nowrap" data-drop="folder"><input class="in" id="f-folder" data-bind="folder" value="${esc(p.folder)}" placeholder="Pick or drop the folder this project lives in" spellcheck="false" ${canEdit || !isLockedStarter ? '' : 'readonly'}>
              ${(canEdit || !isLockedStarter) ? `<button class="btn" data-act="pick" data-v="folder" data-k="pk-folder">Browse</button>` : ''}</div></div>
          <div class="actions">
            <button class="btn primary" data-act="launch" data-id="${p.id}" data-k="launch">${svg('play')}Launch</button>
            <button class="btn" data-act="reveal" data-k="reveal">${svg('folder')}Open folder</button>
          </div>
          <p class="help">${isSpotifyApp ? 'Opens the installed Spotify desktop app. YuniSpot will load if you have applied it to Spotify.' : isApp ? 'Opens the app or file you picked.' : 'Runs in a new terminal window inside the project folder.'} ${isSpotifyApp ? '' : 'You can drag a file or folder onto the fields above.'}</p>
        </section>
        <section class="panel">
          <h3>Links <small>${p.links.length}</small></h3>
          ${links ? `<ul class="links">${links}</ul>` : '<p class="help">Save your repo, docs or anything you keep reopening.</p>'}
          ${canEdit ? `<div class="row nowrap"><input class="in" id="lk-label" placeholder="Name (optional)" maxlength="60" value="${esc(drafts['lk-label'] || '')}" data-draft="lk-label" style="max-width:38%">
            <input class="in" id="lk-url" placeholder="github.com/you/project" maxlength="500" value="${esc(drafts['lk-url'] || '')}" data-draft="lk-url" spellcheck="false">
            <button class="btn" data-act="addlink" data-k="addlink">Add</button></div>` : '<p class="help">Developer mode is required to manage links.</p>'}
        </section>
        <section class="panel">
          <h3>Details</h3>
          <div class="field"><span class="label">Description</span>
            <textarea class="ta sm" id="f-desc" data-bind="desc" maxlength="200" placeholder="What is this project?" ${canEdit ? '' : 'readonly'}>${esc(p.desc)}</textarea></div>
          <div class="field"><span class="label">Track</span>
            <div class="seg" role="group" aria-label="Track">${TRACKS.map((t) => `<button data-act="track" data-v="${t}" data-k="tr-${t}" aria-pressed="${p.track === t}" ${canEdit ? '' : 'disabled'}>${t}</button>`).join('')}</div></div>
          <div class="field"><span class="label">Icon</span>
            <div class="icons">${PICKABLE.map((k) => `<button data-act="icon" data-v="${k}" data-k="ic-${k}" aria-pressed="${p.icon === k}" aria-label="${k}" ${canEdit ? '' : 'disabled'}>${svg(k)}</button>`).join('')}</div></div>
          ${canEdit || !isLockedStarter ? `<div class="row"><button class="btn" data-act="dup" data-k="dup">Duplicate project</button>
            <button class="btn danger${ui.confirmDel ? ' armed' : ''}" data-act="del" data-k="del">${svg('trash')}${ui.confirmDel ? 'Confirm delete' : 'Delete project'}</button>
            ${ui.confirmDel ? '<button class="btn" data-act="cancel" data-k="cancel">Keep it</button>' : ''}</div>` : '<p class="help">Developer mode is required for project setup and cleanup.</p>'}
        </section>
      </div>
    </div>`;
  }

  function viewSettings() {
    const th = (id, label, desc) => `<button class="theme-opt" data-act="theme" data-v="${id}" data-k="th-${id}" aria-pressed="${S.settings.theme === id}">
        <span class="swatch s-${id}"${id === 'custom' ? ` style="--custom-bg:${S.settings.customTheme.background};--custom-surface:${S.settings.customTheme.surface};--custom-accent:${S.settings.customTheme.accent}"` : ''}><i></i><i></i></span><b>${label}</b>${desc ? `<small>${desc}</small>` : ''}</button>`;
    const sameTheme = (x) => S.settings.theme === 'custom' && ['background', 'accent', 'surface'].every((k) => S.settings.customTheme[k] === x[k]);
    const saved = [...S.settings.savedThemes].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
    const swatchOf = (x) => `--custom-bg:${x.background};--custom-surface:${x.surface};--custom-accent:${x.accent}`;
    const pinTile = (x) => `<button class="theme-opt" data-act="theme-load" data-id="${esc(x.id)}" data-k="thl-${esc(x.id)}" aria-pressed="${sameTheme(x)}" title="${esc(x.desc)}"><span class="swatch s-custom" style="${swatchOf(x)}"><i></i><i></i></span><b>${esc(x.name)}</b>${x.desc ? `<small>${esc(x.desc)}</small>` : ''}</button>`;
    const savedRow = (x) => `<div class="saved-theme${sameTheme(x) ? ' on' : ''}"><span class="st-dots"><i style="background:${x.background}"></i><i style="background:${x.surface}"></i><i style="background:${x.accent}"></i></span>
        <div class="t"><b>${esc(x.name)}</b><span class="help">${esc(x.desc || 'No description')}</span></div>
        <div class="st-actions"><button class="textbtn" data-act="theme-load" data-id="${esc(x.id)}" data-k="stl-${esc(x.id)}">Load</button>
          <button class="textbtn" data-act="theme-update" data-id="${esc(x.id)}" data-k="stu-${esc(x.id)}">Update colors</button>
          <button class="st-pin${x.pinned ? ' on' : ''}" data-act="theme-pin" data-id="${esc(x.id)}" data-k="stp-${esc(x.id)}" aria-pressed="${!!x.pinned}" aria-label="${x.pinned ? 'Unpin' : 'Pin'} ${esc(x.name)}" title="${x.pinned ? 'Unpin from theme picker' : 'Pin to theme picker'}">${x.pinned ? '\u2605' : '\u2606'}</button>
          <button class="textbtn st-del${ui.confirmThemeDel === x.id ? ' armed' : ''}" data-act="theme-del" data-id="${esc(x.id)}" data-k="std-${esc(x.id)}">${ui.confirmThemeDel === x.id ? 'Confirm delete' : 'Delete'}</button></div></div>`;
    const sw = (id, title, sub, on) => `<div class="switch-row"><div class="t"><b>${title}</b><span class="help">${sub}</span></div>
        <input type="checkbox" class="switch" id="${id}" data-act="${id}" ${on ? 'checked' : ''} aria-label="${title}"></div>`;
    const appearanceRange = (key, label, min, max, step, unit = '%') => `<label class="appearance-range"><span>${label}<output id="appearance-${key}-output">${unit === 'px' ? `${S.settings[key]}px` : `${Math.round(Number(S.settings[key]) * 100)}%`}</output></span>
      <input type="range" min="${min}" max="${max}" step="${step}" value="${S.settings[key]}" data-appearance-range="${key}" data-range-unit="${unit}" aria-label="${label}"></label>`;
    const fontName = S.settings.customFontPath ? S.settings.customFontPath.split(/[\\/]/).pop() : 'No custom font loaded';
    const keys = [['Ctrl K', 'Search and jump anywhere'], ['Ctrl N', 'New project'], ['Ctrl 1 to 9', 'Home, Projects, Studio, Spotify, Roblox, Discord, Android, PC, PS4'], ['/', 'Filter the project list'], ['Esc', 'Close or go back']];
    return `<div class="sec-head"><h2>Settings</h2><label class="search settings-search">${svg('search')}<input id="settings-filter" class="in" type="search" value="${esc(ui.settingsFilter)}" placeholder="Find a setting" aria-label="Find a setting"></label></div>
    <div class="set-grid settings-layout">
      <div class="settings-primary">
        ${intPanel()}
        <section class="panel"><h3>System</h3>
          ${sw('login', 'Start with Windows', 'Open the hub when you sign in.', info.openAtLogin)}
          ${sw('tray', 'Keep running in the tray', 'Closing the window hides it instead of quitting.', S.settings.closeToTray)}
          ${sw('hotkey', 'Global shortcut', 'Press Ctrl+Alt+H anywhere to show or hide the hub.', S.settings.hotkey)}
        </section>
        <section class="panel"><h3>Keyboard shortcuts</h3>
          <ul class="keys">${keys.map(([k, t]) => `<li><kbd>${k}</kbd><span>${t}</span></li>`).join('')}</ul>
        </section>
        <section class="panel settings-support"><h3>Support &amp; data</h3>
          <div class="settings-support-grid">
            <div class="settings-support-item"><h4>Backup</h4>
              <p class="help">Automatic daily backups keep the last 7. Export or restore a backup file here.</p>
              <div class="actions"><button class="btn" data-act="export" data-k="export">Export</button>
                <button class="btn" data-act="import" data-k="import">Import</button>
                <button class="btn" data-act="openbackups" data-k="openbackups">${svg('folder')}Backups</button></div>
            </div>
            <div class="settings-support-item"><h4>Help</h4>
              <p class="help">Revisit the guided tour for a quick overview of YuniHub.</p>
              <div class="actions"><button class="btn" data-act="replaytour" data-k="replaytour">Replay tour</button></div>
            </div>
            <div class="settings-support-item settings-about"><div class="settings-about-heading"><h4>About</h4><span class="help">${esc(S.settings.hubName)} v${esc(info.version || '0.2.0')}</span></div>
              <div class="update-status" aria-live="polite"><span class="dot${['checking', 'downloading'].includes(updateInfo.status) ? '' : ' off'}"></span><span>${esc(updateInfo.message)}</span></div>
              ${updateInfo.status === 'available' ? '<button class="btn primary" data-act="update-download" data-k="update-download">Download update</button>' : ''}
              ${updateInfo.status === 'downloading' ? `<div class="meter"><i style="--p:${Math.max(0, Math.min(100, Number(updateInfo.percent) || 0))}%"></i></div>` : ''}
              ${updateInfo.status === 'downloaded' ? '<button class="btn primary" data-act="update-install" data-k="update-install">Restart to install</button>' : ''}
              <button class="btn" data-act="update-check" data-k="update-check"${['checking', 'downloading'].includes(updateInfo.status) ? ' disabled' : ''}>Check for updates</button>
              <span class="label">Data file</span><span class="mono">${esc(info.dataFile || '')}</span>
            </div>
          </div>
        </section>
      </div>
      <div class="settings-appearance">
        <section class="panel"><h3>Appearance</h3>
          <div class="themes">${th('dark', 'Midnight', 'Red and black glass.')}${th('rei', 'Rei light', 'Soft light with red accents.')}${th('dehbify', 'Etherium Theme', 'Pink and purple plexus. Shout Out hbmi <3.')}${th('berrybaby', 'Berry Baby', 'Sage green, baby pink, and strawberries. I Love You Ty <3.')}${th('custom', 'Custom', 'Your own colors.')}${saved.filter((x) => x.pinned).map(pinTile).join('')}</div>
          <div class="custom-palette"><div class="palette-title"><span class="label">Custom colors</span><button class="textbtn" data-act="theme-reset" data-k="theme-reset">Reset</button></div>
            ${[['background', 'Window'], ['accent', 'Accent'], ['surface', 'Surfaces']].map(([key, label]) => `<label class="color-setting"><span>${label}</span><input type="color" value="${esc(S.settings.customTheme[key])}" data-theme-color="${key}" aria-label="Custom theme ${label.toLowerCase()} color"></label>`).join('')}
          </div>
          <div class="saved-themes"><div class="palette-title"><span class="label">Save current custom colors</span></div>
            <input class="in" id="st-name" placeholder="Theme name" maxlength="30" aria-label="Theme name">
            <input class="in" id="st-desc" placeholder="Description (optional)" maxlength="90" aria-label="Description (optional)">
            <div class="row"><button class="btn primary" data-act="theme-save" data-k="theme-save">Save theme</button></div>
            ${saved.length ? `<div class="saved-list">${saved.map(savedRow).join('')}</div>` : '<p class="help">Saved themes show up here. Pin one with the star to add it to the theme picker.</p>'}
          </div>
          <div class="pref-list">
            ${sw('compactMode', 'Compact project cards', 'Fit more projects on screen with tighter spacing.', S.settings.compactMode)}
            ${sw('reduceMotion', 'Reduce interface motion', 'Limit movement and transitions throughout YuniHub.', S.settings.reduceMotion)}
            ${sw('presenceShowProject', 'Show project names on Discord', 'Your Discord status names the project you have open. Turn off to keep names private.', S.settings.presenceShowProject)}
            ${sw('rgbAccents', 'RGB accent cycle', 'Slowly cycle accent colors across the interface.', S.settings.rgbAccents)}
          </div>
          <div class="appearance-options">
            <h4>Interface</h4>
            <div class="appearance-control-grid">
              <label class="appearance-select"><span>Card treatment</span><select class="in sel" data-appearance-select="cardStyle"><option value="glass"${S.settings.cardStyle === 'glass' ? ' selected' : ''}>Glass</option><option value="flat"${S.settings.cardStyle === 'flat' ? ' selected' : ''}>Flat</option><option value="tinted"${S.settings.cardStyle === 'tinted' ? ' selected' : ''}>Tinted</option></select></label>
            </div>
            <label class="appearance-select"><span>Font family</span><select class="in sel" data-appearance-select="fontPreset"><option value="system"${S.settings.fontPreset === 'system' ? ' selected' : ''}>System sans</option><option value="rounded"${S.settings.fontPreset === 'rounded' ? ' selected' : ''}>Rounded sans</option><option value="serif"${S.settings.fontPreset === 'serif' ? ' selected' : ''}>Serif</option><option value="mono"${S.settings.fontPreset === 'mono' ? ' selected' : ''}>Monospace</option><option value="custom"${S.settings.fontPreset === 'custom' ? ' selected' : ''}>Custom font</option></select></label>
            <div class="appearance-font-row"><span class="help" id="custom-font-name" title="${esc(fontName)}">${esc(fontName)}</span><div class="actions"><button class="btn" data-act="font-pick" data-k="font-pick">Choose font file</button>${S.settings.customFontPath ? '<button class="textbtn" data-act="font-reset" data-k="font-reset">Remove</button>' : ''}</div></div>
            <h4>Background motion</h4>
            ${appearanceRange('backgroundIntensity', 'Effect intensity', .5, 1.5, .05)}
            ${appearanceRange('backgroundSpeed', 'Animation speed', .5, 1.75, .05)}
            ${appearanceRange('interfaceScale', 'Interface scale', .9, 1.1, .05)}
            <h4>Studio editor</h4>
            ${appearanceRange('studioFontSize', 'Editor text size', 10, 20, 1, 'px')}
            ${sw('studioWordWrap', 'Word wrap', 'Wrap long lines to the editor width.', S.settings.studioWordWrap)}
            ${S.settings.theme === 'berrybaby' ? sw('berryCursor', 'Strawberry cursor', 'Use the Berry Baby cursor throughout YuniHub.', S.settings.berryCursor) : ''}
          </div>
        </section>
      </div>
    </div><p id="settings-filter-empty" class="panel settings-filter-empty" hidden>No settings match that search.</p>`;
  }

  function applySettingsFilter() {
    const query = ui.settingsFilter.trim().toLowerCase();
    const panels = Array.from(document.querySelectorAll('.settings-layout .panel'));
    let visible = 0;
    for (const panel of panels) {
      const matches = !query || panel.textContent.toLowerCase().includes(query);
      panel.hidden = !matches;
      if (matches) visible++;
    }
    const empty = document.getElementById('settings-filter-empty');
    if (empty) empty.hidden = visible > 0;
  }

  function modal() {
    if (!ui.modal) return '';
    const tr = drafts.track || 'Android';
    const tpl = drafts.mtpl || (tr === 'PC' ? 'desktop' : 'android');
    return `<div class="scrim" data-act="scrim"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="m-title">
      <h2 id="m-title">New project</h2>
      <div class="field"><label class="label" for="m-name">Name</label>
        <input class="in" id="m-name" maxlength="60" placeholder="What are you building?" value="${esc(drafts.mname || '')}" data-draft="mname" autocomplete="off"></div>
      <div class="field"><label class="label" for="m-desc">Description</label>
        <input class="in" id="m-desc" maxlength="200" placeholder="Optional" value="${esc(drafts.mdesc || '')}" data-draft="mdesc" autocomplete="off"></div>
      <div class="field"><span class="label">Track</span>
        <div class="seg" role="group" aria-label="Track">${TRACKS.map((t) => `<button data-act="mtrack" data-v="${t}" data-k="mt-${t}" aria-pressed="${tr === t}">${t}</button>`).join('')}</div></div>
      <div class="field"><span class="label">Starter tasks</span>
        <div class="seg" role="group" aria-label="Starter tasks">${Object.keys(TEMPLATES).map((k) => `<button data-act="mtpl" data-v="${k}" data-k="mp-${k}" aria-pressed="${tpl === k}">${TEMPLATES[k].label}</button>`).join('')}</div></div>
      <div class="row" style="justify-content:flex-end"><button class="btn" data-act="mcancel" data-k="mcancel">Cancel</button>
        <button class="btn primary" data-act="madd" data-k="madd">Add project</button></div>
    </div></div>`;
  }

  function render() {
    const root = document.getElementById('app');
    const viewChanged = renderedView !== ui.view;
    renderedView = ui.view;
    if (ui.studio === null) ui.studio = defaultStudioWorkspace();
    if (scriptEditor) { scriptEditor.destroy(); scriptEditor = null; }
    if (studioEditor) { studioEditor.destroy(); studioEditor = null; }
    const ae = document.activeElement;
    let key = null, ss = null, se = null;
    if (ae && ae !== document.body && root.contains(ae)) {
      key = ae.id ? '#' + ae.id : ae.dataset && ae.dataset.k ? `[data-k="${ae.dataset.k}"]` : null;
      try { ss = ae.selectionStart; se = ae.selectionEnd; } catch { /* not a text field */ }
    }
    const oldMain = root.querySelector('.main');
    const scroll = oldMain ? oldMain.scrollTop : 0;

    let body;
    if (ui.view === 'project') body = viewProject();
    else if (ui.view === 'settings') body = viewSettings();
    else if (ui.view === 'Studio') body = viewStudio();
    else if (['Spotify', 'Roblox', 'PS4', 'Discord'].includes(ui.view)) body = viewTools(ui.view);
    else if (ui.view === 'projects') body = viewList(null);
    else if (ui.view === 'Android' || ui.view === 'PC') body = viewList(ui.view);
    else body = viewList(null);

    root.innerHTML = `<div class="app">${sidebar(viewChanged && ui.view !== 'home')}<main class="main${viewChanged ? ' view-enter' : ''}" id="main">${body}</main></div>${modal()}${scriptDetailsModal()}${scriptConflictModal()}`;
    if (ui.view === 'settings') applySettingsFilter();

    const main = root.querySelector('.main');
    if (main) main.scrollTop = scroll;
    if (key) {
      let el = null;
      try { el = root.querySelector(key); } catch { /* ignore */ }
      if (el) {
        el.focus({ preventScroll: true });
        if (ss != null) { try { el.setSelectionRange(ss, se); } catch { /* ignore */ } }
      }
    }
    if (ui.scriptDetails) {
      const mount = root.querySelector('#script-editor');
      if (mount) mountScriptEditor(mount, ui.scriptDetails);
    }
    if (ui.view === 'Studio') {
      if (ui.studio.activeFile) mountStudioEditor(root.querySelector('#studio-editor'), ui.studio);
      if (ui.studio.folder && !ui.studio.loaded && !ui.studio.loading) loadStudioWorkspace(ui.studio);
      if (ui.studio.folder && !ui.studio.terminalSessionId && !ui.studio.terminalConnecting) ensureStudioTerminal(ui.studio);
    }
  }

  function tick() {
    const d = new Date();
    const a = document.getElementById('c-date');
    const b = document.getElementById('c-time');
    if (a) a.textContent = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    if (b) b.textContent = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }

  /* ---------- command palette ---------- */
  function paletteItems() {
    const items = [];
    const nav = (label, view, icon) => items.push({ label, hint: 'Go to', icon, run: () => go(view) });
    nav('Home', 'home', 'home'); nav('Projects', 'projects', 'folder'); nav('Studio', 'Studio', 'code'); nav('Spotify', 'Spotify', 'headphones'); nav('Roblox', 'Roblox', 'package'); nav('Discord Status', 'Discord', 'chat'); nav('Android projects', 'Android', 'phone'); nav('PC projects', 'PC', 'monitor'); nav('PS4 tools', 'PS4', 'gamepad'); nav('Settings', 'settings', 'sliders');
    items.push({ label: 'New project', hint: 'Action', icon: 'plus', run: () => openNew() });
    items.push({ label: S.settings.theme === 'dark' ? 'Switch to Rei light theme' : 'Switch to Midnight theme', hint: 'Action', icon: 'theme',
      run: () => { S.settings.theme = S.settings.theme === 'dark' ? 'rei' : 'dark'; applyTheme(); touch(); render(); } });
    S.projects.forEach((p) => {
      items.push({ label: p.name, hint: `${p.track} · ${p.status}`, icon: p.icon, run: () => go('project', p.id) });
      if (p.launch.target) items.push({ label: 'Launch ' + p.name, hint: 'Launch', icon: 'play', run: () => { flush(); runLaunch(p); } });
    });
    const q = pal.q.trim().toLowerCase();
    if (ui.view === 'Studio' && ui.studio && ui.studio.folder) {
      const studio = ui.studio;
      studio.files.filter((file) => !q || file.path.toLowerCase().includes(q)).slice(0, 50).forEach((file) => {
        items.push({ label: file.path, hint: 'Open file', icon: 'file', run: () => openStudioFile(studio, file.path) });
      });
    }
    if (!q) return items;
    const words = q.split(/\s+/);
    return items.filter((it) => { const hay = (it.label + ' ' + it.hint).toLowerCase(); return words.every((w) => hay.includes(w)); });
  }
  function paletteList() {
    const items = paletteItems();
    if (pal.sel >= items.length) pal.sel = Math.max(0, items.length - 1);
    const el = document.getElementById('pal-list');
    if (!el) return items;
    el.innerHTML = items.length
      ? items.map((it, i) => `<button class="pal-item${i === pal.sel ? ' on' : ''}" role="option" aria-selected="${i === pal.sel}" data-pal="run" data-i="${i}">${svg(it.icon)}<span>${esc(it.label)}</span><em>${esc(it.hint)}</em></button>`).join('')
      : '<div class="pal-empty">Nothing matches that.</div>';
    const on = el.querySelector('.on');
    if (on && on.scrollIntoView) on.scrollIntoView({ block: 'nearest' });
    return items;
  }
  function openPalette() {
    pal.open = true; pal.q = ''; pal.sel = 0;
    const root = document.getElementById('palette');
    root.innerHTML = `<div class="scrim pal-scrim" data-pal="scrim"><div class="palette" role="dialog" aria-modal="true" aria-label="Search">
      <div class="pal-in">${svg('search')}<input id="pal-in" placeholder="Open a file, jump to a project, or run a command" autocomplete="off" spellcheck="false" aria-label="Search"></div>
      <div id="pal-list" role="listbox"></div>
      <div class="pal-foot"><span><kbd>Up</kbd><kbd>Down</kbd> move</span><span><kbd>Enter</kbd> select</span><span><kbd>Esc</kbd> close</span></div></div></div>`;
    paletteList();
    document.getElementById('pal-in').focus();
  }
  function closePalette() {
    pal.open = false;
    document.getElementById('palette').innerHTML = '';
  }
  function paletteKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); closePalette(); return; }
    const n = paletteItems().length;
    if (e.key === 'ArrowDown') { e.preventDefault(); pal.sel = n ? (pal.sel + 1) % n : 0; paletteList(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); pal.sel = n ? (pal.sel - 1 + n) % n : 0; paletteList(); }
    else if (e.key === 'Enter') { e.preventDefault(); runPalette(pal.sel); }
  }
  function runPalette(i) {
    const it = paletteItems()[i];
    closePalette();
    if (it) it.run();
  }
  document.getElementById('palette').addEventListener('click', (e) => {
    const t = e.target.closest('[data-pal]');
    if (!t) return;
    if (t.dataset.pal === 'scrim') { if (e.target === t) closePalette(); }
    else if (t.dataset.pal === 'run') runPalette(+t.dataset.i);
  });
  document.getElementById('palette').addEventListener('input', (e) => {
    if (e.target.id === 'pal-in') { pal.q = e.target.value; pal.sel = 0; paletteList(); }
  });

  /* ---------- actions ---------- */
  function go(view, id) {
      updateDiscordActivity();
    if (view === 'project' && ui.view !== 'project') ui.projectReturnView = ui.view;
    ui.view = view; ui.id = id || null; ui.confirmDel = false; ui.editTask = null;
    if (view !== 'project' && !(view === 'Android' || view === 'PC' || view === 'home' || view === 'projects')) ui.q = '';
    if (view === 'project') {
      const p = find(id);
      if (p) { p.opened = Date.now(); touch(); }
    }
    render();
    const main = document.getElementById('main');
    if (main) main.scrollTop = 0;
  }

  function openNew() {
    ui.modal = true;
    drafts.track = ui.view === 'PC' ? 'PC' : 'Android';
    delete drafts.mtpl;
    render();
    const el = document.getElementById('m-name'); if (el) el.focus();
  }

  function addTask() {
    const p = find(ui.id); if (!p) return;
    if (!gateProjectEditor('This starter template is locked to developer mode.', p)) return;
    const el = document.getElementById('nt');
    const v = clip(el && el.value, 160);
    if (!v) { if (el) el.focus(); return; }
    p.tasks.push({ id: uid(), t: v, d: false });
    drafts.nt = '';
    touch(); render();
    const again = document.getElementById('nt'); if (again) again.focus();
  }

  function addLink() {
    const p = find(ui.id); if (!p) return;
    if (!gateProjectEditor('This starter template is locked to developer mode.', p)) return;
    const url = cleanUrl(document.getElementById('lk-url').value);
    if (!url) { toast('Enter a valid web address.', 'err'); document.getElementById('lk-url').focus(); return; }
    const label = clip(document.getElementById('lk-label').value, 60) || hostOf(url);
    p.links.push({ id: uid(), label, url });
    drafts['lk-label'] = ''; drafts['lk-url'] = '';
    touch(); render();
    const again = document.getElementById('lk-url'); if (again) again.focus();
  }

  function commitEdit() {
    const id = ui.editTask;
    if (!id) return;
    const p = find(ui.id); const t = p && p.tasks.find((x) => x.id === id);
    if (p && !gateProjectEditor('This starter template is locked to developer mode.', p)) return;
    const el = document.getElementById('te');
    const v = clip(el && el.value, 160);
    ui.editTask = null;
    if (t && v && v !== t.t) { t.t = v; touch(); }
    render();
  }

  function addProject() {
    const name = clip(drafts.mname, 60);
    if (!name) { const el = document.getElementById('m-name'); if (el) el.focus(); return; }
    const track = drafts.track || 'Android';
    const tpl = TEMPLATES[drafts.mtpl || (track === 'PC' ? 'desktop' : 'android')] || TEMPLATES.blank;
    const p = normProject({
      name, desc: drafts.mdesc, track,
      icon: track === 'PC' ? 'monitor' : 'phone',
      tasks: ['Add it to the hub'].concat(tpl.tasks).map((t, i) => ({ id: uid(), t, d: i === 0 }))
    });
    S.projects.push(p);
    drafts.mname = ''; drafts.mdesc = ''; ui.modal = false;
    touch(); go('project', p.id);
  }

  async function runLaunch(p) {
    const r = await API.launch({ mode: p.launch.mode, target: p.launch.target, cwd: p.folder });
    if (r && r.ok) { p.opened = Date.now(); touch(); toast(`Launched ${p.name}`, 'ok'); }
    else toast((r && r.error) || 'Could not launch.', 'err');
  }

  document.addEventListener('click', async (e) => {
    const t = e.target.closest('[data-act]');
    if (ui.view === 'Studio' && ui.studio && ui.studio.openMenu && !e.target.closest('.studio-menu')) {
      ui.studio.openMenu = '';
      if (!t) { render(); return; }
    }
    if (!t) return;
    const act = t.dataset.act;
    if (act === 'scrim') { if (e.target === t) { ui.modal = false; render(); } return; }
    if (act === 'script-preview-scrim') { if (e.target === t) { ui.scriptDetails = null; render(); } return; }
    const p = ui.id ? find(ui.id) : null;

    switch (act) {
      case 'nav': go(t.dataset.v); break;
      case 'open': go('project', t.dataset.id); break;
      case 'orb-completer-launch': {
        const result = await API.openOrbCompleter();
        if (result && result.ok) toast(result.alreadyRunning ? 'Orb Completer is already open.' : 'Orb Completer opened in a separate window.', 'ok');
        else toast((result && result.error) || 'Could not open Orb Completer.', 'err');
      } break;
      case 'palette': openPalette(); break;
      case 'pin': { const pp = find(t.dataset.id); if (!gateProjectEditor('This starter template is locked to developer mode.', pp)) return; if (pp) { pp.pinned = !pp.pinned; touch(); render(); } } break;
      case 'launch': { const lp = find(t.dataset.id || ui.id); if (lp) { await flush(); runLaunch(lp); } } break;
      case 'reveal': if (p) { const r = await API.reveal(p.folder); if (!r.ok) toast(r.error, 'err'); } break;
      case 'status': if (!gateProjectEditor('This starter template is locked to developer mode.', p)) return; if (p) { p.status = t.dataset.v; touch(); render(); } break;
      case 'track': if (!gateProjectEditor('This starter template is locked to developer mode.', p)) return; if (p) { p.track = t.dataset.v; touch(); render(); } break;
      case 'icon': if (!gateProjectEditor('This starter template is locked to developer mode.', p)) return; if (p) { p.icon = t.dataset.v; touch(); render(); } break;
      case 'mode': if (!gateProjectEditor('This starter template is locked to developer mode.', p)) return; if (p) { p.launch.mode = t.dataset.v; touch(); render(); } break;
      case 'edittask': if (!gateProjectEditor('This starter template is locked to developer mode.', p)) return; ui.editTask = t.dataset.id; render(); { const el = document.getElementById('te'); if (el) { el.focus(); el.select(); } } break;
      case 'deltask': if (!gateProjectEditor('This starter template is locked to developer mode.', p)) return; if (p) {
        const i = p.tasks.findIndex((x) => x.id === t.dataset.id);
        if (i >= 0) {
          const [gone] = p.tasks.splice(i, 1);
          touch(); render();
          toast('Task removed.', '', { label: 'Undo', fn: () => { p.tasks.splice(Math.min(i, p.tasks.length), 0, gone); touch(); render(); } });
        }
      } break;
      case 'cleardone': if (!gateProjectEditor('This starter template is locked to developer mode.', p)) return; if (p) {
        const before = p.tasks.slice();
        p.tasks = p.tasks.filter((x) => !x.d);
        touch(); render();
        toast(`Cleared ${before.length - p.tasks.length} completed.`, '', { label: 'Undo', fn: () => { p.tasks = before; touch(); render(); } });
      } break;
      case 'addtask': addTask(); break;
      case 'addlink': addLink(); break;
      case 'openlink': if (p) { const k = p.links.find((x) => x.id === t.dataset.id); if (k) { const r = await API.openUrl(k.url); if (r && !r.ok) toast(r.error, 'err'); } } break;
      case 'dellink': if (!gateProjectEditor('This starter template is locked to developer mode.', p)) return; if (p) { p.links = p.links.filter((x) => x.id !== t.dataset.id); touch(); render(); } break;
      case 'pick': if (!gateProjectEditor('This starter template is locked to developer mode.', p)) return; if (p) {
        const path = await API.pick(t.dataset.v);
        if (path) { if (t.dataset.v === 'folder') p.folder = path; else p.launch.target = path; touch(); render(); }
      } break;
      case 'dup': if (!gateProjectEditor('This starter template is locked to developer mode.', p)) return; if (p) {
        const copy = normProject({ ...JSON.parse(JSON.stringify(p)), id: uid(), name: clip(p.name + ' copy', 60), pinned: false, opened: 0, created: Date.now(),
          tasks: p.tasks.map((x) => ({ ...x, id: uid() })), links: p.links.map((x) => ({ ...x, id: uid() })) });
        S.projects.push(copy); touch(); go('project', copy.id); toast('Project duplicated.', 'ok');
      } break;
      case 'del': if (!gateProjectEditor('This starter template is locked to developer mode.', p)) return; if (p) {
        if (ui.confirmDel) {
          const idx = S.projects.indexOf(p);
          S.projects.splice(idx, 1); touch(); go('home');
          toast(`Deleted ${p.name}.`, '', { label: 'Undo', fn: () => { S.projects.splice(Math.min(idx, S.projects.length), 0, p); touch(); go('project', p.id); } });
        } else { ui.confirmDel = true; render(); }
      } break;
      case 'cancel': ui.confirmDel = false; render(); break;
      case 'new': openNew(); break;
      case 'mtrack': drafts.track = t.dataset.v; render(); break;
      case 'mtpl': drafts.mtpl = t.dataset.v; render(); break;
      case 'madd': addProject(); break;
      case 'mcancel': ui.modal = false; render(); break;
      case 'tool': await runTool(t.dataset.id); break;
      case 'studio-menu': {
        const studio = ui.studio || (ui.studio = defaultStudioWorkspace());
        studio.openMenu = studio.openMenu === t.dataset.id ? '' : t.dataset.id;
        render();
      } break;
      case 'studio-menu-action': {
        const studio = ui.studio || (ui.studio = defaultStudioWorkspace());
        await runStudioMenuAction(studio, t.dataset.v);
      } break;
      case 'studio-panel': {
        const studio = ui.studio || (ui.studio = defaultStudioWorkspace());
        studio.activePanel = t.dataset.v;
        studio.panelVisible = true;
        render();
      } break;
      case 'studio-panel-toggle': {
        const studio = ui.studio || (ui.studio = defaultStudioWorkspace());
        studio.panelVisible = false;
        render();
      } break;
      case 'studio-file': {
        const studio = ui.studio || (ui.studio = defaultStudioWorkspace());
        await openStudioFile(studio, t.dataset.id);
      } break;
      case 'studio-tab': {
        const studio = ui.studio || (ui.studio = defaultStudioWorkspace());
        await openStudioFile(studio, t.dataset.id);
      } break;
      case 'studio-close-tab': {
        const studio = ui.studio || (ui.studio = defaultStudioWorkspace());
        await closeStudioTab(studio, t.dataset.id);
      } break;
      case 'studio-new': {
        const studio = ui.studio || (ui.studio = defaultStudioWorkspace());
        studio.newFileOpen = true;
        render();
        document.getElementById('studio-new-path')?.focus();
      } break;
      case 'studio-cancel-new': {
        const studio = ui.studio || (ui.studio = defaultStudioWorkspace());
        studio.newFileOpen = false;
        render();
      } break;
      case 'studio-save': {
        const studio = ui.studio || (ui.studio = defaultStudioWorkspace());
        if (await saveStudioFile(studio)) render();
      } break;
      case 'studio-clear': {
        const studio = ui.studio || (ui.studio = defaultStudioWorkspace());
        studio.terminal = [];
        studio.terminalText = '';
        render();
      } break;
      case 'studio-ports-scan': {
        const studio = ui.studio || (ui.studio = defaultStudioWorkspace());
        studio.portsOptIn = true;
        await refreshStudioPorts(studio);
      } break;
      case 'studio-stop': {
        const studio = ui.studio || (ui.studio = defaultStudioWorkspace());
        await API.stopStudioTerminal(studio.terminalSessionId);
      } break;
      case 'studio-more': {
        const studio = ui.studio || (ui.studio = defaultStudioWorkspace());
        studio.fileLimit += 200;
        render();
      } break;
      case 'studio-folder': {
        const studio = ui.studio || (ui.studio = defaultStudioWorkspace());
        await chooseStudioFolder(studio);
      } break;
      case 'studio-detect': {
        const studio = ui.studio || (ui.studio = defaultStudioWorkspace());
        const result = await API.detectStudioToolchains();
        studio.toolchains = result && result.tools ? result.tools : [];
        studio.visualStudio = result && result.visualStudio;
        render();
        toast(`Detected ${studio.toolchains.length + (studio.visualStudio ? 1 : 0)} development tools.`, 'ok');
      } break;
      case 'script-refresh': await refreshScripts(true); break;
      case 'script-details': await openScriptDetails({ source: t.dataset.source, name: t.dataset.name }); break;
      case 'script-details-close': ui.scriptDetails = null; render(); break;
      case 'script-bundle-ack': {
        const result = await API.acknowledgeScriptBundle(t.dataset.v);
        if (!result || !result.ok) toast((result && result.error) || 'Could not acknowledge this bundle.', 'err');
        await refreshScripts();
      } break;
      case 'script-remove': {
        const result = await API.removeManagedScript(t.dataset.destination, t.dataset.name);
        if (!result || !result.ok) toast((result && result.error) || 'Could not remove this managed script.', 'err');
        else toast(`Removed ${t.dataset.name}.`, 'ok');
        await refreshScripts();
      } break;
      case 'script-backups': { const result = await API.openScriptBackups(); if (!result || !result.ok) toast((result && result.error) || 'Could not open script backups.', 'err'); } break;
      case 'profile-new': createExecutorProfile(); break;
      case 'profile-save': saveExecutorProfile(); break;
      case 'profile-delete': deleteExecutorProfile(); break;
      case 'theme-save': {
        const name = clip(document.getElementById('st-name')?.value, 30);
        if (!name) { toast('Give this theme a name first.', 'err'); break; }
        const desc = clip(document.getElementById('st-desc')?.value, 90);
        const ct = S.settings.customTheme;
        const same = S.settings.savedThemes.find((x) => x.name.toLowerCase() === name.toLowerCase());
        if (same) { Object.assign(same, { desc, background: ct.background, accent: ct.accent, surface: ct.surface }); toast(`Updated ${same.name}.`, 'ok'); }
        else {
          if (S.settings.savedThemes.length >= 30) { toast('You can save up to 30 themes.', 'err'); break; }
          S.settings.savedThemes.push({ id: uid(), name, desc, background: ct.background, accent: ct.accent, surface: ct.surface, pinned: false });
          toast(`Saved ${name}.`, 'ok');
        }
        touch(); render();
      } break;
      case 'theme-load': {
        const st = S.settings.savedThemes.find((x) => x.id === t.dataset.id);
        if (!st) break;
        S.settings.customTheme = { background: st.background, accent: st.accent, surface: st.surface };
        S.settings.theme = 'custom';
        applyTheme(); touch(); render();
      } break;
      case 'theme-update': {
        const st = S.settings.savedThemes.find((x) => x.id === t.dataset.id);
        if (!st) break;
        const ct = S.settings.customTheme;
        Object.assign(st, { background: ct.background, accent: ct.accent, surface: ct.surface });
        toast(`${st.name} updated with the current colors.`, 'ok'); touch(); render();
      } break;
      case 'theme-pin': {
        const st = S.settings.savedThemes.find((x) => x.id === t.dataset.id);
        if (st) { st.pinned = !st.pinned; touch(); render(); }
      } break;
      case 'theme-del': {
        if (ui.confirmThemeDel !== t.dataset.id) { ui.confirmThemeDel = t.dataset.id; render(); break; }
        S.settings.savedThemes = S.settings.savedThemes.filter((x) => x.id !== t.dataset.id);
        ui.confirmThemeDel = null; touch(); render();
      } break;
      case 'theme-reset': {
        S.settings.customTheme = { ...DEFAULT_CUSTOM_THEME };
        S.settings.theme = 'custom';
        applyTheme(); touch(); render();
      } break;
      case 'update-check': {
        const result = await API.checkUpdates();
        if (!result || !result.ok) toast((result && result.error) || 'Could not check for updates.', 'err');
      } break;
      case 'update-download': {
        const result = await API.downloadUpdate();
        if (!result || !result.ok) toast((result && result.error) || 'Could not start the update download.', 'err');
      } break;
      case 'update-install': {
        const result = await API.installUpdate();
        if (!result || !result.ok) toast((result && result.error) || 'Could not install the update.', 'err');
      } break;
      case 'script-copy': {
        const selection = Array.from(selectedScripts.values());
        if (!selection.length) { toast('Select at least one script first.', 'err'); break; }
        const request = {
          selection,
          userFolder: S.settings.scripts,
          autoexecFolder: S.settings.autoexec,
          executorPath: S.settings.exe,
          action: t.dataset.mode
        };
        const result = await API.copyScripts(request);
        if (result && result.conflict) {
          ui.scriptConflicts = { ...request, conflicts: result.conflicts || [] };
          render();
          break;
        }
        if (result && result.ok) toast(`${result.count} script${result.count === 1 ? '' : 's'} copied.`, 'ok');
        else toast((result && result.error) || 'Could not copy the selected scripts.', 'err');
      } break;
      case 'script-conflict-cancel': ui.scriptConflicts = null; render(); break;
      case 'script-conflict-replace': {
        const pending = ui.scriptConflicts;
        ui.scriptConflicts = null;
        if (!pending) break;
        const result = await API.copyScripts({ ...pending, replaceExisting: true });
        if (result && result.ok) toast(`${result.count} copied; ${result.replacements.length} existing file${result.replacements.length === 1 ? '' : 's'} backed up.`, 'ok');
        else toast((result && result.error) || 'Could not replace the selected files.', 'err');
        await refreshScripts();
      } break;
      case 'rpclink': await connectRpc(); break;
      case 'discord-profile-open': {
        const result = await API.openUrl(`https://discord.com/users/${encodeURIComponent(t.dataset.id || '')}`);
        if (!result || !result.ok) toast((result && result.error) || 'Could not open this Discord profile.', 'err');
      } break;
      case 'rpc-presence-connect': await connectDiscordPresence(); break;
      case 'rpc-presence-disconnect': await disconnectDiscordPresence(); break;
      case 'discord-profile-refresh':
        {
          const synced = await refreshDiscordProfile();
          toast(synced ? 'Discord profile synced.' : 'Could not sync the Discord profile. Sign in again if the connection expired.', synced ? 'ok' : 'err');
        }
        break;
      case 'discord-presence-refresh':
        updateDiscordActivity();
        toast(S.settings.presenceAutoUpdate ? 'Discord activity refreshed.' : 'Automatic activity updates are paused.', 'ok');
        break;
      case 'spotify-connect': {
        const clientId = clip(document.getElementById('spotify-client-id')?.value, 32);
        if (!/^[A-Za-z0-9]{32}$/.test(clientId)) { toast('Enter a valid Spotify Client ID.', 'err'); break; }
        S.settings.spotifyClientId = clientId;
        spotifyBusy = true;
        spotifyMessage = 'Opening Spotify sign-in…';
        touch(); render();
        const result = await API.spotifyConnect(clientId);
        spotifyBusy = false;
        if (!result || !result.ok) spotifyMessage = (result && result.error) || 'Could not start Spotify sign-in.';
        else spotifyMessage = `Finish sign-in in your browser. Redirect URI: ${result.redirectUri}`;
        render();
        if (!result || !result.ok) toast(spotifyMessage, 'err');
      } break;
      case 'spotify-refresh': await refreshSpotifyStatus({ notify: true }); break;
      case 'spotify-disconnect': {
        await API.spotifyDisconnect();
        spotifyConnected = false;
        spotifyTrack = null;
        spotifyMessage = 'Spotify is disconnected.';
        if (spotifyPollTimer) { clearInterval(spotifyPollTimer); spotifyPollTimer = null; }
        updateDiscordActivity();
        render();
      } break;
      case 'spotify-open': {
        const result = await API.openUrl('https://open.spotify.com');
        if (!result || !result.ok) toast((result && result.error) || 'Could not open Spotify.', 'err');
      } break;
      case 'rpcout': {
        await disconnectDiscordPresence();
        rpcUser = null;
        S.settings.discordUser = null;
        S.settings.discordSession = '';
        touch();
        render();
      } break;
      case 'welcome-next': ui.welcomeStep = Math.min(2, ui.welcomeStep + 1); document.getElementById('splash').innerHTML = welcomeMarkup(); break;
      case 'welcome-back': ui.welcomeStep = Math.max(0, ui.welcomeStep - 1); document.getElementById('splash').innerHTML = welcomeMarkup(); break;
      case 'welcome-continue': finishWelcome(); break;
      case 'welcome-settings': finishWelcome(); go('settings'); break;
      case 'replaytour': {
        ui.welcomeStep = 0;
        S.settings.welcomeVersion = 0;
        touch();
        const splash = document.getElementById('splash');
        if (splash) {
          splash.classList.remove('hidden');
          splash.classList.add('welcome');
          splash.innerHTML = welcomeMarkup();
        }
      } break;
      case 'welcome-discord': {
        const id = discordApplicationId();
        if (!id) {
          finishWelcome();
          go('settings');
          toast('Add a Discord application ID in Settings, then connect from the sidebar.', 'err');
          break;
        }
        await connectRpc();
        if (rpcUser) finishWelcome();
      } break;
      case 'setpick': { const pth = await API.pick(t.dataset.v); if (pth) { S.settings[t.dataset.f] = pth; syncActiveExecutorProfile(); touch(); if (t.dataset.f === 'scripts') { selectedScripts.clear(); watchedScriptsPath = null; await refreshScripts(); } render(); } } break;
      case 'font-pick': {
        if (!API.pickCustomFont || !API.readCustomFont) { toast('Custom font files are available in the desktop app.', 'err'); break; }
        const fontPath = await API.pickCustomFont();
        if (!fontPath) break;
        const result = await API.readCustomFont(fontPath);
        if (!result || !result.ok) { toast((result && result.error) || 'Could not load that font.', 'err'); break; }
        customFontCache.set(fontPath, result.dataUrl);
        S.settings.customFontPath = fontPath;
        S.settings.fontPreset = 'custom';
        applyAppearanceSettings(); touch(); render();
      } break;
      case 'font-reset':
        S.settings.customFontPath = '';
        S.settings.fontPreset = 'system';
        applyAppearanceSettings(); touch(); render();
        break;
      case 'ut': { const r = await API.saveUserscript(); if (r.ok) toast('Userscript saved.', 'ok'); else if (!r.canceled) toast(r.error || 'Could not save it.', 'err'); } break;
      case 'theme': S.settings.theme = t.dataset.v; applyTheme(); touch(); render(); updateDiscordActivity(); break;
      case 'openbackups': { const r = await API.openBackups(); if (!r.ok) toast(r.error, 'err'); } break;
      case 'export': {
        const r = await API.exportData(JSON.stringify(S, null, 2));
        if (r.ok) toast('Backup saved.', 'ok'); else if (!r.canceled) toast(r.error || 'Could not save the backup.', 'err');
      } break;
      case 'import': {
        const r = await API.importData();
        if (r.ok) {
          const n = normalize(r.data);
          if (!n) { toast('That file is not a YuniHub backup.', 'err'); break; }
          S = n; migrateYuniSpotProject(); applyTheme(); touch(); go('home'); toast('Backup restored.', 'ok');
        } else if (!r.canceled) toast(r.error || 'Could not import that file.', 'err');
      } break;
      default: break;
    }
  });

  document.addEventListener('change', async (e) => {
    const t = e.target;
    if (!t) return;
    if (ui.view === 'Studio' && t.id === 'studio-output-source') {
      const studio = ui.studio || (ui.studio = defaultStudioWorkspace());
      studio.outputSource = t.value;
      render();
      return;
    }
    if (ui.view === 'Studio' && t.id === 'studio-editor') {
      const studio = ui.studio || (ui.studio = defaultStudioWorkspace());
      const file = studio.files.find((entry) => entry.id === t.dataset.id) || studio.files[0];
      if (file) {
        file.content = t.value;
      }
      return;
    }
    if (t.id === 's-profile-select') { await switchExecutorProfile(t.value); return; }
    if (t.dataset && t.dataset.appearanceSelect) {
      const key = t.dataset.appearanceSelect;
      S.settings[key] = t.value;
      applyAppearanceSettings(); touch(); render();
      return;
    }
    if (t.id === 's-profile-name') {
      const profile = activeExecutorProfile();
      if (profile) { profile.name = clip(t.value, 50) || 'Executor profile'; touch(); }
      render(); return;
    }
    if (t.id === 'script-game-filter') { gameFilter = t.value; render(); return; }
    if (t.id === 'script-executor-filter') { executorFilter = t.value; render(); return; }
    if (t.matches('.script-check')) {
      const script = { source: t.dataset.source, name: t.dataset.name };
      const key = `${script.source}:${script.name}`;
      if (t.checked) {
        const metadata = scriptCatalog.scripts.find((item) => item.source === script.source && item.name === script.name);
        selectedScripts.set(key, { ...script, supportsAutoload: !!(metadata && metadata.supportsAutoload) });
      }
      else selectedScripts.delete(key);
      render();
      return;
    }
    if (t.id === 'te') { commitEdit(); return; }
    if (t.id === 'srt') { S.settings.sort = t.value; touch(); render(); return; }
    if (t.dataset && t.dataset.act === 'toggle') {
      const p = find(ui.id); const task = p && p.tasks.find((x) => x.id === t.dataset.id);
      if (!gateProjectEditor('This starter template is locked to developer mode.', p)) { t.checked = !t.checked; return; }
      if (task) { task.d = t.checked; touch(); render(); }
    } else if (t.dataset && t.dataset.act === 'login') {
      info.openAtLogin = !!(await API.setLogin(t.checked));
      render();
    } else if (t.dataset && (t.dataset.act === 'compactMode' || t.dataset.act === 'reduceMotion' || t.dataset.act === 'presenceShowProject' || t.dataset.act === 'presenceAutoUpdate' || t.dataset.act === 'berryCursor' || t.dataset.act === 'rgbAccents' || t.dataset.act === 'studioWordWrap')) {
      S.settings[t.dataset.act] = t.checked;
      applyTheme();
      touch(); render();
      if (t.dataset.act === 'presenceShowProject' || t.dataset.act === 'presenceAutoUpdate') updateDiscordActivity();
    } else if (t.dataset && (t.dataset.act === 'tray' || t.dataset.act === 'hotkey')) {
      if (t.dataset.act === 'tray') S.settings.closeToTray = t.checked; else S.settings.hotkey = t.checked;
      const r = await API.setPrefs({ closeToTray: S.settings.closeToTray, hotkey: S.settings.hotkey });
      if (S.settings.hotkey && r && r.hotkeyOk === false) {
        S.settings.hotkey = false;
        toast('Another app is already using Ctrl+Alt+H.', 'err');
      }
      touch(); render();
    } else if (t.dataset && t.dataset.set) {
      const k = t.dataset.set;
      S.settings[k] = clip(t.value, { name: 40, hubName: 30 }[k] || 500) || (k === 'hubName' ? 'YuniHub' : '');
      if (k === 'city') refreshWeather();
      if (k === 'scripts') { selectedScripts.clear(); await refreshScripts(); }
      if (k === 'exe' || k === 'autoexec') syncActiveExecutorProfile();
      touch(); render();
    }
  });

  document.addEventListener('submit', async (e) => {
    if (!e.target) return;
    if (!['studio-create-form', 'studio-command-form'].includes(e.target.id)) return;
    e.preventDefault();
    const studio = ui.studio || (ui.studio = defaultStudioWorkspace());
    if (e.target.id === 'studio-create-form') {
      const filePath = clip(document.getElementById('studio-new-path')?.value, 500);
      if (!filePath || !studio.folder) return;
      const result = await API.createWorkspaceFile({ folder: studio.folder, path: filePath, content: '' });
      if (!result || !result.ok) { toast((result && result.error) || 'Could not create this file.', 'err'); return; }
      studio.newFileOpen = false;
      if (await refreshStudioFiles(studio)) await openStudioFile(studio, result.path);
      return;
    }
    if (e.target.id !== 'studio-command-form') return;
    const command = clip(document.getElementById('studio-command')?.value, 2000);
    if (studio.debugMode && studio.running) {
      await sendStudioDebuggerInput(studio, command);
      const input = document.getElementById('studio-command');
      if (input) { input.value = ''; input.focus(); }
      return;
    }
    await executeStudioCommand(studio, command);
  });

  document.addEventListener('input', (e) => {
    const t = e.target;
    if (!t) return;
    if (ui.view === 'Studio' && t.id === 'studio-file-search') {
      const studio = ui.studio || (ui.studio = defaultStudioWorkspace());
      studio.fileQuery = clip(t.value, 300);
      studio.fileLimit = 200;
      render();
      return;
    }
    if (ui.view === 'settings' && t.id === 'settings-filter') {
      ui.settingsFilter = clip(t.value, 100);
      applySettingsFilter();
      return;
    }
    if (ui.view === 'Studio' && t.id === 'studio-editor') {
      const studio = ui.studio || (ui.studio = defaultStudioWorkspace());
      const file = studio.files.find((entry) => entry.id === t.dataset.id) || studio.files[0];
      if (file) {
        file.content = t.value;
      }
      return;
    }
    if (t.dataset && t.dataset.themeColor) {
      const key = t.dataset.themeColor;
      if (!Object.hasOwn(S.settings.customTheme, key)) return;
      S.settings.customTheme[key] = validHex(t.value, DEFAULT_CUSTOM_THEME[key]);
      S.settings.theme = 'custom';
      applyTheme();
      document.querySelectorAll('.theme-opt').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.v === 'custom')));
      touch();
      return;
    }
    if (t.dataset && t.dataset.appearanceRange) {
      const key = t.dataset.appearanceRange;
      const value = Math.round(Number(t.value) * 100) / 100;
      if (!Number.isFinite(value)) return;
      S.settings[key] = value;
      const output = document.getElementById(`appearance-${key}-output`);
      if (output) output.textContent = t.dataset.rangeUnit === 'px' ? `${Math.round(value)}px` : `${Math.round(value * 100)}%`;
      applyAppearanceSettings(); touch();
      return;
    }
    if (t.id === 'flt') { ui.q = t.value; scheduleSearchUpdate(updateProjectResults); return; }
    if (t.id === 'script-search') { scriptQuery = t.value; scheduleSearchUpdate(updateScriptResults); return; }
    if (!t.dataset) return;
    if (t.dataset.bind) {
      const p = find(ui.id); if (!p) return;
      if (!gateProjectEditor('This starter template is locked to developer mode.', p)) return;
      const f = t.dataset.bind;
      if (f === 'target') p.launch.target = clip(t.value, 500);
      else if (f === 'name') p.name = clip(t.value, 60) || 'Untitled';
      else if (f === 'folder') p.folder = clip(t.value, 500);
      else if (f === 'desc') p.desc = clip(t.value, 200);
      else if (f === 'notes') p.notes = t.value.slice(0, 20000);
      touch();
    } else if (t.dataset.draft) {
      drafts[t.dataset.draft] = t.value;
    }
  });

  /* ---------- keyboard ---------- */
  document.addEventListener('keydown', (e) => {
    const mod = e.ctrlKey || e.metaKey;
    const key = (e.key || '').toLowerCase();
    const tag = e.target && e.target.tagName;
    const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

    if (ui.view === 'Studio' && e.target && e.target.id === 'studio-command') {
      const studio = ui.studio || (ui.studio = defaultStudioWorkspace());
      if (e.key === 'ArrowUp' && studio.commandHistory.length) {
        e.preventDefault();
        const recalled = navigateStudioCommandHistory(studio.commandHistory, studio.commandHistoryIndex, studio.commandHistoryDraft, -1, e.target.value);
        studio.commandHistoryIndex = recalled.index;
        studio.commandHistoryDraft = recalled.draft;
        e.target.value = recalled.value;
      } else if (e.key === 'ArrowDown' && studio.commandHistory.length) {
        e.preventDefault();
        const recalled = navigateStudioCommandHistory(studio.commandHistory, studio.commandHistoryIndex, studio.commandHistoryDraft, 1, e.target.value);
        studio.commandHistoryIndex = recalled.index;
        studio.commandHistoryDraft = recalled.draft;
        e.target.value = recalled.value;
      }
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') return;
    }

    if (mod && key === 's' && ui.view === 'Studio') {
      e.preventDefault();
      saveStudioFile(ui.studio);
      return;
    }

    if (mod && key === 'p' && ui.view === 'Studio') {
      e.preventDefault();
      if (!pal.open) openPalette();
      return;
    }

    if (mod && key === 'k') { e.preventDefault(); if (pal.open) closePalette(); else openPalette(); return; }
    if (pal.open) { paletteKey(e); return; }

    if (mod && key === 'n') { e.preventDefault(); if (!ui.modal) openNew(); return; }
    if (mod && ['1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(key)) {
      e.preventDefault();
      go(['home', 'projects', 'Studio', 'Spotify', 'Roblox', 'Discord', 'Android', 'PC', 'PS4'][+key - 1]);
      return;
    }
    if (e.key === 'Escape') {
      if (ui.scriptConflicts) { ui.scriptConflicts = null; render(); return; }
      if (ui.scriptDetails) { ui.scriptDetails = null; render(); return; }
      if (ui.modal) { ui.modal = false; render(); }
      else if (ui.editTask) { ui.editTask = null; render(); }
      else if (e.target && e.target.id === 'flt' && ui.q) { ui.q = ''; render(); }
      else if (ui.view === 'project' && !typing) go(ui.projectReturnView || (find(ui.id) && find(ui.id).track) || 'home');
      return;
    }
    if (e.key === '/' && !typing && (ui.view === 'projects' || ui.view === 'Android' || ui.view === 'PC')) {
      const el = document.getElementById('flt');
      if (el) { e.preventDefault(); el.focus(); }
      return;
    }
    if (e.key !== 'Enter') return;
    const id = e.target && e.target.id;
    if (id === 'nt') { e.preventDefault(); addTask(); }
    else if (id === 'te') { e.preventDefault(); commitEdit(); }
    else if (id === 'lk-url' || id === 'lk-label') { e.preventDefault(); addLink(); }
    else if (id === 'm-name' || id === 'm-desc') { e.preventDefault(); addProject(); }
  });

  /* ---------- drag and drop: reorder tasks, drop files onto the launch fields ---------- */
  let dragTask = null;
  let dropZone = null;
  const hasFiles = (e) => e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files');
  const setZone = (z) => {
    if (z === dropZone) return;
    if (dropZone) dropZone.classList.remove('drop-on');
    dropZone = z;
    if (z) z.classList.add('drop-on');
  };
  const clearOver = () => document.querySelectorAll('.task.over-top,.task.over-bottom').forEach((n) => n.classList.remove('over-top', 'over-bottom'));

  document.addEventListener('dragstart', (e) => {
    const li = e.target.closest && e.target.closest('.task[data-tid]');
    if (!li) return;
    const p = find(ui.id);
    if (!gateProjectEditor('This starter template is locked to developer mode.', p)) {
      e.preventDefault();
      return;
    }
    dragTask = li.dataset.tid;
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', dragTask); } catch { /* ignore */ }
    li.classList.add('dragging');
  });
  document.addEventListener('dragend', () => {
    dragTask = null; clearOver(); setZone(null);
    document.querySelectorAll('.task.dragging').forEach((n) => n.classList.remove('dragging'));
  });
  document.addEventListener('dragover', (e) => {
    if (hasFiles(e)) {
      e.preventDefault(); // stops the window from trying to open the dropped file
      setZone(e.target.closest ? e.target.closest('[data-drop]') : null);
      return;
    }
    if (!dragTask) return;
    const li = e.target.closest && e.target.closest('.task[data-tid]');
    if (!li || li.dataset.tid === dragTask) return;
    e.preventDefault();
    clearOver();
    const r = li.getBoundingClientRect();
    li.classList.add(e.clientY < r.top + r.height / 2 ? 'over-top' : 'over-bottom');
  });
  document.addEventListener('dragleave', (e) => { if (!e.relatedTarget) setZone(null); });
  document.addEventListener('drop', async (e) => {
    if (hasFiles(e)) {
      const p = ui.view === 'project' ? find(ui.id) : null;
      if (!gateProjectEditor('This starter template is locked to developer mode.', p)) { e.preventDefault(); return; }
      e.preventDefault();
      const zone = e.target.closest ? e.target.closest('[data-drop]') : null;
      setZone(null);
      if (!zone || !p) return;
      const file = e.dataTransfer.files[0];
      const path = file && API.pathFor ? API.pathFor(file) : '';
      if (!path) { toast('Drag and drop works in the desktop app.', 'err'); return; }
      if (zone.dataset.drop === 'folder') p.folder = await API.dirOf(path);
      else {
        p.launch.target = path; p.launch.mode = 'app';
        if (!p.folder) p.folder = await API.dirOf(path);
      }
      touch(); render();
      return;
    }
    if (!dragTask) return;
    const li = e.target.closest && e.target.closest('.task[data-tid]');
    const p = find(ui.id);
    if (!li || !p) return;
    e.preventDefault();
    const from = p.tasks.findIndex((x) => x.id === dragTask);
    let to = p.tasks.findIndex((x) => x.id === li.dataset.tid);
    const r = li.getBoundingClientRect();
    if (e.clientY >= r.top + r.height / 2) to += 1;
    if (from < 0 || to < 0) return;
    const [moved] = p.tasks.splice(from, 1);
    p.tasks.splice(to > from ? to - 1 : to, 0, moved);
    dragTask = null;
    touch(); render();
  });

  /* ---------- boot ---------- */
  (async function boot() {
    if (window.hub) document.documentElement.classList.add('frame');
    let firstRun = true;
    let migratedYuniSpotProject = false;
    try {
      const [saved, i] = await Promise.all([API.load(), API.info()]);
      const n = normalize(saved);
      if (n) { S = n; firstRun = false; migratedYuniSpotProject = migrateYuniSpotProject(); }
      if (i) {
        info = i;
        appMode = info.buildMode || appMode;
      }
      if (API.yuniSpotStatus) {
        try { yuniSpotStatus = await API.yuniSpotStatus(); }
        catch (error) { yuniSpotStatus = { available: false, spotify: false, yuniSpot: false, error: error.message }; }
      }
      if (API.updateState) updateInfo = await API.updateState();
    } catch { /* keep the starter projects */ }
    if (info.userName) S.settings.name = info.userName;
    const profile = activeExecutorProfile();
    if (profile) { S.settings.exe = profile.executorPath; S.settings.autoexec = profile.autoexecFolder; }
    if (!S.settings.city && info.weatherCity) S.settings.city = info.weatherCity;
    if (!S.settings.hubName) S.settings.hubName = 'YuniHub';
    applyTheme();
    render();
    const splash = document.getElementById('splash');
    if (splash && S.settings.welcomeVersion < 1) {
      ui.welcomeStep = 0;
      splash.classList.add('welcome');
      splash.innerHTML = welcomeMarkup();
    } else if (splash) {
      setTimeout(() => splash.classList.add('hidden'), 780);
    }
    if (firstRun || migratedYuniSpotProject) { dirty = true; flush(); } // write starter projects and migrations once
    refreshScripts();
    if (API.onScriptsChanged) API.onScriptsChanged(() => refreshScripts());
    if (API.onScriptsWatchError) API.onScriptsWatchError((message) => toast(message || 'Could not watch the selected script folder.', 'err'));
    if (API.onDiscordAuth) {
      API.onDiscordAuth((payload) => {
        if (!payload || typeof payload !== 'object') return;
        if (payload.ok && payload.user) {
          const sessionToken = clip(payload.sessionToken, 200);
          if (!sessionToken && !S.settings.discordSession) {
            toast('Discord returned your profile without an active YuniHub session. Please sign in again.', 'err');
            return;
          }
          rpcUser = payload.user;
          S.settings.discordUser = payload.user;
          S.settings.discordSession = sessionToken || S.settings.discordSession;
          presenceManualDisconnect = false;
          touch();
          if (S.settings.welcomeVersion < 1) finishWelcome();
          render();
          connectDiscordPresence(false, true);
          toast(`Signed in as ${esc(payload.user.global_name || payload.user.username || 'Discord user')}. Linked perks are active.`, 'ok');
          if (S.settings.discordSession) refreshDiscordProfile().catch(() => {});
        } else {
          toast(payload.error || 'Discord sign-in failed.', 'err');
        }
      });
    }
    if (API.onSpotifyAuth) {
      API.onSpotifyAuth((payload) => {
        spotifyBusy = false;
        if (payload && payload.ok) {
          spotifyMessage = 'Spotify connected. Reading current playback…';
          toast('Spotify connected. Now-playing status is ready.', 'ok');
          refreshSpotifyStatus();
        } else {
          spotifyMessage = (payload && payload.error) || 'Spotify sign-in did not complete.';
          toast(spotifyMessage, 'err');
          if (ui.view === 'Spotify') render();
        }
      });
    }
    if (API.onUpdateStatus) API.onUpdateStatus((status) => {
      updateInfo = status || updateInfo;
      if (ui.view === 'settings') render();
    });
    if (S.settings.discordSession) {
      connectDiscordPresence(false, true);
      refreshDiscordProfile().catch(() => {});
    }
    if (S.settings.spotifyClientId) refreshSpotifyStatus();
    API.setBeacons(S.settings.beacons);
    refreshWeather();
    setInterval(tick, 15000);
    setInterval(refreshWeather, 20 * 60 * 1000);
    setInterval(refreshDiscordProfile, 15000);
  })();
})();
