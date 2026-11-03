const Y = window.YuniSpot;

/* ---------- track history (this device, last 100 plays) ---------- */
const HIST_MAX = 100;
const hist = () => Y.storage.get('history', []);
Y.history = {
  list: () => hist(),
  clear() { Y.storage.set('history', []); },
  add(track) {
    const h = hist();
    if (h.length && h[0].key === track.key) return;
    h.unshift({ key: track.key, title: track.title, artist: track.artist, links: (track.links || []).slice(0, 4), href: track.href || '', t: Date.now() });
    Y.storage.set('history', h.slice(0, HIST_MAX));
  },
};
Y.on('songchange', (t) => { if (t && t.title) Y.history.add(t); });

const ago = (ms) => {
  const m = Math.round((Date.now() - ms) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return m + ' min ago';
  const h = Math.round(m / 60);
  return h < 24 ? h + ' h ago' : Math.round(h / 24) + ' d ago';
};

function showHistory() {
  const el = Y.dom.el;
  const h = hist();
  const rows = h.length
    ? h.slice(0, 50).map((x) => el('div', { class: 'yuni-row' }, el('span', {}, x.title + (x.artist ? ' \u2014 ' + x.artist : '')), el('span', {}, ago(x.t))))
    : [el('div', { class: 'yuni-row' }, el('span', {}, 'Nothing yet. Play some music!'))];
  Y.ui.modal('Play history', el('div', {}, rows));
}

/* ---------- song-change notifications (off by default; in-app cards, no browser permission) ---------- */
const notifyOn = () => !!Y.storage.get('notify', false);
Y.on('songchange', (t) => {
  if (!notifyOn() || !t) return;
  // Spotify swaps the cover a moment after the title, so wait briefly before reading it.
  setTimeout(() => Y.notify.show({
    id: 'song', tag: 'Now playing', title: t.title, body: t.artist, image: Y.player.cover(),
    onclick: () => Y.commands.run('yunispot.goto.track'),
    actions: [
      { label: 'Skip', run: () => Y.player.next() },
      { label: 'Artist', run: () => Y.commands.run('yunispot.goto.artist') },
    ],
  }), 500);
});
function toggleNotify() {
  const next = !notifyOn();
  Y.storage.set('notify', next);
  if (next) {
    const c = Y.player.current();
    Y.notify.show({ id: 'song', tag: 'Notifications on', title: c ? c.title : 'Song cards are on', body: c ? c.artist : 'You will see a card like this whenever the song changes.', image: c ? Y.player.cover() : '' });
  } else Y.ui.toast('Song notifications off');
}

/* ---------- focus + compact modes ---------- */
Y.dom.css('extras', `
html.yuni-focus .Root__nav-bar,html.yuni-focus .Root__right-sidebar{display:none!important}
html.yuni-compact [data-testid="tracklist-row"]{min-height:40px}
html.yuni-compact .main-view-container__scroll-node-child{padding-top:0}
`);
const flag = (key, cls) => {
  const on = !!Y.storage.get('ui:' + key, false);
  document.documentElement.classList.toggle(cls, on);
  return on;
};
const applyModes = () => { flag('focus', 'yuni-focus'); flag('compact', 'yuni-compact'); };
const toggleMode = (key, label) => {
  const next = !Y.storage.get('ui:' + key, false);
  Y.storage.set('ui:' + key, next);
  applyModes();
  Y.ui.toast(label + (next ? ' on' : ' off'));
};
applyModes();

/* ---------- settings + stats export ---------- */
function copyJson(obj, label) {
  const text = JSON.stringify(obj, null, 2);
  const done = () => Y.ui.toast(label + ' copied to clipboard');
  try { navigator.clipboard.writeText(text).then(done, () => Y.ui.toast('Clipboard blocked')); }
  catch { Y.ui.toast('Clipboard blocked'); }
}

Y.on('playpause', (playing) => document.documentElement.classList.toggle('yuni-playing', !!playing));
Y.extras = {
  notifyOn,
  toggleNotify,
  isOn: (key) => !!Y.storage.get('ui:' + key, false),
  toggleMode,
};

const reg = (id, title, run, keywords) => Y.commands.register({ id: 'yunispot.' + id, title, run, section: 'YuniSpot', keywords });
reg('history', 'Show play history', showHistory, ['recent', 'played', 'log']);
reg('history.clear', 'Clear play history', () => { if (confirm('Delete YuniSpot play history?')) { Y.history.clear(); Y.ui.toast('History cleared'); } });
reg('notify', 'Toggle song-change notifications', toggleNotify, ['notification', 'popup', 'alert']);
reg('focus', 'Toggle focus mode (hide sidebars)', () => toggleMode('focus', 'Focus mode'), ['zen', 'sidebar', 'distraction']);
reg('compact', 'Toggle compact lists', () => toggleMode('compact', 'Compact lists'), ['dense', 'tight']);
reg('stats.export', 'Copy listening stats as JSON', () => copyJson(Y.stats ? Y.stats.data() : {}, 'Stats'), ['export', 'backup']);
reg('history.export', 'Copy play history as JSON', () => copyJson(hist(), 'History'), ['export', 'backup']);
