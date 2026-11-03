'use strict';
// Real-DOM tests (optional). The main suite (`npm test`) uses a stub browser; this one loads the built bundle into
// jsdom with a Spotify-shaped page and clicks through the real UI code.
//
//   npm install --no-save jsdom && npm run test:dom
//
// jsdom is NOT a dependency of YuniSpot: without it this file just says so and exits 0.
const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
const VERSION = require('../package.json').version;

let JSDOM;
try { ({ JSDOM } = require('jsdom')); } catch { console.log('skip  test:dom needs jsdom (npm install --no-save jsdom)'); process.exit(0); }

const ROOT = path.join(__dirname, '..');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const SPOTIFY_HTML = `<!doctype html><html><head></head><body>
<div id="main"><div class="Root encore-dark-theme"><div class="Root__top-container">
  <div class="Root__nav-bar"><nav><a href="/">Home</a><a href="/search">Search</a></nav></div>
  <div class="Root__main-view"><div class="main-topBar-container"><a data-testid="user-widget-link" href="/user/me">me</a></div>
    <div class="main-view-container"><section data-testid="home-page"><div data-testid="tracklist-row">Song A</div></section></div></div>
  <div class="Root__right-sidebar"></div>
  <div class="Root__now-playing-bar"><footer data-testid="now-playing-bar">
    <div data-testid="now-playing-widget"><img data-testid="cover-art-image" src="data:image/gif;base64,R0lGODlhAQABAAAAACw="><div data-testid="context-item-info-title">Do or Die</div><div data-testid="context-item-info-subtitles"><a href="/artist/abc123">yit</a></div><button data-testid="add-button" aria-checked="false"></button></div>
    <button data-testid="control-button-shuffle" aria-checked="false"></button><button data-testid="control-button-skip-back"></button>
    <button data-testid="control-button-playpause" aria-label="Play"></button><button data-testid="control-button-skip-forward"></button><button data-testid="control-button-repeat" aria-checked="false"></button>
    <div data-testid="playback-position">0:02</div><div data-testid="playback-duration">2:26</div>
    <button data-testid="control-button-queue"></button><button data-testid="lyrics-button"></button><button data-testid="volume-bar-toggle-mute-button"></button>
    <div data-testid="volume-bar"><input type="range" min="0" max="1" step="0.01" value="0.8"></div></footer></div>
</div></div></div></body></html>`;

function makeHome() {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'yuni-dom-'));
  fs.cpSync(path.join(ROOT, 'themes'), path.join(home, 'themes'), { recursive: true });
  fs.cpSync(path.join(ROOT, 'extensions'), path.join(home, 'extensions'), { recursive: true });
  return home;
}

/** Boots a fresh Spotify-shaped page with YuniSpot. opts: { safe, storage: {key: value}, noLayout } */
function boot(opts = {}) {
  process.env.YUNISPOT_HOME = makeHome();
  for (const k of Object.keys(require.cache)) if (k.startsWith(path.join(ROOT, 'src'))) delete require.cache[k];
  const build = require(path.join(ROOT, 'src/build.js'));
  const cfg = { ...require(path.join(ROOT, 'src/config.js')).load(), safe: !!opts.safe };
  const out = build.build(cfg);
  const dom = new JSDOM(SPOTIFY_HTML, { url: 'https://xpui.app.spotify.com/', runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window;
  w.__pushes = 0;
  w.webpackChunkclient_web = { push() { w.__pushes++; } };
  w.navigator.clipboard = { writeText: () => Promise.resolve() };
  w.confirm = () => true;
  for (const [k, v] of Object.entries(opts.storage || {})) w.localStorage.setItem('yunispot:' + k, JSON.stringify(v));
  // jsdom has no layout engine: give elements a believable box unless they are display:none
  w.Element.prototype.getBoundingClientRect = function rect() {
    const hidden = (() => { for (let n = this; n && n.nodeType === 1; n = n.parentElement) { if (n.style && n.style.display === 'none') return true; } return false; })();
    if (hidden) return { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 };
    const cls = this.className || '';
    if (/Root__main-view/.test(cls)) return { left: 260, top: 8, right: 1000, bottom: 700, width: 740, height: 692 };
    if (/Root__nav-bar/.test(cls)) return { left: 8, top: 8, right: 250, bottom: 700, width: 242, height: 692 };
    if (/yuni-dock($|\s)/.test(cls)) return { left: 8, top: 630, right: 1016, bottom: 712, width: 1008, height: 82 };
    return { left: 200, top: 300, right: 300, bottom: 330, width: 100, height: 30 };
  };
  const errors = [];
  w.addEventListener('error', (e) => errors.push(e.error || e.message));
  const style = w.document.createElement('style'); style.textContent = out.css; w.document.head.appendChild(style);
  const realNow = Date.now(); let skew = 0;
  w.Date.now = () => realNow + skew + (Date.now() - realNow);
  w.eval(out.js);
  return { w, Y: w.YuniSpot, errors, out, skip: (ms) => { skew += ms; }, doc: w.document };
}

const tileBy = (doc, title) => Array.from(doc.querySelectorAll('.yuni-wiz-pick')).find((t) => t.querySelector('b').textContent === title);
const btn = (doc, text) => Array.from(doc.querySelectorAll('button')).find((b) => b.textContent.trim() === text);
const click = (el) => { assert(el, 'element to click exists'); el.dispatchEvent(new el.ownerDocument.defaultView.MouseEvent('click', { bubbles: true })); };
const key = (w, k, mods = {}) => w.document.dispatchEvent(new w.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...mods }));
const spotifyHtml = (doc) => { const c = doc.getElementById('main').cloneNode(true); c.querySelectorAll('[id^="yuni"],[class*="yuni-"]').forEach((n) => n.remove()); return c.outerHTML; };

