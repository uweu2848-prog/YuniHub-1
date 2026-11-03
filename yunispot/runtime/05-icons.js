const Y = window.YuniSpot;

/* Icon set. Every icon is a CSS mask, so it takes the colour of its button and always renders,
   whatever Spotify does to its own markup. Usage: Y.iconBtn('play', 'Play', fn, 'extra-class'). */
const S = (inner, filled) => {
  const attrs = filled ? "fill='black'" : "fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'";
  return 'url("data:image/svg+xml,' + encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' " + attrs + '>' + inner + '</svg>') + '")';
};
const ICONS = {
  play: S("<path d='M7 3.8v16.4a1 1 0 0 0 1.5.86l13.4-8.2a1 1 0 0 0 0-1.72L8.5 2.94A1 1 0 0 0 7 3.8z'/>", true),
  pause: S("<rect x='5' y='3' width='5' height='18' rx='1.2'/><rect x='14' y='3' width='5' height='18' rx='1.2'/>", true),
  prev: S("<rect x='4' y='4' width='2.6' height='16' rx='1'/><path d='M20 5.2v13.6a1 1 0 0 1-1.6.8L9 13.2a1.4 1.4 0 0 1 0-2.4l9.4-6.4A1 1 0 0 1 20 5.2z'/>", true),
  next: S("<rect x='17.4' y='4' width='2.6' height='16' rx='1'/><path d='M4 5.2v13.6a1 1 0 0 0 1.6.8l9.4-6.4a1.4 1.4 0 0 0 0-2.4L5.6 4.4A1 1 0 0 0 4 5.2z'/>", true),
  heart: S("<path d='M12 21s-7.5-4.7-9.5-9.3C1.2 8.6 3 5 6.4 5c2 0 3.5 1.1 4.2 2.4h2.8C14.1 6.1 15.6 5 17.6 5 21 5 22.8 8.6 21.5 11.7 19.5 16.3 12 21 12 21z'/>", true),
  heartO: S("<path d='M12 20s-7-4.4-8.9-8.7C2 8.6 3.6 5.8 6.4 5.8c1.9 0 3.3 1 4 2.3h3.2c.7-1.3 2.1-2.3 4-2.3 2.8 0 4.4 2.8 3.3 5.5C19 15.6 12 20 12 20z'/>"),
  close: S("<path d='M6 6l12 12M18 6 6 18'/>"),
  min: S("<path d='M6 12h12'/>"),
  artist: S("<circle cx='12' cy='8' r='4'/><path d='M4 21c.7-4.4 4-6.5 8-6.5s7.3 2.1 8 6.5'/>"),
  shuffle: S("<path d='M16 4h4v4M4 20 20 4M20 16v4h-4M14.5 14.5 20 20M4 4l5 5'/>"),
  repeat: S("<path d='M17 2l3 3-3 3M4 11V9a4 4 0 0 1 4-4h12M7 22l-3-3 3-3M20 13v2a4 4 0 0 1-4 4H4'/>"),
  queue: S("<path d='M4 6h13M4 11h13M4 16h6M15 14.5v6l5-3z'/>"),
  lyrics: S("<rect x='9' y='3' width='6' height='11' rx='3'/><path d='M5 11a7 7 0 0 0 14 0M12 18v3'/>"),
  volume: S("<path d='M4 9.5h3.5L13 5v14l-5.5-4.5H4z'/><path d='M16.5 9a4.2 4.2 0 0 1 0 6M19 6.5a8 8 0 0 1 0 11'/>"),
  mute: S("<path d='M4 9.5h3.5L13 5v14l-5.5-4.5H4z'/><path d='M17 9.5l4 5M21 9.5l-4 5'/>"),
  cart: S("<circle cx='9' cy='20' r='1.5'/><circle cx='18' cy='20' r='1.5'/><path d='M2 3h3l2.7 12.2a1.5 1.5 0 0 0 1.5 1.2h8.6a1.5 1.5 0 0 0 1.5-1.1L21 8H6'/>"),
  mini: S("<rect x='3' y='5' width='18' height='14' rx='3'/><rect x='12' y='12' width='7' height='5' rx='1.2' fill='black'/>"),
  expand: S("<path d='M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5'/>"),
  pin: S("<path d='M12 3.5l2.5 5.2 5.7.8-4.1 4 1 5.7-5.1-2.7-5.1 2.7 1-5.7-4.1-4 5.7-.8z'/>"),
  pinOn: S("<path d='M12 3.5l2.5 5.2 5.7.8-4.1 4 1 5.7-5.1-2.7-5.1 2.7 1-5.7-4.1-4 5.7-.8z'/>", true),
  home: S("<path d='M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z'/>"),
};

