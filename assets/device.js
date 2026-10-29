/* Pixela: girişteki 3D el konsolu.
   Mat grafit gövde, sarı vurgular, analog çubuklar, harfli düğmeler, parlak cam ekran. Ekranında kodla çizilen kısa "videolar" döner:
   piksel oyun, uygulama kurma, bildirimler, satış grafiği, tema değiştirme. Geçişler yumuşak kayma ile olur. */
import * as THREE from 'three';
import { RoundedBoxGeometry } from './vendor/RoundedBoxGeometry.js';

const Y = '#FFD600', K = '#101010';
const ease = t => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// ---------------- Ekran klipleri (ctx, w, h, p: 0..1 ilerleme, t: saniye) ----------------
// Hepsi yazılım üretiminden sahneler. Kodla çizilir: video dosyası yok, kredi yok, site hafif kalır.
const MONO = '"JetBrains Mono", Menlo, Consolas, monospace';
const SANS = '"Inter Tight", Arial, sans-serif';
const G = '#5fd068', GREY = '#6b6b6b', WHITE = '#f2f2f2';
function rr(c, x, y, w, h, r) { c.beginPath(); c.roundRect(x, y, w, h, r); c.fill(); }
// renkli arka plan: köşeden köşeye renk geçişi + yumuşak ışık lekeleri
function bg(c, w, h, cols, t = 0) {
  const g = c.createLinearGradient(0, 0, w, h);
  cols.forEach((col, i) => g.addColorStop(i / (cols.length - 1), col));
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  const blob = (x, y, r, col) => { const rg = c.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, col); rg.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = rg; c.fillRect(0, 0, w, h); };
  blob(w * (0.25 + Math.sin(t * 0.7) * 0.1), h * 0.3, w * 0.5, 'rgba(255,255,255,.10)');
  blob(w * (0.8 + Math.cos(t * 0.5) * 0.08), h * 0.85, w * 0.45, 'rgba(255,120,200,.16)');
}
function hgrad(c, x, w, cols) { const g = c.createLinearGradient(x, 0, x + w, 0); cols.forEach((col, i) => g.addColorStop(i / (cols.length - 1), col)); return g; }
const RAINBOW = ['#ff4fd8', '#ff8a3d', '#ffd600', '#3df5a7', '#3db7ff', '#8b5cf6'];
const PINK = '#ff5fd2', CYAN = '#3de0ff', PURP = '#a78bfa', ORNG = '#ff9d3d', LIME = '#7cff9b';
const seg = (p, a, b) => clamp((p - a) / (b - a), 0, 1);
function typeText(c, txt, x, y, k) { const n = Math.floor(txt.length * k); c.fillText(txt.slice(0, n), x, y); return c.measureText(txt.slice(0, n)).width; }
function caret(c, x, y, t, col = Y) { if (Math.sin(t * 9) > 0) { c.fillStyle = col; c.fillRect(x + 2, y - 14, 9, 18); } }
function windowBar(c, w, title, bg = '#1a1a1a') {
  c.fillStyle = bg; c.fillRect(0, 0, w, 30);
  ['#ff5f57', '#febc2e', '#28c840'].forEach((col, i) => { c.fillStyle = col; c.beginPath(); c.arc(18 + i * 18, 15, 5.5, 0, 7); c.fill(); });
  c.fillStyle = GREY; c.font = '600 12px ' + SANS; c.textAlign = 'center'; c.fillText(title, w / 2, 19); c.textAlign = 'left';
}

// yaylanarak yerine oturma (biraz taşar, geri döner)
const back = t => { t = clamp(t, 0, 1); const s = 1.7; return 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2); };
function txt(c, s, x, y, size, col, weight = 700, align = 'left') { c.font = `${weight} ${size}px ${SANS}`; c.fillStyle = col; c.textAlign = align; c.fillText(s, x, y); c.textAlign = 'left'; }
// konfeti: sabit tohumlu renkli parçalar
function confetti(c, w, h, k, seed = 3) {
  if (k <= 0) return;
  let s = seed; const r = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  for (let i = 0; i < 46; i++) {
    const x = w / 2 + (r() - 0.5) * w * 1.1 * k, y = h * 0.42 - (r() * 0.9) * h * 0.55 * Math.sin(k * Math.PI * 0.9) + k * k * h * 0.45;
    c.save(); c.translate(x, y); c.rotate(r() * 6 + k * 8 * (r() - 0.5));
    c.fillStyle = RAINBOW[i % RAINBOW.length]; c.globalAlpha = 1 - Math.max(0, k - 0.75) * 4;
    c.fillRect(-4, -2, 8 + r() * 5, 4); c.restore();
  }
  c.globalAlpha = 1;
}

