// Generador del sitio estático de Cuba Real.
// Lee content/{es,en}/{slug}.html y escribe /index.html, /{slug}/index.html, /en/...
// Uso: node scripts/build.mjs   (sin dependencias)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://www.cubareal.net';
const V = Date.now().toString(36); // cache-busting de assets

const ORDER = ['hoy', 'pais', 'pueblo', 'singaos', 'dictadura', 'exilio', 'metodologia', 'contexto', 'historia', 'quienes-somos', 'unirse'];
const EXTRA = ['dolar'];

const T = {
  es: {
    names: ['Hoy', 'El país', 'El pueblo', '(Singaos)', 'La Dictadura', 'Exilio', 'Metodología', 'Contexto', 'Historia de Cuba', 'Quiénes somos', 'Unirse'],
    dolar: 'El dólar', skip: 'Saltar al contenido', join: 'Únete', menu: 'Secciones', seq: 'Secuencia', next: 'Siguiente',
    havana: 'La Habana', usd: 'USD → CUP', code: 'Documento', rev: 'Revisión', read: 'Lectura', min: 'min', src: 'Fuentes enlazadas',
    tagline: 'La realidad que no te cuentan',
    title: 'CUBA: LA REALIDAD QUE NO TE CUENTAN',
    desc: 'Hambre, apagones, hospitales sin medicinas, escuelas sin maestros, el químico en el barrio y 1.339 presos políticos. La realidad de Cuba en 2026. Sin propaganda. Sin filtros.',
    foot1: 'Cuba es el pueblo, no el Partido. Sin propaganda. Sin filtros. El dólar se lee solo cada vez que se abre la página.',
    today: 'Hoy en Cuba', share: 'Pásalo', sources: 'Fuentes 2026',
    sourcesList: 'ONU / OCHA · OPS · AP · Miami Herald · Prisoners Defenders · Cubalex · HRW · UNE · OCDH · MINSAP · ONEI · ADN Cuba · elTOQUE · Yadio.',
    noMoney: 'Cada cifra dice su fuente. Esta página no pide dinero.',
    hero: {
      kicker: 'Hambre. Oscuridad. Sin medicinas. Sin agua. Cárcel.',
      h1: 'Cuba: la realidad <em>que no te cuentan</em>',
      lead: '8.267 muertes documentadas por Cuba Archive desde 1959. Hoy: 1.339 presos políticos y el 94% en pobreza extrema.',
      cta: [['Ver lo que pasa', 'pais', ''], ['El 11J', 'pueblo', 'parte-11j'], ['Cómo se cuentan las 8.267', 'metodologia', '']],
      clock: 'Tiempo bajo esta dictadura · desde 1959',
      units: ['años', 'días', 'horas', 'min', 'seg'],
      tele: 'Telemetría · Cuba', live: 'En vivo',
      rows: [['Hora en La Habana', 'havana', ''], ['Fase solar en Cuba', 'phase', ''], ['Punto subsolar', 'sun', ''], ['Satélite OBS-59', 'sat', ''], ['USD → CUP · Yadio', 'usd', 'luz'], ['Presos políticos · lista PD', 'static:1.355', 'sig'], ['Apagones nacionales 2026', 'static:8', 'sig'], ['Luces en apagón (sim.)', 'dark', 'luz']],
      note: 'Terminador día/noche, punto subsolar y hora calculados en tiempo real. Luces y apagones sobre Cuba: ilustrativos.',
      day: 'Día', night: 'Noche'
    }
  },
  en: {
    names: ['Today', 'The country', 'The people', '(Singaos)', 'The dictatorship', 'Exile', 'Method', 'Context', 'History of Cuba', 'Who we are', 'Join'],
    dolar: 'The dollar', skip: 'Skip to content', join: 'Join', menu: 'Sections', seq: 'Sequence', next: 'Next',
    havana: 'Havana', usd: 'USD → CUP', code: 'Document', rev: 'Revision', read: 'Reading', min: 'min', src: 'Linked sources',
    tagline: 'The truth they don’t tell you',
    title: 'CUBA: THE TRUTH THEY DON’T TELL YOU',
    desc: 'Hunger, blackouts, hospitals without medicine, schools without teachers, synthetic drugs on the corner and 1,339 political prisoners. Cuba in 2026. No propaganda. No filters.',
    foot1: 'Cuba is the people, not the Party. No propaganda. No filters. The dollar is read on its own every time the page opens.',
    today: 'Today in Cuba', share: 'Share it', sources: 'Sources 2026',
    sourcesList: 'UN / OCHA · PAHO · AP · Miami Herald · Prisoners Defenders · Cubalex · HRW · UNE · OCDH · MINSAP · ONEI · ADN Cuba · elTOQUE · Yadio.',
    noMoney: 'Every figure names its source. This page does not ask for money.',
    hero: {
      kicker: 'Hunger. Darkness. No medicine. No water. Prison.',
      h1: 'Cuba: the truth <em>they don’t tell you</em>',
      lead: '8,267 deaths documented by Cuba Archive since 1959. Today: 1,339 political prisoners and 94% in extreme poverty.',
      cta: [['See what is happening', 'pais', ''], ['July 11', 'pueblo', 'parte-11j'], ['How the 8,267 are counted', 'metodologia', '']],
      clock: 'Time under this dictatorship · since 1959',
      units: ['years', 'days', 'hours', 'min', 'sec'],
      tele: 'Telemetry · Cuba', live: 'Live',
      rows: [['Time in Havana', 'havana', ''], ['Solar phase over Cuba', 'phase', ''], ['Subsolar point', 'sun', ''], ['Satellite OBS-59', 'sat', ''], ['USD → CUP · Yadio', 'usd', 'luz'], ['Political prisoners · PD list', 'static:1,355', 'sig'], ['National blackouts 2026', 'static:8', 'sig'], ['Lights in blackout (sim.)', 'dark', 'luz']],
      note: 'Day/night terminator, subsolar point and time computed live. Lights and blackouts over Cuba: illustrative.',
      day: 'Day', night: 'Night'
    }
  }
};

