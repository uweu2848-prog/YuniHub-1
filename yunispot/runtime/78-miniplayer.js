const Y = window.YuniSpot;

// The glass/mini-player takeover is intentionally disabled. Spotify's native player remains in control.
Y.mini = {
  open() { return false; },
  close() { return false; },
  toggle() { return false; },
  isOpen() { return false; },
};
