const Y = window.YuniSpot;
const el = Y.dom.el;

/* The YuniSpot Marketplace: the catalog and control surface for features, settings, and tools. */
Y.dom.css('store', `
.yuni-store{display:flex;flex-direction:column;gap:14px;font-family:var(--yuni-font,ui-monospace,Consolas,monospace)}
.yuni-store-grid{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);gap:22px}
.yuni-store-column{display:flex;flex-direction:column;gap:20px;min-width:0}
.yuni-store-h{font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:#8d8d9b;margin:6px 0 -6px}
.yuni-store-col{display:flex;flex-direction:column;gap:8px}
.yuni-store .yuni-sw-row{padding:11px 12px;border-radius:11px;border:1px solid rgba(255,255,255,.075);background:linear-gradient(130deg,rgba(255,255,255,.04),rgba(255,255,255,.016));transition:border-color .18s,background .18s}
.yuni-store .yuni-sw-row:hover{border-color:rgba(var(--yuni-accent-rgb,255,43,43),.32);background:rgba(255,255,255,.045)}
.yuni-store-state{flex:none;padding:4px 8px;border:1px solid rgba(74,222,128,.28);border-radius:8px;background:rgba(74,222,128,.08);color:#70d99a;font-size:9px;font-weight:700;text-transform:uppercase}
.yuni-swatches{display:flex;gap:10px;flex-wrap:wrap;padding:6px 2px}
.yuni-swatch{width:30px;height:30px;border-radius:50%;border:2px solid rgba(255,255,255,.18);cursor:pointer;position:relative;padding:0;box-shadow:inset 0 1px 0 rgba(255,255,255,.5),0 4px 12px rgba(0,0,0,.4);transition:transform .12s}
.yuni-swatch:hover{transform:scale(1.12)}
.yuni-swatch.on{border-color:#fff;box-shadow:0 0 0 3px rgba(255,255,255,.25),0 4px 12px rgba(0,0,0,.4)}
.yuni-swatch.reset{background:transparent;color:#c9c9d4;font:inherit;font-size:10px;width:auto;border-radius:999px;padding:0 12px}
.yuni-store-links{display:flex;gap:8px;flex-wrap:wrap}
.yuni-store-title{display:flex;align-items:center;gap:10px}
.yuni-store-title .yuni-ib{width:30px;height:30px;pointer-events:none}
#yuni-store-btn{width:32px;height:32px;margin:0 8px;flex:none;border:1px solid rgba(255,255,255,.14);background:rgba(0,0,0,.4);color:#fff}
#yuni-store-btn.float{position:fixed;z-index:2147480000;top:12px;right:190px}
@media(max-width:700px){.yuni-store-grid{grid-template-columns:minmax(0,1fr);gap:18px}.yuni-store-column{gap:17px}}
.yuni-marketplace{width:min(1360px,100%);margin:0 auto}
.yuni-market-hero{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;padding:8px 2px 22px}
.yuni-market-eyebrow{color:var(--yuni-accent,#ff3b3b);font-size:9px;font-weight:800;letter-spacing:.16em;text-transform:uppercase}
.yuni-market-hero h1{margin:6px 0 4px;font-size:32px;line-height:1.15;letter-spacing:0}
.yuni-market-hero p{max-width:640px;margin:0;color:#a6a6b3;line-height:1.55}
.yuni-market-featured{display:flex;align-items:center;gap:14px;width:100%;margin:0 0 16px;padding:14px 16px;border:1px solid rgba(var(--yuni-accent-rgb,255,43,43),.24);border-radius:14px;background:radial-gradient(420px 100px at 0% 50%,rgba(var(--yuni-accent-rgb,255,43,43),.15),transparent 80%),linear-gradient(110deg,rgba(255,255,255,.055),rgba(255,255,255,.018));color:#fff;text-align:left;font:inherit;cursor:pointer;transition:border-color .18s,transform .18s,box-shadow .18s}
.yuni-market-featured:hover{transform:translateY(-1px);border-color:rgba(var(--yuni-accent-rgb,255,43,43),.5);box-shadow:0 10px 24px rgba(0,0,0,.2)}
.yuni-market-feature-icon{display:grid;place-items:center;width:40px;height:40px;flex:none;border-radius:12px;background:rgba(var(--yuni-accent-rgb,255,43,43),.14);color:var(--yuni-accent,#ff4545);font-size:18px}
.yuni-market-feature-copy{flex:1;min-width:0}.yuni-market-feature-copy b{display:block;font-size:12px}.yuni-market-feature-copy small{display:block;margin-top:3px;color:#a6a6b3;font-size:10px;line-height:1.45}
.yuni-market-feature-action{flex:none;color:var(--yuni-accent,#ff4545);font-size:10px;font-weight:800}
.yuni-market-search{width:min(280px,34vw);min-width:160px;padding:10px 12px;border:1px solid rgba(255,255,255,.1);border-radius:10px;background:rgba(255,255,255,.045);color:#fff;font:inherit;outline:none}
.yuni-market-search:focus{border-color:rgba(var(--yuni-accent-rgb,255,43,43),.6);box-shadow:0 0 0 3px rgba(var(--yuni-accent-rgb,255,43,43),.12)}
.yuni-market-tabs{display:flex;gap:6px;overflow-x:auto;padding:0 0 16px;border-bottom:1px solid rgba(255,255,255,.07)}
.yuni-market-tab{flex:none;padding:7px 11px;border:1px solid transparent;border-radius:8px;background:transparent;color:#9a9ca7;font:inherit;font-size:11px;cursor:pointer;transition:background .16s,color .16s,border-color .16s}
.yuni-market-tab:hover{background:rgba(255,255,255,.05);color:#fff}
.yuni-market-tab.active{background:rgba(var(--yuni-accent-rgb,255,43,43),.13);border-color:rgba(var(--yuni-accent-rgb,255,43,43),.32);color:#fff}
.yuni-market-tab:focus-visible,.yuni-market-featured:focus-visible,.yuni-market-toggle:focus-visible,.yuni-market-actions .yuni-btn:focus-visible{outline:2px solid var(--yuni-accent,#ff4545);outline-offset:2px}
.yuni-market-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(238px,1fr));gap:12px;padding-top:16px}
.yuni-market-card{display:flex;flex-direction:column;gap:12px;min-width:0;padding:15px;border:1px solid rgba(255,255,255,.085);border-radius:13px;background:linear-gradient(145deg,rgba(255,255,255,.055),rgba(255,255,255,.014) 60%),rgba(14,15,20,.72);box-shadow:inset 0 1px 0 rgba(255,255,255,.055);transition:transform .2s,border-color .2s,box-shadow .2s;animation:yuni-dash-card-in .35s ease both}
.yuni-market-card:hover{transform:translateY(-2px);border-color:rgba(var(--yuni-accent-rgb,255,43,43),.34);box-shadow:0 12px 28px rgba(0,0,0,.28),0 0 18px rgba(var(--yuni-accent-rgb,255,43,43),.08)}
.yuni-market-card-head{display:flex;align-items:center;gap:10px;min-width:0}
.yuni-market-icon{display:grid;place-items:center;width:36px;height:36px;flex:none;border:1px solid rgba(var(--yuni-accent-rgb,255,43,43),.32);border-radius:10px;background:rgba(var(--yuni-accent-rgb,255,43,43),.1);color:var(--yuni-accent,#ff4545);font-size:16px}
.yuni-market-title{flex:1;min-width:0;font-size:12px;font-weight:800;line-height:1.35}
.yuni-market-category{color:#858894;font-size:9px;text-transform:uppercase;letter-spacing:.08em}
.yuni-market-status{flex:none;padding:3px 7px;border:1px solid rgba(74,222,128,.32);border-radius:7px;background:rgba(74,222,128,.08);color:#7de0a3;font-size:8px;font-weight:800;text-transform:uppercase}
.yuni-market-status.off{border-color:rgba(255,255,255,.13);background:rgba(255,255,255,.035);color:#9294a0}
.yuni-market-desc{flex:1;margin:0;color:#a6a6b3;font-size:11px;line-height:1.55}
.yuni-market-actions{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-top:auto}
.yuni-market-toggle{padding:7px 11px;border:1px solid rgba(255,255,255,.1);border-radius:8px;background:rgba(255,255,255,.055);color:#e7e7ed;font:inherit;font-size:10px;font-weight:700;cursor:pointer}
.yuni-market-toggle.on{border-color:rgba(var(--yuni-accent-rgb,255,43,43),.42);background:rgba(var(--yuni-accent-rgb,255,43,43),.16);color:#fff}
.yuni-market-empty{grid-column:1/-1;display:grid;justify-items:center;gap:10px;padding:34px 12px;border:1px dashed rgba(255,255,255,.11);border-radius:13px;color:#8d8d9b;text-align:center}
@media(max-width:720px){.yuni-market-hero{align-items:stretch;flex-direction:column;gap:14px}.yuni-market-hero h1{font-size:26px}.yuni-market-search{width:100%;box-sizing:border-box}}
@media(max-width:520px){.yuni-market-featured{align-items:flex-start;padding:12px}.yuni-market-feature-action{align-self:center}}
@media(prefers-reduced-motion:reduce){.yuni-market-card,.yuni-market-tab,.yuni-market-featured{animation:none;transition:none}.yuni-market-card:hover,.yuni-market-featured:hover{transform:none}}
`);

