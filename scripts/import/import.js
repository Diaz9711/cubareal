// One-time importer: turns the extracted live-site states into clean, editable
// content partials (content/{es,en}/{slug}.html) for the new static site.
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const EXT = path.join(__dirname, '..', 'ext');
const OUT = '/home/user/cubareal/content';
const SLUGS = { 1: 'hoy', 2: 'pais', 3: 'pueblo', 4: 'singaos', 5: 'dictadura', 6: 'exilio', 7: 'metodologia', 8: 'contexto', 9: 'historia', 10: 'quienes-somos', 11: 'unirse', 12: 'dolar' };
const url = (lang, slug, anchor) => (lang === 'en' ? '/en' : '') + (slug === 'hoy' ? '/' : '/' + slug + '/') + (anchor ? '#' + anchor : '');
const load = (lang, n) => JSON.parse(fs.readFileSync(path.join(EXT, `${lang}-${String(n).padStart(2, '0')}.json`), 'utf8'));
const $load = html => cheerio.load(html, null, false);

function sizes() {
  const out = {};
  const { execSync } = require('child_process');
  const txt = execSync(`python3 -c "
import os,json
from PIL import Image
d='/home/user/cubareal/photos'
print(json.dumps({f: Image.open(os.path.join(d,f)).size for f in os.listdir(d)}))"`).toString();
  return JSON.parse(txt);
}
const SIZES = sizes();

