/* Girişte piksel detay: PIXELA'nın arkasında yavaşça kayan piksel bulutlar. */
(() => {
  'use strict';
  const cv = document.getElementById('hero-pix');
  const hero = cv && cv.closest('.hero');
  if (!cv || !hero) return;
  const c = cv.getContext('2d');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let W = 0, H = 0, dpr = 1, U = 6;

  const CLOUD = ['..XXX....', '.XXXXX.XX', 'XXXXXXXXX'];
  const clouds = [{ x: 0.06, y: 0.13, s: 1.3, v: 7 }, { x: 0.55, y: 0.09, s: 1, v: 5 }, { x: 0.82, y: 0.2, s: 0.8, v: 9 }];

  function size() {
    W = hero.clientWidth; H = hero.clientHeight;
    dpr = Math.min(2, devicePixelRatio || 1);
    cv.width = W * dpr; cv.height = H * dpr;
    U = W < 768 ? 5 : 7;
  }
  addEventListener('resize', size);

  function cloud(x, y, s) {
    const u = U * s;
    c.fillStyle = 'rgba(255,255,255,.9)';
    CLOUD.forEach((row, j) => [...row].forEach((ch, i) => { if (ch === 'X') c.fillRect(Math.round(x + i * u), Math.round(y + j * u), Math.ceil(u), Math.ceil(u)); }));
  }

  let last = 0, running = false, visible = true;
  function frame(now) {
    const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
    if (!W) size(); // boyut ölçülmeden çizme (bulut konumu bozulmasın)
    c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H);
    clouds.forEach(cl => {
      if (!reduce) cl.x += cl.v * dt / W * 6;
      const cw = 9 * U * cl.s;
      if (cl.x * W > W + 20) cl.x = -cw / W - 0.02;
      cloud(cl.x * W, cl.y * H, cl.s);
    });
    if (visible && !document.hidden && !reduce) requestAnimationFrame(frame); else running = false;
  }
  function start() { if (!running && visible && !document.hidden) { running = true; last = 0; requestAnimationFrame(frame); } }
  new IntersectionObserver(es => { visible = es[0].isIntersecting && scrollY < innerHeight * 0.5; start(); }).observe(hero);
  addEventListener('scroll', () => { const v = scrollY < innerHeight * 0.5; if (v !== visible) { visible = v; start(); } }, { passive: true });
  document.addEventListener('visibilitychange', start);
  const init = () => { size(); if (reduce) requestAnimationFrame(frame); else start(); };
  if (document.readyState === 'complete') init(); else addEventListener('load', init);
})();
