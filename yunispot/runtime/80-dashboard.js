const Y = window.YuniSpot;
const el = Y.dom.el;

Y.dom.css('dashboard', `
.yuni-dash{position:fixed;inset:0;z-index:2147482500;display:grid;grid-template-columns:216px minmax(0,1fr);overflow:hidden;background:radial-gradient(1000px 680px at 100% 0%,rgba(var(--yuni-accent-rgb,255,43,43),.14),transparent 64%),linear-gradient(135deg,#0b0c11,#08090d 62%,#111016);color:var(--text-base,#f5f5f7);font-family:var(--yuni-font,ui-monospace,Consolas,monospace);font-size:13px;animation:yuni-dash-in .3s cubic-bezier(.2,.75,.25,1) both}
.yuni-dash-rail{position:relative;display:flex;flex-direction:column;gap:24px;min-width:0;padding:20px 12px 14px;background:rgba(7,8,12,.76);border-right:1px solid rgba(255,255,255,.08);box-shadow:inset -1px 0 0 rgba(var(--yuni-accent-rgb,255,43,43),.08)}
.yuni-dash-brand{display:flex;align-items:center;gap:10px;padding:0 7px 18px;border-bottom:1px solid rgba(255,255,255,.07)}
.yuni-dash-logo{display:grid;place-items:center;width:34px;height:34px;border-radius:10px;background:linear-gradient(145deg,var(--yuni-btn-top,#ff3a3a),var(--yuni-btn-bottom,#b90000));color:#fff;font-weight:900;box-shadow:0 5px 16px rgba(var(--yuni-accent-rgb,255,43,43),.32)}
.yuni-dash-brand-copy{display:flex;flex-direction:column;gap:2px;min-width:0}
.yuni-dash-brand-copy b{font-size:13px}.yuni-dash-brand-copy small{font-size:9px;color:#8d8d9b}
.yuni-dash-rail-label{padding:0 10px;color:#777986;font-size:9px;font-weight:700}
.yuni-dash-nav{display:flex;flex-direction:column;gap:4px;margin-top:-18px}
.yuni-dash-nav-item{display:flex;align-items:center;gap:10px;width:100%;min-height:38px;padding:8px 10px;border:1px solid transparent;border-radius:10px;background:transparent;color:#adb0ba;text-align:left;font:inherit;font-size:12px;cursor:pointer;transition:background .16s,border-color .16s,color .16s}
.yuni-dash-nav-item:hover{background:rgba(255,255,255,.05);color:#fff}
.yuni-dash-nav-item.active{background:rgba(var(--yuni-accent-rgb,255,43,43),.12);border-color:rgba(var(--yuni-accent-rgb,255,43,43),.32);color:#fff}
.yuni-dash-nav-icon{display:grid;place-items:center;width:20px;height:20px;flex:none;color:var(--yuni-accent,#ff4545);font-size:14px}
.yuni-dash-rail-bottom{display:flex;flex-direction:column;gap:12px;margin-top:auto;padding:12px 8px 2px;border-top:1px solid rgba(255,255,255,.07)}
.yuni-dash-live{display:flex;align-items:center;gap:8px;color:#8d909c;font-size:9px}
.yuni-dash-live i{width:6px;height:6px;border-radius:50%;background:#4ade80;box-shadow:0 0 10px rgba(74,222,128,.55)}
.yuni-dash-scroll{min-width:0;min-height:0;overflow:auto;padding:28px 36px 36px;scroll-behavior:smooth}
.yuni-dash-in{width:min(1360px,100%);margin:0 auto}
.yuni-hero{display:flex;flex-direction:column;gap:16px;padding:24px 26px;border-radius:18px;border:1px solid rgba(255,255,255,.09);background:linear-gradient(135deg,rgba(255,255,255,.065),rgba(255,255,255,.018) 58%),rgba(16,17,23,.68);box-shadow:inset 0 1px 0 rgba(255,255,255,.08),0 16px 40px rgba(0,0,0,.34)}
.yuni-hero-top{display:flex;gap:20px;justify-content:space-between;align-items:flex-start;flex-wrap:wrap}
.yuni-hero h1{margin:0;font-size:34px;font-weight:800;letter-spacing:0;line-height:1.15;max-width:720px}
.yuni-red{color:var(--yuni-accent,var(--yuni-accent,#ff2b2b))}
.yuni-sub{margin:4px 0 0;color:#a6a6b3;max-width:520px;line-height:1.5}
.yuni-chips{display:flex;gap:10px;flex-wrap:wrap}
.yuni-chip{padding:9px 13px;border-radius:12px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.04);min-width:92px}
.yuni-chip small{display:block;font-size:9px;letter-spacing:.2em;text-transform:uppercase;color:#8d8d9b;margin-bottom:3px}
.yuni-chip b{font-size:13px;font-weight:700}
.yuni-chip.hot{border-color:rgba(var(--yuni-accent-rgb,255,43,43),.55);box-shadow:0 0 22px rgba(var(--yuni-accent-rgb,255,43,43),.2)}
.yuni-next{display:flex;align-items:center;gap:12px;margin-top:16px;padding:10px 12px 10px 14px;border-radius:14px;border:1px solid rgba(255,255,255,.07);background:rgba(0,0,0,.28)}
.yuni-tag{font-size:10px;letter-spacing:.14em;padding:4px 9px;border-radius:8px;background:rgba(255,255,255,.07);flex:none}
.yuni-next-t{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600}
.yuni-btn{border:0;border-radius:999px;padding:9px 18px;font:inherit;font-weight:700;color:#fff;cursor:pointer;background:linear-gradient(180deg,var(--yuni-btn-top,#ff3a3a),var(--yuni-btn-bottom,#d10000));box-shadow:0 6px 20px rgba(var(--yuni-accent-rgb,255,43,43),.35),inset 0 1px 0 rgba(255,255,255,.3);transition:filter .12s}
.yuni-btn:hover{filter:brightness(1.12)}
.yuni-btn.ghost{background:rgba(255,255,255,.07);box-shadow:none;color:#d8d8e2;font-weight:600;border:1px solid rgba(255,255,255,.06)}
.yuni-btn.sm{padding:7px 13px;font-size:12px}
.yuni-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(248px,1fr));gap:12px;margin-top:14px}
.yuni-card{display:flex;flex-direction:column;gap:10px;padding:15px;border-radius:14px;border:1px solid rgba(255,255,255,.085);background:linear-gradient(145deg,rgba(255,255,255,.045),rgba(255,255,255,.018)),rgba(14,15,20,.7);transition:transform .2s,border-color .2s,box-shadow .2s;animation:yuni-dash-card-in .42s cubic-bezier(.2,.75,.25,1) both}
.yuni-card:nth-child(2){animation-delay:.035s}.yuni-card:nth-child(3){animation-delay:.07s}.yuni-card:nth-child(4){animation-delay:.105s}.yuni-card:nth-child(5){animation-delay:.14s}.yuni-card:nth-child(6){animation-delay:.175s}
.yuni-card:hover{transform:translateY(-2px);border-color:rgba(var(--yuni-accent-rgb,255,43,43),.4);box-shadow:0 12px 30px rgba(0,0,0,.32),0 0 22px rgba(var(--yuni-accent-rgb,255,43,43),.1)}
.yuni-card-head{display:flex;align-items:center;gap:12px}
.yuni-ico{width:42px;height:42px;border-radius:13px;display:grid;place-items:center;flex:none;font-size:19px;color:var(--yuni-accent,#ff5a5a);background:rgba(var(--yuni-accent-rgb,255,43,43),.14);border:1px solid rgba(var(--yuni-accent-rgb,255,43,43),.35)}
.yuni-card-title{flex:1;font-weight:800;font-size:14px}
.yuni-badge{font-size:10px;padding:3px 9px;border-radius:999px;border:1px solid rgba(74,222,128,.5);color:#4ade80;background:rgba(74,222,128,.1)}
.yuni-badge.off{border-color:rgba(255,255,255,.15);color:#8d8d9b;background:rgba(255,255,255,.04)}
.yuni-card-desc{margin:0;color:#a6a6b3;line-height:1.55;min-height:56px}
.yuni-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:auto}
.yuni-sec{display:flex;align-items:baseline;gap:12px;margin:24px 4px 10px;scroll-margin-top:18px}
.yuni-sec h3{margin:0;font-size:17px}
.yuni-sec span{color:#8d8d9b;font-size:11px}
.yuni-list{display:flex;flex-direction:column;gap:8px}
.yuni-li{display:flex;justify-content:space-between;gap:12px;padding:11px 14px;border-radius:14px;border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.03)}
.yuni-li span:last-child{color:#8d8d9b;flex:none}
.yuni-li span:first-child{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
@keyframes yuni-dash-in{from{opacity:0}to{opacity:1}}
@keyframes yuni-dash-card-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@media(max-width:760px){.yuni-dash{grid-template-columns:minmax(0,1fr);grid-template-rows:62px minmax(0,1fr)}.yuni-dash-rail{grid-row:1;flex-direction:row;align-items:center;gap:10px;padding:8px 12px;border-right:0;border-bottom:1px solid rgba(255,255,255,.08)}.yuni-dash-brand{padding:0;border:0}.yuni-dash-brand-copy,.yuni-dash-rail-label,.yuni-dash-rail-bottom{display:none}.yuni-dash-nav{flex:1;flex-direction:row;gap:4px;overflow-x:auto;margin:0}.yuni-dash-nav-item{width:auto;min-width:38px;justify-content:center;padding:7px}.yuni-dash-nav-item span:last-child{display:none}.yuni-dash-scroll{grid-row:2;padding:16px}.yuni-hero{padding:18px}.yuni-hero h1{font-size:26px}.yuni-hero-top{gap:14px}.yuni-chips{width:100%;gap:7px}.yuni-chip{flex:1;min-width:70px;padding:8px}.yuni-grid{grid-template-columns:repeat(auto-fill,minmax(220px,1fr))}}
@media(prefers-reduced-motion:reduce){.yuni-dash,.yuni-card{animation:none;transition:none}.yuni-card:hover{transform:none}}
`);

