const Y = window.YuniSpot;
const el = Y.dom.el;

/* Guided tour: a spotlight that points at the real buttons on screen, one step at a time.
   Keys: Right / Enter = next, Left = back, Esc = skip. It never blocks clicks, so people can try things as they go.
   No backdrop blur anywhere (the dim is a plain shadow), so it is as cheap as a UI layer can be. */
Y.dom.css('tour', `
.yuni-tour-dim{position:fixed;inset:0;z-index:2147482090;background:rgba(3,0,0,.74);animation:yuni-tour-dim-in .34s ease-out both}
.yuni-tour-hole{position:fixed;z-index:2147482090;display:none;border-radius:16px;pointer-events:none;box-shadow:0 0 0 9999px rgba(3,0,0,.74),0 0 0 2px rgba(var(--yuni-accent-rgb,255,43,43),.95),0 0 30px rgba(var(--yuni-accent-rgb,255,43,43),.55);transition:left .38s cubic-bezier(.2,.75,.25,1),top .38s cubic-bezier(.2,.75,.25,1),width .38s cubic-bezier(.2,.75,.25,1),height .38s cubic-bezier(.2,.75,.25,1)}
.yuni-tour-card{position:fixed;z-index:2147482200;width:min(390px,92vw);box-sizing:border-box;padding:18px 18px 14px;border-radius:20px;color:#f5f5f7;font-family:var(--yuni-font,ui-monospace,Consolas,monospace);font-size:13px;line-height:1.55;
 background:linear-gradient(160deg,rgba(255,255,255,.08),rgba(255,255,255,0) 40%),rgb(17,17,23);border:1px solid rgba(255,255,255,.13);box-shadow:0 30px 80px rgba(0,0,0,.7),0 0 0 1px rgba(var(--yuni-accent-rgb,255,43,43),.14)}
.yuni-tour-card>*{animation:yuni-tour-step-in .34s cubic-bezier(.2,.75,.25,1) both}
.yuni-tour-card>*:nth-child(2){animation-delay:.035s}.yuni-tour-card>*:nth-child(3){animation-delay:.07s}.yuni-tour-card>*:nth-child(4){animation-delay:.105s}.yuni-tour-card>*:nth-child(5){animation-delay:.14s}
.yuni-tour-tag{font-size:10px;letter-spacing:.18em;color:var(--yuni-accent,#ff4d4d);margin-bottom:6px}
.yuni-tour-card h3{margin:0 0 6px;font-size:17px;font-weight:800;letter-spacing:-.02em;line-height:1.2}
.yuni-tour-card p{margin:0 0 10px;color:#c9c9d4}
.yuni-tour-card code{font:inherit;padding:1px 6px;border-radius:6px;background:rgba(255,255,255,.09)}
.yuni-tour-keys{display:flex;flex-direction:column;gap:6px;margin:2px 0 12px}
.yuni-tour-key{display:flex;align-items:center;gap:10px}
.yuni-tour-key kbd{font:inherit;font-size:11px;padding:2px 8px;border-radius:7px;background:rgba(255,255,255,.09);border:1px solid rgba(255,255,255,.14);white-space:nowrap}
.yuni-tour-key span{color:#a6a6b3}
.yuni-tour-act{margin:0 0 12px}
.yuni-tour-foot{display:flex;align-items:center;justify-content:space-between;gap:10px;padding-top:4px}
.yuni-tour-dots{display:flex;gap:5px;flex-wrap:wrap;max-width:150px}
.yuni-tour-dots i{width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,.18)}
.yuni-tour-dots i.done{background:rgba(var(--yuni-accent-rgb,255,43,43),.5)}
.yuni-tour-dots i.on{background:var(--yuni-accent,#ff2b2b);box-shadow:0 0 8px var(--yuni-accent,#ff2b2b)}
.yuni-tour-nav{display:flex;gap:8px}
.yuni-tour-skip{position:absolute;top:14px;right:16px;background:none;border:0;color:#8d8d9b;font:inherit;font-size:11px;cursor:pointer;padding:2px 4px}
.yuni-tour-skip:hover{color:#fff}
@keyframes yuni-tour-dim-in{from{opacity:0}to{opacity:1}}
@keyframes yuni-tour-step-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@media (prefers-reduced-motion:reduce){.yuni-tour-hole{transition:none}.yuni-tour-card,.yuni-tour-card>*,.yuni-tour-dim{animation:none}}
`);

const isMac = /mac/i.test((typeof navigator !== 'undefined' && navigator.platform) || '');
const MOD = isMac ? '\u2318' : 'Ctrl';
const ALT = isMac ? '\u2325' : 'Alt';

