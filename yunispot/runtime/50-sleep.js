const Y = window.YuniSpot;
if (Y.feature('sleepTimer')) {
  let timer = null, endAt = 0, offTrack = null;

  function cancel(silent) {
    clearTimeout(timer); timer = null; endAt = 0;
    if (offTrack) { offTrack(); offTrack = null; }
    if (!silent) Y.ui.toast('Sleep timer cancelled');
  }
  const FADE = 20;
  const fadeOn = () => Y.storage.get('sleep:fade', true);
  function pauseNow() {
    if (Y.player.isPlaying()) Y.player.toggle();
    Y.ui.toast('Sleep timer: playback paused. Good night!');
  }
  // Lower the volume to zero over FADE seconds, pause, then put the volume back so tomorrow isn't silent.
  function fadeThenPause() {
    const v0 = Y.player.volume();
    if (v0 === null || v0 <= 0.02 || !Y.player.isPlaying()) return pauseNow();
    Y.ui.toast('Fading out\u2026');
    let n = 0;
    const iv = setInterval(() => {
      n++;
      Y.player.setVolume(Math.max(0, v0 * (1 - n / FADE)));
      if (n < FADE) return;
      clearInterval(iv);
      pauseNow();
      setTimeout(() => Y.player.setVolume(v0), 1500);
    }, 1000);
  }
  function fire(fade) {
    cancel(true);
    if (fade && fadeOn()) fadeThenPause(); else pauseNow();
  }

  Y.sleep = {
    start(minutes) {
      cancel(true);
      endAt = Date.now() + minutes * 60000;
      // start fading FADE seconds early so the music is silent exactly when the timer ends
      const lead = fadeOn() && minutes * 60 > FADE * 2 ? FADE * 1000 : 0;
      timer = setTimeout(() => fire(lead > 0), minutes * 60000 - lead);
      Y.ui.toast('Sleep timer set for ' + minutes + ' min');
    },
    /** Pauses as soon as the next track begins (i.e. the current one is allowed to finish). */
    endOfTrack() {
      cancel(true);
      offTrack = Y.on('songchange', () => { setTimeout(() => fire(false), 400); });
      Y.ui.toast('Will pause after this track');
    },
    cancel: () => cancel(false),
    remainingMs: () => (endAt ? Math.max(0, endAt - Date.now()) : 0),
  };

  for (const m of [15, 30, 45, 60]) {
    Y.commands.register({ id: 'yunispot.sleep.' + m, title: 'Sleep timer: ' + m + ' minutes', section: 'Sleep', keywords: ['timer', 'pause', 'bed'], run: () => Y.sleep.start(m) });
  }
  Y.commands.register({ id: 'yunispot.sleep.track', title: 'Sleep timer: after this track', section: 'Sleep', keywords: ['timer'], run: () => Y.sleep.endOfTrack() });
  Y.commands.register({ id: 'yunispot.sleep.cancel', title: 'Sleep timer: cancel', section: 'Sleep', run: () => Y.sleep.cancel() });
  Y.commands.register({
    id: 'yunispot.sleep.left', title: 'Sleep timer: time remaining', section: 'Sleep',
    run() {
      const ms = Y.sleep.remainingMs();
      Y.ui.toast(ms ? Math.ceil(ms / 60000) + ' min left on sleep timer' : 'No sleep timer running');
    },
  });
}
