/* Pixela: iki 3D sahne (Three.js).
   1) Hero: kare kare piksel PIXELA yazısı (tek gövde) + şeffaf cihaz. Fareye doğru döner.
   Showreel artık gerçek videolarla çalışıyor: assets/reel.js */
import * as THREE from 'three';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';
import { createDevice, CLIPS } from './device.js';
import { RoundedBoxGeometry } from './vendor/RoundedBoxGeometry.js';

const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
let seed = 987654;
const rand = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;

function makeRenderer(canvas) {
  try {
    const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(2, devicePixelRatio || 1));
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.outputColorSpace = THREE.SRGBColorSpace;
    return r;
  } catch (e) {
    canvas.style.display = 'none';
    return null;
  }
}

// slogan PIXELA yazısının hemen altına, ortaya yerleşir (değer: ekran yüksekliğinin oranı)
function placeTag(topFrac) {
  document.documentElement.style.setProperty('--tag-y', (topFrac * 100).toFixed(2) + '%');
}

// Görünür olduğunda çalışan, durunca dinlenen döngü
function loop(el, step) {
  let visible = false, running = false, last = 0;
  const tick = now => {
    const dt = Math.min(50, now - (last || now)); last = now;
    const keep = step(dt / 1000, now / 1000);
    if (visible && !document.hidden && keep !== false) requestAnimationFrame(tick);
    else { running = false; last = 0; }
  };
  const wake = () => { if (!running && visible && !document.hidden) { running = true; requestAnimationFrame(tick); } };
  new IntersectionObserver(es => { visible = es[0].isIntersecting; wake(); }, { rootMargin: '100px 0px' }).observe(el);
  document.addEventListener('visibilitychange', wake);
  return wake;
}

/* =========================================================
   Yedek görünüm: tarayıcıda WebGL yoksa (donanım hızlandırma kapalı vb.)
   aynı sahne 2D tuvalde çizilir: piksel PIXELA ve konsol, fareye döner.
   ========================================================= */