const visible = (n) => {
  try {
    const r = n.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) return false;
    const cs = getComputedStyle(n);
    return cs.display !== 'none' && cs.visibility !== 'hidden';
  } catch { return false; }
};
const pick = (sels) => {
  for (const s of [].concat(sels || [])) {
    let n = null;
    try { n = document.querySelector(s); } catch { /* bad selector */ }
    if (n && visible(n)) return n;
  }
  return null;
};
function buildSteps() {
  return [
    { id: 'intro', title: 'A quick tour', body: 'About a minute. We\u2019ll point at the parts of YuniSpot worth knowing, right on your screen. Use the arrow keys or the buttons; Esc skips. Nothing here changes anything.' },
    { id: 'player', need: true, target: ['[data-testid="now-playing-bar"]'], title: 'Spotify playback',
      body: 'Spotify keeps its native playback, seek, queue, and volume controls. YuniSpot follows the current track without replacing the player.' },
    { id: 'track', need: true, target: ['[data-testid="now-playing-widget"]'], title: 'Now playing',
      body: 'Your track and artist stay in Spotify’s player. When the song changes, YuniSpot can show its own matching glass card.' },
    { id: 'store', need: true, target: ['#yuni-store-btn'], title: 'The YuniSpot Marketplace',
      body: 'Browse song cards, appearance, focus mode, accent colour, and SpotX ad blocking from one place.',
      keys: [[MOD + '+Shift+Y', 'Open the Marketplace from anywhere']], act: { label: 'Open Marketplace', run: () => Y.store && Y.store.open() } },
    { id: 'side', need: true, target: ['.Root__nav-bar'], title: 'Your library',
      body: 'Spotify\u2019s own sidebar: your playlists and library. YuniSpot only changes how it looks, never what is in it.' },
    { id: 'main', need: true, target: ['.Root__main-view'], title: 'Browse and play',
      body: 'Search, browse and play exactly like normal Spotify, and the player follows along. Tip: jump straight to any playlist or artist, or paste a Spotify link.',
      keys: [[MOD + '+Shift+J', 'Playlists & artists browser']] },
    { id: 'palette', title: 'The command palette',
      body: 'Press the shortcut and type what you want: \u201csleep\u201d, \u201cstats\u201d, \u201cnext\u201d, \u201cfocus\u201d. Almost everything in YuniSpot is a command.',
      keys: [[MOD + '+K', 'Open the palette']], act: { label: 'Try it now', run: () => Y.palette && Y.palette.open() } },
    { id: 'keys', title: 'Shortcuts worth knowing',
      body: 'Four big views, one key each:',
      keys: [[MOD + '+Shift+H', 'Home dashboard'], [MOD + '+Shift+N', 'Full-screen Now Playing'], [MOD + '+Shift+J', 'Playlists & artists'], [MOD + '+Shift+Y', 'Marketplace']],
      act: { label: 'Open the dashboard', run: () => Y.dashboard && Y.dashboard.open() } },
    { id: 'safe', title: 'If something looks wrong',
      body: 'Blank or glitchy screen? Press the shortcut below for safe visuals, instantly. From a terminal, `yunispot safe on` or `yunispot restore` always work.',
      keys: [[MOD + '+' + ALT + '+Shift+R', 'Switch to safe visuals']], act: { label: 'Run diagnostics', run: () => Y.commands.run('yunispot.diagnostics') } },
    { id: 'done', title: 'You\u2019re all set', body: 'Replay this tour any time: open the palette and type \u201ctour\u201d. The welcome screen is there too, under \u201cwelcome\u201d. Enjoy the music.' },
  ];
}

let T = null;

const usable = (s) => (!s.when || s.when()) && (!s.need || !!pick(s.target));

function placeCard(r) {
  const card = T.card;
  const vw = window.innerWidth || 1280, vh = window.innerHeight || 720, m = 14;
  const cw = card.offsetWidth || 390, ch = card.offsetHeight || 220;
  let x, y;
  if (!r) { x = (vw - cw) / 2; y = (vh - ch) / 2; }
  else {
    const above = r.top, below = vh - r.bottom, right = vw - r.right, left = r.left;
    if (above >= ch + m + 8 && above >= below) { y = r.top - ch - m; x = r.left + r.width / 2 - cw / 2; }
    else if (below >= ch + m + 8) { y = r.bottom + m; x = r.left + r.width / 2 - cw / 2; }
    else if (right >= cw + m + 8) { x = r.right + m; y = r.top + r.height / 2 - ch / 2; }
    else if (left >= cw + m + 8) { x = r.left - cw - m; y = r.top + r.height / 2 - ch / 2; }
    else { x = r.left + r.width / 2 - cw / 2; y = r.bottom - ch - 24; } // huge target: sit inside it, near the bottom
  }
  card.style.left = Math.round(Math.min(vw - cw - 8, Math.max(8, x))) + 'px';
  card.style.top = Math.round(Math.min(vh - ch - 8, Math.max(8, y))) + 'px';
}

