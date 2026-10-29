/* Girişte piksel dünya: üstte dengeli dağılmış kayan bulutlar, altta iki katmanlı piksel şehir
   (yanıp sönen pencereler, anten ışıkları, ağaçlar). Fareyle katmanlar farklı hızlarda kayar. */
(() => {
  'use strict';
  const cv = document.getElementById('hero-pix');
  const hero = cv && cv.closest('.hero');
  if (!cv || !hero) return;
  const c = cv.getContext('2d');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let W = 0, H = 0, dpr = 1, U = 6, mx = 0, smx = 0;

  const CLOUD = ['..XXX....', '.XXXXX.XX', 'XXXXXXXXX'];
  // doğal ama dengeli dağılım: gökyüzü eşit sütunlara bölünür, her sütunda rastgele yükseklik ve boyda bir bulut.
  // hepsi aynı hızla kaydığı için dağılım bozulmaz, boşluk oluşmaz; her biri hafifçe süzülür.
  let shift = 0, sky = [];
  function layout() {
    let sd = 11; const r = () => (sd = (sd * 1664525 + 1013904223) >>> 0) / 4294967296;
    const cols = W < 768 ? 4 : 8;
    sky = [];
    for (let k = 0; k < cols; k++) {
      const big = r() < 0.35;
      sky.push({ x: (k + 0.15 + r() * 0.7) / cols, y: 0.04 + r() * (W < 768 ? 0.26 : 0.34), s: big ? 1 + r() * 0.35 : 0.65 + r() * 0.3, ph: r() * 6 });
    }
  }

  function size() {
    W = hero.clientWidth; H = hero.clientHeight;
    dpr = Math.min(2, devicePixelRatio || 1);
    cv.width = W * dpr; cv.height = H * dpr;
    U = W < 768 ? 5 : 7;
    layout();
    buildCity();
  }
  addEventListener('pointermove', e => { mx = e.clientX / innerWidth - 0.5; }, { passive: true });
  addEventListener('resize', size);

  // ---- piksel şehir ----
  let back = [], front = [];
  function buildCity() {
    let sd = 5; const r = () => (sd = (sd * 1664525 + 1013904223) >>> 0) / 4294967296;
    const B = U * 1.6, n = Math.ceil((W + 120) / B);
    const make = (minH, maxH, trees) => {
      const out = [];
      for (let i = 0; i < n;) {
        if (trees && r() < 0.18) { out.push({ i, w: 2, tree: true, h: 3 + Math.floor(r() * 2) }); i += 3; continue; }
        const w = 3 + Math.floor(r() * 5), h = minH + Math.floor(r() * (maxH - minH));
        out.push({ i, w, h, ant: r() < 0.3, roof: r() < 0.35, seed: r() * 100 });
        i += w + (r() < 0.25 ? 1 : 0);
      }
      return out;
    };
    const k = W < 768 ? 0.7 : 1;
    back = make(Math.round(8 * k), Math.round(20 * k), false);
    front = make(Math.round(4 * k), Math.round(12 * k), true);
  }
  function drawCity(list, off, body, win, t, lit) {
    const B = U * 1.6, base = H;
    list.forEach(b => {
      const x = Math.round(off + b.i * B);
      if (x > W + 40 || x + b.w * B < -40) return;
      c.fillStyle = body;
      if (b.tree) {
        c.fillRect(x + B * 0.6, base - B * 2, B * 0.8, B * 2);
        c.fillRect(x, base - b.h * B, B * 2, (b.h - 1.5) * B); c.fillRect(x + B * 0.4, base - (b.h + 0.6) * B, B * 1.2, B * 0.8);
        return;
      }
      const w = b.w * B, h = b.h * B;
      c.fillRect(x, base - h, w, h);
      if (b.roof) c.fillRect(x + B, base - h - B, w - 2 * B, B);
      if (b.ant) {
        const ax = x + Math.floor(b.w / 2) * B;
        c.fillRect(ax, base - h - B * 3, B * 0.4, B * 3);
        if (Math.sin(t * 2.4 + b.seed) > 0.2) { c.fillStyle = '#ff3b5c'; c.fillRect(ax - B * 0.2, base - h - B * 3.6, B * 0.8, B * 0.8); }
      }
      // pencereler: bazıları yanar, ara sıra söner
      for (let yy = 2; yy < b.h - 1; yy += 2) for (let xx = 1; xx < b.w - 1; xx += 2) {
        const q = Math.sin(b.seed * 7.1 + xx * 3.7 + yy * 5.3);
        if (q < (lit ? -0.1 : 0.3)) continue;
        const off2 = Math.sin(t * 0.5 + b.seed + xx * 2 + yy) > 0.92;
        c.fillStyle = off2 ? body : win;
        c.fillRect(x + xx * B, base - h + yy * B, B, B);
      }
    });
  }
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
    // şehir: arka katman açık altın, ön katman koyu altın; fareyle farklı hızlarda kayar
    const B = U * 1.6;
    drawCity(back, -smx * 18 - B * 4, '#f0c000', '#ffe866', t, false);
    drawCity(front, -smx * 40 - B * 4, '#d9a300', '#fff2a8', t, true);
    if (!reduce) shift += dt * 9;
    const span = W + 160;
    sky.forEach(cl => {
      let x = cl.x * span + shift;
      x = (x % span) - 120;
      const bob = reduce ? 0 : Math.sin(t * 0.6 + cl.ph) * 4;
      cloud(x - smx * 14 * cl.s, cl.y * H + bob, cl.s);
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
