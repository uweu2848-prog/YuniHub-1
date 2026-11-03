const Y = window.YuniSpot;

/*
 * Extensions receive an `api` object. Capabilities are gated by the permissions declared in
 * manifest.json. This is a convention that makes extensions reviewable ("this one only touches
 * the UI"); it is NOT a security sandbox: extension code still runs inside Spotify's page.
 * Only install extensions you trust.
 */
const pending = [];
const loaded = [];
const failed = [];

Y.registerExtension = (manifest, fn) => { pending.push({ manifest, fn }); };

function buildApi(manifest) {
  const id = manifest.name;
  const perms = new Set(manifest.permissions || []);
  const api = { id, version: manifest.version, permissions: [...perms], log: (...a) => Y.log('[' + id + ']', ...a) };

  const expose = (name, perm, value) => Object.defineProperty(api, name, {
    enumerable: true,
    get() {
      if (!perms.has(perm)) throw new Error('Extension "' + id + '" needs the "' + perm + '" permission to use api.' + name);
      return value;
    },
  });

  expose('player', 'player', {
    toggle: Y.player.toggle, next: Y.player.next, prev: Y.player.prev, seek: Y.player.seek,
    isPlaying: Y.player.isPlaying, current: Y.player.current, position: Y.player.position, duration: Y.player.duration,
    on: (ev, fn) => { if (!['songchange', 'playpause', 'tick'].includes(ev)) throw new Error('unknown player event ' + ev); return Y.on(ev, fn); },
  });
  expose('ui', 'ui', {
    toast: Y.ui.toast, modal: Y.ui.modal, el: Y.dom.el,
    addStyle: (css) => Y.dom.css('ext-' + id, css),
    registerCommand: (cmd) => Y.commands.register({ ...cmd, id: id + '.' + cmd.id, section: cmd.section || id }),
    bindKey: Y.keys.bind,
  });
  expose('storage', 'storage', Y.storageFor(id));
  expose('network', 'network', { fetch: (...a) => fetch(...a) });
  expose('platform', 'platform', { get: () => Y.finder.platform(), finder: Y.finder });
  return api;
}

Y.extensions = {
  runAll() {
    for (const { manifest, fn } of pending.splice(0)) {
      try { fn(buildApi(manifest)); loaded.push({ name: manifest.name, version: manifest.version, permissions: manifest.permissions || [] }); }
      catch (e) { failed.push({ name: manifest.name, error: String(e && e.message || e) }); Y.warn('extension "' + manifest.name + '" failed', e); }
    }
  },
  list: () => ({ loaded: loaded.slice(), failed: failed.slice() }),
};
