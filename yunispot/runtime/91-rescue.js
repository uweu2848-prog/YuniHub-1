const Y = window.YuniSpot;

/* ---------- screen rescue ----------
   Safety net for "everything went dark" situations (a blank window with only the player bar showing).
   - Watchdog: if Spotify's player is up but the main view is hidden / zero-sized / gone for ~5 s, switch to safe visuals.
   - Manual: Ctrl/Cmd+Alt+Shift+R, or "YuniSpot: Fix blank screen" in the palette (keyboard shortcuts keep working
     even when nothing is painted, because they live in JS, not in the page layout).
   - CLI: `yunispot safe on` makes the next start safe even if the UI is unusable.
  Safe visuals = glass effects and every backdrop blur forced off. Spotify's native player stays available. */
Y.dom.css('rescue', `
html.yuni-rescue *,html.yuni-rescue *::before,html.yuni-rescue *::after{-webkit-backdrop-filter:none!important;backdrop-filter:none!important}
html.yuni-rescue .yuni-np,html.yuni-rescue .yuni-dash{display:none!important}
html.yuni-rescue .Root__now-playing-bar{visibility:visible!important}
html.yuni-rescue .Root__main-view::before{display:none!important}
`);

const root = document.documentElement;
const CLS = 'yuni-rescue';
const MAIN_SEL = '.Root__main-view, main, [data-testid="main"]';
const APP_SEL = '[data-testid="now-playing-bar"], [data-testid="control-button-playpause"]';
const NEED = 5;           // consecutive 1 s checks before the watchdog acts
const WARMUP_MS = 8000;   // give Spotify time to draw after start-up

let seenGood = false, blank = 0, fired = false, readyAt = 0;

/** 'ok' | 'hidden' (exists but invisible) | 'gone' (was visible, now missing) | 'unknown' (never seen: cannot judge) */
function probe() {
  let nodes;
  try { nodes = document.querySelectorAll(MAIN_SEL); } catch { return 'unknown'; }
  if (!nodes.length) return seenGood ? 'gone' : 'unknown';
  for (const n of nodes) {
    try {
      const r = n.getBoundingClientRect();
      if (r.width < 80 || r.height < 80) continue;
      const cs = getComputedStyle(n);
      if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) continue;
      seenGood = true;
      return 'ok';
    } catch { /* ignore this node */ }
  }
  return 'hidden';
}
const healthy = () => { const p = probe(); return p === 'ok' || p === 'unknown'; };

function closeAll() {
  const tryIt = (fn) => { try { fn(); } catch { /* best effort */ } };
  tryIt(() => Y.tour && Y.tour.stop && Y.tour.stop());
  tryIt(() => Y.welcome && Y.welcome.close && Y.welcome.close());
  tryIt(() => Y.dashboard && Y.dashboard.close());
  tryIt(() => Y.nowPlaying && Y.nowPlaying.isOpen() && Y.nowPlaying.close());
  tryIt(() => Y.mini && Y.mini.isOpen() && Y.mini.close());
  tryIt(() => Y.palette && Y.palette.close());
  tryIt(() => document.querySelectorAll('.yuni-overlay').forEach((n) => n.remove()));
}

function run(why, auto) {
  closeAll();
  Y.storage.set('ui:lite', true);
  Y.storage.set('rescue:at', Date.now());
  root.classList.add(CLS);
  try { Y.appearance.apply(); } catch { /* ignore */ }
  Y.log('safe visuals on' + (why ? ': ' + why : ''));
  try {
    Y.notify.show({
      id: 'rescue', tag: 'Safe visuals', ms: 14000,
      title: auto ? 'YuniSpot fixed a blank screen' : 'Safe visuals are on',
      body: 'Blur effects are off. Spotify\u2019s native controls remain active; restore your appearance in Marketplace when the screen is stable.',
      actions: [{ label: 'Open Store', run: () => Y.store && Y.store.open() }],
    });
  } catch { /* ignore */ }
}

function undo() {
  root.classList.remove(CLS);
  Y.storage.set('ui:lite', false);
  try { Y.appearance.apply(); } catch { /* ignore */ }
  blank = 0; fired = false;
  Y.ui.toast('Normal appearance restored');
}

/** One watchdog step; exported so it can be tested. Returns true if it acted. */
function check() {
  if (fired || root.classList.contains(CLS)) return false;
  if (Date.now() - readyAt < WARMUP_MS) return false;
  if (document.hidden || (window.innerWidth || 0) < 200 || document.fullscreenElement) { blank = 0; return false; }
  if (!document.querySelector(APP_SEL)) { blank = 0; return false; } // login screen / still loading: nothing to judge
  const p = probe();
  if (p === 'hidden' || p === 'gone') blank++; else blank = 0;
  if (blank >= NEED) { fired = true; run('main view is ' + p, true); return true; }
  return false;
}

Y.rescue = { run, undo, check, healthy, probe, active: () => root.classList.contains(CLS) };

Y.on('ready', () => {
  readyAt = Date.now();
  if (Y.boot && Y.boot.safe) {
    // `yunispot safe on`: visuals are forced safe for this start without touching saved settings.
    root.classList.add(CLS);
    setTimeout(() => Y.notify.show({ id: 'rescue', tag: 'Safe mode', title: 'YuniSpot started with safe visuals', body: 'Blur effects are off for this start. Run `yunispot safe off` and restart Spotify to restore your appearance.', ms: 12000 }), 1500);
  }
});
Y.on('tick', () => { try { check(); } catch (e) { Y.warn('screen check failed', e); } });

Y.commands.register({ id: 'yunispot.rescue', title: 'YuniSpot: Fix blank screen (switch to safe visuals)', section: 'YuniSpot', keywords: ['blank', 'black', 'empty', 'broken', 'fix', 'rescue', 'nothing showing', 'glitch'], run: () => run('manual', false) });
Y.commands.register({ id: 'yunispot.rescue.undo', title: 'YuniSpot: Restore normal appearance', section: 'YuniSpot', keywords: ['restore', 'glass', 'undo safe'], run: undo });
Y.keys.bind('mod+alt+shift+r', () => run('shortcut', false), { allowInInput: true });