const GLYPHS2D = {
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  I: ['111', '010', '010', '010', '010', '010', '111'],
  X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001']
};
function hero2D(oldCanvas, section) {
  const canvas = oldCanvas.cloneNode(false);
  canvas.style.display = '';
  oldCanvas.replaceWith(canvas);
  const c = canvas.getContext('2d');
  const cells = []; let cx = 0;
  [...'PIXELA'].forEach(ch => {
    const g = GLYPHS2D[ch];
    g.forEach((row, y) => [...row].forEach((b, x) => { if (b === '1') cells.push([cx + x, y]); }));
    cx += g[0].length + 1;
  });
  const COLS = cx - 1;
  // konsol ekranı: device.js'deki kliplerle aynı
  const SW = 512, SH = 384;
  const scr = document.createElement('canvas'); scr.width = SW; scr.height = SH;
  const sc = scr.getContext('2d');
  let idx = 0, clipT = 0, trans = 0, nextIdx = 1;
  const next = () => {
    if (trans > 0) return; nextIdx = (idx + 1) % CLIPS.length; trans = 0.0001;
  };

  let W = 0, H = 0, dpr = 1, mobile = false;
  const L = {};
  function size() {
    W = canvas.clientWidth; H = canvas.clientHeight; if (!W || !H) return;
    dpr = Math.min(2, devicePixelRatio || 1);
    canvas.width = W * dpr; canvas.height = H * dpr;
    mobile = W < 768 || H > W * 1.15;
    L.cell = Math.min(W * (mobile ? 0.86 : 0.56 * Math.pow(Math.min(1, (H / W) / 0.625), 0.8)), H * 1.15) / COLS;
    L.tw = COLS * L.cell; L.th = 7 * L.cell;
    L.tx = W / 2; L.ty = H * (mobile ? 0.34 : 0.3);
    const tb = L.ty + L.th / 2;
    placeTag(tb / H + 0.02);
    if (mobile) { L.dh = Math.min(H * 0.26, W * 0.42); L.dcy = H * 0.62; L.dcx = W / 2; }
    else {
      // konsol, sloganın altına iner (slogan için yer bırakılır)
      const gap = L.th * 0.66;
      L.dh = Math.min(H * 0.4, L.th * 2.2, H - Math.max(H * 0.1, 105) - tb - gap);
      L.dcx = W / 2 - L.tw * 0.03; L.dcy = tb + gap + L.dh / 2;
      document.documentElement.style.setProperty('--tag-top', ((L.ty + L.th / 2) / H * 100 + 2.5).toFixed(1) + '%');
    }
    L.dw = L.dh * 1.81;
  }
  addEventListener('resize', () => { size(); wake(); });
  size();

  const target = { x: 0, y: 0 }; let moved = false;
  addEventListener('pointermove', e => { target.x = (e.clientX / innerWidth) * 2 - 1; target.y = (e.clientY / innerHeight) * 2 - 1; moved = true; wake(); }, { passive: true });
  section.addEventListener('click', e => {
    if (e.target.closest('a, button')) return;
    const r = canvas.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    if (Math.abs(x - L.dcx) < L.dw / 2 && Math.abs(y - L.dcy) < L.dh / 2) next();
  });

  let ready = reduce.matches || !!window.__pixelaReady, introT = reduce.matches ? 9 : 0;
  document.addEventListener('pixela:ready', () => { ready = true; wake(); });
  const rot = { x: 0, y: 0, vx: 0, vy: 0 }, dev = { x: 0, y: 0, vx: 0, vy: 0 };
  const spring = (o, tx, ty, k, d, dt) => {
    o.vx += ((tx - o.x) * k - o.vx * d) * dt; o.vy += ((ty - o.y) * k - o.vy * d) * dt;
    o.x += o.vx * dt; o.y += o.vy * dt;
  };
  const rrect = (x, y, w, h, r) => { c.beginPath(); c.roundRect(x, y, w, h, r); };
  const blob = (x, y, rx, ry, a) => {
    c.save(); c.translate(x, y); c.scale(1, ry / rx);
    const g = c.createRadialGradient(0, 0, 0, 0, 0, rx);
    g.addColorStop(0, `rgba(60,40,0,${0.42 * a})`); g.addColorStop(0.6, `rgba(60,40,0,${0.12 * a})`); g.addColorStop(1, 'rgba(60,40,0,0)');
    c.fillStyle = g; c.fillRect(-rx, -rx, rx * 2, rx * 2); c.restore();
  };

  function drawText(ie, t) {
    const cell = L.cell, gx = L.tx - L.tw / 2, gy = L.ty - L.th / 2;
    // dönüş hissi: yatay sıkışma + derinlik yönü fareye göre
    const sx = Math.cos(rot.x * 1.4), sy = Math.cos(rot.y * 1.4);
    const ex = -rot.x * cell * 2.2, ey = -rot.y * cell * 2.2 + cell * 0.25;
    c.save();
    c.translate(L.tx, L.ty + (1 - ie) * 40 + (moved ? 0 : Math.sin(t * 1.1) * 3));
    c.transform(sx, rot.x * -0.06, 0, sy, 0, 0);
    c.translate(-L.tx, -L.ty);
    const steps = 5;
    for (let s = steps; s >= 1; s--) {
      const k = s / steps;
      c.fillStyle = `rgb(${34 - 14 * k | 0},${34 - 14 * k | 0},${34 - 14 * k | 0})`;
      cells.forEach(([x, y]) => c.fillRect(gx + x * cell + ex * k, gy + y * cell + ey * k, cell * 0.95, cell * 0.95));
    }
    const lg = c.createLinearGradient(gx, gy, gx + L.tw, gy + L.th);
    lg.addColorStop(0, '#2a2a2a'); lg.addColorStop(0.5, '#121212'); lg.addColorStop(1, '#1d1d1d');
    cells.forEach(([x, y]) => {
      const px = gx + x * cell, py = gy + y * cell;
      c.fillStyle = lg; rrect(px, py, cell * 0.94, cell * 0.94, cell * 0.08); c.fill();
      c.fillStyle = 'rgba(255,255,255,.10)'; c.fillRect(px + cell * 0.08, py + cell * 0.06, cell * 0.78, cell * 0.07);
    });
    c.restore();
  }

  let dv2 = 0;
  function drawDevice(ie, t, dt) {
    const de = dv2 * dv2 * (3 - 2 * dv2), lk = 1 - de;
    clipT += dt;
    if (trans === 0 && clipT > 4.6) next();
    if (trans > 0) {
      // yumuşak kayma: eski klip sola, yenisi sağdan
      trans += dt / 0.6;
      const k = 1 - Math.pow(1 - Math.min(1, trans), 3), off = k * SW;
      sc.save(); sc.translate(-off, 0); CLIPS[idx].draw(sc, SW, SH, 1, t); sc.restore();
      sc.save(); sc.translate(SW - off, 0); CLIPS[nextIdx].draw(sc, SW, SH, 0, t); sc.restore();
      if (trans >= 1) { idx = nextIdx; clipT = 0; trans = 0; }
    } else CLIPS[idx].draw(sc, SW, SH, clamp(clipT / 4.6, 0, 1), t);
    const w = L.dw, h = L.dh;
    // dalış: konsol ekranın ortasına gelir ve ekranı görüş alanını kaplayana kadar büyür
    const zoom = Math.max(W / (h * 0.82 * 4 / 3), H / (h * 0.82)) * 1.06;
    const s = (0.6 + 0.4 * ie) * (1 + (zoom - 1) * de * de);
    const dx = dev.x * lk, dy = dev.y * lk;
    c.save();
    c.translate(L.dcx + (W / 2 - L.dcx) * de, L.dcy + (H / 2 - L.dcy) * de + ((1 - ie) * 60 + Math.sin(t * 1.2) * 4) * lk);
    c.transform(Math.cos(dx) * s, dx * 0.12 * s, -dy * 0.05 * s, Math.cos(dy) * s, 0, 0);
    c.rotate(-dx * 0.05);
    const R = h * 0.3;
    // gölge/kalınlık ve mat siyah gövde (dış köşeler geniş yuvarlak)
    c.fillStyle = 'rgba(0,0,0,.35)'; rrect(-w / 2 - dev.x * 8, -h / 2 + 7, w, h, R); c.fill();
    const bg = c.createLinearGradient(0, -h / 2, 0, h / 2);
    bg.addColorStop(0, '#26262d'); bg.addColorStop(0.5, '#141418'); bg.addColorStop(1, '#0b0b0e');
    c.fillStyle = bg; rrect(-w / 2, -h / 2, w, h, R); c.fill();
    // ekran camı ve birleşim çizgileri
    const sh = h * 0.82, sw = sh * 4 / 3;
    c.fillStyle = '#050507'; rrect(-sw / 2 - h * 0.05, -h / 2 + h * 0.03, sw + h * 0.1, h * 0.94, 6); c.fill();
    c.fillStyle = '#000'; [-1, 1].forEach(sd => c.fillRect(sd * (sw / 2 + h * 0.05) - 1, -h * 0.46, 2, h * 0.92));
    // omuz tuşları
    c.fillStyle = '#ffd600'; [-1, 1].forEach(sd => { rrect(sd * (sw / 2 + (w - sw) / 4) - h * 0.14, -h / 2 - 4, h * 0.28, 7, 3); c.fill(); });
    c.drawImage(scr, -sw / 2, -sh / 2, sw, sh);
    // ekranda showreel videosu belirir
    const va = clamp((dv2 - 0.18) / 0.4, 0, 1), v = window.__reelFront && window.__reelFront();
    if (va > 0 && v && v.readyState >= 2 && v.videoWidth) {
      const a = sw / sh, vr = v.videoWidth / v.videoHeight;
      let sx = 0, sy = 0, swv = v.videoWidth, shv = v.videoHeight;
      if (vr > a) { swv = shv * a; sx = (v.videoWidth - swv) / 2; } else { shv = swv / a; sy = (v.videoHeight - shv) / 2; }
      c.globalAlpha = va; c.drawImage(v, sx, sy, swv, shv, -sw / 2, -sh / 2, sw, sh); c.globalAlpha = 1;
    }
    // tuşlar: analog çubuklar (sarı halka), harfli düğmeler, yön tuşları
    const lx = -(sw / 2 + (w - sw) / 4), rx = -lx, u = h * 0.075, kc = '#2a2a31';
    const stick2 = (x, y) => {
      c.fillStyle = '#0a0a0d'; c.beginPath(); c.arc(x, y, u * 1.25, 0, 7); c.fill();
      c.strokeStyle = '#ffd600'; c.lineWidth = 2; c.beginPath(); c.arc(x, y, u * 1.2, 0, 7); c.stroke();
      const sg = c.createRadialGradient(x - u * 0.3, y - u * 0.3, 1, x, y, u); sg.addColorStop(0, '#3a3a42'); sg.addColorStop(1, '#1a1a1f');
      c.fillStyle = sg; c.beginPath(); c.arc(x, y, u * 0.9, 0, 7); c.fill();
    };
    stick2(lx, -h * 0.2); stick2(rx, h * 0.17);
    const btn = (x, y, col, lab, labCol) => {
      c.fillStyle = col; c.beginPath(); c.arc(x, y, u * 0.6, 0, 7); c.fill();
      c.fillStyle = labCol; c.font = `800 ${Math.round(u * 0.7)}px "Inter Tight", Arial`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(lab, x, y + 1); c.textAlign = 'left'; c.textBaseline = 'alphabetic';
    };
    [[0, -1.3, 'X'], [1.3, 0, 'A'], [0, 1.3, 'B'], [-1.3, 0, 'Y']].forEach(([x, y, l]) => btn(rx + x * u, -h * 0.2 + y * u, l === 'A' ? '#ffd600' : kc, l, l === 'A' ? '#101010' : '#e6e6ec'));
    [[0, -1.3, '▲'], [1.3, 0, '▶'], [0, 1.3, '▼'], [-1.3, 0, '◀']].forEach(([x, y, l]) => btn(lx + x * u, h * 0.17 + y * u, kc, l, '#e6e6ec'));
    // ekran yansıması
    const gl = c.createLinearGradient(-sw / 2, -sh / 2, sw / 2, sh / 2);
    gl.addColorStop(0, 'rgba(255,255,255,0)'); gl.addColorStop(0.33, 'rgba(255,255,255,0)'); gl.addColorStop(0.37, 'rgba(255,255,255,.18)'); gl.addColorStop(0.47, 'rgba(255,255,255,.04)'); gl.addColorStop(0.5, 'rgba(255,255,255,0)');
    c.fillStyle = gl; c.fillRect(-sw / 2, -sh / 2, sw, sh);
    c.restore();
  }

  const wake = loop(section, (dt, t) => {
    if (!W) { size(); if (!W) return true; }
    const still = reduce.matches;
    if (ready && introT < 9) introT += dt;
    const ie = still ? 1 : 1 - Math.pow(1 - clamp(introT / 1.4, 0, 1), 4);
    spring(rot, still ? 0 : target.x * 0.24, still ? 0 : target.y * 0.16, 46, 8.5, dt);
    spring(dev, still ? -0.2 : target.x * 0.6 - 0.15, still ? 0 : target.y * 0.4, 38, 7.5, dt);
    const DL = (window.__diveLen ? window.__diveLen() : innerHeight);
    dv2 = still ? 0 : clamp(scrollY / DL, 0, 1);
    if (scrollY > DL * 1.25) return true;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, W, H);
    if (!ready) return true;
    const fade = clamp(1 - dv2 * 1.8, 0, 1);
    c.globalAlpha = ie * fade;
    blob(L.tx + rot.x * 20, L.ty + L.th * 0.45, L.tw * 0.62, L.th * 0.9, 1);
    blob(L.dcx + 12, L.dcy + L.dh * 0.42, L.dw * 0.55, L.dh * 0.35, 1);
    if (fade > 0) drawText(ie, t);
    c.globalAlpha = ie;
    drawDevice(ie, t, dt);
    c.globalAlpha = 1;
    return true;
  });
  addEventListener('scroll', () => wake(), { passive: true });
}