// 1) Bug avı: piksel karakter zıplayarak hataların üstünden atlar, kod jetonlarını toplar
// konsola tıklanınca oyun karakteri ekstra zıplar (createDevice ayarlar)
const poke = { t: -99, n: 0 };
function clipGame(c, w, h, p, t) {
  const sky = c.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#2a1060'); sky.addColorStop(0.6, '#b23aa8'); sky.addColorStop(1, '#ff8a3d');
  c.fillStyle = sky; c.fillRect(0, 0, w, h);
  // güneş ve piksel bulutlar
  c.fillStyle = '#ffd600'; c.beginPath(); c.arc(w * 0.78, h * 0.34, 46, 0, 7); c.fill();
  c.fillStyle = 'rgba(255,255,255,.85)';
  for (let i = 0; i < 4; i++) {
    const x = ((i * 170 - t * 22) % (w + 120) + w + 120) % (w + 120) - 80, y = 60 + (i % 2) * 40;
    [[0, 8, 48, 16], [12, 0, 28, 8], [8, 16, 36, 8]].forEach(([a, b, cw, ch]) => c.fillRect(x + a, y + b, cw, ch));
  }
  const G0 = 300, V = 130, S = 230, HX = 120, scroll = t * V;
  // zemin blokları
  for (let x = -((scroll) % 32); x < w; x += 32) {
    c.fillStyle = '#3df5a7'; c.fillRect(x, G0, 32, 12);
    c.fillStyle = '#1f9e6d'; c.fillRect(x, G0 + 12, 32, h - G0);
    c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(x + 30, G0, 2, h - G0);
  }
  // hatalar (kırmızı piksel böcekler) ve üstlerinde kod jetonları
  const first = Math.floor(scroll / S);
  for (let i = first; i < first + 4; i++) {
    const bx = i * S - scroll + 330;
    if (bx < -40 || bx > w + 40) continue;
    const wig = Math.sin(t * 14 + i) * 2;
    c.fillStyle = '#ff3b5c'; c.fillRect(bx - 14, G0 - 18 + wig, 28, 18);
    c.fillStyle = '#ffffff'; c.fillRect(bx - 8, G0 - 14 + wig, 5, 5); c.fillRect(bx + 3, G0 - 14 + wig, 5, 5);
    c.fillStyle = '#101010'; c.fillRect(bx - 6, G0 - 12 + wig, 2, 2); c.fillRect(bx + 5, G0 - 12 + wig, 2, 2);
    c.fillStyle = '#ff3b5c'; [-12, -2, 8].forEach(lx => c.fillRect(bx + lx, G0 - 2, 4, 4));
    if (bx > HX - 6) {
      const cy = G0 - 112 + Math.sin(t * 5 + i) * 4;
      c.fillStyle = '#ffd600'; rr(c, bx - 17, cy - 13, 34, 26, 8);
      txt(c, '</>', bx, cy + 5, 13, '#101010', 800, 'center');
    }
  }
  // karakter: hatanın üstünden zıplar
  const dx = (((330 - scroll - HX) % S) + S) % S, j = (dx + 70) % S;
  const pj = t - poke.t, extra = pj >= 0 && pj < 0.75 ? Math.sin(Math.PI * pj / 0.75) * 150 : 0;
  const jump = Math.max(j < 150 ? Math.sin(Math.PI * j / 150) * 100 : 0, extra);
  const hy = G0 - 34 - jump, squash = jump > 0 ? 0 : Math.abs(Math.sin(t * 16)) * 2;
  c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(HX + 16, G0 + 2, 18 - jump * 0.08, 4, 0, 0, 7); c.fill();
  c.fillStyle = '#ffd600'; rr(c, HX, hy + squash, 32, 34 - squash, 6);
  c.fillStyle = '#101010'; c.fillRect(HX + 18, hy + 9 + squash, 5, 7); c.fillRect(HX + 25, hy + 9 + squash, 4, 7);
  c.fillStyle = '#ff5fd2'; c.fillRect(HX + 4, hy + 20 + squash, 7, 4);
  // skor paneli
  c.fillStyle = 'rgba(16,16,16,.55)'; rr(c, 16, 14, 150, 34, 10); rr(c, w - 148, 14, 132, 34, 10);
  txt(c, 'BUG AVI', 30, 37, 15, '#ffd600', 800);
  txt(c, 'SKOR ' + String(Math.floor(scroll / S) * 10 + 120 + poke.n * 10).padStart(4, '0'), w - 30, 37, 15, '#ffffff', 800, 'right');
  // zıplayınca "+10" ve yıldızlar
  if (pj >= 0 && pj < 0.9) {
    const a = 1 - pj / 0.9;
    c.globalAlpha = a; txt(c, '+10', HX + 16, hy - 16 - pj * 40, 18, '#ffd600', 800, 'center');
    for (let k = 0; k < 6; k++) { const an = k / 6 * Math.PI * 2, rr2 = 10 + pj * 60; c.fillStyle = k % 2 ? '#ffffff' : '#ffd600'; c.fillRect(HX + 16 + Math.cos(an) * rr2 - 3, G0 - 10 + Math.sin(an) * rr2 * 0.5 - 3, 6, 6); }
    c.globalAlpha = 1;
  }
}

