const Y = window.YuniSpot;
const el = Y.dom.el;

/* Full-screen "Now Playing" view: big cover art with a glass reflection on a colour-matched backdrop.
  Esc closes it, Space plays/pauses. Playback stays with Spotify's native player. */
Y.dom.css('np', `
.yuni-np{position:fixed;inset:0;z-index:2147481500;color:#fff;font-family:var(--yuni-font,ui-monospace,Consolas,monospace);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:clamp(10px,2.4vh,22px);overflow:hidden;background:#050507;animation:yuni-in .22s ease-out}
.yuni-np-bg{position:absolute;inset:-12%;background:center/cover no-repeat;filter:blur(64px) saturate(1.5) brightness(.55);transform:scale(1.15);transition:background-image .5s}
.yuni-np-glow{position:absolute;inset:0;background:radial-gradient(70% 60% at 50% 100%,rgba(var(--yuni-amb,var(--yuni-accent-rgb,255,43,43)),.35),transparent 70%),linear-gradient(180deg,rgba(0,0,0,.25),rgba(0,0,0,.7))}
.yuni-np>*{position:relative}
.yuni-np-top{position:absolute;top:18px;left:22px;right:22px;display:flex;align-items:center;justify-content:space-between}
.yuni-np-tag{font-size:10px;letter-spacing:.24em;color:rgba(255,255,255,.7)}
.yuni-np-clock{font-size:13px;color:rgba(255,255,255,.7);font-variant-numeric:tabular-nums;margin-right:12px}
.yuni-np-cover{width:min(44vh,400px);height:min(44vh,400px);border-radius:22px;background:rgba(255,255,255,.06) center/cover no-repeat;border:1px solid rgba(255,255,255,.28);box-shadow:inset 0 1px 0 rgba(255,255,255,.5),0 30px 80px rgba(0,0,0,.65),0 0 90px rgba(var(--yuni-amb,var(--yuni-accent-rgb,255,43,43)),.35);-webkit-box-reflect:below 8px linear-gradient(transparent 62%,rgba(255,255,255,.22));overflow:hidden}
.yuni-np-cover::after{content:"";position:absolute;inset:0;background:linear-gradient(155deg,rgba(255,255,255,.28),rgba(255,255,255,.05) 38%,transparent 60%);pointer-events:none}
.yuni-np-meta{text-align:center;max-width:min(80vw,640px);margin-top:clamp(6px,2.4vh,26px)}
.yuni-np-title{font-weight:800;font-size:clamp(20px,3.6vh,32px);letter-spacing:-.02em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.yuni-np-artist{margin-top:4px;color:rgba(255,255,255,.72);font-size:clamp(13px,2vh,17px);cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.yuni-np-artist:hover{text-decoration:underline}
.yuni-np-bar{display:flex;align-items:center;gap:12px;width:min(78vw,560px)}
.yuni-np-bar span{width:40px;font-size:11px;color:rgba(255,255,255,.65);font-variant-numeric:tabular-nums}
.yuni-np-bar span:last-child{text-align:right}
.yuni-np-ctl{display:flex;align-items:center;gap:clamp(14px,2.4vw,26px)}
.yuni-np .yuni-pp{width:62px;height:62px;border:0;background:linear-gradient(180deg,var(--yuni-btn-top,#ff3a3a),var(--yuni-btn-bottom,#d10000));box-shadow:0 10px 30px rgba(var(--yuni-accent-rgb,255,43,43),.6),inset 0 1px 0 rgba(255,255,255,.55)}
.yuni-np .yuni-pp::after{width:42%;height:42%}
.yuni-np .yuni-ib{width:38px;height:38px}
.yuni-np .yuni-pp:hover{background:linear-gradient(180deg,var(--yuni-btn-top,#ff3a3a),var(--yuni-btn-bottom,#d10000));filter:brightness(1.12)}
@media (max-height:640px){.yuni-np-cover{-webkit-box-reflect:none}}
@media (prefers-reduced-motion:reduce){.yuni-np{animation:none}.yuni-np-bg{transition:none}}
html.yuni-lite .yuni-np-bg{filter:brightness(.4)}
`);

let root = null, R = {}, tick = null, onKey = null, lastKey = null, lastCover = null;
const fmt = (s) => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');

