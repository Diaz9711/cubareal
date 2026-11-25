const { chromium } = require('playwright');
const fs = require('fs');
const URL = 'https://www.cubareal.net/';
const [,, LANG, SECS] = process.argv;           // e.g. es 1,2,3
const secs = SECS.split(',').map(Number);

// ---------- in-page helpers (stringified) ----------
const HELPERS = `
window.__ser = function(root, opts) {
  opts = opts || {};
  let bi = 0;
  const btns = [];
  const esc = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const hint = el => {
    const c = (el.getAttribute('class') || '');
    const h = [];
    const txt = (el.textContent || '').trim();
    if (/font-display/.test(c) && /text-(3xl|4xl|5xl|6xl|7xl|8xl)/.test(c) && txt.length < 18 && !/^H/.test(el.tagName)) h.push('num');
    else if (/font-display/.test(c) && !/^H\\d/.test(el.tagName)) h.push('disp');
    if (/uppercase/.test(c) && /tracking/.test(c)) h.push('eyebrow');
    if (/text-danger/.test(c)) h.push('red');
    if (/text-luz/.test(c)) h.push('luz');
    if (/text-fg-muted|text-fg-subtle/.test(c)) h.push('muted');
    if (/(^|\\s)(text-xs|text-sm)(\\s|$)/.test(c) && !h.includes('eyebrow')) h.push('small');
    if (/(^|\\s)(text-lg|text-xl)(\\s|$)/.test(c)) h.push('large');
    if (/tabular-nums/.test(c)) h.push('tab');
    const g = c.match(/(?:^|\\s)(?:sm:|md:|lg:)?grid-cols-(\\d)/g);
    if (/(^|\\s)(sm:|md:|lg:)?grid(\\s|$)/.test(c)) h.push('grid', 'g' + (g ? Math.max(...g.map(x => +x.match(/(\\d)$/)[1])) : 1));
    if (/grid-cols-\\[/.test(c)) h.push('split');
    if (/(^|\\s)border(\\s|$)/.test(c) && /rounded/.test(c) && /(p-\\d|px-\\d)/.test(c)) h.push('card');
    if (/border-danger/.test(c)) h.push('card-red');
    if (/border-t(\\s|$)/.test(c)) h.push('rule');
    if (/rounded-full/.test(c) && /border/.test(c)) h.push('pill');
    if (/italic/.test(c) && !/not-italic/.test(c)) h.push('it');
    return h;
  };
  const visible = el => { const s = getComputedStyle(el); return s.display !== 'none' && s.visibility !== 'hidden' && !(el.offsetWidth === 0 && el.offsetHeight === 0 && el.getClientRects().length === 0); };
  function walk(n) {
    if (n.nodeType === 3) return esc(n.textContent);
    if (n.nodeType !== 1) return '';
    const tag = n.tagName.toLowerCase();
    if (['svg','script','style','noscript','template','iframe','canvas','video'].includes(tag)) return '';
    if (!visible(n) && tag !== 'br') return '';
    const kids = () => [...n.childNodes].map(walk).join('');
    const h = hint(n);
    if (tag === 'img') return '<img src="' + n.getAttribute('src') + '" alt="' + esc(n.alt || '') + '"' + (h.length ? ' class="' + h.join(' ') + '"' : '') + '>';
    if (tag === 'br') return '<br>';
    let out = tag, attrs = '';
    if (tag === 'button') { out = 'div'; const i = bi++; btns.push(n); attrs += ' data-b="' + i + '"'; }
    if (tag === 'a') { const href = n.getAttribute('href') || ''; attrs += ' href="' + esc(href) + '"'; }
    if (n.id) attrs += ' id="' + n.id + '"';
    if (!['h1','h2','h3','h4','h5','h6','p','ul','ol','li','a','figure','figcaption','blockquote','table','thead','tbody','tr','td','th','strong','em','b','i','small','time','section','article','div','span','dl','dt','dd','sup','sub','q','cite','label'].includes(out)) out = 'div';
    const inner = kids();
    if (!inner.trim() && !/<img/.test(inner)) return '';
    if ((out === 'span' || out === 'div') && !h.length && !attrs) {
      // unwrap meaningless wrappers
      return out === 'div' ? inner : inner;
    }
    if (out === 'span' && !h.length) return inner;
    return '<' + out + attrs + (h.length ? ' class="' + h.join(' ') + '"' : '') + '>' + inner + '</' + out + '>';
  }
  const html = walk(root);
  window.__btns = btns;
  return { html, n: btns.length, labels: btns.map(b => b.innerText.replace(/\\s+/g,' ').trim().slice(0,120)) };
};
window.__chapter = () => document.querySelector('.chapter-enter') || document.querySelector('#contenido');
window.__dialogs = () => [...document.querySelectorAll('[role=dialog], .sheet-part, [data-state=open]')].filter(e => !window.__chapter().contains(e));
window.__hdr = () => (document.querySelector('header') || {}).innerText || '';
`;

