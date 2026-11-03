const Y = window.YuniSpot;
const el = Y.dom.el;

/* ---------- safe mode ----------
  If Spotify's UI is reloaded several times within seconds of starting (a crash loop), YuniSpot
  switches to solid visuals without changing Spotify's native playback controls. */
const pending = Y.storage.get('boot:pending', 0);
Y.safeMode = pending >= 3;
if (Y.safeMode) {
  Y.storage.set('boot:pending', 0);
  Y.on('ready', () => setTimeout(() => Y.notify.show({ id: 'safe', tag: 'Safe mode', title: 'YuniSpot started in safe mode', body: 'Spotify restarted several times in a row, so blur effects are off. Restore them in Marketplace when the screen is stable.', ms: 9000 }), 1500));
} else {
  Y.storage.set('boot:pending', pending + 1);
  setTimeout(() => Y.storage.set('boot:pending', 0), 15000); // survived 15 s: not a crash loop
}

/* ---------- diagnostics report (safe to paste into a bug report: no track names or personal data) ---------- */
Y.report = () => {
  const ext = Y.extensions.list();
  const lines = [
    'YuniSpot ' + Y.version + (Y.safeMode ? ' (safe mode)' : ''),
    'Theme: ' + (Y.boot.theme || '?') + ', accent override: ' + (Y.appearance.accent() || 'none'),
    'Player: Spotify native controls active',
    'Webpack hook: ' + (Y.finder.hooked() ? Y.finder.moduleCount() + ' modules' : 'not used') + ', Platform object: ' + (Y.finder.platform() ? 'found' : 'not found'),
    'Screen: ' + (Y.rescue ? (Y.rescue.healthy() ? 'main view visible' : 'main view NOT visible') + (Y.rescue.active() ? ', safe visuals on' : '') : '?'),
    'Volume readable: ' + (Y.player.volume() !== null) + ', seek available: ' + !!(Y.finder.platform() && Y.finder.platform().PlayerAPI),
    '',
    'Selectors:',
    ...Object.entries(Y.player.health()).map(([k, v]) => '  ' + (v ? 'ok       ' : 'MISSING  ') + k),
    '',
    'Extensions: ' + (ext.loaded.map((e) => e.name + '@' + e.version).join(', ') || 'none') + (ext.failed.length ? '  FAILED: ' + ext.failed.map((e) => e.name + ' (' + e.error + ')').join('; ') : ''),
    'Viewport: ' + (window.innerWidth || '?') + 'x' + (window.innerHeight || '?'),
  ];
  return lines.join('\n');
};
const copy = (text, ok) => {
  try { navigator.clipboard.writeText(text).then(() => Y.ui.toast(ok), () => Y.ui.toast('Clipboard blocked')); }
  catch { Y.ui.toast('Clipboard blocked'); }
};
Y.commands.register({ id: 'yunispot.report', title: 'Copy diagnostics report', section: 'YuniSpot', keywords: ['debug', 'bug', 'support', 'selectors'], run: () => copy(Y.report(), 'Diagnostics report copied') });