const SW = (title, desc, get, toggle) => [title, desc, get, toggle];

/** Flat list of on/off features: [title, description, isOn(), toggle()]. */
function switches() {
  const list = [];
  list.push(SW('Song-change cards', 'A glass card with cover art whenever the song changes.', () => Y.extras.notifyOn(), () => Y.extras.toggleNotify()));
  list.push(SW('Glass effects', 'Blur and translucency. Turn off if Spotify feels laggy.', () => !Y.appearance.state().lite, () => Y.appearance.toggleGlass()));
  list.push(SW('Monospace font', 'The terminal look. Off = clean sans-serif.', () => !Y.appearance.state().sans, () => Y.appearance.toggleMono()));
  list.push(SW('Focus mode', 'Hide the sidebars and keep only the music.', () => Y.extras.isOn('focus'), () => Y.extras.toggleMode('focus', 'Focus mode')));
  list.push(SW('Compact lists', 'Tighter track rows so more fit on screen.', () => Y.extras.isOn('compact'), () => Y.extras.toggleMode('compact', 'Compact lists')));
  list.push(SW('Show what\u2019s new after updates', 'Open the welcome screen once after each YuniSpot update.', () => !Y.storage.get('welcome:quiet', false), () => Y.storage.set('welcome:quiet', !Y.storage.get('welcome:quiet', false))));
  list.push(SW('Fade out before the sleep timer pauses', 'Lowers the volume over the last 20 seconds instead of cutting off.', () => Y.storage.get('sleep:fade', true), () => Y.storage.set('sleep:fade', !Y.storage.get('sleep:fade', true))));
  list.push(SW('Daily goal celebration', 'Show a card when you reach your daily listening goal.', () => Y.storage.get('goal:notify', true), () => Y.storage.set('goal:notify', !Y.storage.get('goal:notify', true))));
  return list;
}