async function fresh(p, sec) {
  await p.goto(URL, { waitUntil: 'networkidle', timeout: 60000 });
  await p.addScriptTag({ content: HELPERS });
  if (LANG === 'en') {
    await p.evaluate(() => { const b = [...document.querySelectorAll('header button')].find(x => x.innerText.trim() === 'EN'); b && b.click(); });
    await p.waitForTimeout(700);
  }
  if (sec === 12) {
    await p.evaluate(() => [...document.querySelectorAll('button')].find(x => /^1 (DÓLAR|DOLLAR)/i.test(x.innerText.trim())).click());
    await p.waitForTimeout(1500);
  } else if (sec > 1) {
    const ok = await p.evaluate(idx => {
      const re = new RegExp('^' + idx + '\\s');
      const b = [...document.querySelectorAll('button')].find(x => re.test(x.innerText.replace(/\s+/g, ' ').trim()));
      if (!b) return false; b.click(); return true;
    }, String(sec).padStart(2, '0'));
    if (!ok) throw new Error('no section button ' + sec);
    await p.waitForTimeout(1500);
  }
  await p.evaluate(() => scrollTo(0, 0));
}

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  for (const sec of secs) {
    const p = await ctx.newPage();
    await fresh(p, sec);
    const base = await p.evaluate(() => window.__ser(window.__chapter()));
    const hdr0 = await p.evaluate(() => window.__hdr());
    const out = { sec, lang: LANG, header: hdr0, html: base.html, labels: base.labels, actions: {} };
    for (let i = 0; i < base.n; i++) {
      try {
        await fresh(p, sec);
        const before = await p.evaluate(() => { const r = window.__ser(window.__chapter()); return { html: r.html, d: window.__dialogs().length }; });
        await p.evaluate(i => window.__btns[i] && window.__btns[i].scrollIntoView(), i);
        await p.evaluate(i => window.__btns[i] && window.__btns[i].click(), i);
        await p.waitForTimeout(900);
        const hdr = await p.evaluate(() => window.__hdr());
        const dlg = await p.evaluate(() => window.__dialogs().map(d => window.__ser(d).html).join('\n'));
        const after = await p.evaluate(() => window.__ser(window.__chapter()).html);
        const anchor = await p.evaluate(() => { const ids = [...document.querySelectorAll('[id]')].filter(e => e.id !== 'contenido'); let best = null, bd = 1e9; ids.forEach(e => { const t = e.getBoundingClientRect().top; if (Math.abs(t - 80) < bd) { bd = Math.abs(t - 80); best = e.id; } }); return { id: best, y: scrollY }; });
        if (hdr !== hdr0) out.actions[i] = { type: 'nav', header: hdr.split('\n').slice(-2, -1)[0], anchor, html: after.slice(0, 200) };
        else if (dlg && dlg.length > 20) out.actions[i] = { type: 'dialog', html: dlg };
        else if (after !== before.html) out.actions[i] = { type: 'change', html: after };
        else out.actions[i] = { type: 'none' };
      } catch (e) { out.actions[i] = { type: 'error', msg: e.message.split('\n')[0] }; }
    }
    fs.writeFileSync(`ext/${LANG}-${String(sec).padStart(2, '0')}.json`, JSON.stringify(out, null, 1));
    const types = Object.values(out.actions).reduce((a, x) => (a[x.type] = (a[x.type] || 0) + 1, a), {});
    console.log(LANG, sec, 'buttons', base.n, JSON.stringify(types));
    await p.close();
  }
  await b.close();
})();