/* ---------- settings backup (look & feature switches only, never your listening data) ---------- */
const SETTING = /^(ui:|notify|welcome:quiet|goal:min|goal:notify|sleep:fade|name$)/;
Y.settings = {
  export() { const o = {}; Y.storage.keys().filter((k) => SETTING.test(k)).forEach((k) => { o[k] = Y.storage.get(k, null); }); return o; },
  import(text) {
    let o;
    try { o = typeof text === 'string' ? JSON.parse(text) : text; } catch { return 0; }
    if (!o || typeof o !== 'object' || Array.isArray(o)) return 0;
    let n = 0;
    for (const [k, v] of Object.entries(o)) if (SETTING.test(k) && k.length < 40) { Y.storage.set(k, v); n++; }
    return n;
  },
  reset() { Y.storage.keys().filter((k) => SETTING.test(k)).forEach((k) => Y.storage.remove(k)); },
};
Y.commands.register({ id: 'yunispot.settings.export', title: 'Copy my YuniSpot settings (backup)', section: 'YuniSpot', keywords: ['export', 'backup', 'settings'], run: () => copy(JSON.stringify(Y.settings.export(), null, 2), 'Settings copied to clipboard') });
Y.commands.register({
  id: 'yunispot.settings.import', title: 'Restore YuniSpot settings from a backup', section: 'YuniSpot', keywords: ['import', 'restore', 'paste'],
  run() {
    const ta = el('textarea', { rows: 8, placeholder: 'Paste the settings JSON here', style: { width: '100%', boxSizing: 'border-box', borderRadius: '12px', padding: '12px', background: 'rgba(255,255,255,.05)', color: 'inherit', border: '1px solid rgba(255,255,255,.12)', font: 'inherit' } });
    let closeIt = null;
    closeIt = Y.ui.modal('Restore settings', el('div', { class: 'yuni-wel' }, ta,
      el('div', { class: 'yuni-wel-actions' }, el('button', { class: 'yuni-btn sm', onclick: () => {
        const n = Y.settings.import(ta.value || '');
        closeIt();
        if (!n) return Y.ui.toast('That is not a YuniSpot settings backup');
        Y.ui.toast(n + ' settings restored. Reloading\u2026'); setTimeout(() => location.reload(), 900);
      } }, 'Restore'))));
  },
});
Y.commands.register({ id: 'yunispot.settings.reset', title: 'Reset YuniSpot settings to defaults', section: 'YuniSpot', keywords: ['reset', 'default'], run() { if (confirm('Reset all YuniSpot look and feature settings? Your listening stats are kept.')) { Y.settings.reset(); location.reload(); } } });
Y.commands.register({ id: 'yunispot.safe', title: 'Safe mode: reduce visual effects', section: 'YuniSpot', keywords: ['fix', 'broken', 'disable'], run() { Y.storage.set('ui:lite', true); Y.appearance.apply(); Y.ui.toast('Performance appearance enabled'); } });

/* ---------- extra shortcuts (Spotify keeps its own: Space, Ctrl+Up/Down volume, Ctrl+Left/Right skip) ---------- */
const bind = (combo, fn) => Y.keys.bind(combo, fn, { allowInInput: false });
const vol = (d) => { const v = Y.player.volume(); if (v === null) return Y.ui.toast('Volume is not available on this Spotify version'); const n = Math.min(1, Math.max(0, v + d)); Y.player.setVolume(n); Y.notify.show({ id: 'vol', compact: true, ms: 1200, body: 'Volume ' + Math.round(n * 100) + '%' }); };
const seekBy = (d) => { const p = Y.player.position(), dur = Y.player.duration(); if (!dur) return; if (!Y.player.seek(Math.min(dur - 1, Math.max(0, p + d)))) Y.ui.toast('Seeking is not available on this Spotify version'); };
bind('mod+alt+arrowup', () => vol(0.05));
bind('mod+alt+arrowdown', () => vol(-0.05));
bind('mod+alt+arrowright', () => seekBy(10));
bind('mod+alt+arrowleft', () => seekBy(-10));
bind('mod+alt+m', () => Y.player.mute());
bind('mod+alt+l', () => { if (!Y.player.like()) Y.ui.toast('Like button not found'); });
Y.player.adjustVolume = vol;

/* ---------- shortcuts cheat-sheet ---------- */
const isMac = /mac/i.test((typeof navigator !== 'undefined' && navigator.platform) || '');
const M = isMac ? '\u2318' : 'Ctrl';
const A = isMac ? '\u2325' : 'Alt';
const SHORTCUTS = [
  [M + '+K', 'Command palette'], [M + '+Shift+H', 'Home dashboard'], [M + '+Shift+Y', 'YuniSpot Marketplace'],
  [M + '+Shift+N', 'Full-screen Now Playing'], [M + '+Shift+J', 'Playlists & artists'],
  [M + '+' + A + '+\u2191 / \u2193', 'Volume up / down 5%'], [M + '+' + A + '+\u2192 / \u2190', 'Seek forward / back 10 s'],
  [M + '+' + A + '+M', 'Mute'], [M + '+' + A + '+L', 'Like the current song'],
];
Y.commands.register({
  id: 'yunispot.shortcuts', title: 'Show keyboard shortcuts', section: 'YuniSpot', keywords: ['keys', 'hotkeys', 'help', 'cheat sheet'],
  run: () => Y.ui.modal('Keyboard shortcuts', el('div', {}, SHORTCUTS.map(([k, d]) => el('div', { class: 'yuni-row' }, el('span', {}, d), el('span', { style: { fontWeight: '700' } }, k))))),
});
