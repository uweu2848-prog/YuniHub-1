const boot = window.__YUNI_BOOT__ || {};
const Y = (window.YuniSpot = window.YuniSpot || {});
Y.version = boot.version || 'dev';
Y.boot = boot;
Y.feature = (name) => !(boot.features && boot.features[name] === false);
Y.log = (...a) => console.log('%c[YuniSpot]', 'color:#a78bfa;font-weight:bold', ...a);
Y.warn = (...a) => console.warn('[YuniSpot]', ...a);

/* ---------- events ---------- */
const listeners = new Map();
Y.on = (ev, fn) => {
  if (!listeners.has(ev)) listeners.set(ev, new Set());
  listeners.get(ev).add(fn);
  return () => Y.off(ev, fn);
};
Y.off = (ev, fn) => { const s = listeners.get(ev); if (s) s.delete(fn); };
Y.emit = (ev, data) => {
  const s = listeners.get(ev);
  if (!s) return;
  s.forEach((fn) => { try { fn(data); } catch (e) { Y.warn('listener error on "' + ev + '"', e); } });
};

/* ---------- storage (localStorage, namespaced, never throws) ---------- */
const PREFIX = 'yunispot:';
Y.storage = {
  get(key, def) {
    try { const v = localStorage.getItem(PREFIX + key); return v === null ? def : JSON.parse(v); }
    catch { return def; }
  },
  set(key, val) { try { localStorage.setItem(PREFIX + key, JSON.stringify(val)); return true; } catch { return false; } },
  remove(key) { try { localStorage.removeItem(PREFIX + key); } catch { /* ignore */ } },
  /** Names of every YuniSpot key (without the namespace prefix). */
  keys() {
    try {
      const out = [];
      for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith(PREFIX)) out.push(k.slice(PREFIX.length)); }
      return out;
    } catch { return []; }
  },
};
Y.storageFor = (id) => ({
  get: (k, d) => Y.storage.get('ext:' + id + ':' + k, d),
  set: (k, v) => Y.storage.set('ext:' + id + ':' + k, v),
  remove: (k) => Y.storage.remove('ext:' + id + ':' + k),
});

/* ---------- DOM helpers ---------- */
Y.dom = {
  el(tag, props, ...kids) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') e.className = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
      else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2).toLowerCase(), v);
      else e.setAttribute(k, v === true ? '' : String(v));
    }
    for (const kid of kids.flat()) {
      if (kid == null || kid === false) continue;
      e.append(typeof kid === 'object' && kid.nodeType ? kid : document.createTextNode(String(kid)));
    }
    return e;
  },
  waitFor(selector, timeout = 15000) {
    return new Promise((resolve, reject) => {
      const found = document.querySelector(selector);
      if (found) return resolve(found);
      const mo = new MutationObserver(() => {
        const n = document.querySelector(selector);
        if (n) { mo.disconnect(); clearTimeout(t); resolve(n); }
      });
      mo.observe(document.documentElement, { childList: true, subtree: true });
      const t = setTimeout(() => { mo.disconnect(); reject(new Error('timeout waiting for ' + selector)); }, timeout);
    });
  },
  css(id, text) {
    let s = document.getElementById('yuni-css-' + id);
    if (!s) { s = document.createElement('style'); s.id = 'yuni-css-' + id; document.head.appendChild(s); }
    s.textContent = text;
    return s;
  },
};

/* ---------- toast + modal ---------- */
Y.dom.css('core', `
#yuni-toasts{position:fixed;right:20px;bottom:104px;display:flex;flex-direction:column;gap:8px;z-index:2147483000;pointer-events:none}
.yuni-toast{background:var(--background-elevated-highlight,#2a2a2a);color:var(--text-base,#fff);padding:10px 16px;border-radius:12px;font-size:13px;border:1px solid rgba(255,255,255,.08);box-shadow:0 10px 30px rgba(0,0,0,.45);animation:yuni-in .16s ease-out}
.yuni-overlay{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:2147482999;display:flex;align-items:flex-start;justify-content:center;padding-top:12vh}
.yuni-modal{width:min(560px,92vw);max-height:76vh;overflow:auto;background:var(--background-elevated-base,#1f1f1f);color:var(--text-base,#fff);border-radius:18px;border:1px solid rgba(255,255,255,.08);box-shadow:0 28px 70px rgba(0,0,0,.6);animation:yuni-in .16s ease-out;font-size:14px}
.yuni-modal-head{display:flex;align-items:center;justify-content:space-between;padding:16px 20px 8px}
.yuni-modal-head h2{margin:0;font-size:18px;font-weight:700}
.yuni-x{background:none;border:0;color:var(--text-subdued,#aaa);font-size:24px;line-height:1;cursor:pointer;padding:0 4px}
.yuni-x:hover{color:var(--text-base,#fff)}
.yuni-modal-body{padding:8px 20px 20px}
.yuni-confirm-message{margin:0;color:var(--text-subdued,#b4b4c0);line-height:1.6}
.yuni-confirm-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:18px}
@keyframes yuni-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.yuni-toast,.yuni-modal{animation:none}}
`);

