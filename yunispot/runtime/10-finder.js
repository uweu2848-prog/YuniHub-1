const Y = window.YuniSpot;
let req = null;
let platform = null;
let nextPlatformTry = 0;

/** Grab webpack's internal require() so we can look modules up by what they export (not by minified names). */
function getRequire() {
  if (req) return req;
  const name = Object.keys(window).find((k) => /^webpackChunk/.test(k));
  const chunks = name && window[name];
  if (!chunks || typeof chunks.push !== 'function') return null;
  try { chunks.push([['yuni_' + Date.now()], {}, (r) => { req = r; }]); } catch (e) { Y.warn('webpack hook failed', e); }
  return req;
}

function* exportsIter() {
  const r = getRequire();
  if (!r || !r.c) return;
  for (const id in r.c) {
    let ex;
    try { ex = r.c[id].exports; } catch { continue; }
    if (ex && (typeof ex === 'object' || typeof ex === 'function')) yield ex;
  }
}

/** Walk React's fiber tree looking for the context value that holds Spotify's Platform object.
 *  Read-only, never touches YuniSpot's own nodes, visits each root once and gives up after ~120 ms
 *  so it can never stall Spotify's UI (it simply tries again later). */
function findPlatformInFiber() {
  const seen = new Set();
  const roots = [document.getElementById('main'), document.getElementById('root')].filter(Boolean);
  if (!roots.length) roots.push(...Array.from(document.body.children).filter((n) => !/^yuni/.test(n.id || '') && !/(^|\s)yuni-/.test(n.className || '')));
  const t0 = Date.now();
  for (const el of roots) {
    const key = Object.keys(el).find((k) => k.startsWith('__reactContainer$') || k.startsWith('__reactFiber$'));
    if (!key) continue;
    const stack = [el[key]];
    let visited = 0;
    while (stack.length && visited++ < 60000) {
      if ((visited & 511) === 0 && Date.now() - t0 > 120) return null;
      const n = stack.pop();
      if (!n || seen.has(n)) continue;
      seen.add(n);
      const p = n.memoizedProps;
      if (p) {
        const v = p.value;
        if (v && typeof v === 'object' && v.PlayerAPI) return v;
        if (p.platform && p.platform.PlayerAPI) return p.platform;
      }
      if (n.sibling) stack.push(n.sibling);
      if (n.child) stack.push(n.child);
    }
  }
  return null;
}

Y.finder = {
  require: getRequire,
  /** Passive: reports the module count only if the webpack hook was already taken by something else.
   *  It never pushes into Spotify's webpack runtime on its own (diagnostics must not change anything). */
  moduleCount() { return req && req.c ? Object.keys(req.c).length : 0; },
  /** Explicit, active probe: installs the webpack hook if needed. Only extensions that ask for it use this. */
  probe() { const r = getRequire(); return r && r.c ? Object.keys(r.c).length : 0; },
  hooked() { return !!req; },
  find(pred) {
    for (const ex of exportsIter()) {
      try {
        if (pred(ex)) return ex;
        if (ex.default && pred(ex.default)) return ex.default;
      } catch { /* getters can throw */ }
    }
    return null;
  },
  byProps(...props) { return Y.finder.find((ex) => props.every((p) => p in ex)); },
  /** Spotify's internal Platform (PlayerAPI, History, ...). Cached; retries at most every 10s while missing. */
  platform() {
    if (platform) return platform;
    const now = Date.now();
    if (now < nextPlatformTry) return null;
    nextPlatformTry = now + 10000;
    try { platform = findPlatformInFiber(); } catch (e) { Y.warn('platform lookup failed', e); }
    return platform;
  },
};
