// Every extension is a function body that receives `api`.
// Only the capabilities listed in manifest.json "permissions" are usable.

const store = api.storage;
const count = (store.get('songs', 0) || 0);
api.log('loaded; songs seen in earlier sessions:', count);

// Show a toast each time the track changes.
api.player.on('songchange', (track) => {
  store.set('songs', (store.get('songs', 0) || 0) + 1);
  api.ui.toast('\u266a ' + track.title + (track.artist ? ' \u2014 ' + track.artist : ''), 2200);
});

// Add an entry to the Ctrl+K command palette.
api.ui.registerCommand({
  id: 'hello',
  title: 'Say hello (example extension)',
  keywords: ['demo', 'example'],
  run() {
    const t = api.player.current();
    api.ui.toast(t ? 'Hello! You are listening to ' + t.title : 'Hello from YuniSpot!');
  },
});