const href = (lang, slug, anchor = '') => (lang === 'en' ? '/en' : '') + (slug === 'hoy' ? '/' : `/${slug}/`) + (anchor ? '#' + anchor : '');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const strip = s => s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

function readContent(lang, slug) {
  const raw = fs.readFileSync(path.join(ROOT, 'content', lang, slug + '.html'), 'utf8');
  const m = raw.match(/^<!--meta (.*?) -->\n?/);
  return { meta: m ? JSON.parse(m[1]) : {}, html: m ? raw.slice(m[0].length) : raw };
}

const STAR = '<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="1.5" y="1.5" width="29" height="29" fill="none" stroke="currentColor" stroke-width="1" opacity=".35"/><polygon fill="#ff5a1f" points="16,6 18.4,13.4 26,14 20,18.6 22.2,26 16,21.8 9.8,26 12,18.6 6,14 13.6,13.4"/></svg>';

function shell({ lang, slug, title, desc, body, isHome }) {
  const t = T[lang];
  const other = lang === 'es' ? 'en' : 'es';
  const idx = ORDER.indexOf(slug);
  const secName = idx >= 0 ? t.names[idx] : t.dolar;
  const canonical = SITE + href(lang, slug);
  const rail = ORDER.map((s, i) => {
    const cur = s === slug ? ' aria-current="page"' : '';
    const done = idx > i ? ' class="done"' : (s === 'singaos' ? ' class="hot"' : '');
    return `<li><a href="${href(lang, s)}"${cur}${done}><span class="n">${String(i + 1).padStart(2, '0')}</span><span class="t">${esc(t.names[i])}</span></a></li>`;
  }).join('');
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="theme-color" content="#07080a">
<link rel="canonical" href="${canonical}">
<link rel="alternate" hreflang="es" href="${SITE + href('es', slug)}">
<link rel="alternate" hreflang="en" href="${SITE + href('en', slug)}">
<meta property="og:type" content="website">
<meta property="og:locale" content="${lang === 'es' ? 'es_ES' : 'en_US'}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${SITE}/assets/og.jpg">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..800&family=IBM+Plex+Mono:wght@400;500;600&display=swap">
<link rel="stylesheet" href="/assets/site.css?v=${V}">
</head>
<body data-lang="${lang}" data-page="${slug}">
<a class="skip" href="#contenido">${t.skip}</a>
<header class="bar">
  <a class="brand" href="${href(lang, 'hoy')}" aria-label="Cuba Real">${STAR}<b>CUBA <i>REAL</i></b></a>
  <div class="bar-sec"><span>${idx >= 0 ? String(idx + 1).padStart(2, '0') : 'USD'}</span><span>/</span><strong>${esc(secName)}</strong></div>
  <div class="bar-right">
    <a class="bar-cell usd" href="${href(lang, 'dolar')}" title="Yadio">${t.usd}<b class="up" data-live="usd">—</b></a>
    <div class="bar-cell hide-s">${t.havana}<b data-live="havana">--:--</b></div>
    <a class="bar-cell lang-btn" href="${href(other, slug)}" hreflang="${other}" lang="${other}" aria-label="${lang === 'es' ? 'English version' : 'Versión en español'}"><span${lang === 'es' ? ' class="on"' : ''}>ES</span><span>/</span><span${lang === 'en' ? ' class="on"' : ''}>EN</span></a>
    <a class="bar-cell join" href="${href(lang, 'unirse')}">${t.join}</a>
    <button class="menu-btn" type="button" aria-label="${t.menu}" aria-expanded="false" aria-controls="rail"><i></i><i></i></button>
  </div>
</header>
<nav class="rail" id="rail" aria-label="${t.menu}">
  <div class="rail-head"><span>${t.seq}</span><span>${String(Math.max(idx, 0) + 1).padStart(2, '0')}/11</span></div>
  <ol>${rail}</ol>
  <div class="rail-foot">${t.today}<br><b data-live="date">—</b><br><a href="${href(lang, 'dolar')}">${t.dolar} →</a></div>
</nav>
<div class="rail-scrim" aria-hidden="true"></div>
<div class="shell">
<main id="contenido">
${body}
</main>
<footer class="foot">
  <div class="wrap">
    <div class="foot-grid">
      <div><h2>${t.title}</h2><p>${t.foot1}</p></div>
      <div><h3>${t.share}</h3><a class="tg" href="https://t.me/+4J17yFYQ2SYwYzAx" target="_blank" rel="noopener">Telegram ↗</a></div>
      <div><h3>${t.sources}</h3><p>${t.sourcesList}</p></div>
    </div>
    <div class="foot-base"><span>${t.today}: <span data-live="date">—</span></span><span>${t.noMoney}</span></div>
  </div>
</footer>
</div>
${isHome ? '<script src="/assets/vendor/d3-array.min.js" defer></script>\n<script src="/assets/vendor/d3-geo.min.js" defer></script>\n<script src="/assets/globe.js?v=' + V + '" defer></script>\n' : ''}<script src="/assets/site.js?v=${V}" defer></script>
</body>
</html>
`;
}

function docHead(lang, slug, meta, html) {
  const t = T[lang];
  const idx = ORDER.indexOf(slug);
  const code = 'CR-' + (idx >= 0 ? String(idx + 1).padStart(2, '0') : 'USD');
  const words = strip(html).split(' ').length;
  const links = new Set((html.match(/href="https?:\/\/[^"]+"/g) || []).map(h => h.split('/')[2])).size;
  const rev = new Date().toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  const kicker = (meta.kicker || '').replace(/^\d+\s*—\s*/, '');
  return `<header class="doc-head">
  <span class="reg reg-tr" aria-hidden="true"></span>
  <div class="doc-code"><span>${code}</span><span>${esc(kicker || t.names[idx] || '')}</span><span>Cuba Real · OBS-59</span></div>
  <h1>${esc(meta.title || '')}</h1>
  ${meta.lead ? `<p class="lead">${esc(meta.lead)}</p>` : ''}
  <div class="doc-meta"><div>${t.code}<b>${code}</b></div><div>${t.rev}<b>${rev}</b></div><div>${t.read}<b>${Math.max(1, Math.round(words / 220))} ${t.min}</b></div>${links ? `<div>${t.src}<b>${links}</b></div>` : ''}</div>
</header>`;
}

function nextLink(lang, slug) {
  const t = T[lang];
  const i = ORDER.indexOf(slug);
  const n = i >= 0 ? ORDER[(i + 1) % ORDER.length] : 'hoy';
  const ni = ORDER.indexOf(n);
  return `<a class="next" href="${href(lang, n)}"><div><small>${t.next} · ${String(ni + 1).padStart(2, '0')}</small><strong>${esc(t.names[ni])}</strong></div><span class="arrow" aria-hidden="true">→</span></a>`;
}

function hero(lang) {
  const h = T[lang].hero;
  const rows = h.rows.map(([k, v, c]) => {
    const val = v.startsWith('static:') ? v.slice(7) : '—';
    const attr = v.startsWith('static:') ? '' : ` data-t="${v}"`;
    const extra = v === 'phase' ? ` data-day="${h.day}" data-night="${h.night}"` : '';
    return `<dt>${k}</dt><dd class="${c}"${attr}${extra}>${val}</dd>`;
  }).join('');
  return `<section class="hero" aria-label="${esc(T[lang].tagline)}">
  <div class="hero-globe" data-globe="/assets/geo/" aria-hidden="true"></div>
  <div class="wrap hero-in">
    <div>
      <p class="hero-kicker">${h.kicker}</p>
      <h1>${h.h1}</h1>
      <p class="hero-lead">${h.lead}</p>
      <div class="hero-ctas">${h.cta.map(([l, s, a], i) => `<a class="btn${i === 0 ? ' btn-signal' : ''}" href="${href(lang, s, a)}">${l}${i === 0 ? ' →' : ''}</a>`).join('')}</div>
    </div>
    <aside class="telemetry" aria-label="${h.tele}">
      <header><span>${h.tele}</span><span class="red">● ${h.live}</span></header>
      <dl>${rows}</dl>
      <p>${h.note}</p>
    </aside>
  </div>
  <div class="mclock">
    <div class="mc-bar" aria-hidden="true"><i data-live="year-bar"></i></div>
    <div class="wrap">
      <div class="mc-l">T+<b>1959</b>${h.clock}</div>
      <div class="mc-d" role="timer" aria-label="${h.clock}">
        <div><b class="y" data-live="c-y">67</b><span>${h.units[0]}</span></div><i>:</i>
        <div><b data-live="c-d">000</b><span>${h.units[1]}</span></div><i>:</i>
        <div><b data-live="c-h">00</b><span>${h.units[2]}</span></div><i>:</i>
        <div><b data-live="c-m">00</b><span>${h.units[3]}</span></div><i>:</i>
        <div><b data-live="c-s">00</b><span>${h.units[4]}</span></div>
      </div>
      <p class="mc-r" data-live="c-sentence"></p>
    </div>
  </div>
</section>`;
}

let count = 0;
for (const lang of ['es', 'en']) {
  for (const slug of [...ORDER, ...EXTRA]) {
    const { meta, html } = readContent(lang, slug);
    const isHome = slug === 'hoy';
    const t = T[lang];
    const idx = ORDER.indexOf(slug);
    const pageTitle = isHome ? t.title : `${meta.title || t.names[idx]} · Cuba Real`;
    const desc = isHome ? t.desc : (meta.lead || t.desc);
    const body = isHome
      ? `${hero(lang)}\n<div class="wrap"><div class="doc">\n${html}\n</div>${nextLink(lang, slug)}</div>`
      : `<div class="wrap">${docHead(lang, slug, meta, html)}<div class="doc">\n${html}\n</div>${nextLink(lang, slug)}</div>`;
    const out = path.join(ROOT, lang === 'en' ? 'en' : '', isHome ? '' : slug, 'index.html');
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, shell({ lang, slug, title: pageTitle, desc, body, isHome }));
    count++;
  }
}

// 404
const nf = shell({ lang: 'es', slug: 'hoy', title: 'No encontrado · Cuba Real', desc: T.es.desc, isHome: false,
  body: `<div class="wrap"><header class="doc-head"><div class="doc-code"><span>404</span><span>Señal perdida</span></div><h1>Esta página no existe</h1><p class="lead">Vuelve a la <a href="/">portada</a> o usa la secuencia de la izquierda.</p></header></div>` });
fs.writeFileSync(path.join(ROOT, '404.html'), nf);
console.log(`Built ${count} pages + 404`);
