/* Pixela: şaşırtan katman. Mürekkep izi, şifre çözme, ses, kaçan harfler. Düz JavaScript. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;

  // ses özelliği kaldırıldı; eski çağrılar sessizce yok sayılır
  window.__pixelaBlip = () => {};
  // alt bölüm işareti (stil için)
  new IntersectionObserver(es => document.documentElement.classList.toggle('at-footer', es[0].isIntersecting), { threshold: 0.3 }).observe($('.footer'));

  // ================= Mürekkep izi: fare arkasında akan, kaynaşan sıvı iz =================
  // Ekran kartında "metaball" tekniğiyle çizilir: yakın damlalar birbirine karışıp tek bir sıvı gibi görünür.
  // Tuval "difference" modunda sarı çizer: sarı zeminde siyah mürekkep, siyah yazının üstünde sarı yazı olur.
  const trail = $('#trail');
  const gl = fine && !reduce && trail ? trail.getContext('webgl', { premultipliedAlpha: false, antialias: false, alpha: true }) : null;
  if (gl) {
    const MAX = 160;
    const vs = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
    const fs = `precision highp float;
      uniform vec4 uP[${MAX}];uniform int uN;uniform float uDpr;uniform vec2 uRes;uniform float uT;
      void main(){
        vec2 c=vec2(gl_FragCoord.x,uRes.y-gl_FragCoord.y)/uDpr;
        float d=1e5;const float k=22.;
        for(int i=0;i<${MAX};i++){
          if(i>=uN)break;
          float di=length(c-uP[i].xy)-uP[i].z;
          float h=clamp(.5+.5*(di-d)/k,0.,1.);
          d=mix(di,d,h)-k*h*(1.-h);   // yumuşak birleşim: damlalar şişmeden kaynaşır
        }
        float a=1.-smoothstep(-.9,.9,d);
        gl_FragColor=vec4(1.,.839,0.,a);
      }`;
    const sh = (type, src) => { const o = gl.createShader(type); gl.shaderSource(o, src); gl.compileShader(o); return o; };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { trail.remove(); }
    else {
      gl.useProgram(prog);
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, 'p');
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      const uP = gl.getUniformLocation(prog, 'uP'), uN = gl.getUniformLocation(prog, 'uN');
      const uDpr = gl.getUniformLocation(prog, 'uDpr'), uRes = gl.getUniformLocation(prog, 'uRes'), uT = gl.getUniformLocation(prog, 'uT');
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      let dpr = 1;
      function size() {
        dpr = Math.min(1.5, devicePixelRatio || 1);
        trail.width = Math.round(innerWidth * dpr); trail.height = Math.round(innerHeight * dpr);
        gl.viewport(0, 0, trail.width, trail.height);
      }
      size(); addEventListener('resize', size);

      const pts = []; // {x,y,vx,vy,r,r0,life}
      const data = new Float32Array(MAX * 4);
      let lx = null, ly = null, lt = 0, raf = null, last = 0, speed = 0;
      addEventListener('pointermove', e => {
        const x = e.clientX, y = e.clientY, now = performance.now();
        // showreel videosunun üstünde iz bırakma (renkli videoda leke gibi duruyor)
        if (e.target.closest && e.target.closest('#reel-frame')) { lx = null; return; }
        if (lx !== null) {
          const dx = x - lx, dy = y - ly, d = Math.hypot(dx, dy);
          const dtm = Math.max(8, now - lt);
          speed += (d / dtm - speed) * 0.35;
          const steps = Math.min(14, Math.ceil(d / 9));
          for (let i = 1; i <= steps; i++) {
            const k = i / steps;
            // hızlı harekette kalın, yavaşta ince; hafif rastgelelik sıvı görünümü verir
            const r0 = clamp(11 + speed * 15, 13, 42) * (0.8 + Math.random() * 0.45);
            pts.push({ x: lx + dx * k, y: ly + dy * k, vx: dx / dtm * 3, vy: dy / dtm * 3 + 4, r: r0, r0, life: 1 });
          }
          while (pts.length > MAX) pts.shift();
        }
        lx = x; ly = y; lt = now;
        if (!raf) raf = requestAnimationFrame(draw);
      }, { passive: true });
      addEventListener('scroll', () => { lx = null; }, { passive: true });
      document.addEventListener('pointerleave', () => { lx = null; });

      function draw(now) {
        const dt = Math.min(50, now - (last || now)) / 1000; last = now;
        for (let i = pts.length - 1; i >= 0; i--) {
          const p = pts[i];
          p.life -= dt * 0.55;               // yaklaşık 1,8 saniyede kaybolur
          if (p.life <= 0) { pts.splice(i, 1); continue; }
          p.x += p.vx * dt * 6; p.y += p.vy * dt * 6;   // akış: hafif kayma ve aşağı damlama
          p.vx *= 0.94; p.vy = p.vy * 0.94 + 0.6;
          const e = p.life * p.life * (3 - 2 * p.life);
          p.r = p.r0 * (0.55 + 0.45 * e) * Math.min(1, p.life * 3);
        }
        const n = pts.length;
        for (let i = 0; i < n; i++) { const p = pts[i]; data[i * 4] = p.x; data[i * 4 + 1] = p.y; data[i * 4 + 2] = p.r; data[i * 4 + 3] = p.life; }
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        if (n) {
          gl.uniform4fv(uP, data);
          gl.uniform1i(uN, n);
          gl.uniform1f(uDpr, dpr);
          gl.uniform2f(uRes, trail.width, trail.height);
          gl.uniform1f(uT, now / 1000);
          gl.drawArrays(gl.TRIANGLES, 0, 3);
        }
        if (n) raf = requestAnimationFrame(draw); else { raf = null; last = 0; }
      }
    }
  } else if (trail) trail.remove();

  // ================= Şifre çözme: harfler karışıp yerine oturur =================
  const GLYPHS = '█▓▒░#@%&*+=<>/PIXELA0123456789';
  $$('[data-scramble]').forEach(el => {
    const final = el.textContent;
    let raf = null;
    const host = el.closest('a, li') || el;
    host.addEventListener('pointerenter', () => {
      if (reduce) return;
      cancelAnimationFrame(raf);
      const t0 = performance.now(), dur = 380 + final.length * 22;
      const step = now => {
        const p = clamp((now - t0) / dur, 0, 1);
        let out = '';
        for (let i = 0; i < final.length; i++) {
          const ch = final[i];
          if (ch === ' ' || p > (i / final.length) * 0.75 + 0.25) out += ch;
          else out += GLYPHS[(Math.random() * GLYPHS.length) | 0];
        }
        el.textContent = out;
        if (p < 1) raf = requestAnimationFrame(step); else el.textContent = final;
      };
      raf = requestAnimationFrame(step);
    });
  });

  // ================= BİZE YAZ: fareden kaçan, yaylanan harfler =================
  const title = $('.ft-title');
  const link = $('#ft-link');
  if (title && !reduce) {
    const text = title.textContent;
    title.setAttribute('aria-label', text);
    title.textContent = '';
    const letters = [...text].map(ch => {
      const s = document.createElement('span');
      s.className = 'fl';
      s.setAttribute('aria-hidden', 'true');
      s.textContent = ch === ' ' ? ' ' : ch;
      title.appendChild(s);
      return { el: s, x: 0, y: 0, r: 0, vx: 0, vy: 0, vr: 0, cx: 0, cy: 0 };
    });
    let mx = -9999, my = -9999, raf = null, last = 0, inside = false;
    function measure() { letters.forEach(l => { const r = l.el.getBoundingClientRect(); l.cx = r.left + r.width / 2 - l.x; l.cy = r.top + r.height / 2 - l.y; }); }
    link.addEventListener('pointerenter', () => { inside = true; measure(); if (!raf) raf = requestAnimationFrame(tick); });
    link.addEventListener('pointermove', e => { mx = e.clientX; my = e.clientY; });
    link.addEventListener('pointerleave', () => { inside = false; mx = my = -9999; });
    function tick(now) {
      const dt = Math.min(32, now - (last || now)) / 1000; last = now;
      let energy = 0;
      letters.forEach(l => {
        const dx = l.cx + l.x - mx, dy = l.cy + l.y - my, d = Math.hypot(dx, dy) || 1;
        const R = 220, f = inside ? Math.pow(Math.max(0, 1 - d / R), 2) : 0;
        const tx = dx / d * f * 70, ty = dy / d * f * 90 - f * 20, tr = (dx / d) * f * 18;
        l.vx += ((tx - l.x) * 180 - l.vx * 14) * dt;
        l.vy += ((ty - l.y) * 180 - l.vy * 14) * dt;
        l.vr += ((tr - l.r) * 180 - l.vr * 14) * dt;
        l.x += l.vx * dt; l.y += l.vy * dt; l.r += l.vr * dt;
        energy += Math.abs(l.x) + Math.abs(l.y) + Math.abs(l.vx) + Math.abs(l.vy);
        l.el.style.transform = `translate(${l.x.toFixed(2)}px,${l.y.toFixed(2)}px) rotate(${l.r.toFixed(2)}deg)`;
      });
      if (inside || energy > 0.5) raf = requestAnimationFrame(tick);
      else { raf = null; last = 0; letters.forEach(l => { l.el.style.transform = ''; }); }
    }
    addEventListener('resize', () => { if (inside) measure(); });
  }
})();
