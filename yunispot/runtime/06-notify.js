const Y = window.YuniSpot;
const el = Y.dom.el;

/* In-app notification cards (no browser permission needed). Aero glass, with cover art, optional
   buttons and a countdown line. Y.ui.toast() is routed through here too, so everything looks alike. */
Y.dom.css('notify', `
#yuni-notes{position:fixed;z-index:2147483000;display:flex;flex-direction:column;gap:10px;width:min(360px,92vw);pointer-events:none;font-family:var(--yuni-font,ui-monospace,Consolas,monospace)}
#yuni-notes.br{right:20px;bottom:112px}#yuni-notes.bl{left:20px;bottom:112px}
#yuni-notes.tr{right:20px;top:56px;flex-direction:column-reverse}#yuni-notes.tl{left:20px;top:56px;flex-direction:column-reverse}
.yuni-note{pointer-events:auto;position:relative;display:flex;gap:12px;align-items:center;padding:11px 14px;border-radius:18px;color:#fff;overflow:hidden;cursor:default;
 background:linear-gradient(160deg,rgba(255,255,255,.16),rgba(255,255,255,.03) 42%,rgba(8,8,12,.7)),rgba(12,12,18,.6);
 -webkit-backdrop-filter:blur(24px) saturate(180%);backdrop-filter:blur(24px) saturate(180%);
 border:1px solid rgba(255,255,255,.18);box-shadow:inset 0 1px 0 rgba(255,255,255,.4),0 18px 48px rgba(0,0,0,.55),0 0 34px rgba(var(--yuni-accent-rgb,255,43,43),.16);
 animation:yuni-note-in .22s cubic-bezier(.2,.9,.3,1.1)}
.yuni-note.out{animation:yuni-note-out .2s ease-in forwards}
.yuni-note.compact{padding:9px 14px;border-radius:14px;font-size:12px}
.yuni-note-img{width:54px;height:54px;flex:none;border-radius:12px;background:rgba(255,255,255,.08) center/cover no-repeat;border:1px solid rgba(255,255,255,.2);box-shadow:0 6px 16px rgba(0,0,0,.45)}
.yuni-note-main{min-width:0;flex:1;display:flex;flex-direction:column;gap:2px}
.yuni-note-tag{font-size:9px;letter-spacing:.2em;color:var(--yuni-accent,#ff2b2b);text-transform:uppercase}
.yuni-note-title{font-weight:800;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.yuni-note-body{color:rgba(255,255,255,.75);font-size:12px;line-height:1.4;overflow:hidden;text-overflow:ellipsis}
.yuni-note-acts{display:flex;gap:6px;margin-top:6px}
.yuni-note-acts button{border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.09);color:#fff;font:inherit;font-size:11px;padding:4px 10px;border-radius:999px;cursor:pointer}
.yuni-note-acts button:hover{background:rgba(var(--yuni-accent-rgb,255,43,43),.35);border-color:rgba(var(--yuni-accent-rgb,255,43,43),.6)}
.yuni-note-bar{position:absolute;left:0;bottom:0;height:2px;width:100%;transform-origin:left;background:linear-gradient(90deg,var(--yuni-btn-top,#ff3a3a),var(--yuni-btn-bottom,#d10000));animation:yuni-note-bar linear forwards}
@keyframes yuni-note-in{from{opacity:0;transform:translateY(10px) scale(.97)}to{opacity:1;transform:none}}
@keyframes yuni-note-out{to{opacity:0;transform:translateX(16px) scale(.97)}}
@keyframes yuni-note-bar{from{transform:scaleX(1)}to{transform:scaleX(0)}}
@media (prefers-reduced-motion:reduce){.yuni-note,.yuni-note.out,.yuni-note-bar{animation:none}}
.yuni-modal{background:linear-gradient(160deg,rgba(255,255,255,.12),rgba(255,255,255,.02) 36%,rgba(6,6,10,.5)),rgb(14,14,20);border:1px solid rgba(255,255,255,.16);box-shadow:inset 0 1px 0 rgba(255,255,255,.35),0 30px 80px rgba(0,0,0,.65)}
.yuni-overlay{background:rgba(0,0,0,.6)}
html.yuni-lite .yuni-note{-webkit-backdrop-filter:none;backdrop-filter:none;background:#15151d}
`);

