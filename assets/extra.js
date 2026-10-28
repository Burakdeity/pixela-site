/* Pixela: küçük ama etkili dokunuşlar.
   1) Başlıklar ekrana girince harfler şifre çözer gibi karışıp yerine oturur.
   2) Sağ kenarda piksel piksel dolan kaydırma göstergesi. */
(() => {
  'use strict';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const GLYPHS = '█▓▒░<>/\\{}[]#%&*+=01PIXELA';

  // ---------------- 1) Şifre çözen başlıklar ----------------
  function decode(el) {
    const nodes = [];
    const walk = n => n.childNodes.forEach(c => { if (c.nodeType === 3 && c.textContent.trim()) nodes.push(c); else if (c.nodeType === 1) walk(c); });
    walk(el);
    const finals = nodes.map(n => n.textContent);
    const total = finals.reduce((a, s) => a + s.length, 0);
    const t0 = performance.now(), DUR = 900 + total * 14;
    const step = now => {
      const p = Math.min(1, (now - t0) / DUR);
      let idx = 0;
      nodes.forEach((n, k) => {
        const f = finals[k];
        let out = '';
        for (let i = 0; i < f.length; i++, idx++) {
          const ch = f[i];
          const settle = (idx / total) * 0.7 + 0.25;
          out += ch === ' ' || p >= settle ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0];
        }
        n.textContent = out;
      });
      if (p < 1) requestAnimationFrame(step); else nodes.forEach((n, k) => { n.textContent = finals[k]; });
    };
    requestAnimationFrame(step);
  }
  if (!reduce) {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { decode(e.target); io.unobserve(e.target); } }), { threshold: 0.4 });
    document.querySelectorAll('[data-decode]').forEach(el => io.observe(el));
  }

  // ---------------- 2) Kaydırma göstergesi ----------------
  const bar = document.getElementById('progress');
  if (bar) {
    const CELLS = 24;
    const cells = Array.from({ length: CELLS }, () => { const i = document.createElement('i'); bar.appendChild(i); return i; });
    let lastN = -1, queued = false;
    const update = () => {
      queued = false;
      const max = document.documentElement.scrollHeight - innerHeight;
      const n = Math.round((max > 0 ? scrollY / max : 0) * CELLS);
      if (n === lastN) return;
      lastN = n;
      cells.forEach((c, i) => c.classList.toggle('on', i < n));
    };
    addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(update); } }, { passive: true });
    addEventListener('resize', update);
    update();
  }
})();