/* =========================================================
   1) HERO: kare kare PIXELA (tek gövde, dağılmaz) ve şeffaf cihaz
   ========================================================= */
(function hero() {
  const canvas = document.getElementById('logo3d');
  const section = canvas.closest('section');
  const renderer = makeRenderer(canvas);
  if (!renderer) { hero2D(canvas, section); return; }
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.03).texture;
  const camera = new THREE.PerspectiveCamera(24, 1, 0.1, 200);
  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.position.set(-6, 8, 10);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xfff0a0, 1.2);
  rim.position.set(8, -4, -6);
  scene.add(rim);
  scene.add(new THREE.AmbientLight(0xffffff, 0.25));
  // fareyi izleyen ışık: siyah yüzeyde gezinen parlama
  const glow = new THREE.PointLight(0xfff2b0, 2.5, 6, 2);
  glow.position.set(0, 0, 2.2);
  scene.add(glow);

  const group = new THREE.Group();
  scene.add(group);
  let textW = 3.8, textH = 0.75, loaded = false;

  // şeffaf el cihazı: yazının önünde, ekranında kısa videolar
  const device = createDevice();
  const devWrap = new THREE.Group();
  devWrap.add(device.group);
  scene.add(devWrap);

  // ekran ışığı: oynayan videonun rengi cihazın önüne yayılır, siyah küplerde renkli yansıma yapar
  const screenLight = new THREE.PointLight(0x7a5cff, 2.2, 3.2, 1.6);
  screenLight.position.set(0, 0.32, 0.55);
  device.group.add(screenLight);
  const glowCol = new THREE.Color(0x7a5cff), tmpCol = new THREE.Color();
  const screenMesh = device.hitTargets[1];
  const scrWd = screenMesh.geometry.parameters.width, scrH = screenMesh.geometry.parameters.height;
  const vidMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, toneMapped: false, depthWrite: false });
  const vidPlane = new THREE.Mesh(screenMesh.geometry, vidMat);
  vidPlane.position.copy(screenMesh.position); vidPlane.position.z += 0.0008; vidPlane.visible = false;
  screenMesh.parent.add(vidPlane);
  const endView = { w: 1, h: 1 };
  let vidCv = null, vidCtx = null, vidTx = null, vidFrame = 0;
  const scrW = new THREE.Vector3(), tmpV = new THREE.Vector3(), lookV = new THREE.Vector3();

  // derinlik gölgesi: sarı zemine düşen yumuşak gölgeler (yazı ve cihaz havada süzülür)
  function shadowTex() {
    const cv = document.createElement('canvas'); cv.width = cv.height = 256;
    const c = cv.getContext('2d');
    const g = c.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, 'rgba(60,40,0,.55)'); g.addColorStop(0.55, 'rgba(60,40,0,.18)'); g.addColorStop(1, 'rgba(60,40,0,0)');
    c.fillStyle = g; c.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(cv);
  }
  const shTex = shadowTex();
  const shMat = () => new THREE.MeshBasicMaterial({ map: shTex, transparent: true, depthWrite: false, toneMapped: false });
  const textShadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), shMat());
  const devShadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), shMat());
  textShadow.renderOrder = devShadow.renderOrder = -1;
  scene.add(textShadow, devShadow);
  const ndc = new THREE.Vector2(), hitRay = new THREE.Raycaster();
  function deviceHit(e) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    hitRay.setFromCamera(ndc, camera);
    return hitRay.intersectObjects(device.hitTargets, false).length > 0;
  }
  // cihaza tıklayınca sonraki video (imleç değişmez)
  section.addEventListener('click', e => { if (e.target.closest('a, button')) return; if (deviceHit(e)) { device.next(); if (window.__pixelaBlip) window.__pixelaBlip(520, 0.12, 'square', 0.04); } });

  // kare kare piksel yazı: küpler tek bir gövde olarak birlikte döner, asla dağılmaz
  const GLYPHS = {
    P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
    I: ['111', '010', '010', '010', '010', '010', '111'],
    X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
    E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
    L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
    A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001']
  };
  (function buildPixelText() {
    const CELL = 0.11;
    const cells = [];
    let cx = 0;
    [...'PIXELA'].forEach(ch => {
      const g = GLYPHS[ch];
      g.forEach((row, y) => [...row].forEach((b, x) => { if (b === '1') cells.push([cx + x, 6 - y]); }));
      cx += g[0].length + 1;
    });
    const cols = cx - 1;
    // kenarları hafif yuvarlatılmış küpler: ışık kenarlarda ince bir parlama yapar
    const geo = new RoundedBoxGeometry(CELL * 0.94, CELL * 0.94, CELL * 1.6, 1, CELL * 0.035);
    const mat = new THREE.MeshPhysicalMaterial({ color: 0x101010, metalness: 0.35, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.06 });
    const mesh = new THREE.InstancedMesh(geo, mat, cells.length);
    const m = new THREE.Matrix4();
    cells.forEach(([x, y], i) => { m.makeTranslation((x - cols / 2 + 0.5) * CELL, (y - 3) * CELL, 0); mesh.setMatrixAt(i, m); });
    group.add(mesh);
    textW = cols * CELL; textH = 7 * CELL;
    loaded = true;
  })();

  // açılış: yazı aşağıdan hafifçe dönerek yerine oturur (parçalanma yok)
  let ready = reduce.matches || !!window.__pixelaReady, introT = reduce.matches ? 9 : 0;
  document.addEventListener('pixela:ready', () => { ready = true; wake(); });

  // fare: ekranın neresinde olursa olsun yazı oraya döner
  const target = new THREE.Vector2(0, 0);
  let moved = false;
  addEventListener('pointermove', e => {
    target.set((e.clientX / innerWidth) * 2 - 1, -((e.clientY / innerHeight) * 2 - 1));
    moved = true;
    wake();
  }, { passive: true });
  document.addEventListener('pointerleave', () => target.set(0, 0));

  let offY = 0, mobile = false, camDist = 10;
  const lay = { tx: 0, ty: 0, dx: 0, dy: 0, ds: 1 };
  function size() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    mobile = w < 768 || h > w * 1.15; // dik tablet de telefon düzenini kullanır
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const viewWFor = d => 2 * d * tan * camera.aspect;
    // yazı ekran genişliğinin masaüstünde %64'ünü, telefonda %86'sını kaplar
    // geniş ve alçak ekranlarda yazı biraz küçülür ki konsola yer kalsın
    const frac = mobile ? 0.86 : 0.56 * Math.pow(Math.min(1, (h / w) / 0.625), 0.8);
    const dist = Math.max(textW / frac / (2 * tan * camera.aspect), (textH * 2.6) / (2 * tan));
    const vw = viewWFor(dist), vh = 2 * dist * tan;
    if (mobile) {
      lay.tx = 0; lay.ty = vh * 0.16;
      lay.dx = 0; lay.dy = -vh * 0.12; lay.ds = Math.min(vh * 0.32, vw * 0.5) / 1.3;
      placeTag(0.5 - (lay.ty - textH / 2) / vh + 0.02);
    } else {
      // Buttermax düzeni: yazı ortada, cihaz yazının üstüne biner (biraz sağda ve aşağıda)
      // yazı okunur kalsın: cihaz yazının altına yerleşir, harflere sadece alt kenarından biner.
      // ölçüler ekran yüksekliğine göre: cihaz her pencerede tamamen görünür.
      // yazı üstte, slogan hemen altında, konsol sloganın altında (ekrana sığacak boyda)
      lay.tx = 0; lay.ty = vh * 0.2;
      const tb = lay.ty - textH / 2, gap = textH * 0.66, f = dist / (dist - 0.9); // konsol öne yakın: perspektif payı
      const T = tb - gap, floor = -vh * (0.5 - Math.min(0.2, 105 / h)); // alttaki işaretlere değmesin
      const devH = Math.min(vh * 0.42, textH * 2.3, (T - floor) / f);
      lay.dx = -textW * 0.03; lay.ds = devH / 1.12;
      lay.dy = T / f - devH / 2;
      placeTag(0.5 - tb / vh + 0.022);
    }
    offY = 0;
    camDist = dist;
    camera.position.set(0, 0, dist);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }
  addEventListener('resize', () => { size(); wake(); });
  size();

  // yay fiziği: tereyağı gibi yumuşak dönüş
  const rot = { x: 0, y: 0, vx: 0, vy: 0 };
  const dev = { x: 0, y: 0, vx: 0, vy: 0 };
  const wake = loop(section, (dt, t) => {
    if (!loaded) return true;
    const still = reduce.matches;
    if (ready && introT < 9) introT += dt;
    const ip = still ? 1 : clamp(introT / 1.4, 0, 1);
    const ie = 1 - Math.pow(1 - ip, 4);
    const scrollP = 0;
    // ekrana dalış: giriş sabitken ilk ekran boyu kaydırmada kamera konsolun ekranına uçar
    const DL = (window.__diveLen ? window.__diveLen() : innerHeight);
    const dv = still ? 0 : clamp(scrollY / DL, 0, 1), de = dv * dv * (3 - 2 * dv);
    if (scrollY > DL * 1.25) return true; // showreel tamamen üstte: çizmeye gerek yok

    const tx = still ? 0 : target.x * 0.24;
    const ty = still ? 0 : -target.y * 0.16;
    const k = 46, damp = 8.5;
    rot.vy += ((tx - rot.y) * k - rot.vy * damp) * dt;
    rot.vx += ((ty - rot.x) * k - rot.vx * damp) * dt;
    rot.y += rot.vy * dt; rot.x += rot.vx * dt;

    group.rotation.y = rot.y + (1 - ie) * -0.5;
    group.rotation.x = rot.x + (1 - ie) * 0.9 + scrollP * 0.5;
    group.rotation.z = rot.y * -0.06;
    const float = still || moved ? 0 : Math.sin(t * 1.1) * 0.02;
    group.position.set(lay.tx, lay.ty + (1 - ie) * -0.5 + float + scrollP * textH * 1.2, 0);
    group.scale.setScalar(ready ? 0.88 + 0.12 * ie : 0.0001);

    // cihaz: fareye daha belirgin döner, hafifçe süzülür, ekranı oynar
    const dtx = still ? -0.25 : target.x * 0.75 - 0.2, dty = still ? 0.05 : -target.y * 0.55;
    dev.vy += ((dtx - dev.y) * 38 - dev.vy * 7.5) * dt;
    dev.vx += ((dty - dev.x) * 38 - dev.vx * 7.5) * dt;
    dev.y += dev.vy * dt; dev.x += dev.vx * dt;
    const lk = 1 - de;
    devWrap.rotation.set((dev.x + (1 - ie) * 0.8) * lk, (dev.y + (1 - ie) * 2.4) * lk, (-dev.y * 0.12 + (still ? 0 : Math.sin(t * 0.8) * 0.03)) * lk);
    devWrap.scale.setScalar(ready ? lay.ds * (0.6 + 0.4 * ie) : 0.0001);
    devWrap.position.set(lay.dx, lay.dy + (still ? 0 : Math.sin(t * 1.2) * 0.04) * lk + (1 - ie) * -0.8, mobile ? 0.4 : 0.9);
    if (dv < 0.62) device.update(dt, t); // video ekranı tamamen kaplayınca klip çizilmez
    device.hitTargets[0].visible = de < 0.12; // cam gövde dalışta gizlenir: ekstra çizim turu kalkar
    tmpCol.set(device.glowColor());
    glowCol.lerp(tmpCol, Math.min(1, dt * 3));
    screenLight.color.copy(glowCol);
    // gölgeler: nesnenin arkasında, sağ-alta düşer; nesne döndükçe hafifçe kayar
    textShadow.position.set(group.position.x + 0.06 + rot.y * 0.4, group.position.y - textH * 0.18 - rot.x * 0.3, -0.9);
    textShadow.scale.set(textW * 1.25 * group.scale.x, textH * 1.9 * group.scale.x, 1);
    devShadow.position.set(devWrap.position.x + 0.1 + dev.y * 0.25, devWrap.position.y - 0.12 - dev.x * 0.2, -0.7);
    devShadow.scale.set(lay.ds * 1.5 * (devWrap.scale.x / (lay.ds || 1)), lay.ds * 1.9 * (devWrap.scale.x / (lay.ds || 1)), 1);
    textShadow.material.opacity = devShadow.material.opacity = ready ? 0.9 * ie : 0;

    if (!still) {
      glow.position.x += (lay.tx + target.x * textW * 0.6 - glow.position.x) * Math.min(1, dt * 5);
      glow.position.y += (target.y * textH * 1.2 - glow.position.y) * Math.min(1, dt * 5);
    }
    // dalış: kamera ekranın tam karşısına, ekran görüş alanını kaplayana kadar yaklaşır
    camera.position.set(0, 0, camDist);
    camera.lookAt(0, 0, 0);
    // hız hissi: dalışın ortasında görüş açısı genişler, sonda eski haline döner
    const punch = Math.sin(de * Math.PI);
    camera.fov = 24 + punch * 9;
    camera.updateProjectionMatrix();
    if (de > 0) {
      devWrap.updateMatrixWorld(true);
      screenMesh.getWorldPosition(scrW);
      const sc = devWrap.scale.x;
      const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      const zc = Math.min(scrH * sc / (2 * tan), scrWd * sc / (2 * tan * camera.aspect)) * 0.9;
      // dalış sonunda görüş alanının ekran üzerindeki boyu (ekranın kendi ölçüsünde)
      endView.h = 2 * zc * tan / sc; endView.w = endView.h * camera.aspect;
      tmpV.set(scrW.x, scrW.y, scrW.z + zc);
      camera.position.lerp(tmpV, de);
      lookV.set(0, 0, 0).lerp(scrW, de);
      camera.lookAt(lookV);
      camera.rotateZ(punch * 0.07); // hafif sinematik dönüş
    }
    // ekranda showreel videosu belirir (dalış ilerledikçe)
    const va = clamp((dv - 0.18) / 0.4, 0, 1);
    vidMat.opacity = va;
    vidPlane.visible = va > 0.001;
    if (vidPlane.visible) {
      const v = window.__reelFront && window.__reelFront();
      if (v && v.readyState >= 2 && v.videoWidth) {
        // tam boy video yerine küçültülmüş kopya: her karede ekran kartına daha az veri gider, dalış akıcı olur
        const cw = v.videoWidth >= v.videoHeight ? 960 : 540, ch = Math.round(cw * v.videoHeight / v.videoWidth);
        if (!vidCv || vidCv.width !== cw || vidCv.height !== ch) {
          vidCv = document.createElement('canvas'); vidCv.width = cw; vidCv.height = ch; vidCtx = vidCv.getContext('2d');
          if (vidTx) vidTx.dispose();
          vidTx = new THREE.CanvasTexture(vidCv); vidTx.colorSpace = THREE.SRGBColorSpace; vidTx.minFilter = THREE.LinearFilter; vidTx.generateMipmaps = false;
        }
        const tx = vidTx;
        if ((vidFrame++ & 1) === 0) { vidCtx.drawImage(v, 0, 0, cw, ch); tx.needsUpdate = true; }
        if (vidMat.map !== tx) { vidMat.map = tx; vidMat.needsUpdate = true; }
        // başta video ekrana kırpılarak (cover) oturur; dalışın sonunda ekranın görünen kısmı,
        // showreel'in tam ekranda gösterdiği kadrajın aynısı olur: geçiş dikişsiz olur
        const a = scrWd / scrH, vr = v.videoWidth / v.videoHeight, asp = camera.aspect;
        const st = vr > a ? [a / vr, 1] : [1, vr / a];                       // ekran kadrajı (u, v)
        const vw = vr > asp ? [asp / vr, 1] : [1, vr / asp];                 // showreel kadrajı
        const pw = Math.min(1, endView.w / scrWd), ph = Math.min(1, endView.h / scrH); // dalış sonunda görünen ekran payı
        const rx0 = st[0], ry0 = st[1], rx1 = vw[0] / pw, ry1 = vw[1] / ph;
        const rx = rx0 + (rx1 - rx0) * de, ry = ry0 + (ry1 - ry0) * de;
        tx.repeat.set(rx, ry);
        tx.offset.set(0.5 - rx / 2, 0.5 - ry / 2);
      } else vidPlane.visible = false;
    }
    renderer.render(scene, camera);
    return true; // cihaz ekranı sürekli oynar; bölüm görünmezken döngü zaten durur
  });
  addEventListener('scroll', () => wake(), { passive: true });
})();

