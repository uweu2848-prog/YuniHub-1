const Y = window.YuniSpot;
if (Y.feature('stats')) {
  const KEY = 'stats';
  const data = Y.storage.get(KEY, { total: 0, tracks: {}, artists: {}, days: {} });
  data.dayPlays = data.dayPlays || {};
  data.recent = data.recent || [];
  data.hours = Array.isArray(data.hours) && data.hours.length === 24 ? data.hours : new Array(24).fill(0);
  let cur = null;
  let dirty = false;
  let sinceFlush = 0;

  const dayKey = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const fmt = (s) => { const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return h ? h + 'h ' + m + 'm' : m + 'm'; };

  function prune() {
    const entries = Object.entries(data.tracks);
    if (entries.length <= 3000) return;
    entries.sort((a, b) => b[1].seconds - a[1].seconds);
    data.tracks = Object.fromEntries(entries.slice(0, 2000));
  }
  function flush() {
    if (!dirty) return;
    prune();
    Y.storage.set(KEY, data);
    dirty = false; sinceFlush = 0;
  }

  Y.on('songchange', (t) => {
    cur = { key: t.key, title: t.title, artists: t.artists, seconds: 0 };
    data.recent.unshift({ title: t.title, artist: t.artist, at: Date.now() });
    if (data.recent.length > 20) data.recent.length = 20;
    dirty = true;
  });

  Y.on('tick', ({ playing }) => {
    if (!cur || !playing) return;
    cur.seconds++;
    data.total++;
    const dk = dayKey(new Date());
    data.days[dk] = (data.days[dk] || 0) + 1;
    data.hours[new Date().getHours()]++;
    const tr = data.tracks[cur.key] || (data.tracks[cur.key] = { title: cur.title, artist: cur.artists.join(', '), plays: 0, seconds: 0 });
    tr.seconds++;
    const counted = cur.seconds === 30; // a "play" = 30s of listening, same idea as Spotify's own rule
    if (counted) { tr.plays++; data.dayPlays[dk] = (data.dayPlays[dk] || 0) + 1; }
    for (const a of cur.artists) {
      const ar = data.artists[a] || (data.artists[a] = { plays: 0, seconds: 0 });
      ar.seconds++;
      if (counted) ar.plays++;
    }
    dirty = true;
    if (++sinceFlush >= 15) flush();
  });

  window.addEventListener('beforeunload', flush);
  document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });

  Y.dom.css('stats', `
.yuni-stat-big{font-size:34px;font-weight:800;margin:4px 0 14px}
.yuni-stat-h{margin:18px 0 8px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--text-subdued,#aaa)}
.yuni-row{display:flex;justify-content:space-between;gap:12px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.05)}
.yuni-row span:first-child{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.yuni-row span:last-child{color:var(--text-subdued,#aaa);flex:none}
.yuni-bars{display:flex;align-items:flex-end;gap:8px;height:80px;margin-top:6px}
.yuni-bar{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:4px;font-size:11px;color:var(--text-subdued,#aaa);height:100%}
.yuni-bar i{display:block;width:100%;border-radius:6px 6px 2px 2px;background:var(--yuni-accent,var(--essential-bright-accent,#1db954));min-height:2px}
`);

  function show() {
    flush();
    const el = Y.dom.el;
    const topTracks = Object.values(data.tracks).sort((a, b) => b.seconds - a.seconds).slice(0, 10);
    const topArtists = Object.entries(data.artists).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.seconds - a.seconds).slice(0, 10);
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      days.push({ label: d.toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 3), secs: data.days[dayKey(d)] || 0 });
    }
    const max = Math.max(1, ...days.map((d) => d.secs));
    const hmax = Math.max(1, ...data.hours);
    const rows = (items, label) => items.length
      ? items.map((x, i) => el('div', { class: 'yuni-row' }, el('span', {}, (i + 1) + '. ' + label(x)), el('span', {}, fmt(x.seconds) + ' \u00b7 ' + x.plays + ' plays')))
      : [el('div', { class: 'yuni-row' }, el('span', {}, 'Nothing yet. Play some music!'))];
    Y.ui.modal('Listening stats', el('div', {},
      el('div', { class: 'yuni-stat-h' }, 'Total listening time'),
      el('div', { class: 'yuni-stat-big' }, fmt(data.total)),
      el('div', { class: 'yuni-stat-h' }, 'Last 7 days'),
      el('div', { class: 'yuni-bars' }, days.map((d) => el('div', { class: 'yuni-bar', title: fmt(d.secs) }, el('i', { style: { height: Math.round((d.secs / max) * 100) + '%' } }), d.label))),
      el('div', { class: 'yuni-stat-h' }, 'When you listen'),
      el('div', { class: 'yuni-bars', style: { height: '56px', gap: '3px' } }, data.hours.map((v, h) => el('div', { class: 'yuni-bar', title: h + ':00 \u2013 ' + fmt(v) }, el('i', { style: { height: Math.max(2, Math.round((v / hmax) * 100)) + '%' } })))),
      el('div', { class: 'yuni-row' }, el('span', {}, 'Most active around'), el('span', {}, hmax > 1 ? new Date(2000, 0, 1, data.hours.indexOf(hmax)).toLocaleTimeString(undefined, { hour: 'numeric' }) : 'not enough data yet')),
      el('div', { class: 'yuni-stat-h' }, 'Top tracks'),
      rows(topTracks, (t) => t.title + ' \u2014 ' + t.artist),
      el('div', { class: 'yuni-stat-h' }, 'Top artists'),
      rows(topArtists, (a) => a.name)));
  }

  const GOALS = [30, 60, 90, 120];
  const goalMin = () => { const g = Y.storage.get('goal:min', 60); return GOALS.includes(g) ? g : 60; };
  function streak() {
    // consecutive days (ending today, or yesterday if today isn't done yet) with at least the goal listened
    const need = goalMin() * 60;
    const d = new Date();
    if ((data.days[dayKey(d)] || 0) < need) d.setDate(d.getDate() - 1);
    let n = 0;
    while ((data.days[dayKey(d)] || 0) >= need && n < 3650) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }
  // one celebratory card per day when the goal is reached
  Y.on('tick', () => {
    if (!Y.storage.get('goal:notify', true) || !Y.notify) return;
    const k = dayKey(new Date());
    if ((data.days[k] || 0) >= goalMin() * 60 && Y.storage.get('goal:done', '') !== k) {
      Y.storage.set('goal:done', k);
      const st = streak();
      Y.notify.show({ id: 'goal', tag: 'Daily goal', title: 'Goal reached: ' + goalMin() + ' min', body: st > 1 ? st + ' days in a row. Keep it going!' : 'Nice listening today.' });
    }
  });

  Y.stats = {
    show,
    goal: { minutes: goalMin, cycle() { const n = GOALS[(GOALS.indexOf(goalMin()) + 1) % GOALS.length]; Y.storage.set('goal:min', n); return n; }, streak },
    reset() { data.total = 0; data.tracks = {}; data.artists = {}; data.days = {}; data.dayPlays = {}; data.recent = []; data.hours = new Array(24).fill(0); dirty = true; flush(); },
    today() { const k = dayKey(new Date()); return { seconds: data.days[k] || 0, plays: data.dayPlays[k] || 0 }; },
    recent: () => data.recent.slice(),
    data: () => JSON.parse(JSON.stringify(data)),
  };
  Y.commands.register({ id: 'yunispot.stats', title: 'Show listening stats', section: 'YuniSpot', keywords: ['history', 'top', 'minutes'], run: show });
  Y.commands.register({
    id: 'yunispot.stats.reset', title: 'Reset listening stats', section: 'YuniSpot',
    run() { if (confirm('Delete all YuniSpot listening stats?')) { Y.stats.reset(); Y.ui.toast('Listening stats reset'); } },
  });
}
