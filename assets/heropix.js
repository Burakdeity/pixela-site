/* Girişte piksel bulutlar: farklı boy ve hızlarda kayar, fareyle hafif derinlik verir. */
(() => {
  'use strict';
  const cv = document.getElementById('hero-pix');
  const hero = cv && cv.closest('.hero');
  if (!cv || !hero) return;
  const c = cv.getContext('2d');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let W = 0, H = 0, dpr = 1, U = 6, mx = 0, smx = 0;

  const CLOUD = ['..XXX....', '.XXXXX.XX', 'XXXXXXXXX'];
  // düzenli şeritler: her sırada eşit aralıklı bulutlar, sıralar yarım aralık kaydırılmış (dama gibi).
  // aynı sıradakiler aynı hızla kaydığı için aralıklar hiç bozulmaz.
  const LANES = [{ y: 0.07, s: 0.7, v: 10, off: 0 }, { y: 0.17, s: 1.1, v: 14, off: 0.5 }, { y: 0.27, s: 0.85, v: 12, off: 0 }];
  let shift = 0;

  function size() {
    W = hero.clientWidth; H = hero.clientHeight;
    dpr = Math.min(2, devicePixelRatio || 1);
    cv.width = W * dpr; cv.height = H * dpr;
    U = W < 768 ? 5 : 7;
  }
  addEventListener('pointermove', e => { mx = e.clientX / innerWidth - 0.5; }, { passive: true });
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
    smx += (mx - smx) * 0.05;
    if (!reduce) shift += dt;
    const per = W < 768 ? 2 : 4, gap = W / per; // telefonda sırada 2, bilgisayarda 4 bulut
    LANES.forEach(l => {
      const cw = 9 * U * l.s, span = gap * (per + 1);
      for (let k = 0; k <= per; k++) {
        let x = (k + l.off) * gap + shift * l.v;
        x = ((x % span) + span) % span - gap * 0.6 - cw / 2;
        cloud(x - smx * 12 * l.s, l.y * H, l.s);
      }
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
