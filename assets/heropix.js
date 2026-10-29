/* Girişte piksel dünya: altta iki katman piksel ufuk (tepeler + şehir), üstte kayan piksel bulutlar.
   Fareyle katmanlar farklı hızlarda kayar (derinlik). */
(() => {
  'use strict';
  const cv = document.getElementById('hero-pix');
  const hero = cv && cv.closest('.hero');
  if (!cv || !hero) return;
  const c = cv.getContext('2d');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let W = 0, H = 0, dpr = 1, U = 6, hills = [], city = [], mx = 0, smx = 0;

  const CLOUD = ['..XXX....', '.XXXXX.XX', 'XXXXXXXXX'];
  const clouds = [{ x: 0.06, y: 0.13, s: 1.3, v: 7 }, { x: 0.55, y: 0.09, s: 1, v: 5 }, { x: 0.82, y: 0.2, s: 0.8, v: 9 }];

  function size() {
    W = hero.clientWidth; H = hero.clientHeight;
    dpr = Math.min(2, devicePixelRatio || 1);
    cv.width = W * dpr; cv.height = H * dpr;
    U = W < 768 ? 5 : 7;
    buildSkyline();
  }
  // sabit tohumlu rastgele: her açılışta aynı siluet
  function rng(seed) { let s = seed; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }
  function buildSkyline() {
    const B = U * 2, n = Math.ceil(W / B) + 12;
    // tepeler: yumuşak dalga, basamak basamak
    hills = [];
    for (let i = 0; i < n; i++) hills.push(Math.round((Math.sin(i * 0.11) * 0.5 + Math.sin(i * 0.037 + 1) * 0.5 + 1) * 4 + 3));
    // şehir: farklı boyda binalar, bazılarında pencere
    city = []; const r = rng(7);
    for (let i = 0; i < n;) {
      const w = 2 + Math.floor(r() * 4), h = 4 + Math.floor(r() * 9), gap = r() < 0.3 ? 1 : 0;
      city.push({ i, w, h, ant: r() < 0.25, win: r() < 0.6 });
      i += w + gap;
    }
  }
  addEventListener('pointermove', e => { mx = e.clientX / innerWidth - 0.5; }, { passive: true });
  function skyline(t) {
    const B = U * 2, base = H;
    smx += (mx - smx) * 0.05;
    // arka katman: tepeler
    const o1 = -smx * 20 - B * 6;
    c.fillStyle = 'rgba(214,150,0,.22)';
    hills.forEach((h, i) => c.fillRect(Math.round(o1 + i * B), base - h * B, B + 1, h * B));
    // ön katman: şehir
    const o2 = -smx * 45 - B * 6;
    city.forEach(b => {
      const x = Math.round(o2 + b.i * B), w = b.w * B, h = b.h * B;
      c.fillStyle = 'rgba(16,16,16,.09)'; c.fillRect(x, base - h, w, h);
      if (b.ant) c.fillRect(x + Math.floor(b.w / 2) * B, base - h - B * 2, B / 2, B * 2);
      if (b.win) {
        for (let yy = 2; yy < b.h - 1; yy += 2) for (let xx = 0; xx < b.w; xx++) {
          // pencereler arada bir yanıp söner
          const on = Math.sin(b.i * 3.1 + xx * 1.7 + yy * 2.3 + Math.floor(t * 0.4 + b.i) * 1.3) > 0.55;
          if (on) { c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(x + xx * B + B * 0.3, base - h + yy * B + B * 0.3, B * 0.4, B * 0.4); }
        }
      }
    });
  }
  addEventListener('resize', size);

  function cloud(x, y, s) {
    const u = U * s;
    c.fillStyle = 'rgba(255,255,255,.9)';
    CLOUD.forEach((row, j) => [...row].forEach((ch, i) => { if (ch === 'X') c.fillRect(Math.round(x + i * u), Math.round(y + j * u), Math.ceil(u), Math.ceil(u)); }));
  }

  let last = 0, running = false, visible = true;
  function frame(now) {
    const t = now / 1000, dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
    if (!W) size(); // boyut ölçülmeden çizme (bulut konumu bozulmasın)
    c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H);
    skyline(t);
    clouds.forEach(cl => {
      if (!reduce) cl.x += cl.v * dt / W * 6;
      const cw = 9 * U * cl.s;
      if (cl.x * W > W + 20) cl.x = -cw / W - 0.02;
      cloud(cl.x * W - smx * 10 * cl.s, cl.y * H, cl.s);
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
