/* Pixela: bölümler arası geçişler.
   1) Menüden bir bölüme gidince piksel perde: tıklanan noktadan dalga gibi kapanır, hedefte açılır.
   2) Renk değişen bölüm kenarlarında önceki rengin piksel sütunları akar, kaydırdıkça geri çekilip merdivene döner.
   3) Büyük başlıklar ekrana girince satır satır aşağıdan kayar. */
(() => {
  'use strict';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const ease = t => 1 - Math.pow(1 - t, 3);

  // ---------------- 1) Piksel perde ----------------
  const cv = document.createElement('canvas');
  cv.className = 'pix-curtain';
  cv.setAttribute('aria-hidden', 'true');
  document.body.appendChild(cv);
  const c = cv.getContext('2d');
  let busy = false;
  window.__pixTransition = (ox, oy, mid) => {
    if (busy) { mid(); return; }
    busy = true;
    const W = innerWidth, H = innerHeight, dpr = Math.min(2, devicePixelRatio || 1);
    cv.width = W * dpr; cv.height = H * dpr; c.setTransform(dpr, 0, 0, dpr, 0, 0);
    cv.classList.add('on');
    const size = W < 768 ? 44 : 64;
    const cols = Math.ceil(W / size), rows = Math.ceil(H / size);
    if (!ox && !oy) { ox = W / 2; oy = H / 2; }
    const maxD = Math.hypot(Math.max(ox, W - ox), Math.max(oy, H - oy));
    const cells = [];
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const d = Math.hypot(x * size + size / 2 - ox, y * size + size / 2 - oy) / maxD;
      cells.push({ x, y, d: d * 0.75 + Math.random() * 0.25, yel: Math.random() < 0.06 });
    }
    const IN = 520, HOLD = 140, OUT = 620;
    const t0 = performance.now();
    let jumped = false;
    const step = now => {
      const t = now - t0;
      c.clearRect(0, 0, W, H);
      let phase, p;
      if (t < IN) { phase = 0; p = t / IN; }
      else if (t < IN + HOLD) { phase = 1; p = 1; }
      else { phase = 2; p = Math.min(1, (t - IN - HOLD) / OUT); }
      if (phase >= 1 && !jumped) { jumped = true; mid(); }
      cells.forEach(cl => {
        // kapanırken tıklanan noktadan dışa, açılırken yine aynı sırayla dağılır
        let k = phase === 0 ? clamp((p - cl.d * 0.6) / 0.4, 0, 1) : phase === 1 ? 1 : 1 - clamp((p - cl.d * 0.6) / 0.4, 0, 1);
        if (k <= 0) return;
        k = ease(k);
        const s = size * k + 1;
        c.fillStyle = cl.yel && phase !== 1 ? '#FFD600' : '#101010';
        c.fillRect(cl.x * size + (size - s) / 2, cl.y * size + (size - s) / 2, s, s);
      });
      if (phase === 1) {
        // ortada küçük piksel logo
        c.fillStyle = '#FFD600';
        const u = 10, lx = W / 2 - u * 2.5, ly = H / 2 - u * 2.5;
        [[0,0],[1,0],[2,0],[0,1],[2,1],[0,2],[1,1]].forEach(([x, y]) => c.fillRect(lx + x * u * 1.7, ly + y * u * 1.7, u * 1.4, u * 1.4));
      }
      if (phase < 2 || p < 1) requestAnimationFrame(step);
      else { c.clearRect(0, 0, W, H); cv.classList.remove('on'); busy = false; }
    };
    requestAnimationFrame(step);
  };

  // ---------------- 2) Akan piksel kenarlar ----------------
  const edges = [];
  [['.grid-sec', '#101010'], ['.velo', '#FFD600'], ['.process', '#101010'], ['.footer', '#FFD600']].forEach(([sel, col]) => {
    const sec = document.querySelector(sel);
    if (!sec) return;
    sec.classList.add('has-drip');
    const box = document.createElement('div');
    box.className = 'drip';
    box.setAttribute('aria-hidden', 'true');
    box.style.color = col;
    sec.appendChild(box);
    edges.push({ sec, box, cols: [], n: 0 });
  });
  const STAIR = [48, 16, 32, 0]; // eski merdiven kenarın son hali (16px'lik basamaklar)
  function build() {
    const cw = 16;
    edges.forEach(e => {
      const n = Math.ceil(e.sec.clientWidth / cw);
      if (n === e.n) return;
      e.n = n; e.box.textContent = ''; e.cols = [];
      let s = n * 7 + 3;
      const r = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
      const blk = Math.ceil(n / 3);
      for (let i = 0; i < n; i++) {
        const el = document.createElement('i');
        el.style.left = (i * cw) + 'px';
        e.box.appendChild(el);
        // komşu sütunlar benzer boyda: damla gibi akar
        const wave = Math.sin(i / blk * Math.PI * 2 + r()) * 0.5 + 0.5;
        e.cols.push({ el, fin: STAIR[i % 4], start: 0.22 + wave * 0.38 + r() * 0.14, d: r() * 0.35, last: -1 });
      }
    });
  }
  function update() {
    const H = innerHeight;
    edges.forEach(e => {
      const r = e.sec.getBoundingClientRect();
      if (r.top > H + 50 || r.top < -H) return;
      // bölümün üstü ekranın altındayken uzun, ekranın üst üçte birine gelince merdivene döner
      const p = reduce ? 1 : clamp((H - r.top) / (H * 0.9), 0, 1);
      e.cols.forEach(cl => {
        const k = ease(clamp((p - cl.d) / (1 - cl.d), 0, 1));
        const h = Math.round(cl.fin + (cl.start * H - cl.fin) * (1 - k));
        if (h !== cl.last) { cl.last = h; cl.el.style.height = h + 'px'; }
      });
    });
  }
  build();
  update();
  addEventListener('resize', () => { build(); update(); });
  let q = false;
  addEventListener('scroll', () => { if (q) return; q = true; requestAnimationFrame(() => { q = false; update(); }); }, { passive: true });

  // ---------------- 3) Satır satır kayan başlıklar ----------------
  document.querySelectorAll('.caps-title, .sv-title, .pr-title').forEach(h => {
    const parts = h.innerHTML.split(/<br\s*\/?>/i);
    h.innerHTML = parts.map((p, i) => `<span class="tl"><span class="tl-in" style="--d:${i * 0.09}s">${p}</span></span>`).join('');
    if (reduce) { h.classList.add('tl-on'); return; }
    new IntersectionObserver((es, o) => es.forEach(en => { if (en.isIntersecting) { h.classList.add('tl-on'); o.disconnect(); } }), { threshold: 0.3 }).observe(h);
  });
})();