function update() {
  if (!root) return;
  const c = Y.player.current();
  const key = c ? c.key : '';
  if (key !== lastKey) { lastKey = key; R.title.textContent = c ? c.title : 'Nothing playing'; R.artist.textContent = c ? c.artist : ''; }
  const cover = c ? Y.player.cover() : '';
  if (cover !== lastCover) {
    lastCover = cover;
    const css = cover ? 'url("' + cover.replace(/["\\\n]/g, '') + '")' : 'none';
    R.cover.style.backgroundImage = css; R.bg.style.backgroundImage = css;
    if (Y.ambient) Y.ambient.color(cover).then((col) => { if (root && lastCover === cover) Y.setVar(root, '--yuni-amb', col ? col.join(',') : ''); });
  }
  R.pp.setIcon(Y.player.isPlaying() ? 'pause' : 'play');
  const liked = Y.player.liked();
  R.like.setIcon(liked ? 'heart' : 'heartO'); R.like.classList.toggle('on', liked); R.like.setAttribute('aria-pressed', String(liked));
  R.shuffle.classList.toggle('on', Y.player.shuffled());
  const rm = Y.player.repeatMode();
  R.repeat.classList.toggle('on', rm !== 'off'); R.repeat.classList.toggle('one', rm === 'one');
  const d = Y.player.duration(), p = Y.player.position();
  R.seekS.set(d ? p / d : 0);
  R.pos.textContent = fmt(p); R.dur.textContent = fmt(d);
  R.clock.textContent = new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function open() {
  if (root) return;
  R = {};
  const ib = (n, t, f, c) => Y.iconBtn(n, t, f, c);
  const later = () => setTimeout(update, 250);
  R.bg = el('div', { class: 'yuni-np-bg' });
  R.cover = el('div', { class: 'yuni-np-cover', title: 'Open track page', onclick: () => { close(); Y.commands.run('yunispot.goto.track'); } });
  R.title = el('div', { class: 'yuni-np-title' }, 'Nothing playing');
  R.artist = el('div', { class: 'yuni-np-artist', title: 'Open artist profile', onclick: () => { close(); Y.commands.run('yunispot.goto.artist'); } }, '');
  R.pos = el('span', {}, '0:00'); R.dur = el('span', {}, '0:00');
  R.seekS = Y.slider((f) => { const d = Y.player.duration(); if (d && !Y.player.seek(f * d)) Y.ui.toast('Seeking is not available on this Spotify version'); }, null, { label: 'Seek', step: 0.02 });
  R.shuffle = ib('shuffle', 'Shuffle', () => { Y.player.shuffle(); later(); }, 'bare');
  R.prev = ib('prev', 'Previous', () => { Y.player.prev(); setTimeout(update, 400); }, 'bare');
  R.pp = ib('play', 'Play / pause', () => { Y.player.toggle(); later(); }, 'yuni-pp');
  R.next = ib('next', 'Next', () => { Y.player.next(); setTimeout(update, 400); }, 'bare');
  R.repeat = ib('repeat', 'Repeat', () => { Y.player.repeat(); later(); }, 'bare');
  R.like = ib('heartO', 'Like', () => { if (!Y.player.like()) Y.ui.toast('Like button not found on this Spotify version'); setTimeout(update, 300); }, 'bare');
  R.clock = el('span', { class: 'yuni-np-clock' }, '');
  root = el('div', { class: 'yuni-np', role: 'dialog', 'aria-label': 'Now playing' },
    R.bg, el('div', { class: 'yuni-np-glow' }),
    el('div', { class: 'yuni-np-top' }, el('span', { class: 'yuni-np-tag' }, 'NOW PLAYING'), el('span', { style: { display: 'flex', alignItems: 'center' } }, R.clock, ib('close', 'Close (Esc)', close, 'bare'))),
    R.cover,
    el('div', { class: 'yuni-np-meta' }, R.title, R.artist),
    el('div', { class: 'yuni-np-bar' }, R.pos, R.seekS.track, R.dur),
    el('div', { class: 'yuni-np-ctl' }, R.shuffle, R.prev, R.pp, R.next, R.repeat, R.like));
  document.body.appendChild(root);
  onKey = (e) => {
    if (e.key === 'Escape') { e.stopPropagation(); close(); }
    else if (e.key === ' ' && !/^(input|textarea|button)$/i.test((e.target && e.target.tagName) || '')) { e.preventDefault(); e.stopPropagation(); Y.player.toggle(); later(); }
  };
  document.addEventListener('keydown', onKey, true);
  lastKey = null; lastCover = null;
  update();
  tick = Y.on('tick', update);
}

function close() {
  if (!root) return;
  if (tick) tick(); tick = null;
  document.removeEventListener('keydown', onKey, true);
  root.remove(); root = null; R = {};
}

Y.nowPlaying = { open, close, toggle: () => (root ? close() : open()), isOpen: () => !!root };
Y.commands.register({ id: 'yunispot.nowplaying', title: 'Full-screen Now Playing view', section: 'Player', keywords: ['fullscreen', 'big', 'cover', 'ambient', 'lock screen'], shortcut: 'Ctrl+Shift+N', run: () => Y.nowPlaying.toggle() });
Y.keys.bind('mod+shift+n', () => Y.nowPlaying.toggle(), { allowInInput: true });