const POS = ['br', 'bl', 'tr', 'tl'];
const POS_LABEL = { br: 'Bottom right', bl: 'Bottom left', tr: 'Top right', tl: 'Top left' };
const DURS = [3000, 5000, 8000];
const MAX = 1;
let box = null;

const position = () => {
  const p = Y.storage.get('notify:pos', 'br');
  return POS.includes(p) ? p : 'br';
};
const duration = () => { const d = Y.storage.get('notify:ms', 5000); return DURS.includes(d) ? d : 5000; };

function container() {
  if (box && box.isConnected !== false) { box.className = position(); return box; }
  box = document.getElementById('yuni-notes');
  if (!box) { box = el('div', { id: 'yuni-notes' }); document.body.appendChild(box); }
  box.className = position();
  return box;
}

function dismiss(card) {
  if (!card || card.__gone) return;
  card.__gone = true;
  clearTimeout(card.__t);
  card.classList.add('out');
  setTimeout(() => card.remove(), 210);
}

/** show({ id?, title?, body?, image?, kind?, ms?, compact?, actions?: [{label, run}], onclick? }) */
function show(o) {
  const opts = o || {};
  const dedupeId = opts.id || 'toast:' + String(opts.body || opts.title || 'toast');
  const host = container();
  if (opts.id || dedupeId) Array.from(host.children).forEach((c) => { if (c.__id === dedupeId) dismiss(c); });
  const live = Array.from(host.children).filter((c) => !c.__gone);
  while (live.length >= MAX) dismiss(live.shift());

  const ms = opts.ms || (opts.compact ? 2800 : duration());
  const card = el('div', { class: 'yuni-note' + (opts.compact ? ' compact' : ''), role: 'status', onclick: () => { if (opts.onclick) opts.onclick(); dismiss(card); } },
    opts.image ? el('div', { class: 'yuni-note-img', style: { backgroundImage: 'url("' + String(opts.image).replace(/["\\\n]/g, '') + '")' } }) : null,
    el('div', { class: 'yuni-note-main' },
      opts.tag ? el('div', { class: 'yuni-note-tag' }, opts.tag) : null,
      opts.title ? el('div', { class: 'yuni-note-title' }, opts.title) : null,
      opts.body ? el('div', { class: 'yuni-note-body' }, opts.body) : null,
      opts.actions && opts.actions.length
        ? el('div', { class: 'yuni-note-acts' }, opts.actions.map((a) => el('button', { onclick: (e) => { e.stopPropagation(); try { a.run(); } catch (err) { Y.warn('notification action failed', err); } dismiss(card); } }, a.label)))
        : null),
    el('i', { class: 'yuni-note-bar', style: { animationDuration: ms + 'ms' } }));
  card.__id = dedupeId || null;
  card.__t = setTimeout(() => dismiss(card), ms);
  host.appendChild(card);
  return () => dismiss(card);
}

Y.notify = {
  show,
  clear() { if (box) Array.from(box.children).forEach(dismiss); },
  position,
  positionLabel: () => POS_LABEL[position()],
  cyclePosition() { const n = POS[(POS.indexOf(position()) + 1) % POS.length]; Y.storage.set('notify:pos', n); container(); return POS_LABEL[n]; },
  duration,
  cycleDuration() { const n = DURS[(DURS.indexOf(duration()) + 1) % DURS.length]; Y.storage.set('notify:ms', n); return n / 1000 + 's'; },
};

// Every toast in YuniSpot now uses the same card style.
Y.ui.toast = (msg, ms) => show({ body: String(msg), ms: ms || 2800, compact: true });

Y.commands.register({ id: 'yunispot.notify.corner', title: 'Notifications: move to next corner', section: 'Notifications', keywords: ['position', 'toast', 'popup'], run: () => { const l = Y.notify.cyclePosition(); show({ body: 'Notifications will appear ' + l.toLowerCase(), compact: true }); } });
Y.commands.register({ id: 'yunispot.notify.time', title: 'Notifications: change how long they stay', section: 'Notifications', keywords: ['duration', 'seconds', 'toast'], run: () => { const l = Y.notify.cycleDuration(); show({ title: 'Notification length', body: 'Cards now stay for ' + l, tag: 'Notifications' }); } });