let root = null, timer = null, refs = {}, currentPage = 'home';
const fmt = (s) => { const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return h ? h + 'h ' + m + 'm' : m + 'm'; };
const greet = () => { const h = new Date().getHours(); return h < 5 ? 'Good night' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; };

function userName() {
  const saved = Y.storage.get('name', null);
  if (saved) return saved;
  for (const sel of ['[data-testid="user-widget-name"]', '[data-testid="user-widget-link"]']) {
    const n = document.querySelector(sel);
    const t = n && (n.getAttribute('aria-label') || n.textContent);
    if (t && t.trim()) return t.trim();
  }
  return 'there';
}

const chip = (label, key, hot) => { const v = el('b', {}, '\u2013'); refs[key] = v; return el('div', { class: 'yuni-chip' + (hot ? ' hot' : '') }, el('small', {}, label), v); };
const btn = (label, fn, o) => el('button', { class: 'yuni-btn' + (o && o.ghost ? ' ghost' : '') + ' sm', onclick: fn }, label);
const card = (icon, title, badge, desc, actions) => el('div', { class: 'yuni-card' },
  el('div', { class: 'yuni-card-head' }, el('div', { class: 'yuni-ico' }, icon), el('div', { class: 'yuni-card-title' }, title), el('span', { class: 'yuni-badge' + (badge === 'off' ? ' off' : '') }, badge)),
  el('p', { class: 'yuni-card-desc' }, desc),
  el('div', { class: 'yuni-actions' }, actions));

