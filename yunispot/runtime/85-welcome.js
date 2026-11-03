const Y = window.YuniSpot;
const el = Y.dom.el;

Y.dom.css('welcome', `
.yuni-wel{display:flex;flex-direction:column;gap:16px;font-family:var(--yuni-font,ui-monospace,Consolas,monospace)}
.yuni-wel-hero{display:flex;flex-direction:column;gap:6px;padding:4px 0 2px}
.yuni-wel-hero h1{margin:0;font-size:26px;font-weight:800;letter-spacing:-.025em;line-height:1.15}
.yuni-wel-hero h1 span{color:var(--yuni-accent,var(--yuni-accent,#ff2b2b))}
.yuni-wel-hero p{margin:0;color:#a6a6b3;line-height:1.55}
.yuni-wel-tag{align-self:flex-start;font-size:10px;letter-spacing:.16em;padding:4px 9px;border-radius:8px;background:rgba(var(--yuni-accent-rgb,255,43,43),.14);border:1px solid rgba(var(--yuni-accent-rgb,255,43,43),.4)}
.yuni-wel-h{font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:#8d8d9b;margin:2px 0 -6px}
.yuni-wel-keys{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}
.yuni-wel-key{padding:12px;border-radius:14px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.04);display:flex;flex-direction:column;gap:6px;cursor:pointer;transition:border-color .15s,box-shadow .15s}
.yuni-wel-key:hover{border-color:rgba(var(--yuni-accent-rgb,255,43,43),.5);box-shadow:0 0 22px rgba(var(--yuni-accent-rgb,255,43,43),.15)}
.yuni-wel-key kbd{align-self:flex-start;font:inherit;font-size:11px;padding:2px 7px;border-radius:7px;background:rgba(255,255,255,.09);border:1px solid rgba(255,255,255,.12)}
.yuni-wel-key b{font-size:13px}.yuni-wel-key small{color:#a6a6b3;line-height:1.4}
.yuni-sw-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:9px 12px;border-radius:12px;background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.06);cursor:pointer}
.yuni-sw-row:hover{border-color:rgba(var(--yuni-accent-rgb,255,43,43),.35)}
.yuni-sw-row small{display:block;color:#8d8d9b;margin-top:2px}
.yuni-sw{flex:none;width:36px;height:20px;border-radius:999px;background:rgba(255,255,255,.14);position:relative;transition:background .15s}
.yuni-sw::after{content:"";position:absolute;top:3px;left:3px;width:14px;height:14px;border-radius:50%;background:#fff;transition:transform .15s}
.yuni-sw.on{background:linear-gradient(180deg,var(--yuni-btn-top,#ff3a3a),var(--yuni-btn-bottom,#d10000))}
.yuni-sw.on::after{transform:translateX(16px)}
.yuni-wel-new{margin:0;padding-left:18px;color:#c9c9d4;line-height:1.7}
.yuni-wel-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;padding-top:4px}
`);