// 2) Uygulama kuruluyor: parçalar yaylanarak telefona yerleşir, sonunda konfeti
function clipBuild(c, w, h, p, t) {
  bg(c, w, h, ['#0b2a6b', '#3d1a8a', '#8b2a9a'], t);
  const px = w / 2 - 88, py = 22, pw = 176, ph = h - 44;
  c.fillStyle = '#0d0d12'; rr(c, px - 8, py - 8, pw + 16, ph + 16, 30);
  c.fillStyle = '#f7f4ff'; rr(c, px, py, pw, ph, 22);
  c.save(); c.beginPath(); c.roundRect(px, py, pw, ph, 22); c.clip();
  const drop = (a, fn) => { const k = back(seg(p, a, a + 0.14)); if (k <= 0) return; c.save(); c.translate(0, (1 - k) * -60); c.globalAlpha = Math.min(1, k * 1.5); fn(); c.restore(); };
  drop(0.02, () => { c.fillStyle = hgrad(c, px, pw, ['#ff4fd8', '#8b5cf6']); c.fillRect(px, py, pw, 62); txt(c, 'Merhaba Ayşe', px + 16, py + 40, 15, '#fff', 800); });
  drop(0.12, () => { c.fillStyle = '#ffd600'; c.beginPath(); c.arc(px + pw - 30, py + 34, 14, 0, 7); c.fill(); });
  const cards = [['#3db7ff', 'Siparişler', '12'], ['#3df5a7', 'Randevular', '5'], ['#ff8a3d', 'Mesajlar', '3']];
  cards.forEach(([col, label, n], i) => drop(0.2 + i * 0.1, () => {
    const y = py + 78 + i * 58;
    c.fillStyle = '#ffffff'; rr(c, px + 12, y, pw - 24, 48, 12);
    c.fillStyle = col; rr(c, px + 22, y + 10, 28, 28, 8);
    txt(c, label, px + 60, y + 29, 13, '#1b1440', 700);
    txt(c, n, px + pw - 26, y + 30, 15, col, 800, 'right');
  }));
  drop(0.52, () => {
    const pulse = 1 + Math.sin(t * 6) * 0.03 * seg(p, 0.6, 0.7);
    c.save(); c.translate(px + pw / 2, py + ph - 42); c.scale(pulse, pulse);
    c.fillStyle = '#ffd600'; rr(c, -62, -18, 124, 36, 18); txt(c, 'Yayına al', 0, 5, 14, '#101010', 800, 'center'); c.restore();
  });
  c.restore();
  // dokunuş ve konfeti
  const tap = seg(p, 0.66, 0.72);
  if (tap > 0 && tap < 1) { c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 3; c.beginPath(); c.arc(px + pw / 2, py + ph - 42, 10 + tap * 30, 0, 7); c.stroke(); }
  confetti(c, w, h, seg(p, 0.7, 1));
  const ok = back(seg(p, 0.72, 0.84));
  if (ok > 0) { c.save(); c.translate(w / 2, 46); c.scale(ok, ok); c.fillStyle = '#3df5a7'; rr(c, -84, -20, 168, 40, 20); txt(c, 'Uygulama yayında!', 0, 6, 14, '#0b2a1f', 800, 'center'); c.restore(); }
}

// 3) Bildirimler: işletmeye gelen iyi haberler sırayla düşer
const NOTES = [['#3df5a7', '₺', 'Yeni sipariş', '₺450 · 2 ürün'], ['#ff4fd8', '✓', 'Randevu onaylandı', 'Yarın 14:30'], ['#ffd600', '★', '5 yıldızlı yorum', '“Harika uygulama!”'], ['#3db7ff', '↑', 'Ödeme alındı', '₺1.250 hesabında']];
function clipNotify(c, w, h, p, t) {
  bg(c, w, h, ['#062a3a', '#0b4a6b', '#3a1a8a'], t);
  txt(c, '09:41', w / 2, 52, 40, 'rgba(255,255,255,.95)', 800, 'center');
  txt(c, 'Bugün harika gidiyor', w / 2, 76, 13, 'rgba(255,255,255,.65)', 600, 'center');
  NOTES.forEach(([col, ic, title, sub], i) => {
    const k = back(seg(p, 0.06 + i * 0.17, 0.24 + i * 0.17));
    if (k <= 0) return;
    const y = 96 + i * 66, x = 56 + (1 - k) * 260;
    c.save(); c.globalAlpha = Math.min(1, k * 1.4);
    c.fillStyle = 'rgba(255,255,255,.94)'; rr(c, x, y, w - 112, 56, 16);
    c.fillStyle = col; rr(c, x + 10, y + 10, 36, 36, 10);
    txt(c, ic, x + 28, y + 35, 18, '#101010', 800, 'center');
    txt(c, title, x + 58, y + 25, 14, '#141428', 800);
    txt(c, sub, x + 58, y + 44, 12, '#5b5b7a', 600);
    txt(c, 'şimdi', x + w - 128, y + 24, 11, '#9a9ab0', 600, 'right');
    c.restore();
  });
  const n = Math.min(4, Math.floor(seg(p, 0.06, 0.8) * 5));
  if (n > 0) { c.fillStyle = '#ff3b5c'; c.beginPath(); c.arc(w - 40, 40, 16, 0, 7); c.fill(); txt(c, '+' + n, w - 40, 45, 13, '#fff', 800, 'center'); }
}

