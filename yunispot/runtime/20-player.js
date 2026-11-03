const Y = window.YuniSpot;
const q = (s) => document.querySelector(s);

// All DOM access goes through this table, so when Spotify changes markup there is exactly one place to fix.
const SEL = {
  playPause: '[data-testid="control-button-playpause"]',
  next: '[data-testid="control-button-skip-forward"]',
  prev: '[data-testid="control-button-skip-back"]',
  shuffle: '[data-testid="control-button-shuffle"]',
  repeat: '[data-testid="control-button-repeat"]',
  title: '[data-testid="context-item-info-title"]',
  artist: '[data-testid="context-item-info-subtitles"]',
  pos: '[data-testid="playback-position"]',
  dur: '[data-testid="playback-duration"]',
  queue: '[data-testid="control-button-queue"]',
  lyrics: '[data-testid="lyrics-button"]',
  mute: '[data-testid="volume-bar-toggle-mute-button"]',
  volInput: '[data-testid="volume-bar"] input[type="range"]',
  cover: '[data-testid="cover-art-image"], [data-testid="now-playing-widget"] img',
  like: '[data-testid="add-button"], [data-testid="control-button-heart"], [data-testid="now-playing-widget"] button[aria-label*="ibrary"]',
};

const parseTime = (t) => {
  if (!t) return 0;
  const p = t.trim().split(':').map(Number);
  return p.some(Number.isNaN) ? 0 : p.reduce((a, v) => a * 60 + v, 0);
};
const click = (sel) => { const b = q(sel); if (b) { b.click(); return true; } return false; };
const playerState = () => { try { const p = Y.finder.platform(); return p && p.PlayerAPI && p.PlayerAPI._state; } catch { return null; } };

Y.player = {
  selectors: SEL,
  toggle: () => click(SEL.playPause),
  next: () => click(SEL.next),
  prev: () => click(SEL.prev),
  shuffle: () => click(SEL.shuffle),
  repeat: () => click(SEL.repeat),
  isPlaying() {
    const s = playerState();
    if (s && typeof s.isPaused === 'boolean') return !s.isPaused;
    const b = q(SEL.playPause);
    return !!b && /pause/i.test(b.getAttribute('aria-label') || '');
  },
  current() {
    const t = q(SEL.title);
    const title = t && t.textContent.trim();
    if (!title) return null;
    const a = q(SEL.artist);
    let artists = [];
    if (a) {
      artists = Array.from(a.querySelectorAll('a')).map((x) => x.textContent.trim()).filter(Boolean);
      if (!artists.length && a.textContent.trim()) artists = [a.textContent.trim()];
    }
    const links = a ? Array.from(a.querySelectorAll('a'))
      .map((x) => ({ name: x.textContent.trim(), href: x.getAttribute('href') || '' }))
      .filter((l) => l.name && /^\/artist\//.test(l.href)) : [];
    const ta = t.closest ? (t.closest('a') || t.querySelector('a')) : null;
    const href = (t.getAttribute && t.getAttribute('href')) || (ta && ta.getAttribute('href')) || '';
    return { title, artists, artist: artists.join(', '), links, href, key: title + '::' + artists.join(',') };
  },
  shuffled() { const b = q(SEL.shuffle); return !!b && b.getAttribute('aria-checked') === 'true'; },
  repeatMode() { const b = q(SEL.repeat); const v = b && b.getAttribute('aria-checked'); return v === 'true' ? 'all' : v === 'mixed' ? 'one' : 'off'; },
  liked() { const b = q(SEL.like); return !!b && b.getAttribute('aria-checked') === 'true'; },
  queue: () => click(SEL.queue),
  lyrics: () => click(SEL.lyrics),
  mute: () => click(SEL.mute),
  /** Volume 0..1, or null when it cannot be read. */
  volume() {
    try {
      const i = q(SEL.volInput);
      if (i) { const min = Number(i.min) || 0, max = Number(i.max) || 1; return Math.min(1, Math.max(0, (Number(i.value) - min) / ((max - min) || 1))); }
      const p = Y.finder.platform();
      const v = p && p.PlaybackAPI && p.PlaybackAPI.getVolume && p.PlaybackAPI.getVolume();
      if (typeof v === 'number') return v;
    } catch { /* unreadable */ }
    return null;
  },
  setVolume(f) {
    const v = Math.min(1, Math.max(0, f));
    try {
      const p = Y.finder.platform();
      if (p && p.PlaybackAPI && p.PlaybackAPI.setVolume) { p.PlaybackAPI.setVolume(v); return true; }
    } catch { /* fall through to the slider */ }
    try {
      const i = q(SEL.volInput);
      if (i) {
        const min = Number(i.min) || 0, max = Number(i.max) || 1;
        Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(i, String(min + v * (max - min)));
        i.dispatchEvent(new Event('input', { bubbles: true }));
        i.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }
    } catch { /* not available */ }
    return false;
  },
  /** URL of the current cover art, or ''. */
  cover() { const i = q(SEL.cover); return (i && (i.currentSrc || i.getAttribute('src'))) || ''; },
  like: () => click(SEL.like),
  position() { const e = q(SEL.pos); return e ? parseTime(e.textContent) : 0; },
  duration() { const e = q(SEL.dur); return e ? parseTime(e.textContent) : 0; },
  seek(seconds) {
    try {
      const p = Y.finder.platform();
      if (p && p.PlayerAPI && p.PlayerAPI.seekTo) { p.PlayerAPI.seekTo(seconds * 1000); return true; }
    } catch { /* fall through */ }
    return false;
  },
  /** Which selectors currently resolve. Used by the in-app diagnostics. */
  health() { return Object.fromEntries(Object.entries(SEL).map(([k, s]) => [k, !!q(s)])); },
};

// One cheap 1s poll (3 DOM reads) is far lighter than a subtree MutationObserver on the now-playing bar.
let last = { key: null, playing: false };
setInterval(() => {
  const track = Y.player.current();
  const playing = Y.player.isPlaying();
  if (track && track.key !== last.key) { last.key = track.key; Y.emit('songchange', track); }
  if (playing !== last.playing) { last.playing = playing; Y.emit('playpause', playing); }
  Y.emit('tick', { playing, track, position: Y.player.position(), duration: Y.player.duration() });
}, 1000);