Y.dom.css('wizard', `
.yuni-wiz{position:fixed;inset:0;z-index:2147482999;display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;background:radial-gradient(900px 520px at 100% -5%,rgba(var(--yuni-accent-rgb,255,43,43),.22),transparent 62%),radial-gradient(700px 480px at -5% 105%,rgba(var(--yuni-accent-rgb,255,43,43),.16),transparent 60%),rgba(4,0,0,.9);animation:yuni-wiz-backdrop-in .3s ease-out both}
.yuni-wiz-card{width:min(660px,100%);max-height:calc(100vh - 32px);display:flex;flex-direction:column;border-radius:22px;color:#f5f5f7;font-family:var(--yuni-font,ui-monospace,Consolas,monospace);font-size:13px;line-height:1.55;overflow:hidden;
 background:linear-gradient(160deg,rgba(255,255,255,.08),rgba(255,255,255,0) 40%),rgb(17,17,23);border:1px solid rgba(255,255,255,.12);box-shadow:0 30px 90px rgba(0,0,0,.7),0 0 0 1px rgba(var(--yuni-accent-rgb,255,43,43),.1),0 0 70px rgba(var(--yuni-accent-rgb,255,43,43),.1);animation:yuni-wiz-card-in .42s cubic-bezier(.2,.75,.25,1) both}
.yuni-wiz-top{display:flex;align-items:center;justify-content:space-between;padding:16px 20px 0}
.yuni-wiz-body{padding:12px 24px 8px;overflow:auto;display:flex;flex-direction:column;gap:14px}
.yuni-wiz-body h2{margin:0;font-size:22px;font-weight:800;letter-spacing:0;line-height:1.2}
.yuni-wiz-body p{margin:0;color:#b4b4c0}
.yuni-wiz-body>*{animation:yuni-wiz-content-in .38s cubic-bezier(.2,.75,.25,1) both}
.yuni-wiz-body>*:nth-child(2){animation-delay:.035s}.yuni-wiz-body>*:nth-child(3){animation-delay:.07s}.yuni-wiz-body>*:nth-child(4){animation-delay:.105s}.yuni-wiz-body>*:nth-child(5){animation-delay:.14s}
.yuni-wiz-body code{font:inherit;padding:1px 6px;border-radius:6px;background:rgba(255,255,255,.09);color:#ececf2}
.yuni-wiz-foot{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 24px 18px;border-top:1px solid rgba(255,255,255,.06)}
.yuni-wiz-dots{display:flex;gap:6px}
.yuni-wiz-dots i{width:7px;height:7px;border-radius:50%;background:rgba(255,255,255,.18);transition:background .15s}
.yuni-wiz-dots i.done{background:rgba(var(--yuni-accent-rgb,255,43,43),.5)}
.yuni-wiz-dots i.on{background:var(--yuni-accent,#ff2b2b);box-shadow:0 0 9px var(--yuni-accent,#ff2b2b)}
.yuni-wiz-nav{display:flex;gap:8px;align-items:center}
.yuni-wiz-link{background:none;border:0;color:#8d8d9b;font:inherit;font-size:12px;cursor:pointer;padding:6px 8px}
.yuni-wiz-link:hover{color:#fff}
.yuni-wiz-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px}
.yuni-wiz-tile{padding:13px;border-radius:14px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.04);display:flex;flex-direction:column;gap:5px}
.yuni-wiz-tile b{font-size:13px}.yuni-wiz-tile small{color:#a6a6b3;line-height:1.45}
.yuni-wiz-pick{cursor:pointer;transition:border-color .15s,box-shadow .15s,background .15s}
.yuni-wiz-pick:hover{border-color:rgba(var(--yuni-accent-rgb,255,43,43),.45)}
.yuni-wiz-pick.on{border-color:var(--yuni-accent,#ff2b2b);background:rgba(var(--yuni-accent-rgb,255,43,43),.1);box-shadow:0 0 22px rgba(var(--yuni-accent-rgb,255,43,43),.18)}
.yuni-wiz-num{width:24px;height:24px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-weight:800;font-size:12px;background:linear-gradient(180deg,var(--yuni-btn-top,#ff3a3a),var(--yuni-btn-bottom,#d10000));color:#fff;margin-bottom:2px}
.yuni-wiz-kbd{display:flex;align-items:center;gap:10px;padding:5px 0}
.yuni-wiz-kbd kbd{font:inherit;font-size:11px;padding:2px 8px;border-radius:7px;background:rgba(255,255,255,.09);border:1px solid rgba(255,255,255,.14);white-space:nowrap}
.yuni-wiz-kbd span{color:#a6a6b3}
.yuni-wiz-cta{display:flex;flex-direction:column;gap:10px;align-items:stretch;margin-top:4px}
.yuni-wiz-cta .yuni-btn{padding:12px 18px;font-size:14px}
@keyframes yuni-wiz-backdrop-in{from{opacity:0}to{opacity:1}}
@keyframes yuni-wiz-card-in{from{opacity:0;transform:translateY(16px) scale(.985)}to{opacity:1;transform:translateY(0) scale(1)}}
@keyframes yuni-wiz-content-in{from{opacity:0;transform:translateY(9px)}to{opacity:1;transform:translateY(0)}}
@media (prefers-reduced-motion:reduce){.yuni-wiz,.yuni-wiz-card,.yuni-wiz-body>*{animation:none}}
`);

const isMac = /mac/i.test((typeof navigator !== 'undefined' && navigator.platform) || '');
const MOD = isMac ? '\u2318' : 'Ctrl';
const ALT = isMac ? '\u2325' : 'Alt';