function tick() {
  const now = new Date();
  refs.date.textContent = now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  refs.time.textContent = now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const t = Y.stats ? Y.stats.today() : { seconds: 0, plays: 0 };
  refs.today.textContent = fmt(t.seconds);
  refs.plays.textContent = String(t.plays);
  const cur = Y.player.current();
  refs.now.textContent = cur ? cur.title + (cur.artist ? ' \u2014 ' + cur.artist : '') : 'Nothing playing right now';
  refs.pp.textContent = Y.player.isPlaying() ? 'Pause' : 'Play';
}

function build() {
  refs = {};
  const ext = Y.extensions.list();
  const statsOn = !!Y.stats, sleepOn = !!Y.sleep;
  const appearBtn = (label, fn) => { const b = btn(label(), () => { fn(); b.textContent = label(); }, { ghost: true }); return b; };

  const recent = Y.stats ? Y.stats.recent().slice(0, 8) : [];
  const jump = (id) => { const target = root && root.querySelector('#yuni-dash-' + id); if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  const navItem = (icon, label, run, page) => el('button', { class: 'yuni-dash-nav-item' + (currentPage === page ? ' active' : ''), type: 'button', 'data-yuni-page': page, onclick: run },
    el('span', { class: 'yuni-dash-nav-icon', 'aria-hidden': 'true' }, icon), el('span', {}, label));
  const rail = el('aside', { class: 'yuni-dash-rail', 'aria-label': 'YuniSpot navigation' },
    el('div', { class: 'yuni-dash-brand' }, el('span', { class: 'yuni-dash-logo' }, 'Y'), el('span', { class: 'yuni-dash-brand-copy' }, el('b', {}, 'YuniSpot'), el('small', {}, 'SPOTIFY COMPANION'))),
    el('span', { class: 'yuni-dash-rail-label' }, 'WORKSPACE'),
    el('nav', { class: 'yuni-dash-nav' },
      navItem('\u2302', 'Home', () => open('home'), 'home'),
      navItem('\u25a6', 'Marketplace', () => open('marketplace'), 'marketplace'),
      navItem('\u2692', 'Tools', () => { open('home'); setTimeout(() => jump('tools'), 60); }, 'home'),
      navItem('\u25f7', 'Recent', () => { open('home'); setTimeout(() => jump('recent'), 60); }, 'home'),
      navItem('\u2661', 'Library', () => { close(); setTimeout(() => Y.nav && Y.nav.hub('all'), 60); }, 'library')),
    el('div', { class: 'yuni-dash-rail-bottom' },
      el('span', { class: 'yuni-dash-live' }, el('i'), 'SPOTIFY CONNECTED')));

  return el('div', { class: 'yuni-dash', onclick: (e) => { if (e.target === root) close(); } },
    rail,
    el('main', { class: 'yuni-dash-scroll' },
      el('div', { class: 'yuni-dash-in' },
      el('div', { class: 'yuni-hero', id: 'yuni-dash-overview' },
        el('div', { class: 'yuni-hero-top' },
          el('div', {},
            el('h1', {}, greet() + ', ' + userName() + '. Welcome to ', el('span', { class: 'yuni-red' }, 'YuniSpot'), '.'),
            el('p', { class: 'yuni-sub' }, 'Your music, stats and tools gathered in one place.')),
          el('div', { class: 'yuni-chips' }, chip('Now', 'date'), chip('Time', 'time', true), chip('Today', 'today'), chip('Plays', 'plays'))),
        el('div', { class: 'yuni-next' },
          el('span', { class: 'yuni-tag' }, 'NOW PLAYING'),
          (refs.now = el('span', { class: 'yuni-next-t' }, '')),
          (refs.pp = el('button', { class: 'yuni-btn sm', onclick: () => { Y.player.toggle(); setTimeout(tick, 150); } }, 'Play')),
          btn('Next', () => { Y.player.next(); setTimeout(tick, 400); }, { ghost: true }))),

      el('div', { class: 'yuni-sec', id: 'yuni-dash-tools' }, el('h3', {}, 'Tools'), el('span', {}, 'Everything YuniSpot adds to Spotify')),
      el('div', { class: 'yuni-grid' },
        card('\u25d4', 'Listening Stats', statsOn ? 'available' : 'off', 'Total time, last 7 days, top tracks and artists. Stored only on this device.', [statsOn ? btn('Open', () => Y.stats.show()) : btn('Disabled', () => {}, { ghost: true })]),
        card('\u263e', 'Sleep Timer', sleepOn ? 'available' : 'off', 'Pause playback automatically after a set time, or when the current track ends.',
          sleepOn ? [btn('15m', () => Y.sleep.start(15)), btn('30m', () => Y.sleep.start(30)), btn('60m', () => Y.sleep.start(60)), btn('Cancel', () => Y.sleep.cancel(), { ghost: true })] : [btn('Disabled', () => {}, { ghost: true })]),
        card('\u2318', 'Command Palette', Y.palette ? 'available' : 'off', 'Fuzzy-search every action: playback, navigation, timers, extensions. Shortcut: Ctrl/Cmd + K.', [Y.palette ? btn('Open', () => { close(); Y.palette.open(); }) : btn('Disabled', () => {}, { ghost: true })]),
        card('\u29c9', 'Extensions', ext.loaded.length ? 'available' : 'off', ext.loaded.length ? ext.loaded.map((e) => e.name).join(', ') : 'No extensions enabled. Add them with: yunispot ext enable <name>', []),
        card('\u25d0', 'Appearance', 'available', 'Glass effects look best, but you can switch blur off for maximum speed, or swap the monospace font for sans.',
          [appearBtn(() => (Y.appearance.state().lite ? 'Glass: off' : 'Glass: on'), () => Y.appearance.toggleGlass()), appearBtn(() => (Y.appearance.state().sans ? 'Font: sans' : 'Font: mono'), () => Y.appearance.toggleMono())]),
        (() => {
          if (!Y.stats || !Y.stats.goal) return null;
          const g = Y.stats.goal, t = Y.stats.today();
          const mins = Math.floor(t.seconds / 60), goal = g.minutes(), st = g.streak();
          return card('\u25ce', 'Daily Goal', mins >= goal ? 'done' : Math.round((mins / goal) * 100) + '%', mins + ' of ' + goal + ' minutes listened today. ' + (st ? 'Streak: ' + st + (st === 1 ? ' day.' : ' days.') : 'Hit your goal to start a streak.'), [btn('Change goal', () => { g.cycle(); close(); Y.dashboard.open(); }, { ghost: true })]);
        })(),
        card('\u25b6', 'Spotify Player', 'active', 'Spotify keeps its controls for playback, seeking, queue, and volume. YuniSpot leaves those controls untouched.', [btn('Back to overview', () => jump('overview'), { ghost: true })]),
        card('\u2605', 'Playlists & Artists', Y.nav ? 'available' : 'off', 'Jump to your playlists, artist profiles and albums, or paste any Spotify link. Shortcut: Ctrl/Cmd + Shift + J.', [Y.nav ? btn('Browse', () => { close(); Y.nav.hub('all'); }) : btn('Disabled', () => {}, { ghost: true }), Y.nav ? btn('Artist', () => { close(); Y.commands.run('yunispot.goto.artist'); }, { ghost: true }) : null]),
        card('\u23f1', 'Focus Timer', Y.focusTimer ? 'available' : 'off', 'Pomodoro-style work blocks. Music pauses when it is time for a break.', Y.focusTimer ? [btn('25m', () => Y.focusTimer.start(25, 5)), btn('50m', () => Y.focusTimer.start(50, 10)), btn('Stop', () => Y.focusTimer.stop(), { ghost: true })] : [btn('Disabled', () => {}, { ghost: true })]),
        card('\u271a', 'Diagnostics', 'available', 'Check which Spotify selectors still work after an update, and which extensions loaded.', [btn('Run', () => Y.commands.run('yunispot.diagnostics'))])),

      Y.nav && Y.nav.pins().length ? el('div', { class: 'yuni-sec' }, el('h3', {}, 'Pinned'), el('span', {}, 'Your shortcuts. Pin from Playlists & Artists')) : null,
      Y.nav && Y.nav.pins().length ? el('div', { class: 'yuni-list' }, Y.nav.pins().slice(0, 8).map((p) => el('div', { class: 'yuni-li', style: { cursor: 'pointer' }, onclick: () => { close(); setTimeout(() => Y.navigate(p.path), 60); } }, el('span', {}, p.name), el('span', {}, p.kind)))) : null,
      el('div', { class: 'yuni-sec', id: 'yuni-dash-recent' }, el('h3', {}, 'Recently played'), el('span', {}, 'Tracked while YuniSpot is running')),
      el('div', { class: 'yuni-list' },
        recent.length
          ? recent.map((r) => el('div', { class: 'yuni-li' }, el('span', {}, r.title + (r.artist ? ' \u2014 ' + r.artist : '')), el('span', {}, new Date(r.at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }))))
          : el('div', { class: 'yuni-li' }, el('span', {}, 'Nothing yet. Play something!'), el('span', {}, ''))))));
}

