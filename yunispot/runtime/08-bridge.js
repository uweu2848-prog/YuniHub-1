const Y = window.YuniSpot;
const config = Y.boot && Y.boot.bridge;

async function request(route, method, payload) {
  if (!config || !config.port || !config.token || typeof window.fetch !== 'function') {
    throw new Error('Store helper is not available. Run YuniSpot apply first.');
  }
  const response = await window.fetch('http://127.0.0.1:' + config.port + route, {
    method,
    mode: 'cors',
    cache: 'no-store',
    headers: { Authorization: 'Bearer ' + config.token, ...(payload ? { 'Content-Type': 'application/json' } : {}) },
    ...(payload ? { body: JSON.stringify(payload) } : {}),
  });
  let data;
  try { data = await response.json(); } catch { data = {}; }
  if (!response.ok) throw new Error(data.error || 'Store helper request failed.');
  return data;
}

Y.bridge = {
  available: () => !!(config && config.port && config.token && typeof window.fetch === 'function'),
  status: () => request('/status', 'GET'),
  install: () => request('/adblock/install', 'POST'),
  uninstall: () => request('/adblock/uninstall', 'POST'),
  updateStatus: () => request('/spotify/update', 'GET'),
  updateSpotify: () => request('/spotify/update', 'POST'),
};

let checkingSpotifyUpdate = false;
async function checkSpotifyUpdate() {
  if (checkingSpotifyUpdate || !Y.bridge.available()) return;
  checkingSpotifyUpdate = true;
  let promptId = null;
  try {
    const update = await Y.bridge.updateStatus();
    if (!update.available || !update.releaseId) return;
    if (Y.storage.get('spotify:update-dismissed', '') === update.releaseId ||
      Y.storage.get('spotify:update-prompted', '') === update.releaseId) return;
    const installed = await Y.bridge.status();
    const patches = installed.spotx ? 'YuniSpot and SpotX' : 'YuniSpot';
    promptId = update.releaseId;
    Y.storage.set('spotify:update-prompted', update.releaseId);
    const accepted = await Y.ui.confirm(
      'Spotify update available',
      'Spotify ' + (update.latestVersion || 'has a new release') + ' is available (you have ' + (update.currentVersion || 'an earlier version') + '). Update and reapply ' + patches + ' now?',
      { cancel: 'Stay on this version', confirm: 'Update & reapply' },
    );
    if (!accepted) {
      Y.storage.set('spotify:update-dismissed', update.releaseId);
      return;
    }
    await Y.bridge.updateSpotify();
    Y.notify.show({
      id: 'spotify-update-started',
      tag: 'YuniSpot',
      title: 'Spotify update started',
      body: 'Spotify will restart after the official installer finishes, then YuniSpot and any installed SpotX patch will be reapplied.',
      ms: 7000,
    });
  } catch (e) {
    if (promptId) Y.storage.remove('spotify:update-prompted');
    Y.warn('Spotify update workflow failed', e);
    Y.notify.show({ id: 'spotify-update-check-failed', tag: 'YuniSpot', title: promptId ? 'Spotify update could not be started' : 'Spotify update check failed', body: e.message, ms: 6500 });
  } finally {
    checkingSpotifyUpdate = false;
  }
}

Y.on('ready', () => {
  if (!Y.bridge.available()) return;
  setTimeout(async () => {
    try {
      const status = await Y.bridge.status();
      const operation = status.lastOperation;
      if (!operation || !['complete', 'failed'].includes(operation.state)) return;
      const id = operation.action + ':' + operation.at;
      if (Y.storage.get('bridge:last-operation', '') === id) return;
      Y.storage.set('bridge:last-operation', id);
      Y.notify.show({
        id: 'adblock-operation',
        tag: 'YuniSpot',
        title: operation.state === 'complete'
          ? operation.action === 'spotify-update'
            ? 'Spotify updated'
            : (operation.action === 'install' ? 'Ad blocker installed' : 'Ad blocker removed')
          : operation.action === 'spotify-update' ? 'Spotify update failed' : 'Ad blocker update failed',
        body: operation.message,
        ms: 6500,
      });
    } catch (e) { Y.warn('could not read ad blocker status', e); }
    checkSpotifyUpdate();
    setInterval(checkSpotifyUpdate, 6 * 60 * 60 * 1000);
  }, 900);
});