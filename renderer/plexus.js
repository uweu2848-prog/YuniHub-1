/* Animated theme backdrops: Etherium plexus and Berry Baby strawberries. */
const PINK = [255, 99, 182];
const PURPLE = [157, 124, 255];
const BERRY_PINK = [245, 195, 194];
const BERRY_SAGE = [142, 165, 140];
const COUNT = 95;
const LINK = 0.34;      // link distance in normalized 3D space
const SPIN = 0.00018;   // radians per ms

let canvas = null, ctx = null, raf = 0, last = 0, angle = 0, variant = 'dehbify';
let pts = [], w = 0, h = 0, dpr = 1, reduced = false;
let berryDrops = [], berrySprite = null;
let motionIntensity = 1, motionSpeed = 1;
const mouse = { x: 0, y: 0, tx: 0, ty: 0 };

function seed() {
  pts = Array.from({ length: COUNT }, (_, i) => ({
    x: Math.random() * 2 - 1, y: Math.random() * 2 - 1, z: Math.random() * 2 - 1,
    vx: (Math.random() - .5) * .00006, vy: (Math.random() - .5) * .00006, vz: (Math.random() - .5) * .00006,
    c: i % 2 ? PINK : PURPLE
  }));
}

function resize() {
  if (!canvas) return;
  dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  w = window.innerWidth; h = window.innerHeight;
  canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
  canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (variant === 'berrybaby') seedBerryDrops();
  if (reduced) frame(0);
}

function seedBerryDrops() {
  const size = Math.min(w, h);
  const count = Math.min(18, Math.max(12, Math.round(w / 90)));
  berryDrops = Array.from({ length: count }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    size: size * (.014 + Math.random() * .012),
    speed: .014 + Math.random() * .026,
    drift: (Math.random() - .5) * .018,
    rotation: (Math.random() - .5) * .8,
    spin: (Math.random() - .5) * .0005,
    alpha: .46 + Math.random() * .28
  }));
}

function drawStrawberry(x, y, size, rotation, alpha) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.scale(size, size);

  ctx.beginPath();
  ctx.moveTo(0, -.25);
  ctx.bezierCurveTo(.68, -.56, .7, .03, 0, .64);
  ctx.bezierCurveTo(-.7, .03, -.68, -.56, 0, -.25);
  ctx.closePath();
  ctx.fillStyle = `rgba(${BERRY_PINK.join(',')},${alpha})`;
  ctx.strokeStyle = `rgba(${BERRY_SAGE.join(',')},${alpha * .8})`;
  ctx.lineWidth = .025;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-.48, -.33); ctx.quadraticCurveTo(-.38, -.72, -.12, -.43);
  ctx.quadraticCurveTo(-.08, -.78, .08, -.45);
  ctx.quadraticCurveTo(.38, -.73, .48, -.34);
  ctx.quadraticCurveTo(.2, -.43, 0, -.25);
  ctx.quadraticCurveTo(-.2, -.43, -.48, -.33);
  ctx.closePath();
  ctx.fillStyle = `rgba(${BERRY_SAGE.join(',')},${Math.min(1, alpha + .18)})`;
  ctx.fill();

  ctx.fillStyle = `rgba(82,111,83,${Math.min(1, alpha + .16)})`;
  for (const [sx, sy] of [[-.3, -.12], [0, -.16], [.3, -.12], [-.38, .12], [-.13, .08], [.14, .08], [.38, .12], [-.24, .34], [.04, .3], [.27, .34], [0, .5]]) {
    ctx.beginPath();
    ctx.ellipse(sx, sy, .026, .048, sx * .5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function createBerrySprite() {
  if (berrySprite) return;
  const previous = ctx;
  const sprite = document.createElement('canvas');
  sprite.width = 160;
  sprite.height = 160;
  ctx = sprite.getContext('2d');
  if (!ctx) { ctx = previous; return; }
  drawStrawberry(80, 82, 100, 0, 1);
  ctx = previous;
  berrySprite = sprite;
}

function drawBerrySprite(x, y, size, rotation, alpha) {
  if (!berrySprite) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha * motionIntensity));
  ctx.drawImage(berrySprite, -size * .8, -size * .8, size * 1.6, size * 1.6);
  ctx.restore();
}

function drawBerryScene(dt) {
  if (!reduced) {
    mouse.x += (mouse.tx - mouse.x) * .035;
    mouse.y += (mouse.ty - mouse.y) * .035;
    for (const berry of berryDrops) {
      berry.y += berry.speed * dt;
      berry.x += berry.drift * dt;
      berry.rotation += berry.spin * dt;
      if (berry.y > h + berry.size) { berry.y = -berry.size; berry.x = Math.random() * w; }
      if (berry.x > w + berry.size) berry.x = -berry.size;
      if (berry.x < -berry.size) berry.x = w + berry.size;
    }
  }
  ctx.clearRect(0, 0, w, h);
  const heroSize = Math.min(w, h) * .43;
  drawBerrySprite(w * .79 + mouse.x * 13, h * .62 + mouse.y * 10, heroSize, -.12, .26);
  for (const berry of berryDrops) drawBerrySprite(berry.x, berry.y, berry.size, berry.rotation, berry.alpha);
}