function switchRow([title, desc, get, toggle]) {
  const sw = el('span', { class: 'yuni-sw' + (get() ? ' on' : '') });
  return el('div', { class: 'yuni-sw-row', role: 'switch', onclick: () => { try { toggle(); } catch (e) { Y.warn('toggle failed', e); } sw.classList.toggle('on', !!get()); } },
    el('div', {}, el('div', {}, title), el('small', {}, desc)), sw);
}

function marketCard(icon, category, title, description, status, actions, searchText) {
  const badge = el('span', { class: 'yuni-market-status' + (/off|disabled/i.test(status) ? ' off' : '') }, status);
  const card = el('article', { class: 'yuni-market-card', 'data-category': category, 'data-search': (title + ' ' + description + ' ' + (searchText || '')).toLowerCase() },
    el('div', { class: 'yuni-market-card-head' },
      el('span', { class: 'yuni-market-icon', 'aria-hidden': 'true' }, icon),
      el('div', { style: { flex: '1', minWidth: '0' } }, el('div', { class: 'yuni-market-title' }, title), el('div', { class: 'yuni-market-category' }, category)),
      badge),
    el('p', { class: 'yuni-market-desc' }, description),
    el('div', { class: 'yuni-market-actions' }, actions || []));
  card.__status = badge;
  return card;
}

