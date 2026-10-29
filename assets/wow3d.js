/* Pixela: sayfanın alt yarısındaki 3D sahneler.
   1) Hizmetler: küplerden bir heykel. Hangi hizmetin üzerine gelinirse dağılıp o şekli kurar.
   2) Alt bölüm: fareye tepki veren piksel denizi. Küpler dalgalanır, imlecin altında yükselir, tıklayınca halka yayılır. */
import * as THREE from 'three';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
let seed = 24680;
const rand = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;

function renderer(canvas) {
  try {
    const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(2, devicePixelRatio || 1));
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.outputColorSpace = THREE.SRGBColorSpace;
    return r;
  } catch (e) { canvas.style.display = 'none'; return null; }
}
// görünürken çalışan, görünmezken duran döngü
function runWhileVisible(el, step) {
  let vis = false, raf = null, last = 0;
  const tick = now => {
    const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
    step(dt, now / 1000);
    raf = vis && !document.hidden ? requestAnimationFrame(tick) : (last = 0, null);
  };
  const wake = () => { if (!raf && vis && !document.hidden) raf = requestAnimationFrame(tick); };
  new IntersectionObserver(es => { vis = es[0].isIntersecting; wake(); }, { rootMargin: '150px 0px' }).observe(el);
  document.addEventListener('visibilitychange', wake);
  return wake;
}

/* =========================================================
   1) HİZMETLER: şekil değiştiren piksel heykeli
   ========================================================= */
function cube() {
  const o = [], n = 6;
  for (let x = 0; x < n; x++) for (let y = 0; y < n; y++) for (let z = 0; z < n; z++)
    if (x === 0 || y === 0 || z === 0 || x === n - 1 || y === n - 1 || z === n - 1) o.push([x, y, z, (x + y + z) % 5 === 0 ? 1 : 0]);
  return o;
}
function browser() {
  const o = [], W = 20, H = 13;
  for (let x = 0; x < W; x++) for (let y = 0; y < H; y++) {
    const edge = x === 0 || x === W - 1 || y === 0 || y === H - 1, bar = y >= H - 3;
    const hero = y >= 5 && y <= 8 && x >= 2 && x <= 10, txt = (y === 3 && x >= 2 && x <= 8) || (y === 2 && x >= 2 && x <= 5);
    const card = y >= 2 && y <= 8 && x >= 13 && x <= 17 && (x === 13 || x === 17 || y === 2 || y === 8);
    if (edge || bar) { o.push([x, y, 0, 0], [x, y, 1, 0]); } else if (hero) o.push([x, y, 0, 1]); else if (txt || card) o.push([x, y, 0, 0]);
    if (y === H - 2 && (x === 2 || x === 4 || x === 6)) o.push([x, y, -1, 1]);
  }
  return o;
}
function phone() {
  const o = [], W = 9, H = 17;
  for (let x = 0; x < W; x++) for (let y = 0; y < H; y++) {
    if ((x === 0 || x === W - 1) && (y === 0 || y === H - 1)) continue;
    const edge = x === 0 || x === W - 1 || y === 0 || y === H - 1, notch = y === H - 2 && x >= 3 && x <= 5;
    const block = y >= 10 && y <= 13 && x >= 2 && x <= 6, rows = (y === 7 || y === 5) && x >= 2 && x <= 6, home = y === 2 && x === 4;
    if (edge || notch) { o.push([x, y, 0, 0], [x, y, 1, 0]); } else if (block) o.push([x, y, 0, 1]); else if (rows || home) o.push([x, y, 0, 0]);
  }
  return o;
}
function bag() {
  const o = [], W = 9, H = 8, D = 4;
  for (let x = 0; x < W; x++) for (let y = 0; y < H; y++) for (let z = 0; z < D; z++)
    if (x === 0 || x === W - 1 || z === 0 || z === D - 1 || y === 0) o.push([x, y, z, (y === H - 1 && (z === 0 || z === D - 1)) ? 1 : 0]);
  for (let a = 0; a <= 12; a++) {
    const t = Math.PI * a / 12, x = Math.round(4 - Math.cos(t) * 2.4), y = H + Math.round(Math.sin(t) * 3);
    o.push([x, y, 0, 1], [x, y, D - 1, 1]);
  }
  return o;
}
// özel yazılım: dişli çark (10 diş, ortası boş)
function gear() {
  const o = [], R = 6.5, r0 = 2.2, D = 3;
  for (let x = -10; x <= 10; x++) for (let y = -10; y <= 10; y++) {
    const d = Math.hypot(x, y), a = Math.atan2(y, x);
    const tooth = Math.cos(a * 10) > 0.25 && d <= R + 2.2;
    if ((d <= R || tooth) && d >= r0) for (let z = 0; z < D; z++) {
      const surf = z === 0 || z === D - 1 || d > R - 1 || d < r0 + 1 || tooth;
      if (surf) o.push([x, y, z, d < r0 + 1.2 ? 1 : 0]);
    }
  }
  return o;
}
function bars() {
  const o = [], hs = [4, 7, 5, 10, 8, 12];
  for (let x = 0; x < 16; x++) for (let z = 0; z < 4; z++) o.push([x, 0, z, 1]);
  hs.forEach((h, i) => { const bx = (1 + i * 2.5) | 0; for (let y = 1; y <= h; y++) for (let dx = 0; dx < 2; dx++) for (let z = 1; z < 3; z++) o.push([bx + dx, y, z, 0]); });
  return o;
}
function prep(list) {
  const seen = new Set(), u = list.filter(p => { const k = p.slice(0, 3).join(); if (seen.has(k)) return false; seen.add(k); return true; });
  const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
  u.forEach(p => { for (let i = 0; i < 3; i++) { mn[i] = Math.min(mn[i], p[i]); mx[i] = Math.max(mx[i], p[i]); } });
  const c = [0, 1, 2].map(i => (mn[i] + mx[i]) / 2);
  // döndükçe ekrana sığsın: genişlik olarak en kötü durumda x-z köşegeni
  const ex = mx[0] - mn[0] + 1, ey = mx[1] - mn[1] + 1, ez = mx[2] - mn[2] + 1;
  return { pts: u.map(p => [p[0] - c[0], p[1] - c[1], p[2] - c[2], p[3]]), ew: Math.hypot(ex, ez), eh: Math.hypot(ey, ez * 0.4) };
}

