(() => {
  const themes = new Set(['dark', 'rei', 'dehbify', 'berrybaby', 'custom']);
  const theme = new URLSearchParams(window.location.search).get('theme');
  if (!themes.has(theme)) return;

  document.documentElement.dataset.theme = theme;
  const logo = theme === 'berrybaby'
    ? '../build/yunihub-icon-berrybaby.svg'
    : (theme === 'dehbify' ? '../build/yunihub-icon-dehbify.svg' : '../build/yunihub-icon.svg');
  const favicon = document.querySelector('link[rel="icon"]');
  if (favicon) favicon.href = logo;
})();