function marketSwitch(feature, category, icon) {
  const [title, description, get, toggle] = feature;
  const action = el('button', { class: 'yuni-market-toggle' + (get() ? ' on' : ''), type: 'button', 'aria-pressed': String(!!get()) }, get() ? 'Enabled' : 'Enable');
  const card = marketCard(icon, category, title, description, get() ? 'Enabled' : 'Disabled', [action]);
  action.addEventListener('click', () => {
    try { toggle(); } catch (e) { Y.warn('marketplace feature toggle failed', e); }
    const on = !!get();
    action.textContent = on ? 'Enabled' : 'Enable';
    action.classList.toggle('on', on);
    action.setAttribute('aria-pressed', String(on));
    card.__status.textContent = on ? 'Enabled' : 'Disabled';
    card.__status.classList.toggle('off', !on);
  });
  return card;
}

function adblockProduct() {
  const state = el('p', { class: 'yuni-market-desc' }, 'Checking SpotX ad blocking...');
  const button = el('button', { class: 'yuni-btn ghost sm', type: 'button', disabled: true }, 'Checking');
  const reapplyButton = el('button', { class: 'yuni-btn ghost sm', type: 'button', hidden: true }, 'Update SpotX');
  const card = marketCard('\u25c8', 'Ad blocking', 'SpotX ad blocker', 'Blocks audio, banner, and video ads using the latest source from the official SpotX project.', 'Checking', [button, reapplyButton]);
  card.insertBefore(state, card.querySelector('.yuni-market-actions'));
  const refresh = async () => {
    if (!Y.bridge || !Y.bridge.available()) {
      state.textContent = 'Apply YuniSpot once to enable Marketplace controls.';
      button.textContent = 'Unavailable';
      button.disabled = true;
      return;
    }
    try {
      const current = await Y.bridge.status();
      const enabled = !!current.spotx;
      const status = current.busy ? 'Working' : enabled ? 'Installed' : 'Available';
      state.textContent = current.busy ? 'Spotify patch operation in progress.' : enabled ? 'Ad blocking is active; automatic Spotify updates are paused. Update SpotX to fetch the latest source.' : 'Install audio, banner, and video ad blocking from the official SpotX source. Automatic Spotify updates will be paused.';
      card.__status.textContent = status;
      card.__status.classList.toggle('off', !enabled);
      button.textContent = current.busy ? 'Working...' : enabled ? 'Remove' : 'Install';
      button.disabled = current.busy || !current.spotify;
      reapplyButton.hidden = !enabled || current.busy;
    } catch (e) {
      state.textContent = 'YuniSpot helper unavailable. Apply YuniSpot to reconnect.';
      button.textContent = 'Offline';
      button.disabled = true;
    }
  };
  button.addEventListener('click', async () => {
    if (button.disabled) return;
    try {
      const current = await Y.bridge.status();
      const action = current.spotx ? 'uninstall' : 'install';
      const accepted = await Y.ui.confirm('Restart Spotify?', 'Spotify will close and restart to ' + (action === 'install' ? 'download and install the latest SpotX source' : 'remove SpotX') + '. YuniSpot will reapply your theme afterward.', {
        cancel: 'Cancel', confirm: action === 'install' ? 'Install SpotX' : 'Remove SpotX',
      });
      if (!accepted) return;
      button.disabled = true;
      button.textContent = 'Restarting...';
      state.textContent = 'Downloading the latest official SpotX source. Spotify will reopen automatically.';
      await Y.bridge[action]();
    } catch (e) {
      Y.warn('SpotX operation could not be started', e);
      state.textContent = 'SpotX operation could not be started: ' + e.message;
      button.disabled = false;
      button.textContent = 'Try again';
    }
  });
  reapplyButton.addEventListener('click', async () => {
    if (reapplyButton.disabled) return;
    try {
      const accepted = await Y.ui.confirm(
        'Update SpotX?',
        'The latest SpotX source will be downloaded and installed with Spotify automatic updates paused. YuniSpot will be reapplied afterward.',
        { cancel: 'Cancel', confirm: 'Update SpotX' },
      );
      if (!accepted) return;
      reapplyButton.disabled = true;
      reapplyButton.textContent = 'Restarting...';
      await Y.bridge.install();
    } catch (e) {
      Y.warn('SpotX settings could not be reapplied', e);
      state.textContent = 'SpotX could not be updated: ' + e.message;
      reapplyButton.disabled = false;
      reapplyButton.textContent = 'Update SpotX';
    }
  });
  refresh();
  return card;
}