(function services() {
  const canvas = document.getElementById('sv3d');
  const section = document.getElementById('hizmetler');
  if (!canvas || !section) return;
  const r = renderer(canvas); if (!r) return;
  const scene = new THREE.Scene();
  scene.environment = new THREE.PMREMGenerator(r).fromScene(new RoomEnvironment(r), 0.04).texture;
  const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 200); cam.position.set(0, 0, 46);
  const k1 = new THREE.DirectionalLight(0xffffff, 2.4); k1.position.set(-14, 18, 20); scene.add(k1);
  const k2 = new THREE.DirectionalLight(0xffd600, 1.6); k2.position.set(18, -8, -14); scene.add(k2);

  const SHAPES = [cube(), browser(), phone(), bag(), gear()].map(prep);
  const N = Math.max(...SHAPES.map(s => s.pts.length));
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.86, 0.86, 0.86), new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.55, roughness: 0.28 }), N);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const group = new THREE.Group(); group.add(mesh); scene.add(group);
  const YEL = new THREE.Color('#FFD600'), WHT = new THREE.Color('#f2f2f2');
  const pos = new Float32Array(N * 3), tgt = new Float32Array(N * 3), scl = new Float32Array(N), tscl = new Float32Array(N), spd = new Float32Array(N), spin = new Float32Array(N * 2);
  for (let i = 0; i < N; i++) { spd[i] = 0.05 + rand() * 0.07; spin[i * 2] = rand() - 0.5; spin[i * 2 + 1] = rand() - 0.5; for (let a = 0; a < 3; a++) pos[i * 3 + a] = (rand() - 0.5) * 50; }
  let shape = -1, gS = 1, tS = 1, boost = 0, wake = () => {};
  // görünen alanın %62'sine sığdır (heykel dönerken kenarlarda kesilmesin)
  let vis = { w: 24, h: 24 };
  function fitTo(s) { tS = Math.min(vis.w * 0.72 / s.ew, vis.h * 0.7 / s.eh, vis.h * 0.055); }
  function setShape(f) {
    if (f === shape) return; shape = f;
    const s = SHAPES[f], order = [...Array(N).keys()];
    for (let i = N - 1; i > 0; i--) { const j = (rand() * (i + 1)) | 0; [order[i], order[j]] = [order[j], order[i]]; }
    order.forEach((idx, n) => {
      const on = n < s.pts.length, p = s.pts[on ? n : n % s.pts.length];
      tgt[idx * 3] = p[0]; tgt[idx * 3 + 1] = p[1]; tgt[idx * 3 + 2] = p[2]; tscl[idx] = on ? 1 : 0;
      mesh.setColorAt(idx, on && p[3] === 1 ? WHT : YEL);
    });
    mesh.instanceColor.needsUpdate = true; fitTo(s); boost = 1; wake();
    // patlama: küpler önce dışa savrulur, sonra yeni şekle toplanır
    if (!reduce) for (let i = 0; i < N; i++) { const x = pos[i * 3], y = pos[i * 3 + 1], l = Math.hypot(x, y) || 1, k = 2 + rand() * 3; pos[i * 3] += x / l * k; pos[i * 3 + 1] += y / l * k; pos[i * 3 + 2] += (rand() - 0.5) * 6; }
  }
  setShape(0);
  // satıra gelince o hizmetin şekli; listeden çıkınca piksel küp
  document.querySelectorAll('.sv-row').forEach(row => row.addEventListener('pointerenter', () => setShape(1 + (+row.dataset.prev || 0))));
  const list = document.querySelector('.sv-list');
  if (list) list.addEventListener('pointerleave', () => setShape(0));
  // dokunmatikte: sırayla kendiliğinden değişsin
  let autoT = 0; const touch = matchMedia('(hover: none)').matches;

  let mx = 0, my = 0, smx = 0, smy = 0;
  addEventListener('pointermove', e => { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; }, { passive: true });
  function size() { const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return; r.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
    const vh = 2 * cam.position.z * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)); vis = { w: vh * cam.aspect, h: vh }; if (shape >= 0) { fitTo(SHAPES[shape]); gS = tS; } }
  addEventListener('resize', size); size();
  const d = new THREE.Object3D();
  wake = runWhileVisible(section, (dt, t) => {
    if (touch && !reduce) { autoT += dt; if (autoT > 3) { autoT = 0; setShape(shape % 4 + 1); } }
    const f = dt * 60;
    for (let i = 0; i < N; i++) {
      const k = reduce ? 1 : 1 - Math.pow(1 - spd[i], f);
      for (let a = 0; a < 3; a++) { const j = i * 3 + a; pos[j] += (tgt[j] - pos[j]) * k; }
      scl[i] += (tscl[i] - scl[i]) * k;
      const tr = Math.min(1, Math.hypot(tgt[i * 3] - pos[i * 3], tgt[i * 3 + 1] - pos[i * 3 + 1]) / 8);
      d.position.set(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
      d.rotation.set(spin[i * 2] * tr * 5, spin[i * 2 + 1] * tr * 5, 0);
      d.scale.setScalar(Math.max(0.0001, scl[i])); d.updateMatrix(); mesh.setMatrixAt(i, d.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    gS += (tS - gS) * (1 - Math.pow(0.92, f)); group.scale.setScalar(gS);
    smx += (mx - smx) * 0.06; smy += (my - smy) * 0.06; boost *= Math.pow(0.97, f);
    group.rotation.y = (reduce ? 0 : Math.sin(t * 0.5) * 0.4) + smx * 0.8 + boost * 1.2 - 0.3;
    group.rotation.x = 0.15 + smy * 0.35;
    r.render(scene, cam);
  });
})();

/* =========================================================
   2) ALT BÖLÜM: fareye tepki veren piksel denizi
   ========================================================= */
(function footerField() {
  const canvas = document.getElementById('ft3d');
  const footer = canvas && canvas.closest('footer');
  if (!canvas || !footer) return;
  const r = renderer(canvas); if (!r) return;
  const scene = new THREE.Scene();
  scene.environment = new THREE.PMREMGenerator(r).fromScene(new RoomEnvironment(r), 0.04).texture;
  scene.fog = new THREE.Fog(0x101010, 22, 46);
  const cam = new THREE.PerspectiveCamera(38, 1, 0.1, 200);
  cam.position.set(0, 9, 22); cam.lookAt(0, 0, -2);
  const k1 = new THREE.DirectionalLight(0xffffff, 1.6); k1.position.set(-10, 20, 10); scene.add(k1);
  scene.add(new THREE.AmbientLight(0xffffff, 0.15));

  const COLS = matchMedia('(max-width: 767px)').matches ? 26 : 52, ROWS = 20, GAP = 1.0;
  const N = COLS * ROWS;
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.86, 1, 0.86), new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.5, roughness: 0.35 }), N);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(mesh);
  const base = [];
  for (let z = 0; z < ROWS; z++) for (let x = 0; x < COLS; x++) base.push([(x - (COLS - 1) / 2) * GAP, (z - ROWS + 4) * GAP]);
  const DARK = new THREE.Color('#1b1b1b'), YEL = new THREE.Color('#FFD600'), col = new THREE.Color();
  for (let i = 0; i < N; i++) mesh.setColorAt(i, DARK);

  // fare: zemine düşen ışın
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3();
  let mx = 999, mz = 999, smx = 999, smz = 999, inside = false;
  const ripples = []; // {x,z,t0}
  footer.addEventListener('pointermove', e => {
    const b = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - b.left) / b.width) * 2 - 1, -((e.clientY - b.top) / b.height) * 2 + 1);
    ray.setFromCamera(ndc, cam);
    if (ray.ray.intersectPlane(plane, hit)) { mx = hit.x; mz = hit.z; if (!inside) { smx = mx; smz = mz; } inside = true; }
  });
  footer.addEventListener('pointerleave', () => { inside = false; });
  footer.addEventListener('pointerdown', () => { if (inside) ripples.push({ x: mx, z: mz, t0: performance.now() / 1000 }); });

  function size() { const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return; r.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
  addEventListener('resize', size); size();
  const d = new THREE.Object3D();
  const heights = new Float32Array(N);
  runWhileVisible(footer, (dt, t) => {
    if (inside) { smx += (mx - smx) * 0.12; smz += (mz - smz) * 0.12; }
    const now = performance.now() / 1000;
    while (ripples.length && now - ripples[0].t0 > 3) ripples.shift();
    for (let i = 0; i < N; i++) {
      const [x, z] = base[i];
      let h = reduce ? 0.3 : 0.28 + 0.22 * Math.sin(x * 0.32 + t * 1.1) * Math.cos(z * 0.38 + t * 0.8);
      if (inside) { const dd = (x - smx) ** 2 + (z - smz) ** 2; h += 3.2 * Math.exp(-dd / 7); }
      for (const rp of ripples) {
        const age = now - rp.t0, dist = Math.hypot(x - rp.x, z - rp.z), ring = age * 9;
        h += 1.6 * Math.exp(-((dist - ring) ** 2) / 2.5) * Math.max(0, 1 - age / 3);
      }
      heights[i] += (h - heights[i]) * 0.18;
      const hh = Math.max(0.12, heights[i]);
      d.position.set(x, hh / 2 - 0.5, z);
      d.scale.set(1, hh, 1);
      d.updateMatrix(); mesh.setMatrixAt(i, d.matrix);
      col.copy(DARK).lerp(YEL, clamp((hh - 0.55) / 2.2, 0, 1)); mesh.setColorAt(i, col);
    }
    mesh.instanceMatrix.needsUpdate = true; mesh.instanceColor.needsUpdate = true;
    r.render(scene, cam);
  });
})();
