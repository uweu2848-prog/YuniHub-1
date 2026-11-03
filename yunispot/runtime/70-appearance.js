const Y = window.YuniSpot;

/* Re-skin YuniSpot's own UI (palette, modals, toasts, stats) to match the red/black glass look.
   This file loads after the other runtime files so these rules win. */
Y.dom.css('skin', `
/* No backdrop-filter on full-screen overlays or big dialogs: stacking them on top of the themed panels can make
   Chromium drop layers and paint a blank window. Opaque gradients give the same look without that risk. */
.yuni-overlay{background:rgba(4,0,0,.66)}
.yuni-modal,.yuni-pal{font-family:var(--yuni-font,ui-monospace,Consolas,monospace);background:linear-gradient(160deg,rgba(255,255,255,.07),rgba(255,255,255,0) 40%),rgb(17,17,23);border:1px solid rgba(255,255,255,.09);border-radius:20px;box-shadow:0 0 0 1px rgba(var(--yuni-accent-rgb,255,43,43),.07),0 30px 90px rgba(0,0,0,.7),0 0 60px rgba(var(--yuni-accent-rgb,255,43,43),.09)}
.yuni-pal input{font-family:inherit}
.yuni-toast{font-family:var(--yuni-font,ui-monospace,Consolas,monospace);background:rgba(18,18,24,.92);-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,.08);border-left:3px solid var(--yuni-accent,var(--yuni-accent,#ff2b2b))}
.yuni-item.sel{background:rgba(var(--yuni-accent-rgb,255,43,43),.14);box-shadow:inset 0 0 0 1px rgba(var(--yuni-accent-rgb,255,43,43),.35)}
.yuni-item kbd{font-family:inherit;border:1px solid rgba(255,255,255,.1)}
.yuni-x:hover{color:var(--yuni-accent,#ff4d4d)}
.yuni-stat-h{color:#8d8d9b;letter-spacing:.16em;font-size:10px}
.yuni-bar i{background:linear-gradient(180deg,var(--yuni-accent,#ff4d4d),var(--yuni-btn-bottom,#b30000));box-shadow:0 0 14px rgba(var(--yuni-accent-rgb,255,43,43),.35)}
html.yuni-lite .yuni-overlay,html.yuni-lite .yuni-modal,html.yuni-lite .yuni-pal,html.yuni-lite .yuni-toast,html.yuni-lite .yuni-dash{-webkit-backdrop-filter:none;backdrop-filter:none}
html.yuni-lite .yuni-modal,html.yuni-lite .yuni-pal{background:#14141b}
`);

const html = document.documentElement;
const state = () => ({ lite: !!Y.storage.get('ui:lite', false), sans: !!Y.storage.get('ui:sans', false) });
function apply() {
  const s = state();
  html.classList.toggle('yuni-lite', s.lite || !!(Y.boot && Y.boot.safe));
  html.classList.toggle('yuni-sans', s.sans);
}

Y.appearance = {
  state,
  apply,
  toggleGlass() { Y.storage.set('ui:lite', !state().lite); apply(); Y.ui.toast(state().lite ? 'Glass effects off (performance mode)' : 'Glass effects on'); },
  toggleMono() { Y.storage.set('ui:sans', !state().sans); apply(); Y.ui.toast(state().sans ? 'Sans-serif font' : 'Monospace font'); },
};
apply();

let playerMotionTimer = null;
Y.on('songchange', () => {
  const bar = document.querySelector('.Root__now-playing-bar');
  if (!bar) return;
  clearTimeout(playerMotionTimer);
  bar.classList.remove('yuni-song-change');
  void bar.offsetWidth;
  bar.classList.add('yuni-song-change');
  playerMotionTimer = setTimeout(() => bar.classList.remove('yuni-song-change'), 500);
});

Y.commands.register({ id: 'yunispot.glass', title: 'Toggle glass effects (performance mode)', section: 'Appearance', keywords: ['blur', 'lag', 'fast', 'lite'], run: () => Y.appearance.toggleGlass() });
Y.commands.register({ id: 'yunispot.mono', title: 'Toggle monospace font', section: 'Appearance', keywords: ['font', 'sans', 'typeface'], run: () => Y.appearance.toggleMono() });

/* ---------- accent: live colour switching + making Spotify's own green UI follow the accent ---------- */
const hexRgb = (hex) => {
  const h = String(hex).replace('#', '');
  const f = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return /^[0-9a-f]{6}$/i.test(f) ? [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16)) : null;
};
const mixc = (rgb, to, t) => rgb.map((c) => Math.round(c + (to - c) * t));
const toHex = (rgb) => '#' + rgb.map((c) => c.toString(16).padStart(2, '0')).join('');
const hueOf = ([r, g, b]) => {
  const [R, G, B] = [r / 255, g / 255, b / 255];
  const mx = Math.max(R, G, B), mn = Math.min(R, G, B), d = mx - mn;
  if (!d) return 0;
  const h = mx === R ? ((G - B) / d) % 6 : mx === G ? (B - R) / d + 2 : (R - G) / d + 4;
  return Math.round(((h * 60) + 360) % 360);
};