// 4) Satış grafiği: renkli çubuklar yükselir, çizgi çizilir, rakam sayar
function clipChart(c, w, h, p, t) {
  bg(c, w, h, ['#1a0b3a', '#3a0b5a', '#0b3a5a'], t);
  c.fillStyle = 'rgba(255,255,255,.08)'; rr(c, 24, 20, w - 48, h - 40, 18);
  txt(c, 'Bu ayki satış', 46, 54, 14, 'rgba(255,255,255,.7)', 600);
  const val = Math.round(ease(seg(p, 0.05, 0.75)) * 184250);
  txt(c, '₺' + val.toLocaleString('tr-TR'), 46, 92, 34, '#ffffff', 800);
  const up = back(seg(p, 0.55, 0.7));
  if (up > 0) { c.save(); c.translate(w - 110, 72); c.scale(up, up); c.fillStyle = '#3df5a7'; rr(c, -48, -18, 96, 34, 17); txt(c, '▲ %248', 0, 5, 14, '#0b2a1f', 800, 'center'); c.restore(); }
  const vals = [0.32, 0.45, 0.38, 0.6, 0.52, 0.74, 0.68, 0.9];
  const bx0 = 50, bw = (w - 100) / vals.length, base = h - 50, maxH = 190;
  const pts = [];
  vals.forEach((v, i) => {
    const k = back(seg(p, 0.08 + i * 0.05, 0.3 + i * 0.05));
    const bh = v * maxH * Math.max(0, k);
    c.fillStyle = RAINBOW[i % RAINBOW.length];
    rr(c, bx0 + i * bw + 6, base - bh, bw - 12, Math.max(0, bh), 8);
    pts.push([bx0 + i * bw + bw / 2, base - v * maxH - 16]);
  });
  const lk = seg(p, 0.45, 0.85);
  if (lk > 0) {
    c.strokeStyle = '#ffffff'; c.lineWidth = 3.5; c.lineJoin = 'round'; c.beginPath();
    const n = lk * (pts.length - 1);
    pts.forEach(([x, y], i) => { if (i <= n) i ? c.lineTo(x, y) : c.moveTo(x, y); });
    const i0 = Math.floor(n), f = n - i0;
    if (i0 < pts.length - 1) c.lineTo(pts[i0][0] + (pts[i0 + 1][0] - pts[i0][0]) * f, pts[i0][1] + (pts[i0 + 1][1] - pts[i0][1]) * f);
    c.stroke();
    const last = pts[Math.min(pts.length - 1, Math.ceil(n))];
    c.fillStyle = '#ffd600'; c.beginPath(); c.arc(last[0], last[1], 6 + Math.sin(t * 8) * 1.5, 0, 7); c.fill();
  }
}

