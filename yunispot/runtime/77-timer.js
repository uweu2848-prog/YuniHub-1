const Y = window.YuniSpot;

/* Focus timer (pomodoro): work block, then optionally pauses music for a break. Lives only in this session. */
let t = null;
const fmt = (s) => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');

function stop(silent) {
  if (!t) return;
  clearInterval(t.iv); t = null;
  Y.emit('focustimer', null);
  if (!silent) Y.ui.toast('Focus timer cancelled');
}

function start(workMin, breakMin) {
  stop(true);
  const end = Date.now() + workMin * 60000;
  t = { phase: 'focus', end, workMin, breakMin };
  Y.ui.toast('Focus for ' + workMin + ' min. Break: ' + breakMin + ' min.');
  t.iv = setInterval(() => {
    const left = Math.max(0, Math.round((t.end - Date.now()) / 1000));
    Y.emit('focustimer', { phase: t.phase, left, label: fmt(left) });
    if (left > 0) return;
    if (t.phase === 'focus') {
      if (Y.player.isPlaying()) Y.player.toggle();
      Y.ui.toast('Time for a ' + t.breakMin + ' min break. Music paused.', 6000);
      t.phase = 'break'; t.end = Date.now() + t.breakMin * 60000;
    } else {
      Y.ui.toast('Break over. Ready for another round?', 6000);
      stop(true);
    }
  }, 1000);
}

Y.focusTimer = { start, stop, status: () => (t ? { phase: t.phase, left: Math.max(0, Math.round((t.end - Date.now()) / 1000)) } : null) };
const reg = (id, title, run, kw) => Y.commands.register({ id: 'yunispot.focus.' + id, title, run, section: 'Focus timer', keywords: kw || ['pomodoro', 'study', 'work'] });
reg('25', 'Focus timer: 25 min work, 5 min break', () => start(25, 5));
reg('50', 'Focus timer: 50 min work, 10 min break', () => start(50, 10));
reg('15', 'Focus timer: 15 min sprint', () => start(15, 3));
reg('status', 'Focus timer: how long is left?', () => {
  const s = Y.focusTimer.status();
  Y.ui.toast(s ? (s.phase === 'focus' ? 'Focus' : 'Break') + ': ' + fmt(s.left) + ' left' : 'No focus timer running');
});
reg('stop', 'Focus timer: cancel', () => stop(false));
