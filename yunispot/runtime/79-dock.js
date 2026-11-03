const Y = window.YuniSpot;

// The glass-player takeover is intentionally disabled. Spotify's native player remains active.
Y.dock = {
  isOn() { return false; },
  enabled() { return false; },
  set() { return false; },
  toggle() { return false; },
};