function onMove(e) {
  mouse.tx = (e.clientX / (window.innerWidth || 1) - .5) * 2;
  mouse.ty = (e.clientY / (window.innerHeight || 1) - .5) * 2;
}

function frame(dt) {
  if (!ctx) return;
  if (variant === 'berrybaby') { drawBerryScene(dt); return; }
  if (!reduced) {
    angle += SPIN * dt;
    mouse.x += (mouse.tx - mouse.x) * .04; mouse.y += (mouse.ty - mouse.y) * .04;
    for (const p of pts) {
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      if (p.x > 1 || p.x < -1) p.vx *= -1;
      if (p.y > 1 || p.y < -1) p.vy *= -1;
      if (p.z > 1 || p.z < -1) p.vz *= -1;
    }
  }
  const ay = angle + mouse.x * .25, ax = mouse.y * .18 + Math.sin(angle * 1.7) * .08;
  const cy = Math.cos(ay), sy = Math.sin(ay), cx = Math.cos(ax), sx = Math.sin(ax);
  const scale = Math.min(w, h) * .62, fov = 2.6;
  const proj = pts.map((p) => {
    const x1 = p.x * cy + p.z * sy, z1 = -p.x * sy + p.z * cy;
    const y2 = p.y * cx - z1 * sx, z2 = p.y * sx + z1 * cx;
    const k = fov / (fov + z2 + 1.2);
    return { sx: w / 2 + x1 * scale * k * 1.45, sy: h / 2 + y2 * scale * k, x: x1, y: y2, z: z2, k, c: p.c };
  });

  ctx.clearRect(0, 0, w, h);
  ctx.lineWidth = 1;
  for (let i = 0; i < proj.length; i++) {
    const a = proj[i];
    for (let j = i + 1; j < proj.length; j++) {
      const b = proj[j];
      const d = Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
      if (d > LINK) continue;
      const depth = Math.max(.18, Math.min(1, (a.k + b.k) / 2 * 1.1));
      const alpha = (1 - d / LINK) * .55 * depth * motionIntensity;
      const g = ctx.createLinearGradient(a.sx, a.sy, b.sx, b.sy);
      g.addColorStop(0, `rgba(${a.c[0]},${a.c[1]},${a.c[2]},${alpha})`);
      g.addColorStop(1, `rgba(${b.c[0]},${b.c[1]},${b.c[2]},${alpha})`);
      ctx.strokeStyle = g;
      ctx.beginPath(); ctx.moveTo(a.sx, a.sy); ctx.lineTo(b.sx, b.sy); ctx.stroke();
    }
  }
  for (const p of proj) {
    const r = 1.2 + p.k * 1.9;
    const a = Math.max(.35, Math.min(1, p.k * motionIntensity));
    ctx.fillStyle = `rgba(${p.c[0]},${p.c[1]},${p.c[2]},${a})`;
    ctx.shadowColor = `rgba(${p.c[0]},${p.c[1]},${p.c[2]},.9)`;
    ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(p.sx, p.sy, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.shadowBlur = 0;
}

function loop(t) {
  raf = requestAnimationFrame(loop);
  const dt = Math.min(64, t - (last || t));
  last = t;
  frame(dt * motionSpeed);
}

function onVisibility() {
  if (!canvas || reduced) return;
  if (document.hidden) { cancelAnimationFrame(raf); raf = 0; }
  else if (!raf) { last = 0; raf = requestAnimationFrame(loop); }
}

function stop() {
  cancelAnimationFrame(raf); raf = 0;
  window.removeEventListener('resize', resize);
  window.removeEventListener('mousemove', onMove);
  document.removeEventListener('visibilitychange', onVisibility);
  if (canvas) canvas.remove();
  canvas = null; ctx = null;
}

export function setPlexus(enabled, reduceMotion, theme = 'dehbify', options = {}) {
  const wantReduced = !!reduceMotion;
  const wantVariant = theme === 'berrybaby' ? 'berrybaby' : 'dehbify';
  motionIntensity = Math.max(.5, Math.min(1.5, Number(options.intensity) || 1));
  motionSpeed = Math.max(.5, Math.min(1.75, Number(options.speed) || 1));
  if (!enabled) { stop(); return; }
  if (canvas && wantReduced === reduced && wantVariant === variant) {
    if (reduced) frame(0);
    return;
  }
  stop();
  reduced = wantReduced;
  variant = wantVariant;
  canvas = document.createElement('canvas');
  canvas.id = 'plexus';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.prepend(canvas);
  ctx = canvas.getContext('2d');
  if (variant === 'berrybaby') { createBerrySprite(); seedBerryDrops(); }
  else if (!pts.length) seed();
  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', onVisibility);
  resize();
  if (reduced) { frame(0); return; }
  window.addEventListener('mousemove', onMove, { passive: true });
  raf = requestAnimationFrame(loop);
}