Y.ui = {
  toast(msg, ms = 2600) {
    if (Y.notify && typeof Y.notify.show === 'function') {
      Y.notify.show({
        id: 'toast:' + String(msg || 'toast'),
        body: String(msg),
        ms: ms || 2600,
        compact: true,
      });
      return;
    }
    let box = document.getElementById('yuni-toasts');
    if (!box) { box = Y.dom.el('div', { id: 'yuni-toasts' }); document.body.appendChild(box); }
    const t = Y.dom.el('div', { class: 'yuni-toast' }, msg);
    box.appendChild(t);
    setTimeout(() => t.remove(), ms);
  },
  modal(title, content, className) {
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
    const close = () => { overlay.remove(); document.removeEventListener('keydown', onKey, true); };
    const overlay = Y.dom.el('div', { class: 'yuni-overlay', onclick: (e) => { if (e.target === overlay) close(); } },
      Y.dom.el('div', { class: 'yuni-modal' + (className ? ' ' + className : ''), role: 'dialog', 'aria-label': typeof title === 'string' ? title : 'YuniSpot' },
        Y.dom.el('div', { class: 'yuni-modal-head' },
          Y.dom.el('h2', {}, title),
          Y.dom.el('button', { class: 'yuni-x', 'aria-label': 'Close', onclick: close }, '\u00d7')),
        Y.dom.el('div', { class: 'yuni-modal-body' }, content)));
    document.body.appendChild(overlay);
    document.addEventListener('keydown', onKey, true);
    return close;
  },
  confirm(title, message, labels = {}) {
    return new Promise((resolve) => {
      let finished = false;
      let overlay;
      const finish = (accepted) => {
        if (finished) return;
        finished = true;
        document.removeEventListener('keydown', onKey, true);
        overlay.remove();
        resolve(accepted);
      };
      const onKey = (e) => {
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); finish(false); }
      };
      const cancel = Y.dom.el('button', { class: 'yuni-btn ghost sm', onclick: () => finish(false) }, labels.cancel || 'Cancel');
      const accept = Y.dom.el('button', { class: 'yuni-btn sm', onclick: () => finish(true) }, labels.confirm || 'Continue');
      overlay = Y.dom.el('div', { class: 'yuni-overlay', role: 'presentation', onclick: (e) => { if (e.target === overlay) finish(false); } },
        Y.dom.el('div', { class: 'yuni-modal', role: 'alertdialog', 'aria-modal': 'true', 'aria-label': String(title) },
          Y.dom.el('div', { class: 'yuni-modal-head' },
            Y.dom.el('h2', {}, title),
            Y.dom.el('button', { class: 'yuni-x', 'aria-label': 'Cancel', onclick: () => finish(false) }, '\u00d7')),
          Y.dom.el('div', { class: 'yuni-modal-body' },
            Y.dom.el('p', { class: 'yuni-confirm-message' }, message),
            Y.dom.el('div', { class: 'yuni-confirm-actions' }, cancel, accept))));
      document.body.appendChild(overlay);
      document.addEventListener('keydown', onKey, true);
      cancel.focus();
    });
  },
};

/* ---------- command registry ---------- */
const commands = new Map();
Y.commands = {
  register(cmd) {
    if (!cmd || !cmd.id || !cmd.title || typeof cmd.run !== 'function') throw new Error('command needs id, title and run()');
    commands.set(cmd.id, cmd);
    return () => commands.delete(cmd.id);
  },
  list: () => [...commands.values()],
  run(id, ...args) {
    const c = commands.get(id);
    if (!c) throw new Error('unknown command ' + id);
    return c.run(...args);
  },
};

/* ---------- keyboard shortcuts ---------- */
const bindings = [];
const MODS = ['mod', 'ctrl', 'meta', 'alt', 'shift'];
Y.keys = {
  bind(combo, fn, opts) {
    const parts = combo.toLowerCase().split('+').map((s) => s.trim());
    const b = {
      key: parts.find((p) => !MODS.includes(p)),
      mod: parts.includes('mod'), ctrl: parts.includes('ctrl'), meta: parts.includes('meta'),
      alt: parts.includes('alt'), shift: parts.includes('shift'),
      allowInInput: !!(opts && opts.allowInInput), fn,
    };
    bindings.push(b);
    return () => { const i = bindings.indexOf(b); if (i >= 0) bindings.splice(i, 1); };
  },
};
document.addEventListener('keydown', (e) => {
  const k = (e.key || '').toLowerCase();
  const t = e.target || {};
  const typing = /^(input|textarea|select)$/i.test(t.tagName || '') || t.isContentEditable;
  for (const b of bindings) {
    if (b.key !== k) continue;
    const modOk = b.mod ? (e.ctrlKey || e.metaKey) : (e.ctrlKey === b.ctrl && e.metaKey === b.meta);
    if (!modOk || e.altKey !== b.alt || e.shiftKey !== b.shift) continue;
    if (typing && !b.allowInInput && !(b.mod || b.ctrl || b.meta || b.alt)) continue;
    e.preventDefault();
    e.stopPropagation();
    try { b.fn(e); } catch (err) { Y.warn('shortcut error', err); }
    return;
  }
}, true);
