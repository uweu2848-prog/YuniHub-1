const Y = window.YuniSpot;
if (Y.feature('palette')) {
  Y.dom.css('palette', `
.yuni-pal{width:min(620px,92vw);background:var(--background-elevated-base,#1f1f1f);color:var(--text-base,#fff);border-radius:18px;border:1px solid rgba(255,255,255,.08);box-shadow:0 28px 70px rgba(0,0,0,.6);overflow:hidden;animation:yuni-in .14s ease-out;font-size:14px}
.yuni-pal input{width:100%;box-sizing:border-box;padding:18px 20px;background:transparent;border:0;border-bottom:1px solid rgba(255,255,255,.08);color:inherit;font-size:16px;outline:none}
.yuni-pal-list{max-height:52vh;overflow:auto;padding:6px}
.yuni-item{display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:10px;cursor:pointer}
.yuni-item.sel{background:var(--background-elevated-highlight,#2a2a2a)}
.yuni-item-title{flex:1}
.yuni-item-sec{font-size:12px;color:var(--text-subdued,#aaa)}
.yuni-item kbd{font-size:11px;padding:2px 6px;border-radius:6px;background:rgba(255,255,255,.08);color:var(--text-subdued,#aaa)}
.yuni-empty{padding:18px;text-align:center;color:var(--text-subdued,#aaa)}
`);

  let overlay = null, input = null, list = null, results = [], sel = 0;
  const recent = () => Y.storage.get('palette:recent', {});

  function score(query, text) {
    const q = query.toLowerCase(), t = text.toLowerCase();
    if (!q) return 1;
    const idx = t.indexOf(q);
    if (idx >= 0) return 50 + Math.max(0, 50 - idx);
    let ti = 0, s = 0, streak = 0;
    for (const ch of q) {
      const i = t.indexOf(ch, ti);
      if (i < 0) return 0;
      s += i === ti ? 5 + streak : 1;
      streak = i === ti ? streak + 1 : 0;
      ti = i + 1;
    }
    return s;
  }

  function search(query) {
    const rec = recent();
    return Y.commands.list()
      .map((c) => {
        const hay = c.title + ' ' + (c.keywords || []).join(' ') + ' ' + (c.section || '');
        return { c, s: query ? score(query, hay) : 1 + (rec[c.id] || 0) / 1e13 };
      })
      .filter((r) => r.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 50)
      .map((r) => r.c);
  }

  function highlight() {
    Array.from(list.children).forEach((n, i) => n.classList.toggle('sel', i === sel));
    const n = list.children[sel];
    if (n && n.scrollIntoView) n.scrollIntoView({ block: 'nearest' });
  }

  function render() {
    list.textContent = '';
    results.forEach((c, i) => {
      list.appendChild(Y.dom.el('div', {
        class: 'yuni-item' + (i === sel ? ' sel' : ''),
        onclick: () => run(c),
        onmousemove: () => { if (sel !== i) { sel = i; highlight(); } },
      },
      Y.dom.el('span', { class: 'yuni-item-title' }, c.title),
      c.section ? Y.dom.el('span', { class: 'yuni-item-sec' }, c.section) : null,
      c.shortcut ? Y.dom.el('kbd', {}, c.shortcut) : null));
    });
    if (!results.length) list.appendChild(Y.dom.el('div', { class: 'yuni-empty' }, 'No matching commands'));
  }

  function run(c) {
    hide();
    const rec = recent(); rec[c.id] = Date.now(); Y.storage.set('palette:recent', rec);
    setTimeout(() => { try { c.run(); } catch (e) { Y.warn('command failed', c.id, e); Y.ui.toast('Command failed: ' + c.title); } }, 0);
  }

  function show() {
    if (overlay) return;
    input = Y.dom.el('input', { type: 'text', placeholder: 'Type a command\u2026', spellcheck: 'false', 'aria-label': 'Command palette' });
    list = Y.dom.el('div', { class: 'yuni-pal-list', role: 'listbox' });
    overlay = Y.dom.el('div', { class: 'yuni-overlay', onclick: (e) => { if (e.target === overlay) hide(); } },
      Y.dom.el('div', { class: 'yuni-pal' }, input, list));
    document.body.appendChild(overlay);
    results = search(''); sel = 0; render();
    input.addEventListener('input', () => { results = search(input.value.trim()); sel = 0; render(); });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(results.length - 1, sel + 1); highlight(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(0, sel - 1); highlight(); }
      else if (e.key === 'Enter') { e.preventDefault(); if (results[sel]) run(results[sel]); }
      else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); hide(); }
    });
    input.focus();
  }

  function hide() { if (overlay) { overlay.remove(); overlay = null; } }

  Y.palette = { open: show, close: hide, toggle: () => (overlay ? hide() : show()) };
  Y.keys.bind('mod+k', Y.palette.toggle, { allowInInput: true });
  Y.keys.bind('mod+shift+p', Y.palette.toggle, { allowInInput: true });
}
