'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');

const home = os.homedir();

function candidates() {
  if (process.platform === 'win32') {
    const a = process.env.APPDATA || path.join(home, 'AppData', 'Roaming');
    return [{ apps: path.join(a, 'Spotify', 'Apps'), prefs: path.join(a, 'Spotify', 'prefs') }];
  }
  if (process.platform === 'darwin') {
    return [{
      apps: '/Applications/Spotify.app/Contents/Resources/Apps',
      prefs: path.join(home, 'Library', 'Application Support', 'Spotify', 'prefs'),
    }];
  }
  const nativePrefs = path.join(home, '.config', 'spotify', 'prefs');
  const flatpakPrefs = path.join(home, '.var', 'app', 'com.spotify.Client', 'config', 'spotify', 'prefs');
  return [
    { apps: '/opt/spotify/Apps', prefs: nativePrefs },
    { apps: '/usr/share/spotify/Apps', prefs: nativePrefs },
    { apps: '/var/lib/flatpak/app/com.spotify.Client/x86_64/stable/active/files/extra/share/spotify/Apps', prefs: flatpakPrefs },
    { apps: path.join(home, '.local/share/flatpak/app/com.spotify.Client/x86_64/stable/active/files/extra/share/spotify/Apps'), prefs: flatpakPrefs },
    { apps: '/snap/spotify/current/usr/share/spotify/Apps', prefs: nativePrefs },
  ];
}

const hasClient = (apps) =>
  ['xpui.spa', 'xpui.spa.yuni-bak', 'xpui'].some((n) => fs.existsSync(path.join(apps, n)));

/** Resolve the Spotify install. Priority: env vars > config.json > auto-detect. */
function detect(cfg = {}) {
  const apps = process.env.YUNISPOT_APPS || cfg.spotifyAppsPath;
  const prefs = process.env.YUNISPOT_PREFS || cfg.spotifyPrefsPath;
  if (apps) {
    const guess = candidates()[0];
    return { apps, prefs: prefs || (guess && guess.prefs) };
  }
  for (const cand of candidates()) {
    if (fs.existsSync(cand.apps) && hasClient(cand.apps)) {
      return { apps: cand.apps, prefs: prefs || cand.prefs };
    }
  }
  return null;
}

module.exports = { detect, candidates };