function spotifyUpdatesProduct() {
  const state = el('p', { class: 'yuni-market-desc' }, 'Check Spotify’s official Windows installer for a new release.');
  const checkButton = el('button', { class: 'yuni-btn ghost sm', type: 'button' }, 'Check for updates');
  const updateButton = el('button', { class: 'yuni-btn sm', type: 'button', hidden: true }, 'Update & reapply');
  const card = marketCard('\u21bb', 'Updates', 'Spotify updates', 'Choose when Spotify updates. YuniSpot and any installed SpotX patch are reapplied afterward.', 'Checking', [checkButton, updateButton]);
  card.insertBefore(state, card.querySelector('.yuni-market-actions'));
  let latest = null;
  let spotxEnabled = false;
  const refresh = async () => {
    if (!Y.bridge || !Y.bridge.available()) {
      state.textContent = 'Apply YuniSpot on Windows to enable update checks.';
      card.__status.textContent = 'Windows only';
      card.__status.classList.add('off');
      checkButton.disabled = true;
      return;
    }
    checkButton.disabled = true;
    checkButton.textContent = 'Checking...';
    try {
      const current = await Y.bridge.status();
      spotxEnabled = !!current.spotx;
      latest = await Y.bridge.updateStatus();
      state.textContent = latest.available
        ? 'Spotify ' + (latest.latestVersion || 'has a new release') + ' is available; your version is ' + (latest.currentVersion || 'older') + '.'
        : current.spotx
          ? 'Spotify ' + (latest.currentVersion || '') + ' is up to date. Automatic updates are paused by SpotX.'
          : 'Spotify ' + (latest.currentVersion || '') + ' is up to date. Install SpotX to pause automatic updates.';
      card.__status.textContent = current.busy ? 'Working' : latest.available ? 'Update available' : 'Up to date';
      card.__status.classList.toggle('off', !latest.available);
      updateButton.hidden = !latest.available || current.busy;
    } catch (e) {
      latest = null;
      state.textContent = 'Update check failed: ' + e.message;
      card.__status.textContent = 'Check failed';
      card.__status.classList.add('off');
      updateButton.hidden = true;
    } finally {
      checkButton.disabled = false;
      checkButton.textContent = 'Check for updates';
    }
  };
  checkButton.addEventListener('click', refresh);
  updateButton.addEventListener('click', async () => {
    if (!latest || !latest.available) return refresh();
    const accepted = await Y.ui.confirm(
      'Update Spotify?',
      'The official Spotify installer will run. Spotify will restart, then YuniSpot' + (spotxEnabled ? ' and SpotX' : '') + ' will be reapplied.',
      { cancel: 'Stay on this version', confirm: 'Update & reapply' },
    );
    if (!accepted) {
      Y.storage.set('spotify:update-dismissed', latest.releaseId);
      return;
    }
    try {
      await Y.bridge.updateSpotify();
      state.textContent = 'Spotify is updating. The app will reopen with YuniSpot and SpotX reapplied.';
      checkButton.disabled = true;
      updateButton.disabled = true;
    } catch (e) {
      Y.warn('Spotify update could not be started', e);
      state.textContent = 'Update could not be started: ' + e.message;
    }
  });
  refresh();
  return card;
}

