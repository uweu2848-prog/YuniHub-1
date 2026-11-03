const Y = window.YuniSpot;
const el = Y.dom.el;

Y.dom.css('nav', `
.yuni-nav{display:flex;flex-direction:column;gap:12px;font-family:var(--yuni-font,ui-monospace,Consolas,monospace)}
.yuni-nav input{width:100%;box-sizing:border-box;padding:11px 14px;border-radius:12px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);color:inherit;font:inherit;outline:none}
.yuni-nav input:focus{border-color:rgba(var(--yuni-accent-rgb,255,43,43),.7);box-shadow:0 0 0 3px rgba(var(--yuni-accent-rgb,255,43,43),.18)}
.yuni-tabs{display:flex;gap:6px;flex-wrap:wrap}
.yuni-tab{border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.04);color:#c9c9d4;padding:6px 12px;border-radius:999px;font:inherit;font-size:12px;cursor:pointer}
.yuni-tab.on{background:linear-gradient(180deg,var(--yuni-btn-top,#ff3a3a),var(--yuni-btn-bottom,#d10000));color:#fff;border-color:transparent}
.yuni-nav-list{display:flex;flex-direction:column;gap:4px;max-height:44vh;overflow:auto}
.yuni-nav-item{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:12px;cursor:pointer;border:1px solid transparent}
.yuni-nav-item:hover{background:rgba(var(--yuni-accent-rgb,255,43,43),.12);border-color:rgba(var(--yuni-accent-rgb,255,43,43),.35)}
.yuni-nav-item b{flex:1;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.yuni-kind{font-size:9px;letter-spacing:.16em;text-transform:uppercase;padding:3px 7px;border-radius:7px;background:rgba(255,255,255,.07);color:#a6a6b3}
.yuni-nav-empty{padding:16px;text-align:center;color:#8d8d9b;line-height:1.5}
`);

const KINDS = ['playlist', 'artist', 'album', 'track', 'user', 'show', 'episode'];