const NEWS = [
  'A proper welcome and setup screen, plus a guided tour that points at the real buttons (Ctrl+K, then \u201ctour\u201d)',
  'Blank-screen rescue: ' + MOD + '+' + ALT + '+Shift+R switches to safe visuals, and YuniSpot now does it by itself if the main view disappears',
  'Diagnostics is read-only now, and dialogs no longer use full-screen blur, so they cannot upset the window',
  'New terminal commands: `yunispot safe on|off` starts Spotify with safe visuals, even if the screen is unusable',
];

let W = null; // the open wizard: { root, card, pages, i, first, onKey }

function close() {
  if (!W) return;
  const w = W; W = null;
  document.removeEventListener('keydown', w.onKey, true);
  w.root.remove();
}

/** Mark as seen, close, and optionally hand over to the guided tour. */
function finish(startTour) {
  Y.storage.set('welcome:seen', Y.version);
  close();
  if (startTour && Y.tour) setTimeout(() => Y.tour.start(), 350);
}

/* ---------- pages ---------- */
const tile = (title, desc) => el('div', { class: 'yuni-wiz-tile' }, el('b', {}, title), el('small', {}, desc));
const kbdRow = (k, d) => el('div', { class: 'yuni-wiz-kbd' }, el('kbd', {}, k), el('span', {}, d));

function pageWelcome(first) {
  return el('div', { class: 'yuni-wiz-body', style: { padding: 0, overflow: 'visible' } },
    el('h2', {}, 'Welcome to ', el('span', { style: { color: 'var(--yuni-accent,#ff2b2b)' } }, 'YuniSpot'), '.'),
    el('p', {}, 'YuniSpot gives Spotify a modern glass look, a command palette, a listening dashboard, and useful controls while keeping Spotify’s own player in place.'),
    el('div', { class: 'yuni-wiz-grid' },
      tile('Native playback', 'Spotify keeps its player and playback controls. YuniSpot adds a matching song card.'),
      tile('Command palette', 'Press ' + MOD + '+K and type. Almost everything is one search away.'),
      tile('Stats and tools', 'Listening history, sleep and focus timers, playlists, and full-screen Now Playing.')),
    el('p', {}, first ? 'Takes about two minutes: a quick setup, the basics, then a guided tour of the real app. You can skip any of it.' : ''));
}

function pageSetup() {
  const lite = () => !!Y.appearance.state().lite;
  const wrap = el('div', { class: 'yuni-wiz-body', style: { padding: 0, overflow: 'visible' } });
  const pick = (title, desc, isOn, set) => {
    const t = el('div', { class: 'yuni-wiz-tile yuni-wiz-pick' + (isOn() ? ' on' : ''), role: 'radio', tabindex: '0', 'aria-checked': String(isOn()) }, el('b', {}, title), el('small', {}, desc));
    t.__isOn = isOn;
    const act = () => { try { set(); } catch (e) { Y.warn('setup choice failed', e); } paint(); };
    t.addEventListener('click', act);
    t.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); act(); } });
    return t;
  };
  const picks = [];
  const group = (label, tiles) => { picks.push(...tiles); return [el('div', { class: 'yuni-wel-h' }, label), el('div', { class: 'yuni-wiz-grid' }, tiles)]; };
  const paint = () => picks.forEach((t) => { const on = t.__isOn(); t.classList.toggle('on', on); t.setAttribute('aria-checked', String(on)); });

  const swatches = el('div', { class: 'yuni-swatches' });
  const paintSwatches = () => {
    const now = Y.appearance.accent();
    swatches.textContent = '';
    Y.accents.forEach(([name, hex]) => swatches.appendChild(el('button', { class: 'yuni-swatch' + (now === hex ? ' on' : ''), title: name, 'aria-label': name, style: { background: hex }, onclick: () => { Y.appearance.setAccent(hex); paintSwatches(); } })));
    swatches.appendChild(el('button', { class: 'yuni-swatch reset', onclick: () => { Y.appearance.setAccent(null); paintSwatches(); } }, 'Theme default'));
  };
  paintSwatches();

  const sw = Y.store ? Y.store.switches() : [];
  wrap.append(
    el('h2', {}, 'Make it yours'),
    el('p', {}, 'Pick a starting point. Every choice applies right away and can be changed later in Marketplace (the cart icon).'),
    ...group('Look', [
      pick('Full glass', 'Blur and translucency everywhere. Best on a modern graphics card.', () => !lite(), () => { Y.storage.set('ui:lite', false); Y.appearance.apply(); }),
      pick('Performance', 'No blur, solid panels. Pick this if Spotify lags or a screen ever goes blank.', lite, () => { Y.storage.set('ui:lite', true); Y.appearance.apply(); }),
    ]),
    el('div', { class: 'yuni-wiz-tile' }, el('b', {}, 'Spotify player'), el('small', {}, 'Spotify\u2019s native controls stay active. YuniSpot changes the surrounding look, not playback behavior.')),
    el('div', { class: 'yuni-wel-h' }, 'Accent colour'), swatches,
    el('div', { class: 'yuni-wel-h' }, 'Extras'),
    el('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px' } }, [sw[0], sw[2]].filter(Boolean).map(Y.store.switchRow)));
  return wrap;
}

