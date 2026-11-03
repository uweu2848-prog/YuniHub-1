const Y = window.YuniSpot;

/* Picks a vivid colour out of the current cover art for YuniSpot's now-playing surfaces.
   If the image can't be read (cross-origin rules) it just resolves null and the accent is used. */
const cache = new Map();

function color(url) {
  if (!url || typeof Image === 'undefined') return Promise.resolve(null);
  if (cache.has(url)) return Promise.resolve(cache.get(url));
  return new Promise((resolve) => {
    let settled = false;
    const done = (c) => {
      if (settled) return;
      settled = true;
      cache.set(url, c);
      if (cache.size > 60) cache.delete(cache.keys().next().value);
      resolve(c);
    };
    setTimeout(() => done(null), 4000);
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onerror = () => done(null);
      img.onload = () => {
        try {
          const cv = document.createElement('canvas');
          cv.width = cv.height = 24;
          const g = cv.getContext('2d', { willReadFrequently: true });
          g.drawImage(img, 0, 0, 24, 24);
          const d = g.getImageData(0, 0, 24, 24).data;
          let r = 0, gg = 0, b = 0, w = 0;
          for (let i = 0; i < d.length; i += 4) {
            const R = d[i], G = d[i + 1], B = d[i + 2];
            const mx = Math.max(R, G, B), mn = Math.min(R, G, B);
            const sat = mx ? (mx - mn) / mx : 0;
            const wt = 0.05 + sat * sat * 3 + (mx > 60 ? 0.1 : 0); // favour vivid pixels over greys and near-black
            r += R * wt; gg += G * wt; b += B * wt; w += wt;
          }
          if (!w) return done(null);
          let c = [r / w, gg / w, b / w];
          const top = Math.max(...c);
          if (top < 170) c = c.map((x) => x * (200 / Math.max(top, 1))); // lift dark covers so the glow is visible
          done(c.map((x) => Math.min(255, Math.round(x))));
        } catch { done(null); }
      };
      img.src = url;
    } catch { done(null); }
  });
}

Y.ambient = { color };