const root = Object.entries(ICONS).map(([k, v]) => '--yi-' + k + ':' + v + ';').join('');
Y.dom.css('icons', `
:root{${root}}
.yuni-ib{width:28px;height:28px;border-radius:50%;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.08);cursor:pointer;position:relative;padding:0;flex:none;color:#fff;transition:background .12s,transform .12s,box-shadow .12s}
.yuni-ib:hover{background:rgba(255,255,255,.2);transform:scale(1.07)}
.yuni-ib::after{content:"";position:absolute;inset:0;margin:auto;width:48%;height:48%;background:currentColor;-webkit-mask:var(--ic) center/contain no-repeat;mask:var(--ic) center/contain no-repeat}
.yuni-ib.bare{border-color:transparent;background:transparent}
.yuni-ib.bare:hover{background:rgba(255,255,255,.1)}
.yuni-ib.on{color:var(--yuni-accent,#ff2b2b)}
.yuni-ib.on::before{content:"";position:absolute;left:50%;bottom:2px;width:4px;height:4px;margin-left:-2px;border-radius:50%;background:var(--yuni-accent,#ff2b2b);box-shadow:0 0 8px var(--yuni-accent,#ff2b2b)}

.yuni-slider{flex:1;height:14px;display:flex;align-items:center;cursor:pointer;position:relative}
.yuni-slider b{display:block;width:100%;height:5px;border-radius:99px;background:rgba(255,255,255,.16);box-shadow:inset 0 1px 2px rgba(0,0,0,.55);position:relative;overflow:visible;transition:height .1s}
.yuni-slider:hover b{height:7px}
.yuni-slider i{position:absolute;left:0;top:0;bottom:0;width:0;border-radius:99px;background:linear-gradient(90deg,var(--yuni-btn-bottom,#d10000),var(--yuni-accent,#ff2b2b));box-shadow:0 0 12px rgba(var(--yuni-accent-rgb,255,43,43),.75)}
.yuni-slider i::after{content:"";position:absolute;right:-6px;top:50%;width:12px;height:12px;margin-top:-6px;border-radius:50%;background:#fff;box-shadow:0 0 10px rgba(var(--yuni-accent-rgb,255,43,43),.9);opacity:0;transition:opacity .1s}
.yuni-slider:hover i::after,.yuni-slider.drag i::after{opacity:1}
.yuni-slider:focus-visible{outline:2px solid var(--yuni-accent,#ff2b2b);outline-offset:3px;border-radius:99px}
.yuni-ib:focus-visible{outline:2px solid var(--yuni-accent,#ff2b2b);outline-offset:2px}
`);

/** Set a CSS custom property on an element (el.style[...] does not work for custom properties). */
Y.setVar = (node, name, value) => { try { node.style.setProperty(name, value); } catch { /* stub / old engine */ } };
Y.icons = ICONS;
Y.iconBtn = (name, title, onclick, cls) => {
  const b = Y.dom.el('button', { class: 'yuni-ib' + (cls ? ' ' + cls : ''), title, 'aria-label': title, onclick });
  Y.setVar(b, '--ic', 'var(--yi-' + name + ')');
  b.setIcon = (n) => Y.setVar(b, '--ic', 'var(--yi-' + n + ')');
  return b;
};

/** Click / drag / keyboard slider. onChange(f) while dragging, onCommit(f) on release or key press (f is 0..1).
 *  Returns { track, fill, set(f), dragging() }; set() is ignored while the user is dragging. */
Y.slider = (onCommit, onChange, opts) => {
  const el = Y.dom.el;
  const fill = el('i');
  const track = el('div', { class: 'yuni-slider', role: 'slider', tabindex: '0', 'aria-label': (opts && opts.label) || 'Slider', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': '0' }, el('b', {}, fill));
  let dragging = false, cur = 0;
  const show = (f) => { cur = Math.min(1, Math.max(0, f)); fill.style.width = cur * 100 + '%'; track.setAttribute('aria-valuenow', String(Math.round(cur * 100))); return cur; };
  const frac = (e) => { const r = track.getBoundingClientRect(); return r.width ? (e.clientX - r.left) / r.width : 0; };
  track.addEventListener('mousedown', (e) => {
    e.preventDefault();
    dragging = true; track.classList.add('drag');
    const set = (ev) => { const f = show(frac(ev)); if (onChange) onChange(f); return f; };
    set(e);
    const move = (ev) => set(ev);
    const up = (ev) => {
      document.removeEventListener('mousemove', move, true); document.removeEventListener('mouseup', up, true);
      track.classList.remove('drag'); dragging = false;
      onCommit(set(ev));
    };
    document.addEventListener('mousemove', move, true); document.addEventListener('mouseup', up, true);
  });
  const step = (opts && opts.step) || 0.05;
  track.addEventListener('keydown', (e) => {
    const k = e.key;
    const to = k === 'ArrowRight' || k === 'ArrowUp' ? cur + step : k === 'ArrowLeft' || k === 'ArrowDown' ? cur - step : k === 'Home' ? 0 : k === 'End' ? 1 : null;
    if (to === null) return;
    e.preventDefault(); e.stopPropagation();
    onCommit(show(to));
  });
  return { track, fill, set: (f) => { if (!dragging) show(f); }, dragging: () => dragging };
};