// 5) Tema değiştir: aynı site renk renk değişir, imleç paletten seçer
const THEMES = [['#ff4fd8', '#ffe1f6', '#5a0b4a'], ['#3db7ff', '#e0f4ff', '#0b2a5a'], ['#3df5a7', '#e0fff2', '#0b4a2f'], ['#ffd600', '#fff8d6', '#4a3a00'], ['#8b5cf6', '#efe7ff', '#2a0b5a']];
const mix = (a, b, k) => { const pa = [1, 3, 5].map(i => parseInt(a.slice(i, i + 2), 16)), pb = [1, 3, 5].map(i => parseInt(b.slice(i, i + 2), 16)); return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * k)).join(',')})`; };
function clipTheme(c, w, h, p, t) {
  const n = THEMES.length, f = p * (n - 1) * 0.999, i0 = Math.floor(f), kk = ease(clamp((f - i0 - 0.55) / 0.45, 0, 1));
  const A = THEMES[i0], B = THEMES[Math.min(n - 1, i0 + 1)];
  const acc = mix(A[0], B[0], kk), soft = mix(A[1], B[1], kk), dark = mix(A[2], B[2], kk);
  c.fillStyle = soft; c.fillRect(0, 0, w, h);
  // üst menü
  c.fillStyle = dark; rr(c, 24, 20, 30, 30, 9); txt(c, 'Kahve Durağı', 64, 41, 15, dark, 800);
  [['Menü', w - 214], ['Hakkımızda', w - 168], ['İletişim', w - 82]].forEach(([m, x]) => txt(c, m, x, 41, 12, dark, 600));
  // büyük başlık ve buton
  txt(c, 'Günün en iyi', 24, 108, 34, dark, 800);
  txt(c, 'kahvesi burada.', 24, 146, 34, acc, 800);
  c.fillStyle = acc; rr(c, 24, 166, 130, 40, 20); txt(c, 'Sipariş ver', 89, 191, 14, dark, 800, 'center');
  // görsel
  c.fillStyle = acc; rr(c, w - 200, 76, 176, 132, 22);
  c.fillStyle = soft; c.beginPath(); c.arc(w - 112, 142, 40 + Math.sin(t * 3) * 3, 0, 7); c.fill();
  c.fillStyle = dark; c.beginPath(); c.arc(w - 112, 142, 18, 0, 7); c.fill();
  // ürün kartları
  for (let i = 0; i < 3; i++) {
    const x = 24 + i * ((w - 48) / 3);
    c.fillStyle = '#ffffff'; rr(c, x + 4, 226, (w - 48) / 3 - 8, 120, 16);
    c.fillStyle = i === 1 ? acc : soft; rr(c, x + 16, 238, (w - 48) / 3 - 32, 60, 12);
    txt(c, ['Latte', 'Espresso', 'Mocha'][i], x + 16, 320, 13, dark, 800);
    txt(c, ['₺95', '₺70', '₺110'][i], x + 16, 336, 12, acc, 800);
  }
  // palet ve imleç
  c.fillStyle = 'rgba(16,16,16,.8)'; rr(c, w / 2 - 92, h - 34, 184, 26, 13);
  THEMES.forEach((th, i) => { c.fillStyle = th[0]; c.beginPath(); c.arc(w / 2 - 68 + i * 34, h - 21, i === Math.min(n - 1, i0 + (kk > 0.5 ? 1 : 0)) ? 9 : 6, 0, 7); c.fill(); });
  const tx = w / 2 - 68 + (i0 + 1) * 34, ty = h - 21, ck = clamp((f - i0 - 0.2) / 0.35, 0, 1);
  const cx = tx + (1 - ease(ck)) * 60, cy = ty - 4 + (1 - ease(ck)) * -40;
  c.fillStyle = '#ffffff'; c.strokeStyle = '#101010'; c.lineWidth = 1.5;
  c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx, cy + 18); c.lineTo(cx + 5, cy + 13); c.lineTo(cx + 12, cy + 13); c.closePath(); c.fill(); c.stroke();
}

const CLIPS = [
  { draw: clipGame, label: '01 BUG AVI', glow: '#ff4fd8' },
  { draw: clipBuild, label: '02 UYGULAMA KURULUYOR', glow: '#8b5cf6' },
  { draw: clipNotify, label: '03 BİLDİRİMLER', glow: '#3db7ff' },
  { draw: clipChart, label: '04 SATIŞ GRAFİĞİ', glow: '#ff8a3d' },
  { draw: clipTheme, label: '05 TEMA DEĞİŞTİR', glow: '#3df5a7' }
];

// ---------------- Devre kartı dokusu (bir kez çizilir) ----------------
function boardTexture() {
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 640;
  const c = cv.getContext('2d');
  c.fillStyle = '#16181a'; c.fillRect(0, 0, 512, 640);
  let s = 7; const r = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  c.strokeStyle = 'rgba(212,168,75,.55)'; c.lineWidth = 2;
  for (let i = 0; i < 60; i++) {
    let x = r() * 512, y = 300 + r() * 340; c.beginPath(); c.moveTo(x, y);
    for (let j = 0; j < 4; j++) { r() > 0.5 ? (x += (r() - 0.5) * 120) : (y += (r() - 0.5) * 120); c.lineTo(x, y); }
    c.stroke(); c.fillStyle = 'rgba(212,168,75,.8)'; c.beginPath(); c.arc(x, y, 3, 0, 7); c.fill();
  }
  c.fillStyle = '#0b0c0d';
  for (let i = 0; i < 8; i++) c.fillRect(40 + r() * 400, 330 + r() * 260, 30 + r() * 60, 18 + r() * 30);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  return tex;
}

// ---------------- Cihaz ----------------
export function createDevice() {
  // yatay el konsolu: ortada büyük ekran, iki yanda tuşlar
  const SCH = 0.92, SCW = SCH * 4 / 3, SIDE = 0.4;
  const W = SCW + SIDE * 2, H = 1.12, D = 0.16;
  const group = new THREE.Group();

  // ekran tuvali (2x çözünürlük, klipler 512x384 koordinatla çizer)
  const SW = 512, SH = 384, PR = 2;
  const screenCv = document.createElement('canvas'); screenCv.width = SW * PR; screenCv.height = SH * PR;
  const sc = screenCv.getContext('2d'); sc.setTransform(PR, 0, 0, PR, 0, 0);
  const screenTex = new THREE.CanvasTexture(screenCv);
  screenTex.colorSpace = THREE.SRGBColorSpace; screenTex.anisotropy = 8;

  // ---- premium gövde: mat grafit siyah, yanlarda tutamaçlar, sarı vurgular ----
  const bodyMat = new THREE.MeshPhysicalMaterial({ color: 0x0b0b0e, roughness: 0.45, metalness: 0.1, clearcoat: 0.5, clearcoatRoughness: 0.35, envMapIntensity: 0.55 });
  const gripMat = new THREE.MeshPhysicalMaterial({ color: 0x121216, roughness: 0.6, metalness: 0.05, clearcoat: 0.3, clearcoatRoughness: 0.5, envMapIntensity: 0.5 });
  const keyMat = new THREE.MeshPhysicalMaterial({ color: 0x24242b, roughness: 0.3, metalness: 0.1, clearcoat: 0.9, clearcoatRoughness: 0.18, envMapIntensity: 0.7 });
  const yelMat = new THREE.MeshPhysicalMaterial({ color: 0xffd600, roughness: 0.3, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.15 });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x0e0e12, roughness: 0.9 });
  const CW = SCW + 0.14, gx = CW / 2 + SIDE / 2 - 0.02;
  const body = new THREE.Mesh(new RoundedBoxGeometry(CW, H, D, 5, 0.05), bodyMat); group.add(body);
  [-1, 1].forEach(sd => {
    const gw = SIDE + 0.04, R = 0.24, r = 0.02, dz = D * 1.12 - 0.04;
    const shp = new THREE.Shape(), x0 = -gw / 2, x1 = gw / 2, y0 = -H / 2, y1 = H / 2;
    // dış taraf (sd yönü) geniş yuvarlak, iç taraf (gövdeye bakan) neredeyse düz
    const rl = sd < 0 ? R : r, rr2 = sd < 0 ? r : R;
    shp.moveTo(x0 + rl, y0); shp.lineTo(x1 - rr2, y0); shp.quadraticCurveTo(x1, y0, x1, y0 + rr2); shp.lineTo(x1, y1 - rr2); shp.quadraticCurveTo(x1, y1, x1 - rr2, y1);
    shp.lineTo(x0 + rl, y1); shp.quadraticCurveTo(x0, y1, x0, y1 - rl); shp.lineTo(x0, y0 + rl); shp.quadraticCurveTo(x0, y0, x0 + rl, y0);
    const geo = new THREE.ExtrudeGeometry(shp, { depth: dz, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.018, bevelSegments: 5, curveSegments: 24 });
    geo.translate(0, 0, -dz / 2);
    const g = new THREE.Mesh(geo, gripMat);
    g.position.x = sd * gx; group.add(g);
    // birleşim çizgisi
    const seam = new THREE.Mesh(new THREE.PlaneGeometry(0.007, H * 0.93), new THREE.MeshBasicMaterial({ color: 0x050506 }));
    seam.position.set(sd * (CW / 2 - 0.005), 0, D / 2 + 0.0012); group.add(seam);
    // omuz tuşu
    const sh = new THREE.Mesh(new RoundedBoxGeometry(SIDE * 0.62, 0.04, D * 0.7, 3, 0.018), yelMat);
    sh.position.set(sd * (gx - 0.03), H / 2 + 0.004, -0.03); group.add(sh);
  });
  const fz = D / 2, gz = D * 1.12 / 2;

  // ekran: parlak siyah cam çerçeve + ekran + yansıma
  const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x050507, roughness: 0.06, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.03 });
  const glass = new THREE.Mesh(new RoundedBoxGeometry(SCW + 0.1, H - 0.1, 0.01, 3, 0.004), glassMat);
  glass.position.set(0, 0, fz + 0.003); group.add(glass);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(SCW, SCH), new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false }));
  screen.position.set(0, 0.015, fz + 0.0092); group.add(screen);
  const glossCv = document.createElement('canvas'); glossCv.width = 512; glossCv.height = 384;
  const gc = glossCv.getContext('2d');
  const gg = gc.createLinearGradient(0, 0, 512, 384);
  gg.addColorStop(0, 'rgba(255,255,255,.0)'); gg.addColorStop(0.32, 'rgba(255,255,255,.0)'); gg.addColorStop(0.36, 'rgba(255,255,255,.55)');
  gg.addColorStop(0.46, 'rgba(255,255,255,.12)'); gg.addColorStop(0.5, 'rgba(255,255,255,0)'); gg.addColorStop(1, 'rgba(255,255,255,0)');
  gc.fillStyle = gg; gc.fillRect(0, 0, 512, 384);
  const gloss = new THREE.Mesh(new THREE.PlaneGeometry(SCW + 0.1, H - 0.1), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(glossCv), transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  gloss.position.set(0, 0, fz + 0.0105); group.add(gloss);
  // ekran altındaki baskı logo
  const logoCv = document.createElement('canvas'); logoCv.width = 256; logoCv.height = 40;
  const lc = logoCv.getContext('2d'); lc.fillStyle = 'rgba(255,255,255,.55)'; lc.font = '800 26px "Inter Tight", Arial, sans-serif'; lc.textAlign = 'center'; lc.fillText('P I X E L A', 128, 30);
  const logoTex = new THREE.CanvasTexture(logoCv); logoTex.colorSpace = THREE.SRGBColorSpace;
  const logo = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.047), new THREE.MeshBasicMaterial({ map: logoTex, transparent: true, depthWrite: false }));
  logo.position.set(0, -H / 2 + 0.028, fz + 0.0095); group.add(logo);

  // silindir kapağının dokusu döndürülmüş gelir: harf ve oklar dik dursun diye düzeltme
  const CAP_ROT = Math.PI / 2;
  // harfli düğme kapağı (üst yüzde harf)
  function letterTex(ch, col) {
    const cv = document.createElement('canvas'); cv.width = cv.height = 128;
    const c = cv.getContext('2d'); c.fillStyle = '#2b2b33'; c.fillRect(0, 0, 128, 128);
    c.fillStyle = col; c.font = '800 84px "Inter Tight", Arial, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(ch, 64, 70);
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.center.set(0.5, 0.5); t.rotation = CAP_ROT; return t;
  }
  const lx = -gx, rx = gx;
  const capGeo = new THREE.CylinderGeometry(0.046, 0.048, 0.034, 40); capGeo.rotateX(Math.PI / 2);
  [['X', 0, 0.1, '#e6e6ec'], ['A', 0.1, 0, '#101010'], ['B', 0, -0.1, '#e6e6ec'], ['Y', -0.1, 0, '#e6e6ec']].forEach(([ch, x, y, col]) => {
    const top = ch === 'A' ? yelMat : new THREE.MeshPhysicalMaterial({ map: letterTex(ch, col), roughness: 0.32, clearcoat: 0.8, clearcoatRoughness: 0.2 });
    const b = new THREE.Mesh(capGeo, [keyMat, ch === 'A' ? yelMat : top, keyMat]);
    if (ch === 'A') { const lt = new THREE.Mesh(new THREE.CircleGeometry(0.04, 24), new THREE.MeshBasicMaterial({ map: (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 128; const c = cv.getContext('2d'); c.fillStyle = '#101010'; c.font = '800 74px "Inter Tight", Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('A', 64, 70); const t = new THREE.CanvasTexture(cv); return t; })(), transparent: true, depthWrite: false })); lt.position.z = 0.0175; b.add(lt); }
    b.position.set(rx + x, 0.2 + y, gz + 0.006); b.userData.btn = ch; group.add(b);
  });
  // yön tuşları: dört ayrı yuvarlak düğme, üstlerinde ok
  function arrowTex(rot) {
    const cv = document.createElement('canvas'); cv.width = cv.height = 128; const c = cv.getContext('2d');
    c.fillStyle = '#2b2b33'; c.fillRect(0, 0, 128, 128); c.translate(64, 64); c.rotate(rot);
    c.fillStyle = '#e6e6ec'; c.beginPath(); c.moveTo(0, -30); c.lineTo(26, 16); c.lineTo(-26, 16); c.closePath(); c.fill();
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.center.set(0.5, 0.5); t.rotation = CAP_ROT; return t;
  }
  [[0, 0.1, 0, 'up'], [0.1, 0, Math.PI / 2, 'right'], [0, -0.1, Math.PI, 'down'], [-0.1, 0, -Math.PI / 2, 'left']].forEach(([x, y, r, nm]) => {
    const top = new THREE.MeshPhysicalMaterial({ map: arrowTex(r), roughness: 0.32, clearcoat: 0.8, clearcoatRoughness: 0.2 });
    const b = new THREE.Mesh(capGeo, [keyMat, top, keyMat]);
    b.position.set(lx + x, -0.17 + y, gz + 0.006); b.userData.btn = nm; group.add(b);
  });
  // analog çubuklar: yuva, sarı halka, kauçuk başlık, içbükey üst
  function stick(x, y) {
    const st = new THREE.Group(); st.position.set(x, y, gz);
    const well = new THREE.Mesh(new THREE.CylinderGeometry(0.083, 0.083, 0.012, 40), rubber); well.rotation.x = Math.PI / 2; st.add(well);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.007, 12, 48), yelMat); st.add(ring);
    const head = new THREE.Group(); st.add(head); st.userData.head = head; st.userData.btn = 'stick';
    const capM = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.066, 0.05, 40), new THREE.MeshStandardMaterial({ color: 0x232329, roughness: 0.85 }));
    capM.rotation.x = Math.PI / 2; capM.position.z = 0.03; head.add(capM);
    const lip = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.011, 14, 40), new THREE.MeshStandardMaterial({ color: 0x2e2e36, roughness: 0.6 })); lip.position.z = 0.055; head.add(lip);
    const dish = new THREE.Mesh(new THREE.CircleGeometry(0.05, 32), new THREE.MeshStandardMaterial({ color: 0x18181d, roughness: 0.95 })); dish.position.z = 0.052; head.add(dish);
    group.add(st); return st;
  }
  const stickL = stick(lx, 0.2), stickR = stick(rx, -0.17);
  // küçük tuşlar: eksi/artı, ev, ekran görüntüsü, durum ışığı
  const pill = new RoundedBoxGeometry(0.06, 0.018, 0.016, 2, 0.008);
  const minus = new THREE.Mesh(pill, keyMat); minus.position.set(lx + 0.12, 0.42, gz); group.add(minus);
  const plusA = new THREE.Mesh(pill, keyMat); plusA.position.set(rx - 0.12, 0.42, gz); group.add(plusA);
  const plusB = new THREE.Mesh(pill, keyMat); plusB.rotation.z = Math.PI / 2; plusB.position.set(rx - 0.12, 0.42, gz); group.add(plusB);
  const home = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.014, 28), keyMat); home.rotation.x = Math.PI / 2; home.position.set(rx - 0.09, -0.4, gz); group.add(home);
  const homeRing = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.004, 8, 32), yelMat); homeRing.position.set(rx - 0.09, -0.4, gz + 0.004); group.add(homeRing);
  const cap2 = new THREE.Mesh(new RoundedBoxGeometry(0.04, 0.04, 0.014, 2, 0.008), keyMat); cap2.position.set(lx + 0.09, -0.4, gz); group.add(cap2);
  const led = new THREE.Mesh(new THREE.CircleGeometry(0.008, 16), new THREE.MeshBasicMaterial({ color: 0x3df5a7, toneMapped: false })); led.position.set(CW / 2 - 0.05, H / 2 - 0.028, fz + 0.0012); group.add(led);
  // hoparlör delikleri
  const holeGeo = new THREE.CircleGeometry(0.007, 10), holeMat = new THREE.MeshBasicMaterial({ color: 0x050506 });
  [-1, 1].forEach(sd => { for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) { const h = new THREE.Mesh(holeGeo, holeMat); h.position.set(sd * (gx + sd * 0.06) + (i - 1) * 0.024 * sd, -0.43 + j * 0.022 - 0.0, gz + 0.001); group.add(h); } });

  // ---------------- etkileşim: düğmeler basılır, çubuklar fareye eğilir ----------------
  const btns = group.children.filter(o => o.userData.btn && o.userData.btn !== 'stick').map(o => ({ o, z: o.position.z, press: 0, dz: 0 }));
  const sticks = [stickL, stickR];
  let hovered = null, aimX = 0, aimY = 0, sx2 = 0, sy2 = 0, nowT = 0;
  const findBtn = obj => { while (obj && obj !== group) { if (obj.userData && obj.userData.btn) return obj; obj = obj.parent; } return null; };
  function hover(obj) { hovered = findBtn(obj); return !!obj; }
  function aim(x, y) { aimX = clamp(x, -1, 1); aimY = clamp(y, -1, 1); }
  function click(obj) {
    const b = findBtn(obj);
    if (b) { const it = btns.find(x => x.o === b); if (it) it.press = 1; if (b.userData.btn === 'stick') b.userData.kick = 1; }
    const name = b && b.userData.btn;
    if (name === 'right' || name === 'X') { next(); return; }
    if (name === 'left') { prev(); return; }
    if (CLIPS[trans > 0 ? nextIdx : idx].draw === clipGame) { poke.t = nowT; poke.n++; clipT = Math.min(clipT, CLIP_LEN - 2.5); }
    else next();
  }

  // klip oynatıcı
  let idx = 0, clipT = 0, trans = 0, nextIdx = 1, dir = 1;
  const CLIP_LEN = 4.6, TRANS = 0.6;
  function next() { if (trans > 0) return; dir = 1; nextIdx = (idx + 1) % CLIPS.length; trans = 0.0001; }
  function prev() { if (trans > 0) return; dir = -1; nextIdx = (idx - 1 + CLIPS.length) % CLIPS.length; trans = 0.0001; }

  function overlay(c, label, t) {
    // hafif kenar gölgesi
    const g = c.createRadialGradient(SW / 2, SH / 2, SH * 0.5, SW / 2, SH / 2, SH * 0.9);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.18)');
    c.fillStyle = g; c.fillRect(0, 0, SW, SH);
    c.font = '700 12px "Inter Tight", Arial, sans-serif';
    const tw = c.measureText(label).width;
    c.fillStyle = 'rgba(16,16,16,.75)'; rr(c, SW - tw - 34, SH - 32, tw + 20, 22, 11);
    c.fillStyle = Y; c.fillText(label, SW - tw - 24, SH - 16);
  }

  function update(dt, t) {
    nowT = t;
    // düğmeler: üstüne gelince hafif, tıklayınca derin basılır
    const f = 1 - Math.pow(0.0005, dt);
    btns.forEach(it => {
      it.press = Math.max(0, it.press - dt * 4);
      const tgt = (hovered === it.o ? 0.007 : 0) + Math.sin(Math.min(1, it.press) * Math.PI) * 0.016;
      it.dz += (tgt - it.dz) * f; it.o.position.z = it.z - it.dz;
    });
    // analog çubuklar fareye doğru eğilir
    sx2 += (aimX - sx2) * f * 0.6; sy2 += (aimY - sy2) * f * 0.6;
    sticks.forEach(st => {
      const k = st.userData.kick || 0; st.userData.kick = Math.max(0, k - dt * 3);
      const hv = hovered === st ? 1.6 : 1;
      st.userData.head.rotation.set(-sy2 * 0.42 * hv, sx2 * 0.42 * hv, 0);
      st.userData.head.position.z = -Math.sin(Math.min(1, k) * Math.PI) * 0.02;
    });
    clipT += dt;
    if (trans === 0 && clipT > CLIP_LEN) next();
    const p = clamp(clipT / CLIP_LEN, 0, 1);
    if (trans > 0) {
      // yumuşak kayma: eski klip yana kayar, yenisi diğer taraftan gelir
      trans += dt / TRANS;
      const k = ease(Math.min(1, trans)), off = k * SW * dir;
      sc.save(); sc.translate(-off, 0); CLIPS[idx].draw(sc, SW, SH, 1, t); sc.restore();
      sc.save(); sc.translate(SW * dir - off, 0); CLIPS[nextIdx].draw(sc, SW, SH, 0, t); sc.restore();
      if (trans >= 1) { idx = nextIdx; clipT = 0; trans = 0; }
    } else CLIPS[idx].draw(sc, SW, SH, p, t);
    overlay(sc, CLIPS[idx].label, t);
    screenTex.needsUpdate = true;
  }

  // ekranın o anki rengi: etrafa ışık olarak yayılır
  const glowColor = () => CLIPS[trans > 0.5 ? nextIdx : idx].glow;
  return { group, update, next, glowColor, hover, aim, click, hitTargets: [gloss, screen, body] };
}
export { CLIPS };