for (const lang of ['es', 'en']) {
  const pages = {};
  for (const n of Object.keys(SLUGS)) pages[n] = load(lang, +n);
  // signature of each page = first 140 chars of its base html, used to resolve nav targets
  const sigs = Object.entries(pages).map(([n, p]) => [SLUGS[n], p.html.slice(0, 140)]);
  const resolve = act => {
    const hit = sigs.find(([, s]) => act.html.startsWith(s.slice(0, Math.min(140, act.html.length))));
    return hit ? hit[0] : null;
  };

  for (const [n, page] of Object.entries(pages)) {
    const slug = SLUGS[n];
    const $ = $load(page.html);
    const btn = i => $(`[data-b="${i}"]`);
    const meta = {};

    // ---------- page header ----------
    const first = $('section').first();
    const eb = first.children('p.eyebrow').first();
    const h2 = eb.next('h2');
    if (slug !== 'hoy') {
      meta.kicker = eb.text().trim();
      if (h2.length) {
        meta.title = h2.text().trim();
        const lead = h2.next('p');
        if (lead.length && lead.hasClass('muted')) { meta.lead = lead.text().trim(); lead.remove(); }
        h2.remove();
      } else meta.title = meta.kicker.replace(/^\d+\s*—\s*/, '');
      eb.remove();
    }

    // ---------- trailing "Siguiente" ----------
    Object.entries(page.actions).forEach(([i, a]) => {
      const el = btn(i);
      if (a.type === 'nav' && /^(SIGUIENTE|NEXT)\b/i.test(page.labels[i])) { meta.next = resolve(a); el.remove(); }
    });

    // ---------- section-specific interactions ----------
    if (slug === 'hoy') {
      Object.entries(page.actions).forEach(([i, a]) => {
        if (a.type !== 'change') return;
        const $a = $load(a.html);
        const exp = $a(`[data-b="${i}"]`).next('p');
        const el = btn(i);
        el.replaceWith(`<details class="how"><summary>${el.text().trim()}</summary>${$a.html(exp)}</details>`);
      });
    }

    if (slug === 'historia') {
      const sec = $('section').first();
      const eras = [];
      const panelOf = html => {
        const $p = $load(html);
        const s = $p('section').first();
        const kids = s.children().toArray();
        const stop = kids.findIndex(k => $p(k).attr('data-b') === '0');
        const start = kids.findIndex(k => $p(k).is('img'));
        return kids.slice(start, stop).map(k => $p.html(k)).join('');
      };
      eras.push(panelOf(page.html));
      for (let i = 3; i <= 16; i++) if (page.actions[i] && page.actions[i].type === 'change') eras.push(panelOf(page.actions[i].html));
      // remove panel + stepper from base
      const kids = sec.children().toArray();
      const start = kids.findIndex(k => $(k).is('img'));
      kids.slice(start).forEach(k => $(k).remove());
      sec.append('<ol class="eras">' + eras.map((e, k) => `<li class="era" id="era-${k + 1}">${e}</li>`).join('') + '</ol>');
    }

    if (slug === 'pueblo') {
      const ids = ['parte-voces', 'parte-presos', 'parte-11j', 'parte-muertos'];
      // jump pills
      const pills = [0, 1, 2, 3].map(i => btn(i));
      const nav = $('<nav class="jump"></nav>');
      pills.forEach((p, k) => nav.append(`<a href="#${ids[k]}">${p.text().trim()}</a>`));
      pills[0].before(nav); pills.forEach(p => p.remove());

      // people: key by name
      const people = new Map();
      const nameOf = el => (el.find('.disp.large').first().text() || el.find('span').first().contents().first().text() || el.text()).trim();
      const detailOf = html => {
        const $d = $load(html);
        const grid = $d('p.eyebrow').filter((_, e) => /Retratos|Portraits/i.test($d(e).text())).first().next('.grid');
        return $d.html(grid.next('article'));
      };
      const personKey = s => s.replace(/\s+/g, ' ').trim();
      Object.entries(page.actions).forEach(([i, a]) => {
        const el = btn(i);
        if (!el.length) return;
        const label = page.labels[i];
        if (a.type === 'change' && el.closest('ul').length) {              // minors list
          const name = personKey(el.contents().first().text());
          if (!people.has(name)) people.set(name, detailOf(a.html));
        }
      });
      // wall + portraits
      const filterIdx = [];
      Object.entries(page.actions).forEach(([i, a]) => {
        const el = btn(i); if (!el.length) return;
        if (el.hasClass('card') && el.hasClass('small') && !el.find('.disp').length && !el.closest('ul').length) filterIdx.push(+i);
      });
      // base detail (Osorbo) belongs to first portrait
      Object.entries(page.actions).forEach(([i, a]) => {
        const el = btn(i); if (!el.length || filterIdx.includes(+i)) return;
        if (el.find('.disp.large').length) {
          const name = personKey(el.find('.disp.large').first().text());
          if (!people.has(name)) people.set(name, a.type === 'change' ? detailOf(a.html) : detailOf(page.html));
        }
      });
      // filters: membership from each filter state's wall
      const wallNames = html => {
        const $w = $load(html);
        const eb = $w('p.eyebrow').filter((_, e) => /muro|wall/i.test($w(e).text())).first();
        return eb.next('.grid').find('.disp.large').toArray().map(e => personKey($w(e).text()));
      };
      const filters = filterIdx.map((i, k) => ({ k, label: btn(i).text().trim(), names: k === 0 ? wallNames(page.html) : wallNames(page.actions[i].html) }));
      const tagsFor = name => filters.filter(f => f.names.includes(name)).map(f => 'f' + f.k).join(' ');
      const fbar = $('<div class="filters" role="group"></div>');
      filters.forEach(f => fbar.append(`<button type="button" data-filter="f${f.k}"${f.k === 0 ? ' aria-pressed="true"' : ' aria-pressed="false"'}>${f.label}</button>`));
      btn(filterIdx[0]).before(fbar);
      filterIdx.forEach(i => btn(i).remove());

      let pid = 0; const pidOf = new Map();
      for (const name of people.keys()) pidOf.set(name, 'p' + (pid++));
      Object.entries(page.actions).forEach(([i]) => {
        const el = btn(i); if (!el.length) return;
        let name = el.find('.disp.large').first().text();
        if (!name && el.closest('ul').length) name = el.contents().first().text();
        name = personKey(name || '');
        if (!pidOf.has(name)) return;
        el.attr('data-person', pidOf.get(name));
        const tags = tagsFor(name); if (tags) el.attr('data-tags', tags);
        el.attr('role', 'button').attr('tabindex', '0');
        if (el.find('.disp.large').length && !el.find('img').length) el.addClass('wall');
        if (el.find('img').length) el.addClass('portrait');
      });
      // detail panel + templates
      const det = $('p.eyebrow').filter((_, e) => /Retratos|Portraits/i.test($(e).text())).first().next('.grid').next('article');
      det.attr('id', 'person-detail').attr('aria-live', 'polite');
      let tpl = '';
      for (const [name, html] of people) tpl += `<template data-person="${pidOf.get(name)}">${html}</template>`;
      det.after(tpl);
      // first portrait is selected by default
      $('[data-person="p0"]').attr('aria-current', 'true');
    }

    if (slug === 'unirse') {
      Object.entries(page.actions).forEach(([i, a]) => {
        const el = btn(i); if (!el.length) return;
        const t = el.text().trim();
        const cls = el.attr('class') || '';
        if (/telegram/i.test(t) && !/copi|copy/i.test(t)) el.replaceWith(`<a class="${cls} act" href="https://t.me/+4J17yFYQ2SYwYzAx" target="_blank" rel="noopener">${el.html()}</a>`);
        else if (/copi|copy/i.test(t) && /grupo|group/i.test(t)) el.replaceWith(`<a class="${cls} act" data-copy="share" href="https://t.me/+4J17yFYQ2SYwYzAx" target="_blank" rel="noopener">${el.html()}</a>`);
        else if (t === 'X') el.replaceWith(`<a class="${cls} act" data-share="x" href="https://x.com/intent/tweet?url=https%3A%2F%2Fwww.cubareal.net%2F" target="_blank" rel="noopener">X</a>`);
        else if (/copi|copy/i.test(t)) el.replaceWith(`<button type="button" class="${cls} act" data-copy="share">${el.html()}</button>`);
      });
    }

    if (slug === 'dolar') {
      $('article').each((_, a) => {
        const $a = $(a);
        if ($a.find('h3').text().trim() === 'Yadio') {
          $a.find('p.num').first().attr('data-live', 'yadio');
          $a.find('p.num').first().nextAll('p.muted.small').first().attr('data-live', 'yadio-time');
        }
      });
      $('p.muted.small').filter((_, p) => /^(Se separan|They are|The gap|A gap)/i.test($(p).text().trim()) || /\b\d+ CUP\b.*elTOQUE/.test($(p).text())).first().attr('data-live', 'gap');
    }

    // ---------- generic: remaining nav buttons → links ----------
    Object.entries(page.actions).forEach(([i, a]) => {
      const el = btn(i);
      if (!el.length || a.type !== 'nav') return;
      const target = resolve(a);
      if (!target) return;
      const anchor = a.anchor && a.anchor.y > 0 && a.anchor.id ? a.anchor.id : null;
      el.replaceWith(`<a class="${(el.attr('class') || '')} go" href="${url(lang, target, anchor)}">${el.html()}</a>`);
    });
    Object.entries(page.actions).forEach(([i, a]) => {
      const el = btn(i);
      if (el.length && a.type === 'none' && /^01\s/.test(page.labels[i])) el.replaceWith(`<a class="${el.attr('class') || ''} go" href="${url(lang, 'hoy')}" aria-current="page">${el.html()}</a>`);
    });
    // any leftover data-b → plain elements
    $('[data-b]').removeAttr('data-b');

    // ---------- images ----------
    $('img').each((_, im) => {
      const $i = $(im); const f = ($i.attr('src') || '').split('/').pop();
      $i.attr('loading', 'lazy').attr('decoding', 'async');
      if (SIZES[f]) { $i.attr('width', SIZES[f][0]); $i.attr('height', SIZES[f][1]); }
    });

    let html = $.html()
      .replace(/<section><\/section>/g, '')
      .replace(/(<\/(section|article|div|figure|ul|ol|li|p|h\d|details|nav|template)>)/g, '$1\n');
    const header = `<!--meta ${JSON.stringify(meta)} -->\n`;
    fs.mkdirSync(path.join(OUT, lang), { recursive: true });
    fs.writeFileSync(path.join(OUT, lang, slug + '.html'), header + html);
    console.log(lang, slug, html.length, JSON.stringify(meta).slice(0, 140));
  }
}