function pageBasics() {
  const step = (n, title, desc) => el('div', { class: 'yuni-wiz-tile' }, el('span', { class: 'yuni-wiz-num' }, String(n)), el('b', {}, title), el('small', {}, desc));
  return el('div', { class: 'yuni-wiz-body', style: { padding: 0, overflow: 'visible' } },
    el('h2', {}, 'The basics'),
    el('p', {}, 'Use Spotify exactly as you always have. YuniSpot adds a few things on top:'),
    el('div', { class: 'yuni-wiz-grid' },
      step(1, 'Play something', 'Search, open a playlist, and use Spotify\u2019s own player controls.'),
      step(2, 'Make it yours', 'YuniSpot follows the track and can show a matching song card when it changes.'),
      step(3, 'Search for actions', 'Press ' + MOD + '+K and type \u201csleep\u201d, \u201cstats\u201d, \u201cnext\u201d\u2026 anything YuniSpot can do.'),
      step(4, 'Open Marketplace', 'The cart icon holds your look, song cards, focus mode, ad blocker, and accent colour.')),
    el('div', { class: 'yuni-wel-h' }, 'Shortcuts to remember'),
    el('div', {},
      kbdRow(MOD + '+K', 'Command palette'),
      kbdRow(MOD + '+Shift+H', 'Dashboard'),
      kbdRow(MOD + '+Shift+Y', 'YuniSpot Marketplace'),
      kbdRow(MOD + '+Shift+J', 'Playlists & artists'),
      kbdRow(MOD + '+Shift+N', 'Full-screen Now Playing')));
}

function pageSafety() {
  const row = (title, desc) => el('div', { class: 'yuni-wiz-tile' }, el('b', {}, title), el('small', {}, desc));
  return el('div', { class: 'yuni-wiz-body', style: { padding: 0, overflow: 'visible' } },
    el('h2', {}, 'If something ever looks wrong'),
    el('p', {}, 'YuniSpot changes how Spotify looks, so it also comes with a safety net. Worth knowing before you need it:'),
    row('Blank or glitchy screen', 'Press ' + MOD + '+' + ALT + '+Shift+R for safe visuals, instantly. (YuniSpot also does this by itself if the main view disappears.)'),
    row('After a Spotify update', 'Updates reset YuniSpot. Close Spotify and run `yunispot apply` again; `yunispot doctor` tells you what is wrong.'),
    row('Back to plain Spotify', 'Run `yunispot restore` in a terminal and Spotify is exactly as it was. You can also use `yunispot safe on` to start with safe visuals.'),
    el('p', {}, 'Inside Spotify, \u201cYuniSpot: Diagnostics\u201d in the palette shows what is working.'));
}

function pageReady() {
  return el('div', { class: 'yuni-wiz-body', style: { padding: 0, overflow: 'visible' } },
    el('h2', {}, 'You\u2019re all set'),
    el('p', {}, 'Want a guided tour? It points at the real buttons on your screen, takes about a minute, and you can skip it any time.'),
    el('div', { class: 'yuni-wiz-cta' },
      el('button', { class: 'yuni-btn', onclick: () => finish(true) }, 'Take the guided tour'),
      el('button', { class: 'yuni-btn ghost', onclick: () => finish(false) }, 'Skip it, start listening')),
    el('p', {}, 'You can replay the tour or this welcome screen later from the palette (' + MOD + '+K, then \u201ctour\u201d or \u201cwelcome\u201d).'));
}

