/* Pixela: showreel oynatıcı. Gerçek videolar sırayla, yumuşak geçişle oynar.
   Bölüm görünmezken durur, videolar sadece gerektiğinde yüklenir. Kendi videonu eklemek için REEL listesine bir satır ekle. */
(() => {
  'use strict';
  const REEL = [
    { src: 'assets/reel/web.mp4', poster: 'assets/reel/web.jpg', title: 'Web siteleri', kicker: 'Kurumsal · Tanıtım' },
    { src: 'assets/reel/saha.mp4', poster: 'assets/reel/saha.jpg', title: 'Mobil uygulamalar', kicker: 'iOS · Android' },
    { src: 'assets/reel/magaza.mp4', poster: 'assets/reel/magaza.jpg', title: 'Online mağaza', kicker: 'E-ticaret' },
    { src: 'assets/reel/qr.mp4', poster: 'assets/reel/qr.jpg', title: 'QR menü', kicker: 'Restoran · Kafe' }
  ];
  // telefon gibi dik ekranlarda dikey çekilmiş sürümler, bilgisayarda yatay sürümler oynar.
  // Ekranın o anki şekline bakılır; pencere döner ya da boyutu değişirse doğru sürüme geçilir.
  const isTall = () => innerHeight > innerWidth * 1.25;
  let tall = isTall();
  const srcOf = i => tall ? REEL[i].src.replace('.mp4', '-v.mp4') : REEL[i].src;
  const posterOf = i => tall ? REEL[i].poster.replace('.jpg', '-v.jpg') : REEL[i].poster;
  const $ = s => document.querySelector(s);
  const section = $('#reel');
  if (!section) return;
  const vids = [$('#rv-a'), $('#rv-b')];
  const idxEl = $('#reel-idx'), totalEl = $('#reel-total');
  const labelEl = $('#reel-label'), kickerEl = $('#reel-kicker');
  const barsEl = $('#reel-bars');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  totalEl.textContent = String(REEL.length).padStart(2, '0');
  const bars = REEL.map(() => { const i = document.createElement('i'); const b = document.createElement('b'); i.appendChild(b); barsEl.appendChild(i); return b; });

  // piksel geçiş perdesi: sarı kareler dolar, video değişir, kareler boşalır
  const pix = $('#reel-pix'), pc = pix.getContext('2d');
  let wipeRaf = null;
  function pixWipe(mid) {
    if (reduce) { mid(); return; }
    const W = pix.clientWidth, H = pix.clientHeight, dpr = Math.min(2, devicePixelRatio || 1);
    pix.width = W * dpr; pix.height = H * dpr; pc.setTransform(dpr, 0, 0, dpr, 0, 0);
    const COLS = 16, ROWS = Math.max(6, Math.round(16 * H / W)), cw = W / COLS, ch = H / ROWS;
    const cells = [];
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) cells.push({ x, y, th: Math.random() * 0.6 + (x / COLS) * 0.4 });
    const t0 = performance.now(), DUR = 760;
    let fired = false;
    cancelAnimationFrame(wipeRaf);
    const step = now => {
      const p = Math.min(1, (now - t0) / DUR);
      pc.clearRect(0, 0, W, H);
      pc.fillStyle = '#FFD600';
      const inP = Math.min(1, p * 2), outP = Math.max(0, p * 2 - 1);
      cells.forEach(c => {
        const a = Math.min(1, Math.max(0, (inP - c.th * 0.6) / 0.4));
        const b = Math.min(1, Math.max(0, (outP - c.th * 0.6) / 0.4));
        const s = a * (1 - b);
        if (s <= 0) return;
        const sz = Math.min(cw, ch) * s;
        pc.fillRect(c.x * cw + (cw - sz) / 2, c.y * ch + (ch - sz) / 2, sz + 0.5, sz + 0.5);
      });
      if (!fired && p >= 0.5) { fired = true; mid(); }
      if (p < 1) wipeRaf = requestAnimationFrame(step); else pc.clearRect(0, 0, W, H);
    };
    wipeRaf = requestAnimationFrame(step);
  }

  let cur = 0, front = 0, visible = false, started = false, raf = null, switching = false;
  window.__reelFront = () => vids[front]; // giriş ekranındaki konsol aynı videoyu gösterir

  function setText(i) {
    labelEl.classList.add('swap');
    setTimeout(() => {
      labelEl.textContent = REEL[i].title;
      kickerEl.textContent = REEL[i].kicker;
      idxEl.textContent = String(i + 1).padStart(2, '0');
      labelEl.classList.remove('swap');
    }, 60);
  }
  function load(v, i) {
    const key = i + (tall ? 'v' : 'h');
    if (v.dataset.i === key) return;
    v.dataset.i = key;
    v.style.objectFit = REEL[i].fit || 'cover';
    v.poster = posterOf(i);
    v.preload = 'auto'; // sıradaki video önceden tamamen yüklensin, geçişte bekleme olmasın
    v.src = srcOf(i);
    v.load();
  }
  function paintBars() {
    const v = vids[front];
    const p = v.duration ? Math.min(1, v.currentTime / v.duration) : 0;
    // video bitmeden hemen önce geçişi başlat: piksel perdesi sonu örter, boşluk kalmaz
    if (v.duration && !switching && v.currentTime >= v.duration - 0.45) go(cur + 1);
    bars.forEach((b, n) => b.style.setProperty('--p', n < cur ? 1 : n === cur ? p.toFixed(3) : 0));
    if (visible && !document.hidden) raf = requestAnimationFrame(paintBars); else raf = null;
  }
  function play() {
    const v = vids[front];
    if (reduce) return;
    const pr = v.play();
    if (pr && pr.catch) pr.catch(() => {});
    if (!raf) raf = requestAnimationFrame(paintBars);
  }
  function go(i) {
    if (switching) return;
    switching = true;
    const next = (i + REEL.length) % REEL.length;
    const back = 1 - front;
    const nv = vids[back];
    load(nv, next);
    // zaten baştaysa başa sarma: sarma, videoyu bir an "hazır değil" yapar ve geçişi geciktirir
    if (nv.currentTime > 0.05) nv.currentTime = 0;
    let done = false;
    const show = () => {
      if (done) return; done = true;
      pixWipe(swap);
    };
    const swap = () => {
      vids[front].classList.remove('on');
      nv.classList.add('on');
      const old = vids[front];
      setTimeout(() => old.pause(), 900);
      front = back; cur = next;
      setText(cur);
      if (visible) play();
      // bir sonrakini önceden yükle
      load(vids[1 - front], (cur + 1) % REEL.length);
      switching = false;
    };
    if (nv.readyState >= 2) show(); else { nv.addEventListener('loadeddata', show, { once: true }); nv.addEventListener('canplay', show, { once: true }); }
    setTimeout(() => { if (switching) show(); }, 900); // güvenlik: yavaş bağlantıda takılmasın
  }
  addEventListener('resize', () => {
    const t = isTall();
    if (t === tall || !started) return;
    tall = t;
    load(vids[front], cur);
    load(vids[1 - front], (cur + 1) % REEL.length);
    if (visible) play();
  });
  vids.forEach(v => v.addEventListener('ended', () => { if (v === vids[front]) go(cur + 1); }));
  $('#reel-next').addEventListener('click', () => { go(cur + 1); });

  new IntersectionObserver(es => {
    visible = es[0].isIntersecting;
    if (visible) {
      if (!started) {
        started = true;
        load(vids[front], 0);
        load(vids[1 - front], 1);
        setText(0);
      }
      play();
    } else {
      vids.forEach(v => v.pause());
    }
  }, { rootMargin: '200px 0px' }).observe(section);
  document.addEventListener('visibilitychange', () => { if (document.hidden) vids.forEach(v => v.pause()); else if (visible) play(); });
})();
