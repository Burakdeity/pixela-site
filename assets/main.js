/* Pixela: açılış, pürüzsüz kaydırma, kaydırmaya bağlı efektler. Çerçevesiz, düz JavaScript. */
(() => {
  'use strict';

  // ---- Ayarlar: WhatsApp numaranı buraya yaz (ülke kodu ile, + ve boşluk olmadan) ----
  const WHATSAPP_NUMBER = '905514890833';
  const WHATSAPP_TEXT = 'Merhaba Burak, bir proje için yazıyorum.';
  const wa = text => 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(text);

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');

  $('#ft-link').href = wa(WHATSAPP_TEXT);
  $('#soc-wa').href = wa(WHATSAPP_TEXT);
  // Konsept kartlar: tıklayınca o ürünü soran hazır WhatsApp mesajı
  $$('[data-wa]').forEach(a => {
    const name = a.dataset.wa;
    a.href = wa(a.hasAttribute('data-mine')
      ? WHATSAPP_TEXT + ' Aklımda bir fikir var.'
      : 'Merhaba Burak, ' + (/^[A-ZÇĞİÖŞÜ]{2}/.test(name) ? name : name.toLocaleLowerCase('tr')) + ' gibi bir proje için fiyat ve süre öğrenmek istiyorum.');
    a.target = '_blank';
    a.rel = 'noopener';
    a.setAttribute('aria-label', name + ': WhatsApp\'tan sor');
  });

  // ================= Pürüzsüz kaydırma (Lenis) =================
  let lenis = null;
  if (window.Lenis && !reduce.matches) {
    lenis = new Lenis({ duration: 1.2, easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
    const raf = t => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
    lenis.on('scroll', onScroll);
  }
  addEventListener('scroll', onScroll, { passive: true }); // kaydırma çubuğu/klavye ile kaydırmada da çalışsın

  // Üst menü sadece girişte görünür: aşağı inince (ve geri çıkarken) gizli kalır
  const hdrCheck = () => {
    const off = scrollY > innerHeight * 0.35 && document.querySelector('#overlay')?.hidden !== false;
    document.documentElement.classList.toggle('hdr-off', off);
  };
  addEventListener('scroll', hdrCheck, { passive: true });
  addEventListener('resize', hdrCheck);
  hdrCheck();

  // dalışın uzunluğu = showreel'in sayfadaki başlangıcı (telefonda adres çubuğu yüksekliği değiştirse de doğru kalır)
  const reelEl = document.getElementById('reel');
  const diveLen = () => Math.max(1, reelEl.getBoundingClientRect().top + scrollY);
  window.__diveLen = diveLen;

  // ================= Tek kaydırmada otomatik dalış =================
  // En üstte bir kez aşağı kaydırınca kamera kendiliğinden ekrana dalar; showreel'den yukarı
  // kaydırınca girişe geri döner. Animasyon sırasında kaydırma kilitlidir.
  let auto = false;
  const inOut = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  function autoTo(y) {
    if (!lenis || auto) return;
    auto = true;
    lenis.scrollTo(y, { duration: 1.9, easing: inOut, lock: true, force: true, onComplete: () => { setTimeout(() => { auto = false; }, 120); } });
    setTimeout(() => { auto = false; }, 2600); // güvenlik
  }
  if (lenis && !reduce.matches) {
    lenis.on('scroll', e => {
      if (auto) return;
      const D = diveLen(), y = e.scroll;
      if (e.direction === 1 && y > 1 && y < D * 0.92) autoTo(D);
      else if (e.direction === -1 && y < D * 0.97 && y > D * 0.05) autoTo(0);
    });
    // güvenlik: kaydırma dalışın ortasında durursa (ör. parmakla hızlı kaydırma) yönüne göre tamamla
    let settle = null, lastDir = 1, prevY = scrollY;
    addEventListener('scroll', () => {
      if (scrollY !== prevY) { lastDir = scrollY > prevY ? 1 : -1; prevY = scrollY; }
      clearTimeout(settle);
      settle = setTimeout(() => {
        if (auto) return;
        const D = diveLen(), y = scrollY;
        if (y > 2 && y < D - 2) autoTo(lastDir === -1 ? 0 : D);
      }, 160);
    }, { passive: true });
    // dokunmatikte otomatik kayma sırasında parmak momentumu karışmasın
    addEventListener('touchmove', e => { if (auto) e.preventDefault(); }, { passive: false });
    addEventListener('wheel', e => { if (auto) e.preventDefault(); }, { passive: false });
  }

  // Menü bağlantıları: Lenis ile yumuşak git
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    const el = document.querySelector(id);
    if (!el) return;
    e.preventDefault();
    closeMenu();
    // piksel perde geçişi (transitions.js): ekran kapanır, hedefe atlar, açılır
    if (window.__pixTransition && !reduce.matches) {
      window.__pixTransition(e.clientX, e.clientY, () => {
        if (lenis) lenis.scrollTo(el, { immediate: true, force: true });
        else el.scrollIntoView();
      });
    } else if (lenis) lenis.scrollTo(el, { duration: 1.6 });
    else el.scrollIntoView({ behavior: reduce.matches ? 'auto' : 'smooth' });
  }));

  // ================= Açılış ekranı =================
  const loader = $('#loader');
  const ldNum = $('#ld-num');
  const ldCells = $$('.ld-mark i');
  const ORDER = [0, 1, 2, 5, 4, 3, 6, 7, 8];
  const LIT = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8]); // 3x3 piksel kare
  const ready = () => { window.__pixelaReady = true; document.documentElement.classList.add('ready'); document.dispatchEvent(new Event('pixela:ready')); };
  function runLoader() {
    if (reduce.matches) { loader.remove(); ready(); return; }
    document.documentElement.classList.add('is-loading');
    if (lenis) lenis.stop();
    const t0 = performance.now(), DUR = 1600;
    let last = -1;
    (function frame(now) {
      const p = clamp((now - t0) / DUR, 0, 1);
      const e = 1 - Math.pow(1 - p, 2.2);
      const n = Math.round(e * 100);
      if (n !== last) { last = n; ldNum.textContent = n; }
      const lit = Math.floor(e * 9.99);
      ORDER.forEach((idx, i) => ldCells[idx].classList.toggle('on', i < lit && LIT.has(idx)));
      if (p < 1) return requestAnimationFrame(frame);
      setTimeout(() => {
        loader.classList.add('out');
        document.documentElement.classList.remove('is-loading');
        if (lenis) lenis.start();
        ready();
        setTimeout(() => loader.remove(), 1100);
      }, 250);
    })(t0);
  }

  // ================= Mobil menü =================
  const menuBtn = $('#menu-btn');
  const overlay = $('#overlay');
  function openMenu() {
    overlay.hidden = false;
    requestAnimationFrame(() => overlay.classList.add('open'));
    menuBtn.setAttribute('aria-expanded', 'true');
    menuBtn.setAttribute('aria-label', 'Menüyü kapat');
    if (lenis) lenis.stop();
  }
  function closeMenu() {
    if (overlay.hidden) return;
    overlay.classList.remove('open');
    menuBtn.setAttribute('aria-expanded', 'false');
    menuBtn.setAttribute('aria-label', 'Menüyü aç');
    if (lenis) lenis.start();
    setTimeout(() => { if (!overlay.classList.contains('open')) overlay.hidden = true; }, 650);
  }
  menuBtn.addEventListener('click', () => (menuBtn.getAttribute('aria-expanded') === 'true' ? closeMenu() : openMenu()));
  addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });

  // ================= Biz kimiz: harf harf koyulaşan başlık =================
  const who = $('#who');
  const chars = [];
  $$('.ln', who).forEach(ln => {
    const text = ln.textContent;
    ln.setAttribute('aria-hidden', 'true');
    ln.textContent = '';
    [...text].forEach(ch => {
      const s = document.createElement('span');
      s.className = 'ch';
      s.textContent = ch;
      ln.appendChild(s);
      if (ch.trim()) chars.push({ el: s, a: -1 });
    });
  });
  const sr = document.createElement('span');
  sr.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap';
  sr.textContent = 'Ben Burak. Fikirleri özgün dijital ürünlere dönüştürüyorum. Şablon yok, hazır tema yok.';
  who.appendChild(sr);
  function updateWho() {
    if (reduce.matches) return;
    const r = who.getBoundingClientRect();
    if (r.bottom < -100 || r.top > innerHeight + 100) return;
    const p = clamp((innerHeight * 0.85 - r.top) / (r.height + innerHeight * 0.35), 0, 1);
    const n = chars.length;
    chars.forEach((c, i) => {
      const a = Math.round((0.14 + 0.86 * clamp((p * 1.15 - i / n) * 6, 0, 1)) * 100) / 100;
      if (a !== c.a) { c.a = a; c.el.style.setProperty('--a', a); }
    });
  }

  // ================= Reel: kaydırdıkça büyüyen siyah sahne =================
  const reel = $('#reel');
  const frame = $('#reel-frame');
  const ui = $('.reel-ui');
  let lastReel = -1;

  // giriş bölümü kaydırırken sabit kalır ve kamera konsolun ekranına dalar (scenes.js);
  // dalış bitince showreel tam ekran belirir
  const heroSec = $('.hero');
  function updateReel() {
    const vh = diveLen();
    heroSec.classList.toggle('diving', scrollY > vh * 0.04);
    // dalışın son anında showreel tamamen belirir: başlık ve buton görünür
    const k = reduce.matches ? (scrollY > vh * 0.5 ? 1 : 0) : clamp((scrollY - vh * 0.95) / (vh * 0.045), 0, 1);
    const q = Math.round(k * 1000) / 1000;
    if (q === lastReel) return;
    lastReel = q;
    reel.style.setProperty('--rk', q);
    ui.style.setProperty('--uo', q);
    reel.classList.toggle('live', q > 0.5);
    window.__reelProgress = q;
  }

  // ================= Üst menü: aktif bölüm =================
  const pills = $$('.pill');
  const targets = pills.map(p => document.querySelector(p.getAttribute('href')));
  let lastActive = null;
  function updateNav() {
    let act = null;
    targets.forEach((t, i) => { if (t && t.getBoundingClientRect().top < innerHeight * 0.4) act = i; });
    if (act !== lastActive) { lastActive = act; pills.forEach((p, i) => p.classList.toggle('active', i === act)); }
  }

  // ================= Kartlar: görünür olunca gelsin =================
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in');
    setTimeout(() => e.target.classList.add('done'), 1100);
    io.unobserve(e.target);
  }), { threshold: 0.15 });
  $$('.item').forEach(el => io.observe(el));

  // ================= Footer: fareyi izleyen sarı küre =================
  const ftLink = $('#ft-link');
  const blob = $('.ft-blob');
  ftLink.addEventListener('pointermove', e => {
    const r = ftLink.getBoundingClientRect();
    blob.style.setProperty('--bx', (e.clientX - r.left - blob.offsetWidth / 2) + 'px');
    blob.style.setProperty('--by', (e.clientY - r.top - blob.offsetHeight / 2) + 'px');
  });

  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  let mouseX = innerWidth / 2, mouseY = innerHeight / 2;
  addEventListener('pointermove', e => { mouseX = e.clientX; mouseY = e.clientY; }, { passive: true });
  // girişteki ızgara imlecin etrafında belirir
  const heroEl = $('.hero');
  heroEl.addEventListener('pointermove', e => {
    const r = heroEl.getBoundingClientRect();
    heroEl.style.setProperty('--mx', (e.clientX - r.left) + 'px');
    heroEl.style.setProperty('--my', (e.clientY - r.top) + 'px');
  }, { passive: true });

  // ================= Özel imleç =================
  const cursor = $('#cursor');
  const cursorLabel = $('#cursor-label');
  if (fine.matches && !reduce.matches) {
    document.documentElement.classList.add('has-cursor');
    let cx = mouseX, cy = mouseY, cRaf = null;
    const follow = () => {
      cx += (mouseX - cx) * 0.2; cy += (mouseY - cy) * 0.2;
      cursor.style.transform = `translate3d(${cx.toFixed(1)}px,${cy.toFixed(1)}px,0)`;
      cRaf = Math.abs(mouseX - cx) + Math.abs(mouseY - cy) > 0.2 ? requestAnimationFrame(follow) : null; // durunca dinlen
    };
    addEventListener('pointermove', () => { if (!cRaf) cRaf = requestAnimationFrame(follow); }, { passive: true });
    // imleç her zaman küçük nokta kalır (büyüyen yuvarlak kaldırıldı)
    addEventListener('pointerdown', () => cursor.classList.add('down'));
    addEventListener('pointerup', () => cursor.classList.remove('down'));
    document.addEventListener('pointerleave', () => cursor.classList.add('hide'));
    document.addEventListener('pointerenter', () => cursor.classList.remove('hide'));
  } else {
    cursor.remove();
  }

  // ================= Mıknatıs butonlar =================
  if (fine.matches && !reduce.matches) {
    $$('.pill, .down, .soc, .logo, .ft-titlewrap').forEach(el => {
      el.classList.add('mag');
      const strength = el.classList.contains('ft-titlewrap') ? 0.12 : 0.35;
      const host = el.classList.contains('ft-titlewrap') ? $('#ft-link') : el;
      host.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        el.classList.add('pull');
        el.style.transform = `translate(${(dx * strength).toFixed(1)}px,${(dy * strength).toFixed(1)}px)`;
      });
      host.addEventListener('pointerleave', () => { el.classList.remove('pull'); el.style.transform = ''; });
    });
  }

  // ================= Proje kartları: 3D eğilme =================
  if (fine.matches && !reduce.matches) {
    $$('.item').forEach(item => {
      const inner = $('.item-in', item);
      item.addEventListener('pointermove', e => {
        const r = item.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        inner.style.setProperty('--ry', (x * 10).toFixed(2) + 'deg');
        inner.style.setProperty('--rx', (y * -10).toFixed(2) + 'deg');
      });
      item.addEventListener('pointerleave', () => { inner.style.setProperty('--ry', '0deg'); inner.style.setProperty('--rx', '0deg'); });
    });
  }

  // ================= Hız şeridi: kaydırma hızıyla hızlanır ve eğilir =================
  const velo = $('.velo');
  const rows = $$('.velo-row').map(r => ({ dir: +r.dataset.dir, track: $('.velo-track', r), x: 0, w: 0 }));
  let veloOn = false, lastY = scrollY, vel = 0, skew = 0, veloLast = 0;
  function measureVelo() { rows.forEach(r => { r.w = r.track.scrollWidth / 2; }); }
  measureVelo();
  addEventListener('resize', measureVelo);
  function veloTick(now) {
    const dt = Math.min(50, now - (veloLast || now)) / 16.667; veloLast = now;
    const y = scrollY, dy = y - lastY; lastY = y;
    const v = lenis ? lenis.velocity : dy;
    vel += (v - vel) * 0.1;
    skew += (clamp(vel * 0.25, -12, 12) - skew) * 0.12;
    rows.forEach(r => {
      r.x -= r.dir * (1.2 + Math.abs(vel) * 0.6) * (vel < -0.5 ? -1 : 1) * dt;
      if (r.w) { if (r.x <= -r.w) r.x += r.w; if (r.x > 0) r.x -= r.w; }
      r.track.style.transform = `translate3d(${r.x.toFixed(1)}px,0,0) skewX(${(-skew * r.dir).toFixed(2)}deg)`;
    });
    if (veloOn && !document.hidden) requestAnimationFrame(veloTick); else veloLast = 0;
  }
  if (!reduce.matches) new IntersectionObserver(es => {
    const was = veloOn; veloOn = es[0].isIntersecting;
    if (veloOn && !was) { lastY = scrollY; requestAnimationFrame(veloTick); }
  }).observe(velo);

  // ================= Hizmetler: imleci izleyen önizleme =================
  const preview = $('#sv-preview');
  const pvs = $$('.pv', preview);
  if (fine.matches && !reduce.matches) {
    let px = mouseX, py = mouseY, pvOn = false, pvRaf = null, rot = 0;
    const pvLoop = () => {
      const nx = px + (mouseX - px) * 0.14, ny = py + (mouseY - py) * 0.14;
      rot += (clamp((nx - px) * 0.6, -12, 12) - rot) * 0.15;
      px = nx; py = ny;
      preview.style.transform = `translate3d(${(px - preview.offsetWidth / 2).toFixed(1)}px,${(py - preview.offsetHeight / 2).toFixed(1)}px,0) rotate(${rot.toFixed(2)}deg)`;
      pvRaf = pvOn || Math.abs(rot) > 0.05 ? requestAnimationFrame(pvLoop) : null;
    };
    $$('.sv-row').forEach(row => {
      row.addEventListener('pointerenter', () => {
        const i = +row.dataset.prev;
        pvs.forEach((p, n) => p.classList.toggle('on', n === i));
        if (!pvOn) { px = mouseX; py = mouseY; }
        pvOn = true; preview.classList.add('on');
        if (!pvRaf) pvRaf = requestAnimationFrame(pvLoop);
      });
    });
    $('.sv-list').addEventListener('pointerleave', () => { pvOn = false; preview.classList.remove('on'); pvs.forEach(p => p.classList.remove('on')); });
  }

  // ================= Süreç: üstteki kart geri çekilir =================
  const cards = $$('.card');
  const cardState = cards.map(() => -1);
  function updateStack() {
    if (reduce.matches) return;
    cards.forEach((c, i) => {
      const next = cards[i + 1];
      let k = 0;
      if (next) {
        const nr = next.getBoundingClientRect(), cr = c.getBoundingClientRect();
        k = clamp(1 - (nr.top - cr.top) / (innerHeight * 0.6), 0, 1);
      }
      const q = Math.round(k * 200) / 200;
      if (q !== cardState[i]) {
        cardState[i] = q;
        c.style.setProperty('--s', (1 - q * 0.06).toFixed(3));
        c.style.setProperty('--b', (1 - q * 0.45).toFixed(3));
      }
    });
  }

  // ================= Tek kaydırma döngüsü =================
  let queued = false;
  function onScroll() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; updateWho(); updateReel(); updateNav(); updateStack(); });
  }
  addEventListener('resize', onScroll);
  document.addEventListener('visibilitychange', () => document.body.classList.toggle('paused', document.hidden));

  onScroll();
  runLoader();
})();
