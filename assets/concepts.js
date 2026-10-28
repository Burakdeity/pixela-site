/* Pixela: "Neler yapabiliriz" kartları.
   Her kartın ekranında kodla çizilen, sürekli dönen renkli bir mini animasyon var.
   Ayrıca: fareye göre eğilme ve ışık, kategori filtreleri, "Senin projen" kartında piksel ampul. */
(() => {
  'use strict';
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const ease = t => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
  const seg = (p, a, b) => clamp((p - a) / (b - a), 0, 1);
  const SANS = '"Inter Tight", Arial, sans-serif';
  const W0 = 640, H0 = 400; // sahnelerin tasarım ölçüsü; tuvale ortalanarak sığar

  function rr(c, x, y, w, h, r) { c.beginPath(); c.roundRect(x, y, w, h, r); c.fill(); }
  function bg(c, cols) {
    const g = c.createLinearGradient(0, 0, W0, H0);
    cols.forEach((col, i) => g.addColorStop(i / (cols.length - 1), col));
    c.fillStyle = g; c.fillRect(-400, -400, W0 + 800, H0 + 800);
  }
  function glass(c, x, y, w, h, r = 16) {
    c.fillStyle = 'rgba(255,255,255,.08)'; rr(c, x, y, w, h, r);
    c.strokeStyle = 'rgba(255,255,255,.14)'; c.lineWidth = 1; c.beginPath(); c.roundRect(x + .5, y + .5, w - 1, h - 1, r); c.stroke();
  }
  function txt(c, s, x, y, size, col = '#fff', weight = 700, align = 'left') {
    c.font = `${weight} ${size}px ${SANS}`; c.fillStyle = col; c.textAlign = align; c.fillText(s, x, y); c.textAlign = 'left';
  }
  function check(c, x, y, s, col) {
    c.strokeStyle = col; c.lineWidth = 2.5; c.lineCap = 'round'; c.beginPath();
    c.moveTo(x - s * 0.45, y); c.lineTo(x - s * 0.1, y + s * 0.35); c.lineTo(x + s * 0.5, y - s * 0.35); c.stroke();
  }

  // ---------------- 1) Randevu sistemi ----------------
  function sRandevu(c, t) {
    const p = (t % 6) / 6;
    bg(c, ['#24093a', '#4a0f5c', '#7a1468']);
    glass(c, 40, 40, 330, 320, 20);
    txt(c, 'Ekim 2026', 64, 80, 20, '#fff', 800);
    txt(c, '‹  ›', 340, 80, 16, 'rgba(255,255,255,.6)', 700, 'right');
    ['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz'].forEach((d, i) => txt(c, d, 72 + i * 42, 112, 11, 'rgba(255,255,255,.5)', 700, 'center'));
    for (let i = 0; i < 31; i++) {
      const col = (i + 2) % 7, row = Math.floor((i + 2) / 7);
      const x = 72 + col * 42, y = 140 + row * 40;
      const sel = i === 13;
      if (sel) { c.fillStyle = '#ff4fd8'; c.beginPath(); c.arc(x, y - 5, 15, 0, 7); c.fill(); }
      txt(c, String(i + 1), x, y, 13, sel ? '#fff' : 'rgba(255,255,255,.8)', sel ? 800 : 600, 'center');
    }
    // saat seçimi
    txt(c, 'Saat seç', 400, 70, 13, 'rgba(255,255,255,.6)', 700);
    ['09:00', '10:30', '13:00', '15:45'].forEach((h, i) => {
      const y = 86 + i * 52;
      const on = i === 1 && p > 0.22;
      c.fillStyle = on ? '#ff4fd8' : 'rgba(255,255,255,.08)'; rr(c, 400, y, 190, 40, 12);
      txt(c, h, 420, y + 26, 16, '#fff', on ? 800 : 600);
      if (on) check(c, 566, y + 20, 12, '#fff');
    });
    // imleç
    const mk = ease(seg(p, 0.05, 0.2));
    const cx = 620 - mk * 90, cy = 330 - mk * 186;
    c.fillStyle = '#fff'; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + 13, cy + 26); c.lineTo(cx + 17, cy + 15); c.lineTo(cx + 29, cy + 13); c.closePath(); c.fill();
    // onay bildirimi
    const k = ease(seg(p, 0.35, 0.45)) * (1 - seg(p, 0.92, 1));
    if (k > 0) {
      c.globalAlpha = k;
      c.fillStyle = '#fff'; rr(c, 400, 300 - (1 - k) * 20, 210, 64, 16);
      c.fillStyle = '#3df5a7'; c.beginPath(); c.arc(426, 332 - (1 - k) * 20, 13, 0, 7); c.fill();
      check(c, 426, 332 - (1 - k) * 20, 11, '#0b3a2a');
      txt(c, 'Randevu onaylandı', 448, 326 - (1 - k) * 20, 14, '#1a0a26', 800);
      txt(c, '14 Ekim · 10:30', 448, 345 - (1 - k) * 20, 12, '#7a5a8a', 600);
      c.globalAlpha = 1;
    }
    // SMS balonu
    const s = ease(seg(p, 0.55, 0.65)) * (1 - seg(p, 0.92, 1));
    if (s > 0) {
      c.globalAlpha = s;
      const x = 640 - s * 250;
      c.fillStyle = 'rgba(30,10,45,.85)'; rr(c, x, 22, 230, 50, 14);
      c.fillStyle = '#3df5a7'; rr(c, x + 12, 34, 26, 26, 7);
      txt(c, 'SMS', x + 25, 51, 9, '#0b3a2a', 800, 'center');
      txt(c, 'Randevunuz yarın 10:30 ✓', x + 48, 52, 13, '#fff', 700);
      c.globalAlpha = 1;
    }
  }

  // ---------------- 2) Online mağaza ----------------
  function sMagaza(c, t) {
    const p = (t % 5) / 5;
    bg(c, ['#04152f', '#0a3a78', '#0f6fb3']);
    txt(c, 'MAĞAZA', 40, 62, 22, '#fff', 800);
    // sepet
    const count = p > 0.62 ? 2 : p > 0.32 ? 1 : 0;
    glass(c, 540, 30, 60, 46, 14);
    c.strokeStyle = '#fff'; c.lineWidth = 2.4; c.beginPath(); c.moveTo(556, 44); c.lineTo(561, 44); c.lineTo(567, 62); c.lineTo(584, 62); c.lineTo(588, 50); c.lineTo(564, 50); c.stroke();
    if (count) {
      const pop = 1 + Math.max(0, 0.4 - Math.min(Math.abs(p - 0.32), Math.abs(p - 0.62)) * 8);
      c.save(); c.translate(596, 32); c.scale(pop, pop);
      c.fillStyle = '#3df5a7'; c.beginPath(); c.arc(0, 0, 11, 0, 7); c.fill();
      txt(c, String(count), 0, 4.5, 12, '#04152f', 800, 'center'); c.restore();
    }
    const prods = [['Hoodie', '₺890', ['#ff4fd8', '#8b5cf6']], ['Sneaker', '₺1.450', ['#3df5a7', '#3db7ff']], ['Kupa', '₺240', ['#ffd600', '#ff8a3d']]];
    prods.forEach(([n, pr, g], i) => {
      const x = 40 + i * 190, y = 100;
      glass(c, x, y, 170, 250, 18);
      const gr = c.createLinearGradient(x, y, x + 170, y + 150); gr.addColorStop(0, g[0]); gr.addColorStop(1, g[1]);
      c.fillStyle = gr; rr(c, x + 12, y + 12, 146, 140, 12);
      c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.arc(x + 85, y + 82, 30, 0, 7); c.fill();
      txt(c, n, x + 16, y + 180, 15, '#fff', 700);
      txt(c, pr, x + 16, y + 202, 14, 'rgba(255,255,255,.7)', 600);
      const hit = (i === 0 && p > 0.24 && p < 0.34) || (i === 1 && p > 0.54 && p < 0.64);
      c.fillStyle = hit ? '#3df5a7' : '#fff'; rr(c, x + 16, y + 214, 138, 26, 13);
      txt(c, hit ? 'Eklendi ✓' : 'Sepete ekle', x + 85, y + 231, 12, '#04152f', 800, 'center');
    });
    // sepete uçan nokta
    [[0.24, 0.34, 125], [0.54, 0.64, 315]].forEach(([a, b, sx]) => {
      const k = seg(p, a, b);
      if (k > 0 && k < 1) {
        const e = ease(k), x = sx + (585 - sx) * e, y = 327 - (327 - 52) * e - Math.sin(e * Math.PI) * 60;
        c.fillStyle = '#3df5a7'; c.beginPath(); c.arc(x, y, 7, 0, 7); c.fill();
      }
    });
  }

  // ---------------- 3) Saha uygulaması ----------------
  function sSaha(c, t) {
    const p = (t % 6) / 6;
    bg(c, ['#03221d', '#064a3b', '#0b6b55']);
    // telefon
    c.fillStyle = '#0a0a0a'; rr(c, 60, 24, 210, 352, 30);
    c.save(); c.beginPath(); c.roundRect(70, 34, 190, 332, 22); c.clip();
    c.fillStyle = '#0c2f2a'; c.fillRect(70, 34, 190, 332);
    c.strokeStyle = 'rgba(61,245,167,.18)'; c.lineWidth = 6;
    [[70, 120, 260, 90], [70, 250, 260, 300], [120, 34, 150, 366], [210, 34, 180, 366]].forEach(([a, b, d, e]) => { c.beginPath(); c.moveTo(a, b); c.lineTo(d, e); c.stroke(); });
    const pins = [[110, 300], [165, 210], [200, 140], [150, 80]];
    // rota
    const rk = ease(seg(p, 0.15, 0.75));
    c.strokeStyle = '#3df5a7'; c.lineWidth = 3.5; c.setLineDash([8, 6]); c.beginPath();
    const total = pins.length - 1, upto = rk * total;
    pins.forEach(([x, y], i) => {
      if (i === 0) { c.moveTo(x, y); return; }
      if (i - 1 >= upto) return;
      const f = Math.min(1, upto - (i - 1)), [px, py] = pins[i - 1];
      c.lineTo(px + (x - px) * f, py + (y - py) * f);
    });
    c.stroke(); c.setLineDash([]);
    pins.forEach(([x, y], i) => {
      const k = ease(seg(p, 0.05 + i * 0.12, 0.15 + i * 0.12));
      if (k <= 0) return;
      const yy = y - (1 - k) * 40;
      c.fillStyle = i === pins.length - 1 ? '#ffd600' : '#3df5a7';
      c.beginPath(); c.arc(x, yy - 14, 11, Math.PI * 0.85, Math.PI * 2.15); c.lineTo(x, yy); c.closePath(); c.fill();
      c.fillStyle = '#0c2f2a'; c.beginPath(); c.arc(x, yy - 14, 4, 0, 7); c.fill();
    });
    c.restore();
    c.fillStyle = '#0a0a0a'; rr(c, 135, 40, 60, 14, 7);
    // görev listesi
    glass(c, 310, 60, 290, 280, 18);
    txt(c, 'Bugünkü görevler', 334, 100, 17, '#fff', 800);
    ['Kadıköy · Kurulum', 'Moda · Bakım', 'Üsküdar · Teslimat', 'Ataşehir · Keşif'].forEach((n, i) => {
      const y = 130 + i * 50, done = p > 0.2 + i * 0.16;
      c.fillStyle = done ? '#3df5a7' : 'rgba(255,255,255,.1)'; rr(c, 334, y, 26, 26, 8);
      if (done) check(c, 347, y + 13, 10, '#03221d');
      txt(c, n, 374, y + 18, 14, done ? 'rgba(255,255,255,.55)' : '#fff', 600);
      if (done) { c.fillStyle = 'rgba(255,255,255,.4)'; c.fillRect(374, y + 13, c.measureText(n).width, 1.5); }
    });
  }

  // ---------------- 4) Yönetim paneli ----------------
  function sPanel(c, t) {
    const p = (t % 5.5) / 5.5;
    bg(c, ['#2a0d05', '#5a1d0a', '#8a2f12']);
    const kpis = [['Ciro', 184250, '₺'], ['Sipariş', 1240, ''], ['Yeni müşteri', 318, '']];
    kpis.forEach(([n, v, u], i) => {
      const x = 30 + i * 200;
      glass(c, x, 30, 186, 92, 16);
      txt(c, n, x + 18, 58, 12, 'rgba(255,255,255,.6)', 700);
      const val = Math.round(v * ease(seg(p, 0.05, 0.5)));
      txt(c, u + val.toLocaleString('tr-TR'), x + 18, 98, 26, '#fff', 800);
      txt(c, '▲ %' + (12 + i * 7), x + 168, 58, 11, '#3df5a7', 800, 'right');
    });
    glass(c, 30, 140, 386, 230, 16);
    txt(c, 'Haftalık satış', 50, 170, 13, 'rgba(255,255,255,.7)', 700);
    [0.45, 0.62, 0.5, 0.78, 0.7, 0.95, 0.84].forEach((v, i) => {
      const k = ease(seg(p, 0.1 + i * 0.05, 0.5 + i * 0.05)), bh = v * 160 * k;
      const gr = c.createLinearGradient(0, 350 - bh, 0, 350); gr.addColorStop(0, '#ffd600'); gr.addColorStop(1, '#ff8a3d');
      c.fillStyle = i === 5 ? gr : 'rgba(255,255,255,.18)'; rr(c, 54 + i * 50, 350 - bh, 32, bh, 6);
    });
    glass(c, 430, 140, 180, 230, 16);
    txt(c, 'Kanallar', 450, 170, 13, 'rgba(255,255,255,.7)', 700);
    const parts = [[0.48, '#ffd600'], [0.3, '#ff4fd8'], [0.22, '#3db7ff']];
    let a0 = -Math.PI / 2; const dk = ease(seg(p, 0.15, 0.7));
    parts.forEach(([v, col]) => {
      const a1 = a0 + Math.PI * 2 * v * dk;
      c.strokeStyle = col; c.lineWidth = 18; c.beginPath(); c.arc(520, 262, 54, a0, a1); c.stroke();
      a0 = a1 + 0.04;
    });
    txt(c, '%48', 520, 270, 22, '#fff', 800, 'center');
  }

  // ---------------- 5) QR menü ----------------
  const QR = (() => {
    const n = 21, m = []; let s = 42;
    const r = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const finder = (x < 7 && y < 7) || (x > 13 && y < 7) || (x < 7 && y > 13);
      if (finder) {
        const fx = x > 13 ? x - 14 : x, fy = y > 13 ? y - 14 : y;
        const ring = fx === 0 || fx === 6 || fy === 0 || fy === 6, core = fx >= 2 && fx <= 4 && fy >= 2 && fy <= 4;
        if (ring || core) m.push([x, y]);
      } else if (r() > 0.52) m.push([x, y]);
    }
    return m;
  })();
  function sQR(c, t) {
    const p = (t % 6) / 6;
    bg(c, ['#170a3a', '#33157a', '#5b2bb5']);
    glass(c, 40, 50, 300, 300, 22);
    c.fillStyle = '#fff'; rr(c, 70, 80, 240, 240, 14);
    const cell = 10, ox = 85, oy = 95, k = seg(p, 0.02, 0.4);
    QR.forEach(([x, y], i) => { if (i / QR.length < k) { c.fillStyle = '#170a3a'; c.fillRect(ox + x * cell, oy + y * cell, cell - 0.5, cell - 0.5); } });
    // tarama çizgisi
    if (p > 0.4 && p < 0.55) {
      const sy = 80 + seg(p, 0.4, 0.55) * 240;
      c.fillStyle = 'rgba(167,139,250,.6)'; c.fillRect(70, sy, 240, 4);
    }
    // telefon ve menü
    c.fillStyle = '#0a0a0a'; rr(c, 400, 30, 200, 340, 28);
    c.save(); c.beginPath(); c.roundRect(410, 40, 180, 320, 20); c.clip();
    c.fillStyle = '#faf7ff'; c.fillRect(410, 40, 180, 320);
    const mk = ease(seg(p, 0.55, 0.7));
    c.translate(0, (1 - mk) * 320);
    txt(c, 'Menü', 426, 84, 22, '#170a3a', 800);
    const items = [['Latte', '₺95', '#ff9ee6'], ['Cheesecake', '₺140', '#ffd600'], ['Limonata', '₺80', '#3df5a7'], ['Tost', '₺120', '#3db7ff'], ['Brownie', '₺110', '#a78bfa']];
    const scroll = ease(seg(p, 0.72, 0.95)) * 70;
    items.forEach(([n, pr, col], i) => {
      const y = 104 + i * 62 - scroll;
      c.fillStyle = '#efeaff'; rr(c, 422, y, 156, 52, 12);
      c.fillStyle = col; rr(c, 430, y + 8, 36, 36, 9);
      txt(c, n, 476, y + 24, 13, '#170a3a', 700);
      txt(c, pr, 476, y + 42, 12, '#6b5a9a', 600);
    });
    c.restore();
    c.fillStyle = '#0a0a0a'; rr(c, 470, 46, 60, 12, 6);
  }

  // ---------------- 6) Web sitesi (showreel için) ----------------
  function sWeb(c, t) {
    const p = (t % 5) / 5;
    bg(c, ['#3a0a2a', '#8a1a4a', '#ff8a3d']);
    // tarayıcı penceresi
    c.fillStyle = '#0f0f12'; rr(c, 40, 24, 560, 352, 16);
    ['#ff5f57', '#febc2e', '#28c840'].forEach((col, i) => { c.fillStyle = col; c.beginPath(); c.arc(62 + i * 16, 44, 5, 0, 7); c.fill(); });
    c.fillStyle = 'rgba(255,255,255,.08)'; rr(c, 130, 34, 380, 20, 10);
    txt(c, 'kahve.pixela.tr', 320, 48, 11, 'rgba(255,255,255,.6)', 600, 'center');
    c.save(); c.beginPath(); c.roundRect(48, 62, 544, 306, 10); c.clip();
    const sc = ease(seg(p, 0.25, 0.85)) * 330;
    c.translate(0, -sc);
    c.fillStyle = '#fff7ea'; c.fillRect(48, 62, 544, 720);
    // menü
    c.fillStyle = '#1a0a14'; rr(c, 64, 76, 26, 26, 7);
    txt(c, 'Kahve Durağı', 100, 95, 14, '#1a0a14', 800);
    ['Menü', 'Hakkımızda', 'İletişim'].forEach((m, i) => txt(c, m, 380 + i * 70, 95, 11, '#5a3a4a', 700));
    // kahraman alanı
    const gr = c.createLinearGradient(64, 120, 576, 280); gr.addColorStop(0, '#ff4fd8'); gr.addColorStop(0.5, '#ff8a3d'); gr.addColorStop(1, '#ffd600');
    c.fillStyle = gr; rr(c, 64, 118, 512, 170, 16);
    const hk = ease(seg(p, 0.02, 0.2));
    c.globalAlpha = hk;
    txt(c, 'Günün en iyi', 92, 176 + (1 - hk) * 14, 34, '#1a0a14', 800);
    txt(c, 'kahvesi burada.', 92, 214 + (1 - hk) * 14, 34, '#1a0a14', 800);
    c.fillStyle = '#1a0a14'; rr(c, 92, 236, 132, 34, 17);
    txt(c, 'Sipariş ver →', 158, 258, 12, '#ffd600', 800, 'center');
    c.globalAlpha = 1;
    c.fillStyle = 'rgba(255,255,255,.4)'; c.beginPath(); c.arc(480, 200, 54, 0, 7); c.fill();
    c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.arc(500, 186, 26, 0, 7); c.fill();
    // kartlar
    [['Espresso', '#ff4fd8'], ['Latte', '#ff8a3d'], ['Cold brew', '#3db7ff']].forEach(([n, col], i) => {
      const x = 64 + i * 176, y = 310;
      c.fillStyle = '#ffffff'; rr(c, x, y, 160, 170, 14);
      c.fillStyle = col; rr(c, x + 10, y + 10, 140, 96, 10);
      txt(c, n, x + 14, y + 130, 14, '#1a0a14', 800);
      txt(c, '★★★★★', x + 14, y + 152, 11, '#ff8a3d', 700);
    });
    // yorum ve iletişim
    c.fillStyle = '#1a0a14'; rr(c, 64, 500, 512, 120, 16);
    txt(c, '“Şehrin en hızlı', 92, 548, 22, '#ffd600', 800);
    txt(c, 'sipariş sitesi.”', 92, 576, 22, '#ffd600', 800);
    txt(c, 'Hızlı · mobil uyumlu · Google dostu', 92, 602, 11, 'rgba(255,255,255,.6)', 600);
    c.restore();
    // kaydırma çubuğu
    c.fillStyle = 'rgba(255,255,255,.25)'; rr(c, 586, 70 + sc / 330 * 200, 4, 90, 2);
  }

  const SCENES = { randevu: sRandevu, magaza: sMagaza, saha: sSaha, panel: sPanel, qr: sQR, web: sWeb };
  window.__pixelaScenes = { scenes: SCENES, W0, H0 }; // showreel kayıtları için

  // ---------------- Oynatma: sadece görünen kartlar çizilir ----------------
  const items = $$('.ccard canvas[data-scene]').map((cv, i) => ({ cv, ctx: cv.getContext('2d'), draw: SCENES[cv.dataset.scene], vis: false, w: 0, h: 0, dpr: 1, off: i * 0.9 }));
  function size(it) {
    const r = it.cv.getBoundingClientRect();
    it.dpr = Math.min(2, devicePixelRatio || 1);
    it.w = r.width; it.h = r.height;
    it.cv.width = Math.max(1, Math.round(r.width * it.dpr)); it.cv.height = Math.max(1, Math.round(r.height * it.dpr));
  }
  function render(it, t) {
    if (!it.draw || !it.w) return;
    const c = it.ctx;
    // sahne karta tamamen sığar (kırpılmaz); arka plan rengi taşan alanı doldurur
    const s = Math.min(it.w / W0, it.h / H0) * 1.04;
    c.setTransform(it.dpr * s, 0, 0, it.dpr * s, it.dpr * (it.w - W0 * s) / 2, it.dpr * (it.h - H0 * s) / 2);
    it.draw(c, t + it.off);
  }
  items.forEach(size);
  addEventListener('resize', () => { items.forEach(size); items.forEach(it => render(it, performance.now() / 1000)); });
  if (document.fonts) document.fonts.ready.then(() => items.forEach(it => render(it, 1.6)));

  let raf = null, last = 0;
  function loop(now) {
    raf = null;
    if (now - last >= 33) { // ~30 kare/sn yeter, pil dostu
      last = now;
      items.forEach(it => { if (it.vis) render(it, now / 1000); });
    }
    if (items.some(it => it.vis) && !document.hidden) raf = requestAnimationFrame(loop);
  }
  const io = new IntersectionObserver(es => {
    es.forEach(e => { const it = items.find(x => x.cv === e.target); if (it) it.vis = e.isIntersecting; });
    if (reduce) { items.forEach(it => render(it, 2.4)); return; }
    if (!raf && items.some(it => it.vis)) raf = requestAnimationFrame(loop);
  }, { rootMargin: '100px 0px' });
  items.forEach(it => { io.observe(it.cv); render(it, 1.6); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && !raf && items.some(it => it.vis)) raf = requestAnimationFrame(loop); });

  // ---------------- Kart girişi: sırayla belirir ----------------
  const cards = $$('.ccard');
  const rio = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    const i = cards.indexOf(e.target);
    setTimeout(() => e.target.classList.add('in'), reduce ? 0 : (i % 3) * 110);
    rio.unobserve(e.target);
  }), { threshold: 0.12 });
  cards.forEach(cd => rio.observe(cd));

  // ---------------- Fareye göre eğilme ve ışık ----------------
  if (fine && !reduce) cards.forEach(cd => {
    cd.addEventListener('pointermove', e => {
      const r = cd.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      cd.classList.add('tilting');
      cd.style.setProperty('--ry', ((x - 0.5) * 7).toFixed(2) + 'deg');
      cd.style.setProperty('--rx', ((0.5 - y) * 7).toFixed(2) + 'deg');
      cd.style.setProperty('--gx', (x * 100).toFixed(1) + '%');
      cd.style.setProperty('--gy', (y * 100).toFixed(1) + '%');
    });
    cd.addEventListener('pointerleave', () => { cd.classList.remove('tilting'); cd.style.setProperty('--ry', '0deg'); cd.style.setProperty('--rx', '0deg'); });
  });

  // ---------------- Kategori filtreleri ----------------
  const btns = $$('.caps-filter button');
  btns.forEach(b => b.addEventListener('click', () => {
    btns.forEach(x => x.classList.toggle('on', x === b));
    const f = b.dataset.f;
    // seçilmeyen kategoriler tamamen gizlenir, kalanlar kısa bir animasyonla yerleşir
    cards.forEach(cd => {
      const hide = f !== 'all' && !cd.dataset.cat.split(' ').includes(f);
      cd.classList.toggle('hide', hide);
      cd.classList.remove('pop');
      if (!hide) { void cd.offsetWidth; cd.classList.add('pop'); }
    });
    requestAnimationFrame(() => { items.forEach(size); items.forEach(it => render(it, performance.now() / 1000)); });
  }));

  // ---------------- Senin projen: piksel ampul ----------------
  const BULB = ['...XXX...', '..X...X..', '.X.....X.', '.X.....X.', '..X...X..', '...XXX...', '...XXX...', '....X....'];
  const grid = document.querySelector('.cc-mine-grid');
  if (grid) BULB.forEach(row => [...row].forEach(ch => {
    const b = document.createElement('b');
    if (ch === 'X') b.className = 'lit';
    b.style.transitionDelay = (Math.random() * 0.25).toFixed(2) + 's';
    grid.appendChild(b);
  }));
})();