/* Üst ortadaki piksel: 5x5 kareler sırayla şekil değiştirir (P, kalp, gülen yüz, ok, elmas) */
(() => {
  const box = document.getElementById('pixmorph');
  if (!box) return;
  const cells = [...box.children];
  const SHAPES = [
    ['11110', '10001', '11110', '10000', '10000'],
    ['01010', '11111', '11111', '01110', '00100'],
    ['01010', '01010', '00000', '10001', '01110'],
    ['00100', '00010', '11111', '00010', '00100'],
    ['00100', '01110', '11111', '01110', '00100']
  ];
  let i = 0;
  function show(shape) {
    cells.forEach((c, k) => {
      const x = k % 5, y = Math.floor(k / 5);
      c.style.setProperty('--d', ((x + y) * 0.04).toFixed(2) + 's'); // köşeden köşeye dalga
      c.classList.toggle('on', shape[y][x] === '1');
    });
  }
  show(SHAPES[0]);
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  setInterval(() => { if (document.hidden) return; i = (i + 1) % SHAPES.length; show(SHAPES[i]); }, 1800);
})();

/* Girişte sol alt: hizmetler terminalde yazılıp silinir */
(() => {
  const el = document.getElementById('typer');
  if (!el) return;
  const WORDS = ['web sitesi', 'mobil uygulama', 'e-ticaret', 'yönetim paneli', 'QR menü', 'senin fikrin'];
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { el.textContent = WORDS[0]; return; }
  let w = 0, n = 0, del = false;
  (function tick() {
    const word = WORDS[w];
    if (!del) { n++; el.textContent = word.slice(0, n); if (n === word.length) { del = true; return setTimeout(tick, 1500); } return setTimeout(tick, 70 + Math.random() * 60); }
    n--; el.textContent = word.slice(0, n);
    if (n === 0) { del = false; w = (w + 1) % WORDS.length; return setTimeout(tick, 300); }
    setTimeout(tick, 35);
  })();
})();
