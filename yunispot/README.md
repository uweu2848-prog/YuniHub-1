# YuniSpot

Themes, extensions and a command palette for the **Spotify desktop client**. Zero dependencies, one small Node CLI, a lean injected runtime.

## Install

Requires [Node.js 18+](https://nodejs.org) and the regular Spotify desktop app (on Windows, the installer from spotify.com, **not** the Microsoft Store version).

```bash
cd yunispot
node bin/yunispot.js apply  # close Spotify first; no npm install is needed
```

For the global `yunispot` command instead, run `npm link` in this folder and then `yunispot apply`.

For a standalone release package, install the downloaded archive globally (for example, `npm install --global .\yunispot-0.8.1.tgz`) and run `yunispot apply`.

Start Spotify. The first launch opens a **welcome screen** (quick setup, the basics, and a guided tour of the real app). After that, **Ctrl+K** (Cmd+K on Mac) opens the command palette and **Ctrl+Shift+H** opens the YuniSpot dashboard.

To undo everything: `yunispot restore`.

### First launch: welcome, tutorial and tour

New installs open a short wizard on their own, once:

1. **Welcome**: what YuniSpot is, in three lines
2. **Make it yours**: Full glass or Performance look, accent colour, song cards, and font. Spotify's native player stays in place
3. **The basics**: how to play, control and search, plus the shortcuts worth remembering
4. **If something looks wrong**: the safety net (see below)
5. **Guided tour** (optional): a spotlight that points at the real buttons on screen (player, Store, sidebar, palette, shortcuts). Arrow keys or buttons move through it; Esc skips

After a YuniSpot update the same screen shows just a **what's new** list. Replay either any time from the palette: `YuniSpot: Show welcome screen` and `YuniSpot: Take the guided tour`.

### If the screen goes blank

YuniSpot repaints Spotify, so it ships with a safety net:

- **Automatic**: if Spotify's player is up but the main view is hidden or gone for about 5 seconds, YuniSpot switches itself to safe visuals and tells you
- **Manual**: **Ctrl+Alt+Shift+R** (Cmd+Option+Shift+R on Mac), or `YuniSpot: Fix blank screen` in the palette. Keyboard shortcuts keep working even when nothing is painted
- **From a terminal**: `yunispot safe on`, then restart Spotify. It starts with solid visuals while keeping Spotify's native player. `yunispot safe off` goes back
- **Nuclear option**: `yunispot restore` puts Spotify back exactly as it was

Safe visuals = glass effects off, Spotify's native player untouched. Turn the appearance back on in the Store.

### Permissions (macOS / Linux)

Spotify's folder must be writable by you:

```bash
# macOS
sudo chmod a+wr /Applications/Spotify.app
sudo chmod -R a+wr /Applications/Spotify.app/Contents/Resources/Apps

# Linux (adjust the path; `yunispot doctor` prints it)
sudo chmod a+wr /opt/spotify && sudo chmod -R a+wr /opt/spotify/Apps
```

Flatpak/Snap builds can be hard to patch (read-only); the apt/AUR/.deb install is easiest.

## Commands

| Command | What it does |
|---|---|
| `yunispot apply` | Back up Spotify, inject YuniSpot, enable developer mode |
| `yunispot restore` | Put Spotify back exactly as it was |
| `yunispot doctor` | Diagnose problems. **Run this (then `apply`) after every Spotify update** |
| `yunispot watch` | Rebuild on every file change; reload Spotify with Ctrl+Shift+R |
| `yunispot status` | Show theme, extensions and features at a glance |
| `yunispot safe on\|off\|status` | Start Spotify with safe visuals (no blur). Use it if the screen is blank |
| `yunispot adblock status` | Show whether Windows SpotX and YuniSpot patches are active |
| `yunispot adblock install` | Download and run the latest official Windows SpotX source, then reapply YuniSpot |
| `yunispot adblock uninstall` | Restore YuniSpot, run SpotX's uninstaller, then reapply YuniSpot |
| `yunispot accent <#hex \| reset>` | Override the theme's accent colour without editing a theme |
| `yunispot new theme\|ext <name>` | Scaffold a new theme or extension in `~/.yunispot` |
| `yunispot export <file>` / `import <file>` | Back up or restore your config |
| `yunispot ext install <folder>` / `ext remove <name>` | Install or remove a third-party extension (manifest and permissions are validated first) |
| `yunispot theme install <folder>` / `theme remove <name>` | Install or remove a custom theme |
| `yunispot theme list / set <name>` | Switch theme |
| `yunispot ext list / enable / disable <name>` | Manage extensions |
| `yunispot config [key] [value]` | e.g. `yunispot config features.stats false` |

Your files live in `~/.yunispot/` (themes, extensions, config, backup).

On Windows, the YuniSpot Marketplace's **Ad blocking** category manages SpotX install, update, and removal. After updating YuniSpot, close Spotify and run `yunispot apply` once to install the Marketplace helper. The helper downloads the current `main` commit from the official `SpotX-Official/SpotX` GitHub repository whenever SpotX is installed, updated, or removed; no SpotX checkout or local path is needed. It asks before closing Spotify, applies the native patch, and relaunches Spotify. If SpotX was already installed by an older YuniSpot version, choose **Update SpotX** in the Marketplace or run `yunispot adblock install`.

CLI commands remain available for setup and recovery:

```powershell
yunispot adblock install
```

YuniSpot restores its UI before SpotX changes the native client, then reapplies itself. The integration disables SpotX's Defender exclusions and enables Spotify automatic-update blocking. The Marketplace checks Spotify's official Windows installer every six hours while Spotify is open, compares its signed version with the installed client, and prompts when a newer version is available. Choosing **Update & reapply** downloads and verifies Spotify's signed installer, removes and reapplies the latest official SpotX source if installed, verifies that Spotify's version changed, reapplies YuniSpot, then relaunches Spotify. `yunispot restore` only removes YuniSpot; use `yunispot adblock uninstall` or the Store to also remove SpotX.

## The look

The default theme is **YuniHub**: red and black aero-glass.

- Dark base with red radial glows; every main panel is translucent glass (blur + saturation) with a soft inner highlight and thin border
- Red glass play/pause buttons whose icons are drawn by the theme itself, so they always show; red glass pill buttons, red progress bars, red focus rings and card hover glow
- Monospace type (JetBrains Mono if installed, otherwise Cascadia Code / Consolas / SF Mono)
- YuniSpot's own windows (palette, stats, toasts, dashboard) use the same style, with chip labels and rounded cards like YuniHub

Two palette commands tune it: **Toggle glass effects (performance mode)** turns blur off if your GPU struggles, and **Toggle monospace font** swaps to a sans font.
Other themes: `yunispot theme set aero` (sky-blue Vista/Win7 glass), `yuni` (violet) or `midnight` (blue), then `yunispot apply`.

Bundled themes upgrade themselves on `apply`. If you edited one, it is left alone and `yunispot theme reset <name>` restores the bundled version.

## What's built in

- **Native Spotify playback**: Spotify's own player bar remains visible and in control. YuniSpot themes the surrounding app and adds matching in-app song cards without replacing playback controls
- **YuniSpot Marketplace** (cart icon or Ctrl/Cmd+Shift+Y): browse feature cards, switch appearance and notification options, manage SpotX, and launch tools from the same surface as Home
- **Notification cards**: song changes (and every toast) now appear as glass cards with cover art and Skip / Artist buttons. No browser permission needed
- **Accent everywhere**: the progress bar, volume bar, shuffle/repeat/like states and the animated now-playing bars in track rows follow your accent colour instead of Spotify green
- **Full-screen Now Playing** (Ctrl/Cmd+Shift+N, or the expand button in the player): big cover art with a glass reflection on a blurred, colour-matched backdrop. Esc closes it, Space plays/pauses
- **Pins**: star playlists and artists in the browser (Ctrl/Cmd+Shift+J), or use `Pin current artist` / `Pin the page I am on`. Pins appear on the dashboard and as `Open pinned: ...` commands in the palette
- **Stats** now include a 24-hour chart of when you listen most
- **Accessible sliders**: seek and volume can be focused and moved with the arrow keys, Home and End; the mouse wheel changes volume
- **Cover-colour glow**: the full-screen Now Playing view picks a colour from album art (falls back to your accent if the image can't be read)
- **Daily goal + streak**: set 30/60/90/120 minutes in Marketplace or Home; you get a card when you hit it and a streak count
- **Sleep timer fade-out**: volume ramps down over the last 20 s, then pauses and restores the volume
- **Shortcuts**: Ctrl/Cmd+Alt+Up/Down volume, +Left/Right seek 10 s, +M mute, +L like. `Show keyboard shortcuts` lists everything
- **Safe mode**: if Spotify's UI restarts 3+ times within seconds, YuniSpot switches to solid visuals without replacing Spotify's player. `Copy diagnostics report` produces a paste-ready report with no personal data. `Copy my settings` / `Restore settings` back up your look and feature switches
- **Playlists & artists browser** (Ctrl/Cmd+Shift+J): jump to your playlists, artist profiles and albums, filter them, or paste any Spotify link or URI (`open.spotify.com/...`, `spotify:artist:...`). Also `Go to current artist profile` and `Go to current track page`
- **Focus timer**: 15/25/50 minute work blocks that pause the music for your break
- **Welcome wizard + guided tour**: setup, tutorial and a spotlight tour on first launch; a "what's new" list after updates. Reopen with `YuniSpot: Show welcome screen` / `YuniSpot: Take the guided tour`
- **Blank-screen rescue**: a watchdog and a Ctrl+Alt+Shift+R shortcut that switch to safe visuals; `yunispot safe on` for when the UI is unusable
- **Dashboard** (Ctrl+Shift+H): greeting, live clock, today's listening time and plays, now-playing bar with play/next, tool cards, and recently played

- **Command palette** (Ctrl/Cmd+K): fuzzy search, remembers recent commands, every feature and extension plugs into it
- **Listening stats**: total time, last 7 days, top tracks and artists (stored locally only)
- **Play history**: last 100 plays on this device, with export (`Show play history`)
- **Song notifications**: optional YuniSpot glass card on every track change. `apply` disables Spotify's duplicate native desktop toast; `restore` returns the original Spotify preference.
- **Windows ad blocking**: the Marketplace downloads the latest SpotX source from its official GitHub repository for audio, banner, and video ad blocking, and pauses Spotify automatic updates while SpotX is installed
- **Spotify update choice**: the Windows Marketplace checks Spotify's official installer for new releases. Choose **Update & reapply** to run its signed installer and then reapply SpotX and YuniSpot, or stay on the current version
- **Focus mode** hides the sidebars; **compact lists** tighten track rows
- **Export** listening stats and history as JSON from the palette
- **Sleep timer**: 15/30/45/60 min or after the current track
- **Navigation / playback commands**: home, search, liked songs, queue, play/pause, next/prev, shuffle, repeat
- **Extension system** with manifests and permissions
- **Themes** driven by a small `config.json` of colors plus plain CSS
- **In-app diagnostics** (`YuniSpot: Diagnostics`): read-only; shows which Spotify selectors still work and whether the main view is visible

## How it works

1. `apply` copies `xpui.spa` (Spotify's UI archive) to a backup, extracts it to `Apps/xpui/` and renames the original `.spa` aside. Spotify loads the folder instead.
2. It adds `yunispot/yunispot.js` + `.css` and two lines to `index.html`.
3. The bundle is built from `runtime/*.js` + your enabled extensions + your theme.
4. If Spotify updates, it puts a fresh `xpui.spa` back. `doctor` notices; run `apply` again.

## Writing a theme

`~/.yunispot/themes/<name>/` needs `theme.css` and (optionally) `config.json`:

```json
{ "name": "Mine", "colors": { "base": "#000", "highlight": "#111", "press": "#000", "elevated": "#181818",
  "elevatedHighlight": "#222", "text": "#fff", "subdued": "#aaa", "accent": "#ff6b6b" } }
```

Then `yunispot theme set <name> && yunispot apply`.

## Writing an extension

`~/.yunispot/extensions/<name>/manifest.json` + `index.js` (see `extensions/hello-yuni`).

```json
{ "name": "my-ext", "version": "1.0.0", "permissions": ["player", "ui", "storage"] }
```

```js
// index.js: the body of a function that receives `api`
api.player.on('songchange', (t) => api.ui.toast('Now playing ' + t.title));
api.ui.registerCommand({ id: 'hi', title: 'Say hi', run: () => api.ui.toast('hi') });
```

| Permission | Gives `api.` |
|---|---|
| `player` | `toggle next prev seek isPlaying current position duration on(songchange\|playpause\|tick)` |
| `ui` | `toast modal el addStyle registerCommand bindKey` |
| `storage` | `get set remove` (private to the extension) |
| `network` | `fetch` |
| `platform` | `get()` (Spotify internals), `finder` |

> Permissions make extensions easy to review ("this one only touches the UI"). They are **not a security sandbox**. Only install extensions you trust.

## Project layout

```
bin/yunispot.js      CLI entry
src/                 apply/restore/doctor, bundle builder, zip reader, patch engine, CLI
runtime/             code injected into Spotify (00 core, 05 icons, 06 notify, 07 ambient, 08 bridge, 10 finder, 20 player, 30 palette, 40 stats, 50 sleep, 60 extensions, 70 appearance, 75 extras, 76 nav, 77 timer, 78-79 compatibility stubs, 80 dashboard, 81 nowplaying, 84 tour, 85 welcome, 86 store, 90 tools, 91 rescue, 99 start)
themes/ extensions/  bundled examples (copied to ~/.yunispot on first run)
test/smoke.js        end-to-end test against a fake Spotify install   (npm test)
test/dom.js          real-DOM tests of the wizard, tour and rescue     (npm install --no-save jsdom && npm run test:dom)
```

## Keeping it fast

- One bundle, no framework, no dependencies
- Player state uses a single 1 s poll (three DOM reads) instead of a subtree MutationObserver
- Diagnostics are read-only: they never hook Spotify's webpack runtime and the React lookup is time-boxed
- Backdrop blur is limited to the big theme panels, the player and small cards. Full-screen overlays, dialogs, the dashboard, the wizard and the tour never blur (stacking blurs is what can make Chromium paint a blank window)
- Stats are batched to storage every 15 s, not every tick
- Palette and stats UI are built on demand

## Known limits (please read)

- **Not tested against a live Spotify build.** The patcher, zip handling, runtime boot and extension system are covered by `npm test` on a simulated install, and the wizard, tour and rescue by `npm run test:dom` in a jsdom page shaped like Spotify's. A real GPU and a real Spotify build can still surprise us; that is what the rescue tools are for. Spotify's real DOM changes often, so some selectors (`runtime/20-player.js`, the `SEL` table) or theme rules may need a tweak the first time. `Diagnostics` shows exactly which ones fail, and all selectors live in one table.
- Spotify updates can overwrite the patch. On Windows, SpotX can pause automatic updates and the Marketplace can update/reapply both patches; on macOS and Linux, run `yunispot apply` again after an update.
- The Windows update/reapply workflow is not exercised against a live Spotify install by the automated tests. It requires the standard Spotify installer and internet access to fetch the latest SpotX source.
- The "now playing" player controls are language-independent where possible, but "is playing" falls back to the button's English label if the internal player state isn't found.
- Modifying the Spotify client is against Spotify's Terms of Service. Use at your own risk. SpotX is an external native patcher; Spotify updates can replace its patches, so rerun the patchers after updates.

## Roadmap

Smart playlists and a queue manager (needs Web API auth), better lyrics, a community theme/extension marketplace, per-device EQ presets, a TypeScript API package with typings.
