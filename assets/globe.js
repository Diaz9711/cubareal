/* ==========================================================================
   CUBA REAL — Globo orbital
   Proyección ortográfica real (d3-geo, contornos Natural Earth), terminador
   día/noche calculado con la posición actual del Sol, traza de un satélite
   en órbita inclinada y luces de Cuba con apagones (ilustrativo).
   ========================================================================== */
(() => {
  'use strict';
  const host = document.querySelector('[data-globe]');
  if (!host || !window.d3) return;
  const d3 = window.d3;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cv = document.createElement('canvas');
  host.appendChild(cv);
  const ctx = cv.getContext('2d');
  const RAD = Math.PI / 180;
  const CUBA_C = [-79.5, 21.6];
  const CITIES = [
    ['La Habana', -82.38, 23.13, 3], ['Santiago de Cuba', -75.82, 20.02, 2], ['Camagüey', -77.92, 21.38, 1.6],
    ['Holguín', -76.26, 20.89, 1.5], ['Santa Clara', -79.96, 22.41, 1.4], ['Pinar del Río', -83.7, 22.42, 1],
    ['Cienfuegos', -80.44, 22.15, 1], ['Matanzas', -81.58, 23.04, 1], ['Bayamo', -76.64, 20.38, 1],
    ['Guantánamo', -75.21, 20.14, 1], ['Las Tunas', -76.95, 20.96, .8], ['Ciego de Ávila', -78.76, 21.84, .8],
    ['Sancti Spíritus', -79.44, 21.93, .8]
  ];
  const LABELS = ['La Habana', 'Santiago de Cuba', 'Camagüey'];

  let W = 0, H = 0, DPR = 1, world, cuba, near, lights = [], zones = [];
  const proj = d3.geoOrthographic().clipAngle(90).precision(.4);
  const path = d3.geoPath(proj, ctx);
  const grat = d3.geoGraticule10();
  const sphere = { type: 'Sphere' };

  /* ---------- Astronomía: punto subsolar (aprox. NOAA, error < 0.5°) ---------- */
  function subsolar(date) {
    const jd = date / 864e5 + 2440587.5, n = jd - 2451545.0;
    const L = (280.46 + .9856474 * n) % 360, g = ((357.528 + .9856003 * n) % 360) * RAD;
    const lambda = (L + 1.915 * Math.sin(g) + .02 * Math.sin(2 * g)) * RAD;
    const eps = (23.439 - 4e-7 * n) * RAD;
    const dec = Math.asin(Math.sin(eps) * Math.sin(lambda));
    const ra = Math.atan2(Math.cos(eps) * Math.sin(lambda), Math.cos(lambda));
    const gmst = (280.46061837 + 360.98564736629 * n) % 360;
    let lon = (ra / RAD - gmst) % 360;
    if (lon > 180) lon -= 360; if (lon < -180) lon += 360;
    return [lon, dec / RAD];
  }
  window.CR_subsolar = subsolar;

  /* ---------- Satélite: órbita circular inclinada 51,6° ---------- */
  const INC = 51.6 * RAD, PERIOD = 92.7 * 60e3;
  function satPos(t) {
    const u = (t / PERIOD) * 2 * Math.PI;
    const node = -0.0000004 * t - 95 * RAD; // precesión lenta del nodo
    const lat = Math.asin(Math.sin(INC) * Math.sin(u));
    const lon = node + Math.atan2(Math.cos(INC) * Math.sin(u), Math.cos(u)) - (t / 864e5) * 2 * Math.PI;
    return [((lon / RAD + 540) % 360) - 180, lat / RAD];
  }

  function layout() {
    const r = host.getBoundingClientRect();
    W = r.width; H = r.height; DPR = Math.min(devicePixelRatio || 1, 2);
    cv.width = W * DPR; cv.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const mobile = W < 720;
    // Globo grande en órbita baja: el limbo cruza la pantalla y Cuba cae en el hueco libre.
    const R = mobile ? W * .86 : Math.max(W * .58, H * .7);
    proj.scale(R).translate(mobile ? [W * .62, W * 1.0] : [W * .82, H * .84]);
    aim(mobile ? [W * .46, W * .5] : [W * .6, H * .36]);
  }
  // Busca la rotación que coloca a Cuba en el punto de pantalla deseado.
  let base = [-CUBA_C[0], -CUBA_C[1]];
  function aim(target) {
    let lam = -CUBA_C[0], phi = -CUBA_C[1];
    const R = proj.scale();
    for (let i = 0; i < 60; i++) {
      proj.rotate([lam, phi, 0]);
      const p = proj(CUBA_C);
      const dx = p[0] - target[0], dy = p[1] - target[1];
      if (Math.abs(dx) < .3 && Math.abs(dy) < .3) break;
      lam -= dx / R / RAD * .7;
      phi += dy / R / RAD * .7;
      phi = Math.max(-85, Math.min(85, phi));
    }
    base = [lam, phi];
  }

  async function load() {
    const base = host.dataset.globe;
    const [w, c] = await Promise.all([fetch(base + 'world.json').then(r => r.json()), fetch(base + 'caribe.json').then(r => r.json())]);
    world = w; cuba = c.cuba; near = c.near;
    // Luces: muestreo dentro de la geometría real de Cuba
    let seed = 1959; const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647;
    const g = () => (rnd() + rnd() + rnd() - 1.5) / 1.5;
    CITIES.forEach(([, lon, lat, wt]) => {
      for (let i = 0; i < 26 * wt; i++) {
        const p = [lon + g() * .22 * Math.sqrt(wt), lat + g() * .14 * Math.sqrt(wt)];
        if (d3.geoContains(cuba, p)) lights.push({ p, r: .5 + rnd() * .9, a: .5 + rnd() * .5, off: false });
      }
    });
    const [[x0, y0], [x1, y1]] = d3.geoBounds(cuba);
    let k = 0;
    while (k < 240) { const p = [x0 + rnd() * (x1 - x0), y0 + rnd() * (y1 - y0)]; if (d3.geoContains(cuba, p)) { lights.push({ p, r: .35 + rnd() * .5, a: .2 + rnd() * .4, off: false }); k++; } }
  }

  /* ---------- Apagones (ilustrativo) ---------- */
  function tickZones(now) {
    zones = zones.filter(z => z.until > now);
    if (zones.length < 6 && Math.random() < .5) {
      const l = lights[Math.floor(Math.random() * lights.length)];
      zones.push({ c: l.p, r: .5 + Math.random() * 1.4, until: now + 4000 + Math.random() * 9000 });
    }
    let off = 0;
    lights.forEach(l => { l.off = zones.some(z => d3.geoDistance(l.p, z.c) < z.r * RAD); if (l.off) off++; });
    const dark = lights.length ? off / lights.length : 0;
    document.querySelectorAll('[data-t="dark"]').forEach(e => e.textContent = Math.round(dark * 100) + '%');
  }

  let rot = [-CUBA_C[0] + 70, -CUBA_C[1] + 8], t0 = performance.now();
  function frame(now) {
    const intro = Math.min(1, (now - t0) / 3200), e = 1 - Math.pow(1 - intro, 3);
    const drift = reduce ? 0 : Math.sin(now / 9000) * 3;
    const lam = base[0] + 70 * (1 - e) + drift;
    const phi = base[1] + 8 * (1 - e);
    proj.rotate([lam, phi, 0]);
    rot = [lam, phi];
    const [cx, cy] = proj.translate(), R = proj.scale();
    ctx.clearRect(0, 0, W, H);

    // Atmósfera
    let gr = ctx.createRadialGradient(cx, cy, R * .96, cx, cy, R * 1.22);
    gr.addColorStop(0, 'rgba(127,212,255,.18)'); gr.addColorStop(.35, 'rgba(127,212,255,.05)'); gr.addColorStop(1, 'rgba(127,212,255,0)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(cx, cy, R * 1.22, 0, 7); ctx.fill();

    // Océano
    gr = ctx.createRadialGradient(cx - R * .35, cy - R * .4, R * .1, cx, cy, R);
    gr.addColorStop(0, '#1b3147'); gr.addColorStop(1, '#0a121b');
    ctx.fillStyle = gr; ctx.beginPath(); path(sphere); ctx.fill();

    // Retícula
    ctx.strokeStyle = 'rgba(127,212,255,.09)'; ctx.lineWidth = .7; ctx.beginPath(); path(grat); ctx.stroke();

    // Tierra
    if (world) {
      ctx.fillStyle = '#252c36'; ctx.beginPath(); path(world); ctx.fill();
      ctx.fillStyle = '#29313c'; ctx.beginPath(); path(near); ctx.fill();
      ctx.strokeStyle = 'rgba(236,234,228,.22)'; ctx.lineWidth = .6; ctx.beginPath(); path(near); ctx.stroke();
      ctx.strokeStyle = 'rgba(236,234,228,.12)'; ctx.beginPath(); path(world); ctx.stroke();
    }

    // Noche (terminador real)
    const sun = subsolar(new Date());
    const anti = [sun[0] + 180 > 180 ? sun[0] - 180 : sun[0] + 180, -sun[1]];
    ctx.fillStyle = 'rgba(2,3,6,.42)';
    for (const r of [96, 90, 84]) { ctx.beginPath(); path(d3.geoCircle().center(anti).radius(r)()); ctx.fill(); }
    ctx.strokeStyle = 'rgba(255,194,74,.35)'; ctx.setLineDash([2, 4]); ctx.lineWidth = .8;
    ctx.beginPath(); path(d3.geoCircle().center(anti).radius(90)()); ctx.stroke(); ctx.setLineDash([]);

    // Cuba
    if (cuba) {
      ctx.fillStyle = '#353b46'; ctx.beginPath(); path(cuba); ctx.fill();
      ctx.strokeStyle = 'rgba(255,90,31,.85)'; ctx.lineWidth = 1; ctx.beginPath(); path(cuba); ctx.stroke();
      ctx.globalCompositeOperation = 'lighter';
      for (const l of lights) {
        const p = proj(l.p); if (!p) continue;
        const tw = l.off ? .08 : l.a * (reduce ? 1 : .8 + .2 * Math.sin(now / 300 + l.p[0] * 40));
        ctx.fillStyle = l.off ? 'rgba(120,130,150,' + tw + ')' : 'rgba(255,205,110,' + tw + ')';
        ctx.beginPath(); ctx.arc(p[0], p[1], l.r * (R / 420), 0, 7); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
      // Etiquetas
      ctx.font = '500 10px "IBM Plex Mono", monospace'; ctx.textBaseline = 'middle';
      CITIES.filter(c => LABELS.includes(c[0]) && (W >= 720 || c[0] === 'La Habana')).forEach(([n, lon, lat], i) => {
        const p = proj([lon, lat]); if (!p) return;
        // 0: Habana arriba-izq · 1: Santiago abajo · 2: Camagüey abajo-izq
        const L = [[-30, -34], [-6, 46], [-46, 30]][i];
        const lx = p[0] + L[0], ly = p[1] + L[1];
        ctx.strokeStyle = 'rgba(236,234,228,.45)'; ctx.lineWidth = .7;
        ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(lx, ly); ctx.lineTo(lx - 8, ly); ctx.stroke();
        ctx.fillStyle = 'rgba(236,234,228,.88)'; ctx.textAlign = 'right';
        ctx.fillText(n.toUpperCase(), lx - 12, ly - 6);
        ctx.fillStyle = 'rgba(236,234,228,.45)';
        ctx.fillText(Math.abs(lat).toFixed(2) + '°N ' + Math.abs(lon).toFixed(2) + '°W', lx - 12, ly + 6);
      });
    }

    // Satélite y traza
    const t = Date.now();
    const track = { type: 'LineString', coordinates: Array.from({ length: 90 }, (_, i) => satPos(t - (89 - i) * 40e3)) };
    ctx.strokeStyle = 'rgba(127,212,255,.55)'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
    ctx.beginPath(); path(track); ctx.stroke(); ctx.setLineDash([]);
    const sp = proj(satPos(t));
    const vis = sp && d3.geoDistance(satPos(t), [-rot[0], -rot[1]]) < Math.PI / 2;
    if (vis) {
      ctx.fillStyle = '#7fd4ff'; ctx.fillRect(sp[0] - 3, sp[1] - 3, 6, 6);
      ctx.strokeStyle = 'rgba(127,212,255,.5)'; ctx.strokeRect(sp[0] - 7, sp[1] - 7, 14, 14);
      ctx.font = '500 9px "IBM Plex Mono", monospace'; ctx.textAlign = 'left'; ctx.fillStyle = 'rgba(127,212,255,.9)';
      ctx.fillText('OBS-59', sp[0] + 11, sp[1] - 9);
    }

    // Anillo de instrumentación
    ctx.save(); ctx.translate(cx, cy);
    ctx.strokeStyle = 'rgba(236,234,228,.16)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(0, 0, R * 1.08, 0, 7); ctx.stroke();
    const a0 = reduce ? 0 : now / 60000;
    for (let i = 0; i < 360; i += 5) {
      const a = i * RAD + a0, long = i % 30 === 0;
      ctx.strokeStyle = long ? 'rgba(236,234,228,.45)' : 'rgba(236,234,228,.16)';
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * R * 1.08, Math.sin(a) * R * 1.08);
      ctx.lineTo(Math.cos(a) * R * (long ? 1.12 : 1.1), Math.sin(a) * R * (long ? 1.12 : 1.1)); ctx.stroke();
    }
    ctx.restore();

    // Retícula de puntería sobre Cuba
    const cp = proj(CUBA_C);
    if (cp) {
      const k = 18 + (reduce ? 0 : Math.sin(now / 500) * 2);
      ctx.strokeStyle = 'rgba(255,90,31,.9)'; ctx.lineWidth = 1;
      [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy]) => {
        ctx.beginPath(); ctx.moveTo(cp[0] + sx * k * 2.6, cp[1] + sy * (k - 6)); ctx.lineTo(cp[0] + sx * k * 2.6, cp[1] + sy * k); ctx.lineTo(cp[0] + sx * (k * 2.6 - 8), cp[1] + sy * k); ctx.stroke();
      });
    }

    // Telemetría en vivo
    if (!frame.n || now - frame.n > 1000) {
      frame.n = now;
      const fmt = (v, p, n) => Math.abs(v).toFixed(1) + '°' + (v >= 0 ? p : n);
      setT('sun', fmt(sun[1], 'N', 'S') + ' ' + fmt(sun[0], 'E', 'W'));
      const sat = satPos(t); setT('sat', fmt(sat[1], 'N', 'S') + ' ' + fmt(sat[0], 'E', 'W'));
      const day = d3.geoDistance(sun, CUBA_C) < Math.PI / 2;
      document.querySelectorAll('[data-t="phase"]').forEach(e => { e.textContent = e.dataset[day ? 'day' : 'night']; e.className = day ? 'luz' : 'sig'; });
      if (lights.length) tickZones(now);
    }
    if (!reduce) raf = requestAnimationFrame(frame);
  }
  const setT = (k, v) => document.querySelectorAll('[data-t="' + k + '"]').forEach(e => e.textContent = v);

  let raf = 0, visible = true;
  new IntersectionObserver(([en]) => {
    visible = en.isIntersecting;
    cancelAnimationFrame(raf);
    if (visible && !document.hidden) raf = requestAnimationFrame(frame);
  }).observe(host);
  document.addEventListener('visibilitychange', () => { cancelAnimationFrame(raf); if (visible && !document.hidden) raf = requestAnimationFrame(frame); });
  addEventListener('resize', () => { layout(); if (reduce) frame(performance.now()); });

  layout();
  raf = requestAnimationFrame(frame);
  load().then(() => { if (reduce) { t0 = -1e9; frame(performance.now()); } }).catch(() => { /* sin datos: queda esfera + retícula */ });
})();