/** Turn a Spotify link, URI or in-app path into an in-app route, or null. */
function parseLink(text) {
  const t = String(text || '').trim();
  let m = t.match(/^spotify:(\w+):([A-Za-z0-9]{8,32})$/);
  if (!m) m = t.match(/^(?:https?:\/\/)?open\.spotify\.com\/(?:intl-[a-z-]+\/)?(\w+)\/([A-Za-z0-9]{8,32})(?:[?#/].*)?$/i);
  if (!m) m = t.match(/^\/(\w+)\/([A-Za-z0-9]{8,32})\/?$/);
  if (!m || !KINDS.includes(m[1].toLowerCase())) return null;
  return '/' + m[1].toLowerCase() + '/' + m[2];
}

/** Everything linkable that is on screen right now (sidebar library, current page, now-playing bar). */
function scrape() {
  const seen = new Set();
  const out = [];
  document.querySelectorAll('a[href^="/playlist/"], a[href^="/artist/"], a[href^="/album/"], a[href^="/user/"]').forEach((a) => {
    const href = a.getAttribute('href') || '';
    const m = href.match(/^\/(playlist|artist|album|user)\/([A-Za-z0-9]+)/);
    if (!m) return;
    const path = '/' + m[1] + '/' + m[2];
    const name = (a.getAttribute('aria-label') || a.textContent || '').trim().replace(/\s+/g, ' ');
    if (!name || name.length > 90 || seen.has(path)) return;
    seen.add(path);
    out.push({ kind: m[1], name, path });
  });
  return out;
}

function recentArtists() {
  const map = new Map();
  (Y.history ? Y.history.list() : []).forEach((h) => (h.links || []).forEach((l) => {
    if (l.href && !map.has(l.href)) map.set(l.href, { kind: 'artist', name: l.name, path: l.href, recent: true });
  }));
  return [...map.values()].slice(0, 30);
}

function go(path, close) {
  if (close) close();
  setTimeout(() => Y.navigate(path), 60);
}

function openLink(text) {
  const path = parseLink(text);
  if (!path) { Y.ui.toast('That is not a Spotify link'); return false; }
  return Y.navigate(path);
}

/* ---------- pins: your own shortcuts to playlists, artists and albums ---------- */
const PIN_MAX = 40;
const pins = () => Y.storage.get('pins', []).filter((p) => p && typeof p.path === 'string' && /^\/(playlist|artist|album|user|show)\/[A-Za-z0-9]+$/.test(p.path));
const isPinned = (path) => pins().some((p) => p.path === path);
const pinCmds = new Map();
function syncPinCommands() {
  pinCmds.forEach((off) => off()); pinCmds.clear();
  pins().forEach((p) => pinCmds.set(p.path, Y.commands.register({ id: 'yunispot.pin.' + p.path.replace(/\W/g, '_'), title: 'Open pinned: ' + p.name, section: 'Pinned', keywords: [p.kind, 'pin', 'favorite'], run: () => Y.navigate(p.path) })));
}
function setPins(list) { Y.storage.set('pins', list.slice(0, PIN_MAX)); syncPinCommands(); }
function pin(item) {
  if (!item || typeof item.path !== 'string' || !/^\/(playlist|artist|album|user|show)\/[A-Za-z0-9]+$/.test(item.path) || isPinned(item.path)) return false;
  item.name = String(item.name || item.path).slice(0, 80);
  setPins([{ kind: item.kind, name: item.name, path: item.path }, ...pins()]);
  return true;
}
const unpin = (path) => setPins(pins().filter((p) => p.path !== path));

let closeHub = null;
function hub(startTab) {
  if (closeHub) { try { closeHub(); } catch { /* ignore */ } closeHub = null; }
  let tab = startTab || 'all', filter = '';
  const onScreen = scrape();
  const cur = Y.player.current();
  const curArtists = cur ? (cur.links || []).map((l) => ({ kind: 'artist', name: l.name, path: l.href, now: true })) : [];
  const all = [];
  const add = (x) => { if (!all.some((y) => y.path === x.path)) all.push(x); };
  pins().forEach((p) => add({ ...p, pinned: true }));
  curArtists.forEach(add); onScreen.forEach(add); recentArtists().forEach(add);

  const list = el('div', { class: 'yuni-nav-list' });
  const tabs = el('div', { class: 'yuni-tabs' });
  const input = el('input', { type: 'text', placeholder: 'Filter, or paste a Spotify link and press Enter', 'aria-label': 'Filter or paste link' });

  const render = () => {
    tabs.textContent = '';
    [['all', 'All'], ['pinned', 'Pinned'], ['playlist', 'Playlists'], ['artist', 'Artists'], ['album', 'Albums']].forEach(([k, label]) => {
      tabs.appendChild(el('button', { class: 'yuni-tab' + (tab === k ? ' on' : ''), onclick: () => { tab = k; render(); } }, label));
    });
    list.textContent = '';
    const f = filter.toLowerCase();
    const rows = all.filter((x) => (tab === 'all' || (tab === 'pinned' ? isPinned(x.path) : x.kind === tab)) && (!f || x.name.toLowerCase().includes(f)));
    if (!rows.length) {
      list.appendChild(el('div', { class: 'yuni-nav-empty' }, all.length
        ? 'Nothing matches that filter.'
        : 'Nothing to show yet. Open Your Library or play something, then reopen this. You can also paste any Spotify link above.'));
      return;
    }
    rows.slice(0, 120).forEach((x) => list.appendChild(el('div', { class: 'yuni-nav-item', onclick: () => go(x.path, closeHub) },
      el('span', { class: 'yuni-kind' }, x.now ? 'now' : x.kind), el('b', {}, x.name),
      Y.iconBtn(isPinned(x.path) ? 'pinOn' : 'pin', isPinned(x.path) ? 'Unpin' : 'Pin', (e) => { e.stopPropagation(); if (isPinned(x.path)) unpin(x.path); else pin(x); render(); }, 'bare sm' + (isPinned(x.path) ? ' on' : '')))));
  };

  input.addEventListener('input', () => { filter = input.value || ''; render(); });
  input.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const path = parseLink(input.value);
    if (path) go(path, closeHub);
    else if (/^\s*(https?:|spotify:)/i.test(input.value || '')) Y.ui.toast('That is not a Spotify link');
  });

  render();
  closeHub = Y.ui.modal('Playlists & artists', el('div', { class: 'yuni-nav' }, input, tabs, list));
  setTimeout(() => { try { input.focus(); } catch { /* ignore */ } }, 30);
}

Y.nav = { parseLink, scrape, openLink, hub, recentArtists, pins, pin, unpin, isPinned };
syncPinCommands();

const reg = (id, title, run, keywords, shortcut) => Y.commands.register({ id: 'yunispot.' + id, title, run, section: 'Browse', keywords, shortcut });
reg('browse', 'Browse playlists & artists', () => hub('all'), ['library', 'profile', 'artist', 'playlist', 'find'], 'Ctrl+Shift+J');
reg('browse.playlists', 'Browse playlists', () => hub('playlist'), ['library', 'mixes']);
reg('browse.artists', 'Browse artists', () => hub('artist'), ['profile', 'band', 'singer']);
reg('openlink', 'Open a Spotify link or URI', () => hub('all'), ['paste', 'url', 'uri', 'share']);
reg('goto.artist', 'Go to current artist profile', () => {
  const c = Y.player.current();
  const l = c && c.links && c.links[0];
  if (!l) return Y.ui.toast('No artist found for the current track');
  if (c.links.length > 1) hub('artist'); else Y.navigate(l.href);
}, ['artist', 'profile', 'about']);
reg('goto.track', 'Go to current track / album page', () => {
  const c = Y.player.current();
  if (c && c.href) Y.navigate(c.href); else Y.ui.toast('No track page found');
}, ['album', 'song']);
reg('pin.artist', 'Pin current artist', () => {
  const c = Y.player.current(); const l = c && c.links && c.links[0];
  if (!l) return Y.ui.toast('No artist found for the current track');
  const m = l.href.match(/^\/artist\/([A-Za-z0-9]+)/);
  if (!m) return Y.ui.toast('Could not read the artist link');
  Y.ui.toast(pin({ kind: 'artist', name: l.name, path: '/artist/' + m[1] }) ? 'Pinned ' + l.name : l.name + ' is already pinned');
}, ['favorite', 'bookmark', 'star']);
reg('pin.page', 'Pin the page I am on', () => {
  let path = '';
  try { const p = Y.finder.platform(); path = (p && p.History && p.History.location && p.History.location.pathname) || ''; } catch { /* ignore */ }
  const m = path.match(/^\/(playlist|artist|album|show)\/([A-Za-z0-9]+)/);
  if (!m) return Y.ui.toast('Open a playlist, artist or album first');
  const heading = document.querySelector('h1');
  const name = ((heading && heading.textContent) || document.title || m[1]).trim().slice(0, 60);
  Y.ui.toast(pin({ kind: m[1], name, path: '/' + m[1] + '/' + m[2] }) ? 'Pinned ' + name : 'Already pinned');
}, ['favorite', 'bookmark', 'star', 'playlist']);
reg('pins', 'Show my pinned playlists & artists', () => hub('pinned'), ['favorites', 'bookmarks']);
Y.keys.bind('mod+shift+j', () => hub('all'), { allowInInput: true });