function pageNews() {
  const switches = Y.store ? Y.store.switches().slice(0, 5).map(Y.store.switchRow) : [];
  return el('div', { class: 'yuni-wiz-body', style: { padding: 0, overflow: 'visible' } },
    el('h2', {}, 'What\u2019s new in ', el('span', { style: { color: 'var(--yuni-accent,#ff2b2b)' } }, 'v' + Y.version)),
    el('ul', { class: 'yuni-wel-new' }, NEWS.map((n) => el('li', {}, n))),
    el('div', { class: 'yuni-wel-h' }, 'Quick settings'),
    el('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px' } }, switches));
}

/* ---------- wizard shell ---------- */
function render() {
  const w = W;
  const pg = w.pages[w.i];
  const last = w.i === w.pages.length - 1;
  const single = w.pages.length === 1;
  const tag = (w.first ? 'YOU\u2019RE IN \u00b7 v' : 'UPDATED \u00b7 v') + Y.version;
  const nextLabel = pg.id === 'welcome' ? 'Let\u2019s go' : 'Next';
  w.card.replaceChildren(
    el('div', { class: 'yuni-wiz-top' }, el('span', { class: 'yuni-wel-tag' }, tag), el('button', { class: 'yuni-x', 'aria-label': 'Close', onclick: () => finish(false) }, '\u00d7')),
    el('div', { class: 'yuni-wiz-body' }, pg.render()),
    el('div', { class: 'yuni-wiz-foot' },
      !single ? el('div', { class: 'yuni-wiz-dots' }, w.pages.map((_, k) => el('i', { class: k === w.i ? 'on' : k < w.i ? 'done' : '' }))) : el('span'),
      el('div', { class: 'yuni-wiz-nav' },
        pg.id === 'welcome' && w.first ? el('button', { class: 'yuni-wiz-link', onclick: () => finish(false) }, 'Skip for now') : null,
        w.i > 0 ? el('button', { class: 'yuni-btn ghost sm', onclick: () => { w.i--; render(); } }, 'Back') : null,
        !single && !last ? el('button', { class: 'yuni-btn sm', onclick: () => { w.i++; render(); } }, nextLabel) : null,
        single ? el('button', { class: 'yuni-btn ghost sm', onclick: () => finish(true) }, 'Take the tour') : null,
        single ? el('button', { class: 'yuni-btn sm', onclick: () => finish(false) }, 'Got it') : null)));
  const primary = w.card.querySelector('.yuni-btn:not(.ghost)');
  if (primary && primary.focus) { try { primary.focus({ preventScroll: true }); } catch { /* ignore */ } }
}

function open(opts) {
  const first = !!(opts && opts.first);
  close();
  const pages = first
    ? [{ id: 'welcome', render: () => pageWelcome(true) }, { id: 'setup', render: pageSetup }, { id: 'basics', render: pageBasics }, { id: 'safety', render: pageSafety }, { id: 'ready', render: pageReady }]
    : [{ id: 'news', render: pageNews }];
  const card = el('div', { class: 'yuni-wiz-card', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Welcome to YuniSpot' });
  const root = el('div', { class: 'yuni-wiz', onclick: (e) => { if (e.target === root) finish(false); } }, card);
  const onKey = (e) => {
    if (document.querySelector('.yuni-overlay')) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); finish(false); }
  };
  document.body.appendChild(root);
  document.addEventListener('keydown', onKey, true);
  W = { root, card, pages, i: 0, first, onKey };
  Y.storage.set('welcome:seen', Y.version); // seen as soon as it is shown, so a crash can never trap anyone in a loop
  render();
}

Y.welcome = {
  open,
  close,
  isOpen: () => !!W,
  // First run: full setup + tutorial. After an update: what's new (unless the user turned that off).
  maybeShow() {
    const seen = Y.storage.get('welcome:seen', null);
    if (seen === null) return open({ first: true });
    if (seen !== Y.version && !Y.storage.get('welcome:quiet', false)) open({ first: false });
    else if (seen !== Y.version) Y.storage.set('welcome:seen', Y.version);
  },
};

Y.commands.register({ id: 'yunispot.welcome', title: 'YuniSpot: Show welcome screen', section: 'YuniSpot', keywords: ['intro', 'whats new', 'tour', 'help', 'setup', 'tutorial', 'getting started'], run: () => open({ first: true }) });