function marketplace() {
  const sw = switches();
  const categories = ['All', 'Appearance', 'Playback', 'Notifications', 'Ad blocking', 'Productivity', 'Extensions', 'Updates', 'Tools'];
  let selected = 'All';
  const search = el('input', { class: 'yuni-market-search', type: 'search', placeholder: 'Search YuniSpot', 'aria-label': 'Search Marketplace' });
  const tabs = el('div', { class: 'yuni-market-tabs', role: 'tablist', 'aria-label': 'Marketplace categories' });
  const grid = el('div', { class: 'yuni-market-grid', role: 'list' });

  const items = [
    { category: 'Playback', make: () => marketCard('\u25b6', 'Playback', 'Spotify native player', 'Spotify remains in control of play, seek, queue, and volume.', 'Active', [el('button', { class: 'yuni-market-toggle on', disabled: true }, 'Open player')]) },
    { category: 'Playback', make: () => marketCard('\u266a', 'Playback', 'Quick playback controls', 'Toggle shuffle, repeat, or like the track without leaving the Marketplace.', 'Ready', [
      el('button', { class: 'yuni-btn ghost sm', onclick: () => { if (!Y.player.shuffle()) Y.ui.toast('Shuffle control is unavailable'); } }, 'Shuffle'),
      el('button', { class: 'yuni-btn ghost sm', onclick: () => { if (!Y.player.repeat()) Y.ui.toast('Repeat control is unavailable'); } }, 'Repeat'),
      el('button', { class: 'yuni-btn sm', onclick: () => { if (!Y.player.like()) Y.ui.toast('Like control is unavailable'); } }, 'Like track'),
    ]) },
    { category: 'Notifications', make: () => marketSwitch(sw[0], 'Notifications', '\u266a') },
    { category: 'Notifications', make: () => marketCard('\u25a4', 'Notifications', 'Song card style', 'Preview your single YuniSpot song-change notification.', 'Available', [el('button', { class: 'yuni-btn ghost sm', onclick: () => Y.notify.show({ id: 'preview', tag: 'YuniSpot', title: 'Now playing', body: 'Your custom song card.', image: Y.player.cover() }) }, 'Preview')]) },
    { category: 'Appearance', make: () => marketSwitch(sw[1], 'Appearance', '\u25d0') },
    { category: 'Appearance', make: () => marketSwitch(sw[2], 'Appearance', '\u2261') },
    { category: 'Appearance', make: () => marketSwitch(sw[3], 'Appearance', '\u25ce') },
    { category: 'Appearance', make: () => marketSwitch(sw[4], 'Appearance', '\u25a6') },
    { category: 'Appearance', make: () => marketCard('\u25c9', 'Appearance', 'Accent colour', 'Choose the highlight colour used by controls and glass effects.', 'Customizable', [swatchesForMarketplace()]) },
    { category: 'Ad blocking', make: adblockProduct },
    { category: 'Updates', make: spotifyUpdatesProduct },
    { category: 'Productivity', make: () => marketCard('\u25d4', 'Productivity', 'Listening stats', 'Your listening time, history, top tracks, and artists.', Y.stats ? 'Available' : 'Disabled', [el('button', { class: 'yuni-btn sm', onclick: () => Y.stats && Y.stats.show() }, 'Open stats')]) },
    { category: 'Productivity', make: () => marketCard('\u263e', 'Productivity', 'Sleep timer', 'Pause after a duration or when the current track ends.', Y.sleep ? 'Available' : 'Disabled', [el('button', { class: 'yuni-btn sm', onclick: () => Y.sleep && Y.sleep.start(15) }, '15 min'), el('button', { class: 'yuni-btn ghost sm', onclick: () => Y.sleep && Y.sleep.endOfTrack() }, 'After track')]) },
    { category: 'Productivity', make: () => marketCard('\u23f1', 'Productivity', 'Focus timer', 'Timed work blocks with music pauses for breaks.', Y.focusTimer ? 'Available' : 'Disabled', [el('button', { class: 'yuni-btn sm', onclick: () => Y.focusTimer && Y.focusTimer.start(25, 5) }, '25 / 5'), el('button', { class: 'yuni-btn ghost sm', onclick: () => Y.focusTimer && Y.focusTimer.start(50, 10) }, '50 / 10')]) },
    { category: 'Productivity', make: () => marketCard('\u2605', 'Productivity', 'Daily listening goal', 'Set a daily listening target and keep a streak.', Y.stats && Y.stats.goal ? Y.stats.goal.minutes() + ' min' : 'Available', [el('button', { class: 'yuni-btn ghost sm', onclick: () => Y.stats && Y.stats.goal && Y.stats.goal.cycle() }, 'Change goal')]) },
    { category: 'Extensions', make: () => { const ext = Y.extensions.list(); return marketCard('\u29c9', 'Extensions', 'Your extensions', ext.loaded.length ? ext.loaded.map((x) => x.name).join(', ') : 'No extensions enabled.', ext.loaded.length ? ext.loaded.length + ' active' : 'None active', []); } },
    { category: 'Tools', make: () => marketCard('\u2318', 'Tools', 'Command palette', 'Jump to playback, navigation, timers, and YuniSpot features.', 'Available', [el('button', { class: 'yuni-btn sm', onclick: () => { Y.dashboard.close(); Y.palette.open(); } }, 'Open palette')]) },
    { category: 'Tools', make: () => marketCard('\u2606', 'Tools', 'Playlists & artists', 'Search playlists, artists, and albums or open a Spotify link.', 'Available', [el('button', { class: 'yuni-btn sm', onclick: () => { Y.dashboard.close(); Y.nav.hub('all'); } }, 'Browse')]) },
    { category: 'Tools', make: () => marketCard('\u25ce', 'Tools', 'Full-screen Now Playing', 'A focused cover-art view with ambient colour and playback controls.', 'Available', [el('button', { class: 'yuni-btn sm', onclick: () => { Y.dashboard.close(); Y.nowPlaying.open(); } }, 'Open view')]) },
    { category: 'Tools', make: () => marketCard('\u2699', 'Tools', 'Diagnostics & rescue', 'Check Spotify selectors or switch to a stable low-effect appearance.', 'Available', [el('button', { class: 'yuni-btn ghost sm', onclick: () => Y.commands.run('yunispot.diagnostics') }, 'Diagnostics'), el('button', { class: 'yuni-btn sm', onclick: () => Y.rescue.run('manual', false) }, 'Fix screen')]) },
    { category: 'Tools', make: () => marketCard('\u25a4', 'Tools', 'Welcome & guided tour', 'Replay setup or take the interactive tour of YuniSpot.', 'Available', [el('button', { class: 'yuni-btn ghost sm', onclick: () => { Y.dashboard.close(); Y.welcome.open({ first: true }); } }, 'Welcome'), el('button', { class: 'yuni-btn sm', onclick: () => { Y.dashboard.close(); Y.tour.start(); } }, 'Tour')]) },
    { category: 'Tools', make: () => marketCard('\u25a3', 'Tools', 'Settings backup', 'Copy or restore your YuniSpot appearance and feature settings.', 'Available', [el('button', { class: 'yuni-btn ghost sm', onclick: () => Y.commands.run('yunispot.settings.export') }, 'Copy'), el('button', { class: 'yuni-btn sm', onclick: () => { Y.dashboard.close(); Y.commands.run('yunispot.settings.import'); } }, 'Restore')]) },
  ];

  const catalog = items.map((item) => ({ category: item.category, card: item.make() }));
  const render = () => {
    const query = typeof search.value === 'string' ? search.value.trim().toLowerCase() : '';
    const found = catalog.filter((item) => (selected === 'All' || item.category === selected) && (!query || item.card.dataset.search.includes(query)));
    grid.replaceChildren(...(found.length ? found.map((item, index) => {
      item.card.style.animationDelay = Math.min(index, 8) * 28 + 'ms';
      return item.card;
    }) : [el('div', { class: 'yuni-market-empty' },
      el('div', {}, 'No matching YuniSpot tools.'),
      el('button', { class: 'yuni-btn ghost sm', type: 'button', onclick: () => { selected = 'All'; search.value = ''; render(); } }, 'Clear filters'))]));
    Array.from(tabs.children).forEach((button) => {
      const active = button.dataset.category === selected;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', String(active));
    });
  };
  categories.forEach((category) => tabs.appendChild(el('button', { class: 'yuni-market-tab' + (category === selected ? ' active' : ''), type: 'button', role: 'tab', 'aria-selected': String(category === selected), 'data-category': category, onclick: () => { selected = category; render(); } }, category)));
  search.addEventListener('input', render);
  const featured = el('button', { class: 'yuni-market-featured', type: 'button', onclick: () => {
    selected = 'Updates';
    render();
    const updateTab = Array.from(tabs.children).find((button) => button.dataset.category === 'Updates');
    if (updateTab && updateTab.scrollIntoView) updateTab.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  } },
  el('span', { class: 'yuni-market-feature-icon', 'aria-hidden': 'true' }, '\u21bb'),
  el('span', { class: 'yuni-market-feature-copy' },
    el('b', {}, 'Spotify updates, on your terms'),
    el('small', {}, 'Check for new releases, decide when to update, and reapply your YuniSpot setup.')),
  el('span', { class: 'yuni-market-feature-action' }, 'MANAGE \u2192'));
  render();
  return el('div', { class: 'yuni-marketplace' },
    el('div', { class: 'yuni-market-hero' },
      el('div', {}, el('div', { class: 'yuni-market-eyebrow' }, 'YUNISPOT / CATALOG'), el('h1', {}, 'Marketplace'), el('p', {}, 'Browse, tune, and launch everything in your Spotify companion.')),
      search),
    featured, tabs, grid);
}

