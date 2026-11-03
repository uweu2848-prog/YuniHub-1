export function buildDiscordPresencePayload({ project = null, view = 'home', settings = {}, overall = {}, sessionStartedAt = Date.now(), spotify = null }) {
  const hub = settings.hubName || 'YuniHub';
  const dehbify = settings.theme === 'dehbify';
  const berryBaby = settings.theme === 'berrybaby';
  const themeLabel = dehbify ? 'Etherium Theme' : (berryBaby ? 'Berry Baby Theme' : '');
  const withTheme = (state) => themeLabel ? `${state} · ${themeLabel}` : state;
  const total = overall && typeof overall === 'object' ? overall : { count: 0, pct: 0 };
  const count = Number(total.count) || 0;
  const pct = Number(total.pct) || 0;
  const summary = `${count} project${count === 1 ? '' : 's'} · ${pct}% done`;
  const out = {
    largeImage: berryBaby ? 'yunihub_berrybaby' : (dehbify ? 'yunihub_dehbify' : 'yunihub'),
    largeText: `${hub} · The All In One Hub by Yunikus.`,
    smallImage: berryBaby ? 'workspace_berrybaby' : (dehbify ? 'workspace_dehbify' : 'workspace'),
    smallText: `${hub} workspace`,
    buttons: [
      { label: 'Open workspace', url: 'https://yunihub.app' },
      { label: 'View projects', url: 'https://yunihub.app' }
    ]
  };

  if ((view === 'Spotify' || view === 'spotify') && spotify && spotify.name) {
    out.details = `${spotify.isPlaying ? 'Listening to' : 'Paused'} ${spotify.name}`;
    out.state = `${spotify.artists || 'Unknown artist'} · Spotify`;
    out.smallText = spotify.album || `${hub} workspace`;
    out.startTimestamp = sessionStartedAt;
    out.buttons = [{ label: 'Open Spotify', url: 'https://open.spotify.com' }];
    return out;
  }

  if (project) {
    const taskTotal = Array.isArray(project.tasks) ? project.tasks.length : 0;
    const taskDone = Array.isArray(project.tasks) ? project.tasks.filter((task) => task && task.d).length : 0;
    const taskText = taskTotal ? `${taskDone}/${taskTotal} tasks` : 'No tasks yet';
    out.details = settings.presenceShowProject === false ? 'Working on a project' : `Working on ${project.name}`;
    out.state = withTheme(`${project.track || 'Project'} · ${project.status || 'Idea'} · ${taskText}`);
    out.smallText = `${project.track || 'Project'} project`;
    out.startTimestamp = sessionStartedAt;
    out.buttons = [
      { label: 'Open project', url: 'https://yunihub.app' },
      { label: `View ${project.name}`, url: 'https://yunihub.app' }
    ];
    return out;
  }

  if (view === 'Studio' || view === 'studio') {
    out.details = 'Coding in the studio';
    out.state = withTheme(summary);
    out.smallImage = berryBaby ? 'workspace_berrybaby' : (dehbify ? 'workspace_dehbify' : 'workspace');
    out.smallText = 'Studio workspace';
    out.startTimestamp = sessionStartedAt;
    out.buttons = [
      { label: 'Open studio', url: 'https://yunihub.app' },
      { label: 'Build workspace', url: 'https://yunihub.app' }
    ];
    return out;
  }

  if (view === 'settings') {
    out.details = 'Tuning the workspace';
    out.state = themeLabel ? withTheme(summary) : `${settings.theme === 'custom' ? 'Custom' : 'Midnight'} theme · ${summary}`;
    out.startTimestamp = sessionStartedAt;
    return out;
  }

  if (['Spotify', 'Roblox', 'PS4', 'Discord'].includes(view)) {
    out.details = `Using the ${view} tools`;
    out.state = withTheme(summary);
    out.startTimestamp = sessionStartedAt;
    return out;
  }

  if (view === 'Android' || view === 'PC') {
    out.details = `Browsing ${view} projects`;
    out.state = withTheme(summary);
    out.startTimestamp = sessionStartedAt;
    return out;
  }

  out.details = 'Planning projects';
  out.state = withTheme(summary);
  out.startTimestamp = sessionStartedAt;
  return out;
}
