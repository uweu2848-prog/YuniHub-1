import assert from 'node:assert/strict';
import test from 'node:test';
import { buildDiscordPresencePayload } from '../renderer/discord-presence.mjs';

test('builds a richer project presence payload with session timing and labels', () => {
  const payload = buildDiscordPresencePayload({
    project: {
      id: 'proj-1',
      name: 'Project Atlas',
      track: 'Android',
      status: 'Building',
      tasks: [{ d: true }, { d: false }, { d: false }],
    },
    view: 'project',
    settings: {
      hubName: 'YuniHub',
      theme: 'dehbify',
      presenceShowProject: true,
    },
    overall: { count: 3, pct: 67 },
    sessionStartedAt: Date.now() - 1800000,
  });

  assert.equal(payload.details, 'Working on Project Atlas');
  assert.match(payload.state, /Android/);
  assert.match(payload.state, /Building/);
  assert.match(payload.state, /Etherium Theme/);
  assert.equal(payload.smallText, 'Android project');
  assert.equal(typeof payload.startTimestamp, 'number');
  assert.ok(Array.isArray(payload.buttons));
  assert.equal(payload.buttons.length, 2);
});

test('uses a coding-focused state when the studio view is active', () => {
  const payload = buildDiscordPresencePayload({
    project: null,
    view: 'Studio',
    settings: {
      hubName: 'YuniHub',
      theme: 'dehbify',
      presenceShowProject: true,
    },
    overall: { count: 5, pct: 42 },
    sessionStartedAt: Date.now() - 900000,
  });

  assert.equal(payload.details, 'Coding in the studio');
  assert.match(payload.state, /5 project/);
  assert.match(payload.state, /Etherium Theme/);
  assert.equal(payload.largeImage, 'yunihub_dehbify');
  assert.equal(payload.smallImage, 'workspace_dehbify');
});

test('uses the Etherium Theme name in settings presence', () => {
  const payload = buildDiscordPresencePayload({
    project: null,
    view: 'settings',
    settings: { theme: 'dehbify' },
    overall: { count: 1, pct: 100 },
  });

  assert.match(payload.state, /Etherium Theme/);
  assert.doesNotMatch(payload.state, /Theme theme/);
});

test('uses Berry Baby colors and asset keys in Discord presence', () => {
  const payload = buildDiscordPresencePayload({
    project: null,
    view: 'home',
    settings: { theme: 'berrybaby' },
    overall: { count: 2, pct: 50 },
  });

  assert.equal(payload.largeImage, 'yunihub_berrybaby');
  assert.equal(payload.smallImage, 'workspace_berrybaby');
  assert.match(payload.state, /Berry Baby Theme/);
});

test('shows the current Spotify track and artist in Rich Presence', () => {
  const payload = buildDiscordPresencePayload({
    project: null,
    view: 'Spotify',
    settings: { theme: 'berrybaby' },
    spotify: { name: 'Track One', artists: 'Artist One', album: 'Album One', isPlaying: true },
  });

  assert.equal(payload.details, 'Listening to Track One');
  assert.equal(payload.state, 'Artist One · Spotify');
  assert.equal(payload.smallText, 'Album One');
  assert.equal(payload.largeImage, 'yunihub_berrybaby');
});
