const Y = window.YuniSpot;

Y.navigate = (path) => {
  try {
    const p = Y.finder.platform();
    if (p && p.History && p.History.push) { p.History.push(path); return true; }
  } catch { /* fall through */ }
  const a = document.querySelector('a[href="' + path + '"]');
  if (a) { a.click(); return true; }
  Y.ui.toast('Navigation is not available on this Spotify version');
  return false;
};

const add = (id, title, run, extra) => Y.commands.register({ id: 'yunispot.' + id, title, run, section: 'Spotify', ...extra });
add('playpause', 'Play / Pause', () => Y.player.toggle(), { keywords: ['toggle', 'resume'] });
add('next', 'Next track', () => Y.player.next(), { keywords: ['skip'] });
add('prev', 'Previous track', () => Y.player.prev(), { keywords: ['back'] });
add('shuffle', 'Toggle shuffle', () => Y.player.shuffle());
add('repeat', 'Cycle repeat mode', () => Y.player.repeat());
add('home', 'Go to Home', () => Y.navigate('/'), { section: 'Navigate' });
add('search', 'Go to Search', () => Y.navigate('/search'), { section: 'Navigate', keywords: ['find'] });
add('liked', 'Go to Liked Songs', () => Y.navigate('/collection/tracks'), { section: 'Navigate', keywords: ['favorites', 'hearts'] });
add('queue', 'Go to Queue', () => Y.navigate('/queue'), { section: 'Navigate' });
add('copy', 'Copy current track name', () => {
  const t = Y.player.current();
  if (!t) return Y.ui.toast('Nothing playing');
  navigator.clipboard.writeText(t.title + ' \u2014 ' + t.artist).then(() => Y.ui.toast('Copied'), () => Y.ui.toast('Clipboard blocked'));
}, { section: 'YuniSpot' });
add('reload', 'Reload Spotify UI', () => location.reload(), { section: 'YuniSpot' });

add('diagnostics', 'YuniSpot: Diagnostics', () => {
  // Read-only on purpose: it looks at Spotify, it never changes anything in it (no webpack hooks, no DOM edits).
  const el = Y.dom.el;
  const safe = (fn, fallback) => { try { return fn(); } catch (e) { Y.warn('diagnostics probe failed', e); return fallback; } };
  const row = (k, v, good) => el('div', { class: 'yuni-row' }, el('span', {}, k), el('span', { style: good === undefined ? {} : { color: good ? '#4ade80' : '#f87171' } }, String(v)));
  const plat = safe(() => Y.finder.platform(), null);
  const health = safe(() => Y.player.health(), {});
  const ext = safe(() => Y.extensions.list(), { loaded: [], failed: [] });
  const mods = safe(() => Y.finder.moduleCount(), 0);
  Y.ui.modal('YuniSpot diagnostics', el('div', {},
    row('Version', Y.version + (Y.safeMode ? ' (safe mode)' : '')),
    row('Theme', Y.boot.theme || '?'),
    row('Spotify Platform object', plat ? 'found' : 'not found (DOM fallback in use)', !!plat),
    row('Webpack hook', Y.finder.hooked() ? mods + ' modules' : 'not used (not needed)', true),
    row('Screen', safe(() => (Y.rescue && Y.rescue.healthy() ? 'main view visible' : 'main view NOT visible'), '?'), safe(() => !!(Y.rescue && Y.rescue.healthy()), true)),
    el('div', { class: 'yuni-stat-h' }, 'Player selectors'),
    Object.entries(health).map(([k, v]) => row(k, v ? 'ok' : 'not found', v)),
    el('div', { class: 'yuni-stat-h' }, 'Extensions'),
    ext.loaded.map((e) => row(e.name + ' ' + e.version, e.permissions.join(', ') || 'no permissions', true)),
    ext.failed.map((e) => row(e.name, e.error, false)),
    !ext.loaded.length && !ext.failed.length ? row('None loaded', '') : null,
    el('div', { class: 'yuni-stat-h' }, 'Share'),
    el('div', { class: 'yuni-row' }, el('span', {}, 'Copy a report with no personal data, to paste into a bug report.'), el('button', { class: 'yuni-btn sm', onclick: () => Y.commands.run('yunispot.report') }, 'Copy report')),
    el('div', { class: 'yuni-stat-h' }, 'Something looks wrong?'),
    el('div', { class: 'yuni-row' }, el('span', {}, 'Blank or broken screen: switch to safe visuals (also ' + (/mac/i.test((typeof navigator !== 'undefined' && navigator.platform) || '') ? '\u2318' : 'Ctrl') + '+Alt+Shift+R).'), el('button', { class: 'yuni-btn sm', onclick: () => Y.commands.run('yunispot.rescue') }, 'Fix my screen')),
    el('div', { class: 'yuni-stat-h' }, 'Note'),
    el('div', { class: 'yuni-row' }, el('span', {}, 'Selectors show \"not found\" until something is loaded in the player bar.'))));
}, { section: 'YuniSpot', keywords: ['debug', 'health', 'selectors'] });

// Wait for Spotify's UI to mount, then start extensions.
Y.ready = new Promise((resolve) => {
  if (document.readyState !== 'loading') resolve();
  else document.addEventListener('DOMContentLoaded', () => resolve());
}).then(() => Y.dom.waitFor('#main, [data-testid="now-playing-bar"]', 30000).catch(() => null))
  .then(() => {
    Y.extensions.runAll();
    Y.emit('ready');
    Y.log('ready v' + Y.version);
    try { if (!Y.safeMode && !(Y.boot && Y.boot.safe)) Y.welcome.maybeShow(); } catch (e) { Y.warn('welcome screen failed', e); }
  });