(async () => {
  {
    const { w, Y, doc } = boot({ storage: { 'welcome:seen': VERSION } });
    await Y.ready;
    w.confirm = () => { throw new Error('native browser confirmation should not be used'); };
    const cancelResult = Y.ui.confirm('Restart Spotify?', 'Spotify will restart to apply the change.');
    assert(doc.querySelector('[role="alertdialog"].yuni-modal'), 'confirmation uses YuniSpot glass modal');
    click(btn(doc, 'Cancel'));
    assert.strictEqual(await cancelResult, false, 'cancel resolves without running the action');
    const acceptResult = Y.ui.confirm('Restart Spotify?', 'Spotify will restart to apply the change.', { confirm: 'Install ad blocker' });
    click(btn(doc, 'Install ad blocker'));
    assert.strictEqual(await acceptResult, true, 'custom confirmation returns the user choice');

    Y.dashboard.open();
    assert(doc.querySelector('.yuni-dash-rail .yuni-dash-nav') && doc.querySelector('#yuni-dash-tools'), 'dashboard has rail navigation and anchored workspace sections');
    assert(doc.querySelector('.yuni-dash .yuni-card-title') && !doc.querySelector('.yuni-dash .yuni-mini'), 'dashboard contains tools without retired player overlays');
    const surface = doc.querySelector('.yuni-dash');
    Y.bridge.available = () => true;
    Y.bridge.status = () => Promise.resolve({ spotx: false, spotify: true, busy: false });
    Y.store.open();
    assert.strictEqual(doc.querySelector('.yuni-dash'), surface, 'Store opens in the existing YuniSpot surface');
    assert(doc.querySelector('.yuni-marketplace .yuni-market-grid') && doc.querySelector('.yuni-market-card[data-category="Ad blocking"]'), 'Marketplace lists categorized features and SpotX');
    const search = doc.querySelector('.yuni-market-search');
    assert(doc.querySelector('.yuni-market-featured') && doc.querySelector('.yuni-market-card[data-category="Playback"]'), 'Marketplace highlights update management and quick playback controls');
    click(doc.querySelector('.yuni-market-featured'));
    assert(doc.querySelector('.yuni-market-card[data-category="Updates"]'), 'featured update control opens the Updates category');
    click(btn(doc, 'Playback'));
    let shuffleClicks = 0;
    doc.querySelector('[data-testid="control-button-shuffle"]').addEventListener('click', () => shuffleClicks++);
    click(btn(doc, 'Shuffle'));
    assert.strictEqual(shuffleClicks, 1, 'Marketplace quick control toggles Spotify shuffle');
    search.value = 'no-such-tool';
    search.dispatchEvent(new w.Event('input', { bubbles: true }));
    assert(btn(doc, 'Clear filters'), 'empty search results offer a clear-filters action');
    click(btn(doc, 'Clear filters'));
    assert(doc.querySelectorAll('.yuni-market-card').length > 0, 'clear filters restores the Marketplace catalog');
    const spotxInstall = doc.querySelector('.yuni-market-card[data-category="Ad blocking"] .yuni-market-actions button');
    await wait(0);
    spotxInstall.disabled = false;
    assert.strictEqual(spotxInstall.textContent, 'Install', 'SpotX is ready without a local checkout');
    click(spotxInstall);
    await wait(0);
    assert(/latest SpotX source/.test(doc.querySelector('[role="alertdialog"]').textContent), 'Marketplace installs the latest upstream SpotX source without requesting a folder');
    click(btn(doc, 'Cancel'));
    await wait(0);
    click(btn(doc, 'Appearance'));
    assert(Array.from(doc.querySelectorAll('.yuni-market-card')).length > 0 && Array.from(doc.querySelectorAll('.yuni-market-card')).every((card) => card.dataset.category === 'Appearance'), 'category tabs filter catalog cards');
    search.value = 'monospace';
    search.dispatchEvent(new w.Event('input', { bubbles: true }));
    assert.strictEqual(doc.querySelectorAll('.yuni-market-card').length, 1, 'search narrows the catalog');
    assert(/Monospace font/.test(doc.querySelector('.yuni-market-card').textContent));
    click(Array.from(doc.querySelectorAll('.yuni-dash-nav-item')).find((item) => item.textContent.includes('Home')));
    assert(doc.querySelector('#yuni-dash-tools'), 'Home and Marketplace switch inside the same surface');
    Y.dashboard.close();
    console.log('ok  branded confirmation, unified dashboard/Marketplace, and catalog filters');
  }

  /* ---------- 1. first run: wizard, setup choices, tutorial pages, hand-off to the tour ---------- */
  {
    const { w, Y, errors, doc } = boot();
    await Y.ready; await wait(100);
    assert(doc.querySelector('.yuni-wiz'), 'first launch opens the welcome wizard on its own');
    assert.strictEqual(Y.storage.get('welcome:seen'), Y.version, 'marked as seen as soon as it shows');
    assert(/Welcome to/.test(doc.querySelector('.yuni-wiz').textContent) && btn(doc, 'Let\u2019s go') && btn(doc, 'Skip for now'));

    click(btn(doc, 'Let\u2019s go'));
    assert(/Make it yours/.test(doc.querySelector('.yuni-wiz').textContent), 'setup page');
    click(tileBy(doc, 'Performance'));
    assert.strictEqual(Y.storage.get('ui:lite'), true); assert(doc.documentElement.classList.contains('yuni-lite'), 'performance look applies live');
    click(tileBy(doc, 'Full glass'));
    assert.strictEqual(Y.storage.get('ui:lite'), false);
    click(doc.querySelector('.yuni-wiz .yuni-swatch[title="Sky"]'));
    assert.strictEqual(Y.appearance.accent(), '#3db8ff', 'accent swatch applies');
    assert.strictEqual(Y.dock.enabled(), false, 'Spotify native player remains active');
    assert(!tileBy(doc, 'Glass player') && /Spotify\u2019s native controls stay active/.test(doc.querySelector('.yuni-wiz').textContent), 'setup does not offer the removed glass player');

    click(btn(doc, 'Next')); assert(/The basics/.test(doc.querySelector('.yuni-wiz').textContent), 'tutorial page');
    click(btn(doc, 'Next')); assert(/If something ever looks wrong/.test(doc.querySelector('.yuni-wiz').textContent), 'safety page');
    click(btn(doc, 'Next')); assert(btn(doc, 'Take the guided tour') && btn(doc, 'Skip it, start listening'), 'final page offers the tour');
    click(btn(doc, 'Back')); click(btn(doc, 'Next'));
    click(btn(doc, 'Take the guided tour'));
    assert(!doc.querySelector('.yuni-wiz'), 'wizard closes');
    await wait(500);
    assert(Y.tour.isOpen() && doc.querySelector('.yuni-tour-card'), 'tour starts after the wizard');
    assert(!Y.welcome.isOpen());
    assert.deepStrictEqual(errors, [], 'no uncaught errors: ' + errors.join('; '));
    console.log('ok  first run: wizard, live setup choices, tutorial pages, tour hand-off');
  }

  /* ---------- 2. the tour itself ---------- */
  {
    const { w, Y, doc } = boot({ storage: { 'welcome:seen': VERSION } });
    await Y.ready; await wait(1300);
    assert(!doc.querySelector('.yuni-dock') && doc.querySelector('.Root__now-playing-bar'), 'Spotify native player remains active');
    assert(!doc.querySelector('.yuni-wiz'), 'no wizard when already seen');
    Y.tour.start();
    const seen = [];
    for (let guard = 0; guard < 30 && Y.tour.isOpen(); guard++) {
      const card = doc.querySelector('.yuni-tour-card');
      seen.push(card.querySelector('h3').textContent);
      assert(/STEP \d+ \/ \d+/.test(card.textContent));
      const hole = doc.querySelector('.yuni-tour-hole');
      const hasTarget = hole.style.display === 'block';
      if (/Spotify playback|Now playing|Your library|Browse and play/.test(seen[seen.length - 1])) assert(hasTarget, 'spotlight on target for: ' + seen[seen.length - 1]);
      if (/command palette|You\u2019re all set/.test(seen[seen.length - 1])) assert(!hasTarget && doc.querySelector('.yuni-tour-dim').style.display === 'block', 'centred step has no hole');
      assert(card.style.left && card.style.top, 'card is positioned');
      Y.tour.next();
    }
    assert(!Y.tour.isOpen(), 'tour finishes after the last step');
    assert(seen.includes('Spotify playback') && !seen.includes('Your glass player'), 'tour describes the native player: ' + seen.join(' | '));
    assert.strictEqual(Y.storage.get('tour:done'), Y.version);

    // keyboard: arrows move, Esc skips; keys are left alone while the palette is open
    Y.tour.start(); key(w, 'ArrowRight'); assert(/STEP 2/.test(doc.querySelector('.yuni-tour-card').textContent), 'ArrowRight = next');
    key(w, 'ArrowLeft'); assert(/STEP 1 /.test(doc.querySelector('.yuni-tour-card').textContent), 'ArrowLeft = back');
    Y.palette.open(); key(w, 'ArrowRight'); assert(/STEP 1 /.test(doc.querySelector('.yuni-tour-card').textContent), 'tour ignores keys while the palette is open');
    Y.palette.close(); key(w, 'Escape'); assert(!Y.tour.isOpen(), 'Esc skips');
    assert(!doc.querySelector('.yuni-tour-card, .yuni-tour-hole, .yuni-tour-dim'), 'tour cleans up after itself');

    // The native player is the only playback surface.
    Y.dock.set(false);
    Y.tour.start(); const s2 = [];
    for (let g = 0; g < 30 && Y.tour.isOpen(); g++) { s2.push(doc.querySelector('.yuni-tour-card h3').textContent); Y.tour.next(); }
    assert(s2.includes('Spotify playback') && !s2.includes('Your glass player') && !s2.includes('Seek anywhere'), 'tour keeps native playback instructions: ' + s2.join(' | '));

    // a "try it" button runs its action
    Y.tour.start(); while (Y.tour.isOpen() && !/command palette/.test(doc.querySelector('.yuni-tour-card h3').textContent)) Y.tour.next();
    click(btn(doc, 'Try it now')); assert(doc.querySelector('.yuni-overlay'), 'Try it now opens the palette'); Y.palette.close(); Y.tour.stop();
    console.log('ok  tour: spotlight, positioning, adaptive steps, keyboard, try-it actions, cleanup');
  }

  /* ---------- 3. update path (what's new) and quiet mode ---------- */
  {
    const a = boot({ storage: { 'welcome:seen': '0.7.0' } }); await a.Y.ready; await wait(50);
    assert(/What\u2019s new/.test(a.doc.querySelector('.yuni-wiz').textContent) && btn(a.doc, 'Take the tour') && btn(a.doc, 'Got it'), 'update shows what\u2019s new');
    click(btn(a.doc, 'Got it')); assert(!a.doc.querySelector('.yuni-wiz'));
    const b = boot({ storage: { 'welcome:seen': '0.7.0', 'welcome:quiet': true } }); await b.Y.ready; await wait(50);
    assert(!b.doc.querySelector('.yuni-wiz'), 'quiet mode suppresses what\u2019s new'); assert.strictEqual(b.Y.storage.get('welcome:seen'), b.Y.version);
    console.log('ok  update path and quiet mode');
  }

  /* ---------- 4. diagnostics are read-only ---------- */
  {
    const { w, Y, errors, doc } = boot({ storage: { 'welcome:seen': VERSION } });
    await Y.ready; await wait(1300);
    const before = spotifyHtml(doc);
    Y.commands.run('yunispot.diagnostics'); Y.commands.run('yunispot.report');
    const t = doc.querySelector('.yuni-modal').textContent;
    assert(/Webpack hook/.test(t) && /Something looks wrong/.test(t) && /Fix my screen/.test(t));
    assert.strictEqual(w.__pushes, 0, 'diagnostics never push into Spotify\u2019s webpack runtime');
    assert.strictEqual(spotifyHtml(doc), before, 'Spotify\u2019s own DOM is untouched');
    assert(!doc.querySelector('.yuni-dock') && doc.querySelector('.Root__now-playing-bar'), 'Spotify player remains native'); assert.deepStrictEqual(errors, []);
    assert(!/(title|Do or Die|yit)/i.test(Y.report().split('Selectors:')[0]), 'report has no track data');
    console.log('ok  diagnostics: read-only, no webpack hook, Spotify DOM untouched');
  }

  /* ---------- 5. no full-screen blur on overlays / dialogs ---------- */
  {
    const { doc } = boot({ storage: { 'welcome:seen': VERSION } });
    const rules = [];
    doc.querySelectorAll('style').forEach((s) => s.textContent.replace(/\/\*[\s\S]*?\*\//g, '').split('}').forEach((r) => { const i = r.indexOf('{'); if (i > 0) rules.push([r.slice(0, i).trim(), r.slice(i + 1)]); }));
    const bad = rules.filter(([sel, body]) => /backdrop-filter/.test(body) && !/none/.test(body.match(/backdrop-filter:\s*([^;]+)/)[1])
      && sel.split(',').some((x) => /^\.yuni-(overlay|modal|pal|dash|np|wiz|wiz-card|tour-dim|tour-hole|tour-card)\b/.test(x.trim())));
    assert.deepStrictEqual(bad.map((b) => b[0]), [], 'full-screen overlays and dialogs must not use backdrop-filter');
    console.log('ok  overlays, dialogs, dashboard, wizard and tour use no backdrop-filter');
  }

  /* ---------- 6. blank-screen watchdog + rescue ---------- */
  {
    const { w, Y, doc, skip, errors } = boot({ storage: { 'welcome:seen': VERSION } });
    await Y.ready; await wait(1300);
    const view = doc.querySelector('.Root__main-view');
    assert(!doc.querySelector('.yuni-dock') && doc.querySelector('.Root__now-playing-bar') && Y.rescue.healthy());
    skip(20000); // past the warm-up
    for (let i = 0; i < 12; i++) assert.strictEqual(Y.rescue.check(), false); // healthy page: never acts
    assert(!Y.rescue.active());

    view.style.display = 'none'; // the "blank window": app mounted, main view invisible
    assert(!Y.rescue.healthy());
    for (let i = 0; i < 4; i++) assert.strictEqual(Y.rescue.check(), false, 'waits for ~5 s of blank before acting');
    view.style.display = ''; Y.rescue.check(); // recovers on its own -> counter resets
    view.style.display = 'none';
    for (let i = 0; i < 4; i++) Y.rescue.check();
    assert.strictEqual(Y.rescue.check(), true, 'acts on the 5th consecutive blank check');
    assert(Y.rescue.active() && doc.documentElement.classList.contains('yuni-rescue'));
    assert(!doc.querySelector('.yuni-dock'), 'glass player removed'); assert(!doc.documentElement.classList.contains('yuni-dock'));
    assert.strictEqual(Y.storage.get('ui:lite'), true); assert.strictEqual(Y.storage.get('dock:on', null), null);
    assert(doc.documentElement.classList.contains('yuni-lite'), 'glass effects off');
    assert(doc.querySelector('.yuni-note'), 'tells the user what happened');
    assert.strictEqual(Y.rescue.check(), false, 'acts only once');
    view.style.display = '';
    Y.rescue.undo(); assert(!Y.rescue.active() && Y.storage.get('dock:on', null) === null && Y.storage.get('ui:lite') === false, 'undo restores appearance without enabling removed player');
    assert.deepStrictEqual(errors, []);

    // overlays are cleaned up by a rescue
    Y.dashboard.open(); Y.palette.open(); Y.tour.start(); Y.rescue.run('test', false);
    assert(!doc.querySelector('.yuni-dash, .yuni-overlay, .yuni-tour-card'), 'rescue closes dashboards, dialogs and the tour');
    Y.rescue.undo();
    console.log('ok  watchdog: waits, resets, acts once, cleans up, undo works');
  }
  {
    // no false positives
    const { Y, doc, skip, w } = boot({ storage: { 'welcome:seen': VERSION } });
    await Y.ready; await wait(300); skip(20000);
    // (a) Spotify renamed its classes: main view never seen -> cannot judge -> never acts
    doc.querySelector('.Root__main-view').className = 'Renamed__thing';
    for (let i = 0; i < 15; i++) assert.strictEqual(Y.rescue.check(), false, 'unknown layout never triggers');
    // (b) login screen: no player mounted
    const nowPlaying = doc.querySelector('.Root__now-playing-bar'); const holder = nowPlaying.parentElement; nowPlaying.remove();
    for (let i = 0; i < 15; i++) assert.strictEqual(Y.rescue.check(), false, 'no player = login/loading, nothing to judge');
    holder.appendChild(nowPlaying);
    console.log('ok  watchdog: no false positives on renamed layouts or the login screen');
  }
  {
    // (c) a layout that was seen and then vanishes counts as blank; minimised window never does
    const { Y, doc, skip, w } = boot({ storage: { 'welcome:seen': VERSION } });
    await Y.ready; await wait(300); skip(20000);
    Y.rescue.check(); const view = doc.querySelector('.Root__main-view'); const parent = view.parentElement;
    Object.defineProperty(doc, 'hidden', { value: true, configurable: true });
    view.remove(); for (let i = 0; i < 8; i++) assert.strictEqual(Y.rescue.check(), false, 'minimised / hidden window is ignored');
    Object.defineProperty(doc, 'hidden', { value: false, configurable: true });
    for (let i = 0; i < 4; i++) Y.rescue.check();
    assert.strictEqual(Y.rescue.check(), true, 'main view removed after being seen = blank');
    console.log('ok  watchdog: vanished layout detected, hidden window ignored');
  }

  /* ---------- 7. rescue shortcut + palette command ---------- */
  {
    const { w, Y, doc } = boot({ storage: { 'welcome:seen': VERSION } });
    await Y.ready; await wait(1300);
    assert(!doc.querySelector('.yuni-dock') && doc.querySelector('.Root__now-playing-bar'));
    key(w, 'R', { ctrlKey: true, altKey: true, shiftKey: true });
    assert(Y.rescue.active() && !doc.querySelector('.yuni-dock'), 'Ctrl+Alt+Shift+R switches to safe visuals');
    Y.commands.run('yunispot.rescue.undo'); assert(!Y.rescue.active());
    Y.commands.run('yunispot.rescue'); assert(Y.rescue.active(), 'palette command works too');
    console.log('ok  rescue shortcut and palette commands');
  }

  /* ---------- 8. `yunispot safe on`: safe visuals from the first frame, saved settings untouched ---------- */
  {
    const { Y, doc, out } = boot({ safe: true, storage: { 'welcome:seen': VERSION, 'dock:on': true, 'mini:open': true } });
    assert(/"safe":true/.test(out.js)); await Y.ready; await wait(1400);
    assert(doc.documentElement.classList.contains('yuni-rescue') && doc.documentElement.classList.contains('yuni-lite'));
    assert(!doc.querySelector('.yuni-dock') && !doc.querySelector('.yuni-mini') && !doc.querySelector('.yuni-wiz'), 'no glass player, mini player or welcome in safe mode');
    assert.strictEqual(Y.storage.get('dock:on'), true, 'saved settings are not overwritten');
    console.log('ok  safe boot flag');
  }

  console.log('\nAll DOM tests passed.');
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