Y.accents = [
  ['Red', '#ff2b2b'], ['Crimson', '#ff3d6e'], ['Orange', '#ff8a2b'], ['Gold', '#ffc83d'],
  ['Mint', '#2be3a1'], ['Sky', '#3db8ff'], ['Violet', '#a78bfa'], ['Pink', '#ff6bd6'],
];
Y.appearance.accent = () => Y.storage.get('ui:accent', null);
Y.appearance.setAccent = (hex) => {
  const rgb = hex && hexRgb(hex);
  if (!rgb) { Y.storage.remove('ui:accent'); Y.dom.css('accent', ''); return; }
  const h = toHex(rgb);
  Y.storage.set('ui:accent', h);
  Y.dom.css('accent', `:root,body,.encore-dark-theme,.encore-base-set,[class*="encore-"][class*="-set"],[class*="encore-"][class*="-theme"]{--essential-bright-accent:${h}!important;--text-bright-accent:${h}!important;--yuni-accent:${h}!important;--yuni-accent-rgb:${rgb.join(',')}!important;--yuni-btn-top:${toHex(mixc(rgb, 255, 0.12))}!important;--yuni-btn-bottom:${toHex(mixc(rgb, 0, 0.22))}!important;--yuni-eq-rotate:${hueOf(rgb) - 141}deg!important}`);
};
if (Y.appearance.accent()) Y.appearance.setAccent(Y.appearance.accent());

Y.dom.css('accent-ui', `
[data-testid="playback-progressbar"],[data-testid="volume-bar"],[data-testid="progress-bar"],[class*="x-progressBar"],[class*="ProgressBar"]{
  --fg-color:var(--yuni-accent,#ff2b2b)!important;--progress-bar-color:var(--yuni-accent,#ff2b2b)!important;--progress-bar-active-color:var(--yuni-accent,#ff2b2b)!important;
  --is-active-fg-color:var(--yuni-accent,#ff2b2b)!important;--active-fg-color:var(--yuni-accent,#ff2b2b)!important;--hover-fg-color:var(--yuni-accent,#ff2b2b)!important;--fill-color:var(--yuni-accent,#ff2b2b)!important}
[class*="progressBar-fillColor"],[class*="progressBar"] [class*="fillColor"],[class*="progress-bar__fg"],[class*="x-progressBar"][class*="fill"],
[data-testid="playback-progressbar"]:hover [class*="fillColor"],[data-testid="volume-bar"]:hover [class*="fillColor"],[class*="progressBar"]:hover [class*="fillColor"]{
  background:linear-gradient(90deg,var(--yuni-btn-bottom,#d10000),var(--yuni-accent,#ff2b2b))!important;background-color:var(--yuni-accent,#ff2b2b)!important}
[class*="progressBar-handle"],[class*="progress-bar__slider"]{background:#fff!important;box-shadow:0 0 8px rgba(var(--yuni-accent-rgb,255,43,43),.9)!important}
/* shuffle / repeat "on" state, like hearts */
[data-testid^="control-button"][aria-checked="true"],[data-testid^="control-button"][aria-checked="mixed"]{color:var(--yuni-accent,#ff2b2b)!important}
[data-testid^="control-button"][aria-checked="true"]::after,[data-testid^="control-button"][aria-checked="mixed"]::after{background-color:var(--yuni-accent,#ff2b2b)!important}
[data-testid="add-button"][aria-checked="true"] svg,[data-testid="control-button-heart"][aria-checked="true"] svg{fill:var(--yuni-accent,#ff2b2b)!important}
/* the animated "now playing" bars in track rows (a green GIF), rotated onto the accent hue */
img[src*="equaliser"],img[src*="equalizer"],img[src^="data:image/gif"],[data-testid="playing-indicator"] img,[class*="equaliser"] img,[class*="playingIcon"] img,[data-testid="tracklist-row"] [aria-colindex="1"] img{
  filter:hue-rotate(var(--yuni-eq-rotate,-141deg)) saturate(1.3)!important}
/* focus rings on page containers are noise, keep them for real controls only */
section:focus,section:focus-visible,main:focus,main:focus-visible,[tabindex="-1"]:focus,[tabindex="-1"]:focus-visible,[data-testid$="-page"]:focus,[data-testid$="-page"]:focus-visible{outline:none!important;box-shadow:none!important}
`);
