/* ==========================================================================
   CUBA REAL — comportamiento del sitio (sin dependencias)
   ========================================================================== */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const lang = document.body.dataset.lang || 'es';
  const L = lang === 'en' ? 'en-US' : 'es-ES';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const set = (key, v) => $$('[data-live="' + key + '"]').forEach(e => { e.textContent = v; });
  const setT = (key, v) => $$('[data-t="' + key + '"]').forEach(e => { e.textContent = v; });
  const pad = (n, l = 2) => String(n).padStart(l, '0');
  const store = {
    get(k) { try { return JSON.parse(sessionStorage.getItem(k)); } catch (e) { return null; } },
    set(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } }
  };

  /* ---------- Menú (riel) en pantallas pequeñas ---------- */
  const rail = $('#rail'), menuBtn = $('.menu-btn'), scrim = $('.rail-scrim');
  const toggleRail = open => {
    rail.classList.toggle('open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
  };
  menuBtn && menuBtn.addEventListener('click', () => toggleRail(!rail.classList.contains('open')));
  scrim && scrim.addEventListener('click', () => toggleRail(false));
  addEventListener('keydown', e => { if (e.key === 'Escape' && rail.classList.contains('open')) toggleRail(false); });

  /* ---------- Progreso de lectura en el riel ---------- */
  const railOl = $('.rail ol');
  const onScroll = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    railOl && railOl.style.setProperty('--p', max > 0 ? Math.min(1, scrollY / max).toFixed(3) : 0);
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Fecha / hora de La Habana ---------- */
  const havanaDate = new Intl.DateTimeFormat(L, { timeZone: 'America/Havana', day: 'numeric', month: 'long', year: 'numeric' });
  const havanaTime = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Havana', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  set('date', havanaDate.format(new Date()));

  /* ---------- Reloj de misión: desde el 1 de enero de 1959 (hora de Cuba) ---------- */
  const START = new Date('1959-01-01T00:00:00-05:00');
  const addY = (d, n) => { const x = new Date(d); x.setUTCFullYear(x.getUTCFullYear() + n); return x; };
  const hasClock = !!$('[data-live="c-y"]');
  function tick() {
    const now = new Date();
    const hv = havanaTime.format(now);
    set('havana', hv.slice(0, 5));
    setT('havana', hv);
    if (!hasClock) return;
    let y = now.getUTCFullYear() - 1959;
    if (addY(START, y) > now) y--;
    const a = addY(START, y), b = addY(START, y + 1);
    let r = now - a;
    const d = Math.floor(r / 864e5); r -= d * 864e5;
    const h = Math.floor(r / 36e5); r -= h * 36e5;
    const m = Math.floor(r / 6e4); r -= m * 6e4;
    const s = Math.floor(r / 1e3);
    set('c-y', y); set('c-d', pad(d, 3)); set('c-h', pad(h)); set('c-m', pad(m)); set('c-s', pad(s));
    const pct = ((now - a) / (b - a) * 100).toFixed(3) + '%';
    $$('[data-live="year-bar"]').forEach(bar => { bar.style.width = pct; });
    set('c-sentence', lang === 'en'
      ? `${y} years, ${d} days, ${h} hours and ${m} minutes under the dictatorship that began January 1, 1959.`
      : `${y} años, ${d} días, ${h} horas y ${m} minutos bajo la dictadura que empezó el 1 de enero de 1959.`);
  }
  tick();
  setInterval(tick, 1000);

  /* ---------- Reloj anclado: siempre visible en la portada ---------- */
  const dock = $('.mdock'), bigClock = $('.mclock');
  if (dock && bigClock && 'IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => {
      dock.classList.toggle('on', !e.isIntersecting);
    }, { rootMargin: '-56px 0px 0px 0px' }).observe(bigClock);
  } else if (dock) dock.classList.add('on');

  /* ---------- Dólar informal en vivo (Yadio; CORS abierto) ---------- */
  const fmt = n => new Intl.NumberFormat(L, { maximumFractionDigits: 0 }).format(n);
  function paintRate(r) {
    if (!r || !r.rate) return;
    set('usd', fmt(r.rate));
    setT('usd', fmt(r.rate) + ' CUP');
    $$('[data-live="yadio"]').forEach(e => {
      const unit = e.querySelector('span'); e.textContent = fmt(r.rate) + ' ';
      if (unit) e.appendChild(unit);
    });
    const when = new Intl.DateTimeFormat(L, { timeZone: 'America/Havana', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).format(new Date(r.ts));
    set('yadio-time', when + (lang === 'en' ? ' · Cuba time' : ' · hora Cuba'));
    $$('[data-live="gap"]').forEach(e => {
      const base = 785; // última lectura publicada de elTOQUE en la página
      const gap = Math.abs(Math.round(r.rate - base));
      e.textContent = e.textContent.replace(/\d[\d.,]*\s*CUP/, fmt(gap) + ' CUP');
    });
  }
  async function loadRate() {
    const cached = store.get('cr-usd');
    if (cached && Date.now() - cached.at < 5 * 60e3) return paintRate(cached);
    try {
      const res = await fetch('https://api.yadio.io/rate/CUP/USD', { cache: 'no-store' });
      const j = await res.json();
      const r = { rate: j.rate, ts: j.timestamp || Date.now(), at: Date.now() };
      store.set('cr-usd', r); paintRate(r);
    } catch (e) {
      if (cached) paintRate(cached);
    }
  }
  loadRate();
  setInterval(loadRate, 5 * 60e3);

  /* ---------- Figuras numeradas ---------- */
  $$('.doc figure').forEach((f, i) => f.setAttribute('data-fig', 'FIG. ' + pad(i + 1)));

  /* ---------- El pueblo: ficha de cada preso + filtros ---------- */
  const detail = $('#person-detail');
  if (detail) {
    const pick = el => {
      const id = el.dataset.person;
      const tpl = $('template[data-person="' + id + '"]');
      if (!tpl) return;
      const art = tpl.content.firstElementChild;
      detail.innerHTML = art && art.tagName === 'ARTICLE' ? art.innerHTML : tpl.innerHTML;
      $$('[data-person]:not(template)').forEach(x => x.toggleAttribute('aria-current', x.dataset.person === id));
      $$('[data-person="' + id + '"]:not(template)').forEach(x => x.setAttribute('aria-current', 'true'));
      const r = detail.getBoundingClientRect();
      if (r.top < 60 || r.top > innerHeight * .7) detail.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      detail.classList.remove('flash'); void detail.offsetWidth; detail.classList.add('flash');
    };
    document.addEventListener('click', e => { const el = e.target.closest('[data-person]:not(template)'); if (el) pick(el); });
    document.addEventListener('keydown', e => {
      const el = e.target.closest && e.target.closest('[data-person]:not(template)');
      if (el && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); pick(el); }
    });
    $$('[data-filter]').forEach(b => b.addEventListener('click', () => {
      const f = b.dataset.filter;
      $$('[data-filter]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      $$('.wall[data-person], .portrait[data-person]').forEach(x => {
        x.hidden = !(x.dataset.tags || '').split(' ').includes(f);
      });
      // Oculta el bloque de retratos si el filtro no deja ninguno visible
      const pg = $('.portrait') && $('.portrait').parentElement;
      if (pg) {
        const none = !pg.querySelector('.portrait:not([hidden])');
        pg.hidden = none;
        const eb = pg.previousElementSibling; if (eb && eb.matches('p.eyebrow')) eb.hidden = none;
      }
    }));
  }

  /* ---------- Unirse: copiar y compartir ---------- */
  const shareText = lang === 'en'
    ? 'CUBA: THE TRUTH THEY DON’T TELL YOU\nHunger, blackouts, empty hospitals, synthetic drugs and political prisoners. No propaganda. No filters.\nhttps://www.cubareal.net/'
    : 'CUBA: LA REALIDAD QUE NO TE CUENTAN\nHambre, apagones, hospitales vacíos, el químico y presos políticos. Sin propaganda. Sin filtros.\nhttps://www.cubareal.net/';
  $$('[data-share="x"]').forEach(a => { a.href = 'https://x.com/intent/tweet?text=' + encodeURIComponent(shareText); });
  $$('[data-copy]').forEach(el => el.addEventListener('click', async () => {
    let text = shareText;
    if (el.dataset.copy === 'testimonio') {
      const h = ($('#testimonio-historia') || {}).value || '', c = ($('#testimonio-ciudad') || {}).value || '';
      text = h.trim() ? h.trim() + (c.trim() ? '\n— ' + c.trim() : '') : shareText;
    }
    try { await navigator.clipboard.writeText(text); } catch (e) { /* sin portapapeles */ }
    const old = el.dataset.label || el.innerHTML;
    el.dataset.label = old;
    if (el.tagName === 'BUTTON') {
      el.textContent = lang === 'en' ? 'Copied ✓' : 'Copiado ✓';
      setTimeout(() => { el.innerHTML = old; }, 1800);
    }
  }));

  /* ---------- Revelado al hacer scroll ---------- */
  if (!reduce && 'IntersectionObserver' in window) {
    const els = $$('.doc figure, .doc .grid, .doc article, .doc blockquote, .doc .era, .strip');
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    }), { rootMargin: '0px 0px -8% 0px', threshold: .05 });
    els.forEach(el => { if (el.getBoundingClientRect().top > innerHeight) { el.classList.add('rv'); io.observe(el); } });
  }
})();