function onKey(e) {
  if (e.key === 'Escape' && !document.querySelector('.yuni-overlay')) { e.stopPropagation(); close(); }
}
function setPage(page) {
  if (!root) return;
  currentPage = page === 'marketplace' ? 'marketplace' : 'home';
  const scroll = root.querySelector('.yuni-dash-scroll');
  if (!root.__homeContent) root.__homeContent = scroll.firstElementChild;
  scroll.replaceChildren(currentPage === 'marketplace' && Y.store ? Y.store.marketplace() : root.__homeContent);
  root.querySelectorAll('[data-yuni-page]').forEach((button) => button.classList.toggle('active', button.dataset.yuniPage === currentPage));
}
function open(page = 'home') {
  if (root) { setPage(page); return; }
  currentPage = 'home';
  root = build();
  document.body.appendChild(root);
  document.addEventListener('keydown', onKey, true);
  timer = setInterval(tick, 1000);
  setPage(page);
  tick();
}
function close() {
  if (!root) return;
  clearInterval(timer); timer = null;
  document.removeEventListener('keydown', onKey, true);
  root.remove(); root = null;
}

Y.dashboard = { open, close, toggle: () => (root ? close() : open()) };
Y.commands.register({ id: 'yunispot.dashboard', title: 'Open YuniSpot dashboard', section: 'YuniSpot', keywords: ['home', 'hub', 'overview'], shortcut: 'Ctrl+Shift+H', run: () => Y.dashboard.toggle() });
Y.keys.bind('mod+shift+h', () => Y.dashboard.toggle(), { allowInInput: true });