function layout() {
  if (!T) return;
  const s = T.steps[T.i];
  const t = pick(s.target);
  const vw = window.innerWidth || 1280, vh = window.innerHeight || 720;
  if (t) {
    const b = t.getBoundingClientRect(), pad = 6;
    const x = Math.max(4, b.left - pad), y = Math.max(4, b.top - pad);
    const w = Math.max(10, Math.min(vw - 4 - x, b.width + pad * 2)), h = Math.max(10, Math.min(vh - 4 - y, b.height + pad * 2));
    Object.assign(T.hole.style, { display: 'block', left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px' });
    T.dim.style.display = 'none';
    placeCard({ left: x, top: y, right: x + w, bottom: y + h, width: w, height: h });
  } else {
    T.hole.style.display = 'none';
    T.dim.style.display = 'block';
    placeCard(null);
  }
}

function render() {
  const s = T.steps[T.i];
  const total = T.steps.length, last = T.i === total - 1;
  const kids = [
    el('div', { class: 'yuni-tour-tag' }, 'STEP ' + (T.i + 1) + ' / ' + total),
    el('h3', {}, s.title),
    el('p', {}, s.body),
    s.keys ? el('div', { class: 'yuni-tour-keys' }, s.keys.map(([k, d]) => el('div', { class: 'yuni-tour-key' }, el('kbd', {}, k), el('span', {}, d)))) : null,
    s.act ? el('div', { class: 'yuni-tour-act' }, el('button', { class: 'yuni-btn ghost sm', onclick: () => { try { s.act.run(); } catch (e) { Y.warn('tour action failed', e); } } }, s.act.label)) : null,
    el('div', { class: 'yuni-tour-foot' },
      el('div', { class: 'yuni-tour-dots' }, T.steps.map((_, k) => el('i', { class: k === T.i ? 'on' : k < T.i ? 'done' : '' }))),
      el('div', { class: 'yuni-tour-nav' },
        T.i > 0 ? el('button', { class: 'yuni-btn ghost sm', onclick: () => go(-1) }, 'Back') : null,
        el('button', { class: 'yuni-btn sm', onclick: () => go(1) }, last ? 'Finish' : 'Next'))),
    last ? null : el('button', { class: 'yuni-tour-skip', onclick: () => stop(false) }, 'Skip tour'),
  ];
  T.card.replaceChildren(...kids.filter(Boolean));
  layout();
}

function go(d) {
  if (!T) return;
  let i = T.i + d;
  while (i >= 0 && i < T.steps.length && !usable(T.steps[i])) i += d;
  if (i >= T.steps.length) return stop(true);
  if (i < 0) return;
  T.i = i;
  render();
}

function stop(finished) {
  if (!T) return;
  const t = T; T = null;
  clearInterval(t.timer);
  window.removeEventListener('resize', t.onResize);
  document.removeEventListener('keydown', t.onKey, true);
  [t.dim, t.hole, t.card].forEach((n) => n.remove());
  Y.storage.set('tour:done', Y.version);
  if (finished) Y.ui.toast('Tour finished. Replay it any time: Ctrl+K, then \u201ctour\u201d.');
}

function start() {
  if (T) stop(false);
  const steps = buildSteps();
  const dim = el('div', { class: 'yuni-tour-dim', 'aria-hidden': 'true' });
  const hole = el('div', { class: 'yuni-tour-hole', 'aria-hidden': 'true' });
  const card = el('div', { class: 'yuni-tour-card', role: 'dialog', 'aria-label': 'YuniSpot guided tour', 'aria-live': 'polite' });
  const onKey = (e) => {
    // while the palette / a dialog is open on top of the tour, leave the keyboard alone
    if (document.querySelector('.yuni-overlay, .yuni-dash, .yuni-np')) return;
    const t = e.target || {};
    if (/^(input|textarea|select)$/i.test(t.tagName || '') || t.isContentEditable) return;
    const k = e.key;
    if (k === 'Escape') { e.preventDefault(); e.stopPropagation(); stop(false); }
    else if (k === 'ArrowRight' || (k === 'Enter' && !/^button$/i.test(t.tagName || ''))) { e.preventDefault(); e.stopPropagation(); go(1); }
    else if (k === 'ArrowLeft') { e.preventDefault(); e.stopPropagation(); go(-1); }
  };
  const onResize = () => layout();
  document.body.append(dim, hole, card);
  document.addEventListener('keydown', onKey, true);
  window.addEventListener('resize', onResize);
  T = { steps, i: 0, dim, hole, card, onKey, onResize, timer: setInterval(layout, 500) };
  if (!usable(steps[0])) go(1); else render();
}

Y.tour = { start, stop, isOpen: () => !!T, next: () => go(1), back: () => go(-1), steps: () => buildSteps().map((s) => s.id) };
Y.commands.register({ id: 'yunispot.tour', title: 'YuniSpot: Take the guided tour', section: 'YuniSpot', keywords: ['tutorial', 'walkthrough', 'walk around', 'help', 'learn', 'onboarding', 'intro'], run: () => start() });