function swatchesForMarketplace() {
  const container = el('div', { class: 'yuni-swatches' });
  const paint = () => {
    const active = Y.appearance.accent();
    container.replaceChildren(...Y.accents.map(([name, hex]) => el('button', { class: 'yuni-swatch' + (active === hex ? ' on' : ''), title: name, 'aria-label': name, style: { background: hex }, onclick: () => { Y.appearance.setAccent(hex); paint(); } })));
    container.appendChild(el('button', { class: 'yuni-swatch reset', onclick: () => { Y.appearance.setAccent(null); paint(); } }, 'Default'));
  };
  paint();
  return container;
}

function open() {
  if (Y.dashboard) Y.dashboard.open('marketplace');
}

/* The cart button: sits next to the profile picture when it can find it, otherwise floats top-right. */
function ensureButton() {
  if (document.getElementById && document.getElementById('yuni-store-btn')) return;
  const btn = Y.iconBtn('cart', 'YuniSpot Marketplace', open, 'bare');
  btn.id = 'yuni-store-btn';
  const host = document.querySelector && document.querySelector('[data-testid="user-widget-link"]');
  if (host && host.parentElement) host.parentElement.insertBefore(btn, host);
  else { btn.classList.add('float'); document.body.appendChild(btn); }
}
Y.on('ready', () => {
  ensureButton();
  // Spotify re-renders its top bar now and then; put the button back if it disappears, and move it
  // out of the floating spot once the profile button shows up.
  setInterval(() => {
    const b = document.getElementById && document.getElementById('yuni-store-btn');
    if (!b) ensureButton();
    else if (b.classList && b.classList.contains('float') && document.querySelector('[data-testid="user-widget-link"]')) { b.remove(); ensureButton(); }
  }, 3000);
});

Y.store = { open, switches, switchRow, marketplace };
Y.commands.register({ id: 'yunispot.store', title: 'Open YuniSpot Marketplace', section: 'YuniSpot', keywords: ['store', 'marketplace', 'shop', 'features', 'tools', 'preferences'], shortcut: 'Ctrl+Shift+Y', run: open });
Y.keys.bind('mod+shift+y', open, { allowInInput: true });
