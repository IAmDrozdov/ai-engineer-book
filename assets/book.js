/* Чеклист AI-инженера — поведение страниц: навигация, код, схемы, графики, чеклисты, режим проверки. */
(function () {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const params = new URLSearchParams(location.search);
  const QA = params.has('qa');
  const root = document.documentElement;
  const BOOK = window.BOOK || { chapters: [], parts: [], title: '' };
  const scriptSrc = (document.currentScript && document.currentScript.src) || '';
  const BASE = scriptSrc.replace(/assets\/book\.js.*$/, '');
  const qaIssues = [];

  function h(tag, attrs, ...kids) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') node.className = v;
      else if (k === 'text') node.textContent = v;
      else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat()) if (kid != null) node.append(kid);
    return node;
  }
  function s(tag, attrs) {
    const node = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs || {})) if (v != null) node.setAttribute(k, v);
    return node;
  }
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* приватный режим */ } },
  };
  const cssVar = (name) => getComputedStyle(root).getPropertyValue(name).trim();

  /* ---------- тема ---------- */
  if (params.get('theme')) root.dataset.theme = params.get('theme');
  function isDark() {
    if (root.dataset.theme) return root.dataset.theme === 'dark';
    return window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches;
  }
  function toggleTheme() {
    const next = isDark() ? 'light' : 'dark';
    store.set('book-theme', next);
    location.reload(); // схемы mermaid рисуются под тему один раз
  }

  const chapterNo = root.dataset.chapter || '';
  const chapterIdx = BOOK.chapters.findIndex((c) => c.n === chapterNo);
  const chapter = BOOK.chapters[chapterIdx];
  const chapterUrl = (c) => BASE + c.slug + '/index.html';

  /* ---------- каркас страницы главы ---------- */
  function buildChrome(main) {
    const topbar = h('div', { class: 'topbar' },
      h('button', { class: 'topbar__toc-btn', type: 'button', 'aria-label': 'Содержание главы', onclick: () => document.body.classList.toggle('toc-open') }, 'Содержание'),
      h('a', { class: 'topbar__book', href: BASE + 'index.html' }, BOOK.title || 'Оглавление'),
      h('span', { class: 'topbar__chapter' }, chapter ? [h('b', { text: chapter.n }), chapter.title] : ''),
      h('button', { type: 'button', onclick: toggleTheme, 'aria-label': 'Переключить тему' }, isDark() ? 'Светлая' : 'Тёмная'),
      h('span', { class: 'topbar__progress' })
    );
    const toc = h('nav', { class: 'toc', 'aria-label': 'Содержание главы' });
    const layout = h('div', { class: 'layout' });
    main.before(topbar, layout);
    layout.append(toc, main);
    return { topbar, toc };
  }

  function numberSections(main) {
    let k = 0;
    const heads = [];
    $$('h2', main).forEach((h2) => {
      const sec = h2.closest('section');
      const id = h2.id || (sec && sec.id) || 'sec-' + (heads.length + 1);
      if (sec && !sec.id) sec.id = id; else if (!sec) h2.id = id;
      const plain = sec && (sec.hasAttribute('data-nonum') || /^(selfcheck|checklist|sources)$/.test(sec.id));
      if (!plain && chapter) {
        k += 1;
        h2.prepend(h('span', { class: 'sec-num', text: Number(chapter.n) + '.' + k }));
      }
      const item = { h2, id, label: h2.textContent.replace(/^\d+\.\d+/, '').trim(), num: plain ? '' : Number(chapter ? chapter.n : 0) + '.' + k, subs: [] };
      heads.push(item);
    });
    $$('h3', main).forEach((h3, i) => {
      if (!h3.id) h3.id = 'sub-' + (i + 1);
      const owner = heads.filter((x) => x.h2.compareDocumentPosition(h3) & Node.DOCUMENT_POSITION_FOLLOWING).pop();
      if (owner) owner.subs.push({ id: h3.id, label: h3.textContent.trim() });
    });
    return heads;
  }

  function buildToc(toc, heads) {
    if (chapter) toc.append(h('div', { class: 'toc__num', text: chapter.n }), h('div', { class: 'toc__title', text: chapter.title }));
    const ol = h('ol');
    heads.forEach((item) => {
      const li = h('li', {}, h('a', { href: '#' + item.id, 'data-id': item.id }, item.label));
      if (item.subs.length) li.append(h('ol', {}, item.subs.map((sub) => h('li', {}, h('a', { href: '#' + sub.id, 'data-id': sub.id }, sub.label)))));
      ol.append(li);
    });
    toc.append(ol);
    const all = h('details', { class: 'toc__all' }, h('summary', { text: 'Все главы' }));
    BOOK.chapters.forEach((c) => all.append(h('a', { href: chapterUrl(c), 'aria-current': c.n === chapterNo ? 'page' : null }, h('span', { text: c.n }), c.short || c.title)));
    toc.append(all);
    toc.addEventListener('click', (e) => { if (e.target.closest('a')) document.body.classList.remove('toc-open'); });
  }

  function buildFooterNav(main) {
    if (!chapter) return;
    const prev = BOOK.chapters[chapterIdx - 1];
    const next = BOOK.chapters[chapterIdx + 1];
    const nav = h('footer', { class: 'chapter-nav' },
      prev ? h('a', { class: 'prev', href: chapterUrl(prev) }, h('small', { text: 'Предыдущая глава' }), h('b', { text: prev.n + '. ' + prev.title })) : h('a', { class: 'prev', href: BASE + 'index.html' }, h('small', { text: 'К началу' }), h('b', { text: 'Оглавление' })),
      next ? h('a', { class: 'next', href: chapterUrl(next) }, h('small', { text: 'Следующая глава' }), h('b', { text: next.n + '. ' + next.title })) : h('a', { class: 'next', href: BASE + 'index.html' }, h('small', { text: 'Книга закончилась' }), h('b', { text: 'Оглавление' }))
    );
    main.append(nav);
  }

  function scrollSpy(toc, heads) {
    const anchors = heads.flatMap((x) => [x.id, ...x.subs.map((y) => y.id)]).map((id) => document.getElementById(id)).filter(Boolean);
    let ticking = false;
    let best = Number(store.get('book:read:' + chapterNo) || 0);
    function update() {
      ticking = false;
      const doc = document.documentElement;
      const max = doc.scrollHeight - innerHeight;
      const pct = max > 0 ? Math.min(100, Math.round((scrollY / max) * 100)) : 100;
      const bar = $('.topbar');
      if (bar) bar.style.setProperty('--read', pct + '%');
      if (chapterNo && pct > best) { best = pct; store.set('book:read:' + chapterNo, String(pct)); }
      let current = null;
      for (const a of anchors) { if (a.getBoundingClientRect().top < 130) current = a; else break; }
      $$('a.is-current', toc).forEach((a) => a.classList.remove('is-current'));
      $$('li.is-open', toc).forEach((li) => li.classList.remove('is-open'));
      if (current) {
        const link = toc.querySelector('a[data-id="' + CSS.escape(current.id) + '"]');
        if (link) {
          link.classList.add('is-current');
          const top = link.closest('ol').parentElement.closest('li') || link.parentElement;
          top.classList.add('is-open');
          const parentLink = top.querySelector(':scope > a');
          if (parentLink) parentLink.classList.add('is-current');
        }
      }
    }
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    update();
  }

  /* ---------- код ---------- */
  const LANG_ALIAS = { py: 'python', ts: 'typescript', js: 'javascript', sh: 'bash', shell: 'bash', console: 'bash', zsh: 'bash', jsonc: 'json', json5: 'json', yml: 'yaml', md: 'markdown', html: 'xml', svg: 'xml', proto: 'protobuf', docker: 'dockerfile', toml: 'ini' };
  const LANG_PLAIN = new Set(['text', 'plain', 'txt', 'sse', 'prompt', 'log', 'output', '']);
  const LANG_LABEL = { python: 'Python', typescript: 'TypeScript', javascript: 'JavaScript', json: 'JSON', bash: 'Shell', yaml: 'YAML', http: 'HTTP', xml: 'XML', markdown: 'Markdown', sql: 'SQL', ini: 'TOML', prompt: 'Промпт', sse: 'SSE', text: '', plain: '', log: 'Лог', output: 'Вывод', diff: 'Diff', go: 'Go', rust: 'Rust', protobuf: 'Protobuf', dockerfile: 'Dockerfile', graphql: 'GraphQL' };

  function dedent(text) {
    const lines = text.replace(/\t/g, '  ').split('\n');
    while (lines.length && !lines[0].trim()) lines.shift();
    while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
    const indent = Math.min(...lines.filter((l) => l.trim()).map((l) => l.match(/^ */)[0].length));
    return lines.map((l) => l.slice(Number.isFinite(indent) ? indent : 0)).join('\n');
  }
  function parseLines(spec) {
    const out = [];
    String(spec || '').split(',').forEach((part) => {
      const m = part.trim().match(/^(\d+)(?:-(\d+))?$/);
      if (!m) return;
      for (let i = Number(m[1]); i <= Number(m[2] || m[1]); i++) out.push(i);
    });
    return out;
  }
  function makeCodeBlock(text, opts) {
    const rawLang = (opts.lang || '').toLowerCase();
    const lang = LANG_ALIAS[rawLang] || rawLang;
    const code = h('code', { class: lang ? 'language-' + lang : null });
    code.textContent = text;
    if (!LANG_PLAIN.has(rawLang) && window.hljs) {
      if (hljs.getLanguage(lang)) { try { hljs.highlightElement(code); } catch (e) { /* оставляем без подсветки */ } }
      else qaIssues.push({ kind: 'code-lang', msg: 'Неизвестный язык подсветки: ' + rawLang });
    }
    parseLines(opts.hl).forEach((n) => code.prepend(h('span', { class: 'hl-line', style: 'top:' + (n - 1) * 1.6 + 'em' })));
    const label = LANG_LABEL[rawLang] != null ? LANG_LABEL[rawLang] : (LANG_LABEL[lang] != null ? LANG_LABEL[lang] : rawLang);
    const copy = h('button', { class: 'code__copy', type: 'button', text: 'Копировать' });
    copy.addEventListener('click', () => {
      const done = () => { copy.textContent = 'Скопировано'; setTimeout(() => (copy.textContent = 'Копировать'), 1400); };
      if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, () => {}); else done();
    });
    return h('div', { class: 'code' + (opts.wide ? ' wide' : '') },
      h('div', { class: 'code__head' }, h('span', { class: 'code__title', text: opts.title || '' }), h('span', { class: 'code__lang', text: label }), copy),
      h('pre', {}, code));
  }
  function initCode(scope) {
    $$('script.code', scope).forEach((node) => {
      const block = makeCodeBlock(dedent(node.textContent), { lang: node.dataset.lang, title: node.dataset.title, hl: node.dataset.hl, wide: node.classList.contains('wide') });
      node.replaceWith(block);
    });
    $$('pre > code', scope).forEach((code) => {
      const pre = code.parentElement;
      if (pre.closest('.code')) return;
      const m = (code.className || '').match(/language-([\w-]+)/);
      const block = makeCodeBlock(dedent(code.textContent), { lang: m ? m[1] : (pre.dataset.lang || ''), title: pre.dataset.title, hl: pre.dataset.hl, wide: pre.classList.contains('wide') });
      pre.replaceWith(block);
    });
  }

  /* ---------- вкладки ---------- */
  function initTabs(scope) {
    $$('.tabs', scope).forEach((tabs, t) => {
      const panels = $$(':scope > section', tabs);
      if (!panels.length) return;
      if (QA) return; // в режиме проверки показываем все панели подряд
      const list = h('div', { class: 'tabs__list', role: 'tablist' });
      panels.forEach((panel, i) => {
        const btn = h('button', { type: 'button', role: 'tab', 'aria-selected': i === 0 ? 'true' : 'false', text: panel.dataset.tab || 'Вариант ' + (i + 1) });
        panel.hidden = i !== 0;
        btn.addEventListener('click', () => {
          $$('button', list).forEach((b) => b.setAttribute('aria-selected', String(b === btn)));
          panels.forEach((p) => (p.hidden = p !== panel));
        });
        list.append(btn);
      });
      tabs.prepend(list);
    });
  }

  /* ---------- таблицы и рисунки ---------- */
  function initTables(scope) {
    $$('table', scope).forEach((table) => {
      if (table.closest('.table-wrap, .chart')) return;
      const wrap = h('div', { class: 'table-wrap' + (table.classList.contains('wide') ? ' wide' : '') });
      table.replaceWith(wrap);
      wrap.append(table);
    });
  }
  function initFigures(scope) {
    $$('figure.fig', scope).forEach((fig, i) => {
      const body = Array.from(fig.children).filter((c) => c.tagName !== 'FIGCAPTION');
      if (!$(':scope > .fig__panel', fig)) {
        const panel = h('div', { class: 'fig__panel' });
        if (body[0]) body[0].before(panel); else fig.prepend(panel);
        body.forEach((c) => panel.append(c));
      }
      const cap = $(':scope > figcaption', fig);
      if (cap) cap.prepend(h('span', { class: 'fig-num', text: 'Рис. ' + (chapter ? Number(chapter.n) + '.' : '') + (i + 1) + '.' }));
      else qaIssues.push({ kind: 'figure', msg: 'Рисунок ' + (i + 1) + ' без подписи (figcaption)' });
      if (!fig.id) fig.id = 'fig-' + (i + 1);
      if ($('.pipeline, .layers, .versus', fig)) fig.classList.add('fig--plain');
    });
    $$('svg.diagram .arrow', scope).forEach((el) => {
      if (el.hasAttribute('marker-end') || el.classList.contains('arrow--none')) return;
      const id = el.classList.contains('arrow--pen') ? 'arr-pen' : el.classList.contains('arrow--red') ? 'arr-red' : 'arr';
      el.setAttribute('marker-end', 'url(#' + id + ')');
      if (el.classList.contains('arrow--both')) el.setAttribute('marker-start', 'url(#' + id + '-start)');
    });
    if ($('svg.diagram', scope) && !$('#book-defs')) {
      const svg = s('svg', { id: 'book-defs', width: 0, height: 0, 'aria-hidden': 'true', style: 'position:absolute' });
      const defs = s('defs');
      [['arr', 'mk'], ['arr-pen', 'mk-pen'], ['arr-red', 'mk-red']].forEach(([id, cls]) => {
        const end = s('marker', { id, viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto' });
        end.append(s('path', { d: 'M0,0 L10,5 L0,10 z', class: cls }));
        const start = s('marker', { id: id + '-start', viewBox: '0 0 10 10', refX: 1, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto' });
        start.append(s('path', { d: 'M10,0 L0,5 L10,10 z', class: cls }));
        defs.append(end, start);
      });
      svg.append(defs);
      document.body.prepend(svg);
    }
  }

  /* ---------- mermaid ---------- */
  async function initMermaid(scope) {
    const nodes = $$('script[type="text/x-mermaid"], pre.mermaid', scope);
    if (!nodes.length) return;
    if (!window.mermaid) { qaIssues.push({ kind: 'mermaid', msg: 'mermaid.min.js не загружен' }); return; }
    try {
      await Promise.all(['400', '500', '600'].map((w) => document.fonts.load(w + ' 14px Geologica', 'Агент Agent 123')));
    } catch (e) { /* шрифт не обязателен */ }
    const v = cssVar;
    const FLOW_CLASSES = [
      'classDef accent fill:' + v('--marker-soft') + ',stroke:' + v('--marker-ink') + ',color:' + v('--ink'),
      'classDef warn fill:' + v('--red-soft') + ',stroke:' + v('--red') + ',color:' + v('--ink'),
      'classDef ok fill:' + v('--green-soft') + ',stroke:' + v('--green') + ',color:' + v('--ink'),
      'classDef violet fill:' + v('--violet-soft') + ',stroke:' + v('--violet') + ',color:' + v('--ink'),
      'classDef mute fill:' + v('--paper') + ',stroke:' + v('--ink-3') + ',color:' + v('--ink-2') + ',stroke-dasharray:4 3',
      'classDef plain fill:' + v('--sheet') + ',stroke:' + v('--pen') + ',color:' + v('--ink'),
    ].join('\n');
    mermaid.initialize({
      startOnLoad: false,
      suppressErrorRendering: true,
      theme: 'base',
      fontFamily: 'Geologica, system-ui, sans-serif',
      themeVariables: {
        fontFamily: 'Geologica, system-ui, sans-serif', fontSize: '14px',
        background: v('--sheet'), primaryColor: v('--pen-soft'), primaryTextColor: v('--ink'), primaryBorderColor: v('--pen'),
        secondaryColor: v('--marker-soft'), secondaryTextColor: v('--ink'), secondaryBorderColor: v('--marker-ink'),
        tertiaryColor: v('--paper'), tertiaryTextColor: v('--ink'), tertiaryBorderColor: v('--rule'),
        lineColor: v('--ink-2'), textColor: v('--ink'), mainBkg: v('--pen-soft'), nodeBorder: v('--pen'),
        clusterBkg: v('--sheet'), clusterBorder: v('--ink-3'), titleColor: v('--ink'), edgeLabelBackground: v('--sheet'),
        actorBkg: v('--pen-soft'), actorBorder: v('--pen'), actorTextColor: v('--ink'), actorLineColor: v('--ink-3'),
        signalColor: v('--ink'), signalTextColor: v('--ink'),
        labelBoxBkgColor: v('--marker-soft'), labelBoxBorderColor: v('--marker-ink'), labelTextColor: v('--ink'), loopTextColor: v('--ink'),
        noteBkgColor: v('--marker-soft'), noteBorderColor: v('--marker-ink'), noteTextColor: v('--ink'),
        activationBkgColor: v('--pen-mid'), activationBorderColor: v('--pen'), sequenceNumberColor: v('--sheet'),
        labelColor: v('--ink'), altBackground: v('--paper'),
        transitionColor: v('--ink-2'), stateBkg: v('--pen-soft'), stateLabelColor: v('--ink'), compositeBackground: v('--sheet'), compositeTitleBackground: v('--paper'),
        cScale0: v('--pen-soft'), cScale1: v('--marker-soft'), cScale2: v('--green-soft'), cScale3: v('--violet-soft'), cScale4: v('--red-soft'),
        cScaleLabel0: v('--ink'), cScaleLabel1: v('--ink'), cScaleLabel2: v('--ink'), cScaleLabel3: v('--ink'), cScaleLabel4: v('--ink'),
      },
      flowchart: { htmlLabels: true, useMaxWidth: true, padding: 14, nodeSpacing: 46, rankSpacing: 52, curve: 'basis' },
      sequence: { useMaxWidth: true, mirrorActors: false, actorMargin: 64, messageMargin: 38, boxMargin: 8, noteMargin: 12, wrap: true, width: 172, height: 52, actorFontSize: 14, actorFontWeight: 500, messageFontSize: 13, noteFontSize: 13 },
      state: { useMaxWidth: true },
    });
    let n = 0;
    for (const node of nodes) {
      n += 1;
      let src = dedent(node.textContent);
      if (/^\s*(flowchart|graph)\b/.test(src)) src += '\n' + FLOW_CLASSES;
      const holder = h('div', { class: 'mermaid-out' });
      try {
        const out = await mermaid.render('mmd-' + n, src);
        holder.innerHTML = out.svg;
        const svg = $('svg', holder);
        if (svg) { svg.removeAttribute('height'); svg.setAttribute('role', 'img'); }
      } catch (err) {
        const msg = String((err && err.message) || err).slice(0, 600);
        holder.className = 'mermaid-error';
        holder.textContent = 'Схема не построилась: ' + msg + '\n\n' + src;
        const fig = node.closest('figure');
        qaIssues.push({ kind: 'mermaid', msg: 'Ошибка mermaid в ' + (fig && fig.id ? '#' + fig.id : 'схеме ' + n) + ': ' + msg });
        ['mmd-' + n, 'dmmd-' + n].forEach((id) => { const stray = document.getElementById(id); if (stray && !holder.contains(stray)) stray.remove(); });
      }
      node.replaceWith(holder);
    }
  }

  /* ---------- графики ---------- */
  const SERIES_VARS = ['--series-1', '--series-2', '--series-3', '--series-4', '--series-5', '--series-6', '--series-7', '--series-8'];
  const SERIES_FALLBACK = { '--series-5': ['#e87ba4', '#d55181'], '--series-6': ['#008300', '#008300'], '--series-7': ['#4a3aa7', '#9085e9'], '--series-8': ['#e34948', '#e66767'] };
  function seriesColor(i, tone) {
    if (tone === 'muted') return cssVar('--chart-muted');
    const name = SERIES_VARS[i % SERIES_VARS.length];
    return cssVar(name) || (SERIES_FALLBACK[name] || ['#888', '#888'])[isDark() ? 1 : 0];
  }
  function fmtNum(v, cfg) {
    if (v == null || Number.isNaN(v)) return '—';
    const d = cfg.decimals != null ? cfg.decimals : (Math.abs(v) < 10 && v % 1 !== 0 ? 1 : 0);
    const text = Number(v).toLocaleString('ru-RU', { minimumFractionDigits: d, maximumFractionDigits: Math.max(d, 0) });
    const unit = cfg.unit || '';
    const tight = unit === '%' || unit === '×' || unit === 'x';
    return (cfg.prefix || '') + text + (unit ? (tight ? '' : ' ') + unit : '');
  }
  function luminance(color) {
    const probe = h('span', { style: 'color:' + color + ';display:none' });
    document.body.append(probe);
    const m = getComputedStyle(probe).color.match(/[\d.]+/g) || [0, 0, 0];
    probe.remove();
    const [r, g, b] = m.slice(0, 3).map((x) => { const c = Number(x) / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
  let tipEl = null;
  function tip(html, x, y) {
    if (!tipEl) { tipEl = h('div', { class: 'chart-tip', role: 'status' }); document.body.append(tipEl); }
    if (html == null) { tipEl.style.visibility = 'hidden'; return; }
    tipEl.replaceChildren(...(Array.isArray(html) ? html : [html]));
    tipEl.style.visibility = 'visible';
    const r = tipEl.getBoundingClientRect();
    tipEl.style.left = Math.max(8, Math.min(innerWidth - r.width - 8, x + 14)) + 'px';
    tipEl.style.top = Math.max(8, y - r.height - 12) + 'px';
  }
  function tipRow(color, name, value) {
    return h('div', {}, color ? h('i', { style: 'background:' + color }) : null, h('b', { text: value }), h('span', { text: name }));
  }
  function bindTip(node, rowsFn) {
    node.tabIndex = 0;
    node.addEventListener('pointermove', (e) => tip(rowsFn(), e.clientX, e.clientY));
    node.addEventListener('pointerleave', () => tip(null));
    node.addEventListener('focus', () => { const r = node.getBoundingClientRect(); tip(rowsFn(), r.left + r.width / 2, r.top); });
    node.addEventListener('blur', () => tip(null));
  }
  function normalizeChart(cfg) {
    if (cfg.rows && !cfg.series) {
      cfg.categories = cfg.rows.map((r) => r[0]);
      cfg.sublabels = cfg.rows.map((r) => r[2] || '');
      cfg.series = [{ name: cfg.seriesName || cfg.title || '', values: cfg.rows.map((r) => r[1]) }];
    }
    cfg.series = cfg.series || [];
    cfg.categories = cfg.categories || cfg.x || [];
    return cfg;
  }
  function chartLegend(cfg, lineKeys) {
    if (cfg.series.length < 2) return null;
    return h('ul', { class: 'chart__legend' }, cfg.series.map((sr, i) => h('li', {}, h('i', { class: lineKeys ? 'line-key' : null, style: 'background:' + seriesColor(i, sr.tone) }), sr.name)));
  }
  function chartTable(cfg) {
    const table = h('table', {},
      h('thead', {}, h('tr', {}, h('th', { text: cfg.categoryLabel || '' }), cfg.series.map((sr) => h('th', { class: 'num', text: sr.name || 'Значение' })))),
      h('tbody', {}, cfg.categories.map((cat, ci) => h('tr', {}, h('th', { text: String(cat) }), cfg.series.map((sr) => h('td', { class: 'num', text: fmtNum(sr.values[ci], cfg) }))))));
    return h('details', { class: 'chart__table' }, h('summary', { text: 'Данные таблицей' }), table);
  }
  function renderHbar(cfg, box) {
    const max = cfg.max || Math.max(...cfg.series.flatMap((sr) => sr.values.filter((x) => x != null)), 0) || 1;
    const emph = cfg.emphasis ? [].concat(cfg.emphasis) : null;
    const grid = h('div', { class: 'hbar' });
    cfg.categories.forEach((cat, ci) => {
      const label = h('div', { class: 'hbar__label', text: String(cat) });
      if (cfg.sublabels && cfg.sublabels[ci]) label.append(h('small', { text: cfg.sublabels[ci] }));
      const bars = h('div', { class: 'hbar__bars' });
      cfg.series.forEach((sr, si) => {
        const v = sr.values[ci];
        if (v == null) return;
        const color = emph && cfg.series.length === 1 ? (emph.includes(cat) ? seriesColor(0) : cssVar('--chart-muted')) : seriesColor(si, sr.tone);
        const row = h('div', { class: 'hbar__row' },
          h('div', { class: 'hbar__bar', style: 'width:calc((100% - 6.5rem) * ' + Math.max(0, v / max).toFixed(4) + ');background:' + color }),
          h('span', { class: 'hbar__val', text: fmtNum(v, cfg) }));
        bindTip(row, () => [tipRow(color, (cfg.series.length > 1 ? sr.name + ' · ' : '') + cat, fmtNum(v, cfg))]);
        bars.append(row);
      });
      grid.append(label, bars);
    });
    box.append(chartLegend(cfg) || '', grid);
  }
  function renderStack(cfg, box) {
    const wrap = h('div', { class: 'stack' });
    const totals = cfg.categories.map((_, ci) => cfg.series.reduce((a, sr) => a + (sr.values[ci] || 0), 0));
    const max = cfg.normalize ? null : (cfg.max || Math.max(...totals) || 1);
    cfg.categories.forEach((cat, ci) => {
      const total = totals[ci] || 1;
      const bar = h('div', { class: 'stack__bar', style: cfg.normalize ? null : 'width:' + ((total / max) * 100).toFixed(2) + '%' });
      cfg.series.forEach((sr, si) => {
        const v = sr.values[ci];
        if (!v) return;
        const color = seriesColor(si, sr.tone);
        const seg = h('div', { class: 'stack__seg', style: 'flex:' + v + ' 1 0;background:' + color + ';color:' + (luminance(color) > 0.42 ? '#161d2e' : '#fff'), text: cfg.normalize ? Math.round((v / total) * 100) + '%' : fmtNum(v, cfg) });
        bindTip(seg, () => [tipRow(color, sr.name + (cfg.categories.length > 1 ? ' · ' + cat : ''), fmtNum(v, cfg) + (cfg.normalize ? '' : ' (' + Math.round((v / total) * 100) + '%)'))]);
        bar.append(seg);
      });
      wrap.append(h('div', {}, h('div', { class: 'stack__label' }, String(cat), h('span', { text: 'всего ' + fmtNum(totals[ci], cfg) })), bar));
    });
    box.append(chartLegend(cfg) || '', wrap);
    requestAnimationFrame(() => $$('.stack__seg', wrap).forEach((seg) => { if (seg.scrollWidth > seg.clientWidth + 1) seg.textContent = ''; }));
  }
  function niceTicks(min, max, count) {
    const span = (max - min) || 1;
    const step0 = span / count;
    const mag = Math.pow(10, Math.floor(Math.log10(step0)));
    const norm = step0 / mag;
    const step = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag;
    const lo = Math.floor(min / step) * step;
    const hi = Math.ceil(max / step) * step;
    const ticks = [];
    for (let t = lo; t <= hi + step / 2; t += step) ticks.push(Number(t.toFixed(10)));
    return ticks;
  }
  function renderLine(cfg, box) {
    const W = 720, H = cfg.height || 320, m = { t: 14, r: cfg.series.length > 1 ? 132 : 64, b: 34, l: 52 };
    const xs = cfg.categories;
    const all = cfg.series.flatMap((sr) => sr.values.filter((x) => x != null));
    const ticks = niceTicks(cfg.yMin != null ? cfg.yMin : Math.min(0, ...all), cfg.yMax != null ? cfg.yMax : Math.max(...all), 4);
    const y0 = ticks[0], y1 = ticks[ticks.length - 1];
    const px = (i) => m.l + (xs.length > 1 ? (i / (xs.length - 1)) * (W - m.l - m.r) : 0);
    const py = (val) => H - m.b - ((val - y0) / (y1 - y0 || 1)) * (H - m.t - m.b);
    const svg = s('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': cfg.title || 'График' });
    ticks.forEach((t) => {
      svg.append(s('line', { class: t === y0 ? 'axis' : 'grid', x1: m.l, x2: W - m.r, y1: py(t), y2: py(t) }));
      const label = s('text', { x: m.l - 8, y: py(t) + 4, 'text-anchor': 'end' });
      const shortUnit = cfg.unit && cfg.unit.length <= 2 && t === ticks[ticks.length - 1];
      label.textContent = fmtNum(t, Object.assign({}, cfg, { unit: shortUnit ? cfg.unit : '' }));
      svg.append(label);
    });
    const every = Math.ceil(xs.length / 8);
    xs.forEach((x, i) => {
      if (i % every && i !== xs.length - 1) return;
      const label = s('text', { x: px(i), y: H - m.b + 18, 'text-anchor': i === 0 ? 'start' : i === xs.length - 1 ? 'end' : 'middle' });
      label.textContent = String(x);
      svg.append(label);
    });
    const ends = [];
    cfg.series.forEach((sr, si) => {
      const color = seriesColor(si, sr.tone);
      let d = '', pen = false, last = null;
      sr.values.forEach((val, i) => {
        if (val == null) { pen = false; return; }
        d += (pen ? 'L' : 'M') + px(i).toFixed(1) + ',' + py(val).toFixed(1);
        pen = true; last = { i, val };
      });
      svg.append(s('path', { class: 'series', d, stroke: color }));
      if (last) {
        if (last.i < xs.length - 1) svg.append(s('line', { x1: px(last.i) + 6, x2: W - m.r + 6, y1: py(last.val), y2: py(last.val), stroke: color, 'stroke-width': 1, opacity: 0.45 }));
        svg.append(s('circle', { class: 'dot', cx: px(last.i), cy: py(last.val), r: 4, fill: color }));
        ends.push({ y: py(last.val), x: W - m.r, text: (cfg.series.length > 1 ? sr.name + ' ' : '') + fmtNum(last.val, cfg) });
      }
    });
    ends.sort((a, b) => a.y - b.y);
    for (let i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < 15) ends[i].y = ends[i - 1].y + 15;
    ends.forEach((e) => { const label = s('text', { class: 'end-label', x: e.x + 10, y: e.y + 4 }); label.textContent = e.text; svg.append(label); });
    const cross = s('line', { class: 'cross', y1: m.t, y2: H - m.b });
    const hit = s('rect', { x: m.l, y: m.t, width: W - m.l - m.r, height: H - m.t - m.b, fill: 'transparent' });
    svg.append(cross, hit);
    const show = (i, cx, cy) => {
      cross.setAttribute('x1', px(i)); cross.setAttribute('x2', px(i)); cross.style.visibility = 'visible';
      tip([h('div', {}, h('span', { text: String(xs[i]) })), ...cfg.series.map((sr, si) => tipRow(seriesColor(si, sr.tone), sr.name, fmtNum(sr.values[i], cfg)))], cx, cy);
    };
    hit.addEventListener('pointermove', (e) => {
      const r = svg.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * W;
      const i = Math.max(0, Math.min(xs.length - 1, Math.round(((x - m.l) / (W - m.l - m.r)) * (xs.length - 1))));
      show(i, e.clientX, e.clientY);
    });
    hit.addEventListener('pointerleave', () => { cross.style.visibility = 'hidden'; tip(null); });
    box.append(chartLegend(cfg, true) || '', svg);
  }
  function initCharts(scope) {
    $$('script.chart[type="application/json"]', scope).forEach((node, i) => {
      const box = h('div', { class: 'chart' });
      const fig = node.closest('figure');
      if (fig) fig.classList.add('fig--chart');
      let cfg;
      try { cfg = normalizeChart(JSON.parse(node.textContent)); }
      catch (err) { qaIssues.push({ kind: 'chart', msg: 'График ' + (i + 1) + ': JSON не разбирается — ' + err.message }); box.textContent = 'График не построился: ' + err.message; node.replaceWith(box); return; }
      if (cfg.title) box.append(h('div', { class: 'chart__title', text: cfg.title }));
      if (cfg.subtitle) box.append(h('div', { class: 'chart__sub', text: cfg.subtitle }));
      const bad = cfg.series.find((sr) => !Array.isArray(sr.values) || sr.values.length !== cfg.categories.length);
      if (!cfg.series.length || !cfg.categories.length || bad) qaIssues.push({ kind: 'chart', msg: 'График ' + (i + 1) + ': длины categories и values не совпадают или нет данных' });
      if (cfg.series.length > 8) qaIssues.push({ kind: 'chart', msg: 'График ' + (i + 1) + ': больше 8 рядов' });
      try {
        if (cfg.type === 'line') renderLine(cfg, box);
        else if (cfg.type === 'stack') renderStack(cfg, box);
        else renderHbar(cfg, box);
      } catch (err) { qaIssues.push({ kind: 'chart', msg: 'График ' + (i + 1) + ': ' + err.message }); }
      if (cfg.note) box.append(h('div', { class: 'chart__note', text: cfg.note }));
      box.append(chartTable(cfg));
      node.replaceWith(box);
    });
  }

  /* ---------- чеклист навыков ---------- */
  function initChecklist(scope) {
    $$('ul.checklist', scope).forEach((list, li) => {
      const items = $$(':scope > li', list);
      const status = h('p', { class: 'checklist-status' });
      const key = (i) => 'book:check:' + chapterNo + ':' + li + ':' + i;
      const refresh = () => {
        const done = items.filter((_, i) => store.get(key(i)) === '1').length;
        status.textContent = 'Отмечено ' + done + ' из ' + items.length;
        if (chapterNo && li === 0) { store.set('book:done:' + chapterNo, String(done)); store.set('book:total:' + chapterNo, String(items.length)); }
      };
      items.forEach((item, i) => {
        const id = 'chk-' + li + '-' + i;
        const input = h('input', { type: 'checkbox', id });
        input.checked = store.get(key(i)) === '1';
        input.addEventListener('change', () => { store.set(key(i), input.checked ? '1' : '0'); refresh(); });
        const label = h('label', { for: id });
        label.append(...Array.from(item.childNodes));
        item.append(input, label);
      });
      list.after(status);
      refresh();
    });
  }

  /* ---------- оглавление книги ---------- */
  function initIndex() {
    const host = $('#book-index');
    if (!host) return;
    BOOK.parts.forEach((part) => {
      const sec = h('section', { class: 'part' }, h('h2', { text: part.title }), h('p', { class: 'part__note', text: part.note }));
      const list = h('ol', { class: 'chapters' });
      BOOK.chapters.filter((c) => c.part === part.id).forEach((c) => {
        const done = Number(store.get('book:done:' + c.n) || 0), total = Number(store.get('book:total:' + c.n) || 0), read = Number(store.get('book:read:' + c.n) || 0);
        const state = total && done === total ? 'done' : (read > 5 || done) ? 'going' : 'new';
        const meta = total ? 'навыки ' + done + '/' + total : read > 5 ? 'прочитано ' + read + '%' : 'не начато';
        list.append(h('li', { class: 'chapter-row is-' + state },
          h('a', { href: chapterUrl(c) },
            h('span', { class: 'chapter-row__box', 'aria-hidden': 'true' }),
            h('span', { class: 'chapter-row__n', text: c.n }),
            h('span', { class: 'chapter-row__body' }, h('b', { text: c.title }), h('span', { text: c.about })),
            h('span', { class: 'chapter-row__meta', text: meta }))));
      });
      sec.append(list);
      host.append(sec);
    });
    $$('[data-goto]').forEach((node) => {
      const c = BOOK.chapters.find((x) => x.n === node.dataset.goto);
      if (!c) return;
      node.style.cursor = 'pointer';
      node.addEventListener('click', () => { location.href = chapterUrl(c); });
    });
    const btn = $('#theme-toggle');
    if (btn) { btn.textContent = isDark() ? 'Светлая тема' : 'Тёмная тема'; btn.addEventListener('click', toggleTheme); }
  }

  /* ---------- режим проверки ---------- */
  function qaSvgChecks(scope) {
    $$('svg.diagram', scope).forEach((svg) => {
      const fig = svg.closest('figure');
      const where = fig && fig.id ? '#' + fig.id : 'svg';
      const frame = svg.getBoundingClientRect();
      if (!frame.width) return;
      if (!svg.getAttribute('viewBox')) qaIssues.push({ kind: 'svg', msg: where + ': нет viewBox' });
      const rects = $$('rect', svg).map((r) => r.getBoundingClientRect()).filter((b) => b.width > 0);
      const texts = $$('text', svg).map((t) => ({ label: t.textContent.trim().slice(0, 48), b: t.getBoundingClientRect() })).filter((t) => t.b.width > 0);
      texts.forEach((t) => {
        if (t.b.left < frame.left - 1.5 || t.b.right > frame.right + 1.5 || t.b.top < frame.top - 1.5 || t.b.bottom > frame.bottom + 1.5) qaIssues.push({ kind: 'svg', msg: where + ': текст выходит за границы рисунка — «' + t.label + '»' });
        const cx = (t.b.left + t.b.right) / 2, cy = (t.b.top + t.b.bottom) / 2;
        let best = null;
        rects.forEach((r) => { if (cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom && (!best || r.width * r.height < best.width * best.height)) best = r; });
        if (best && (t.b.left < best.left - 1 || t.b.right > best.right + 1)) qaIssues.push({ kind: 'svg', msg: where + ': текст шире своего блока — «' + t.label + '»' });
      });
      for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++) {
        const a = texts[i].b, b = texts[j].b;
        const w = Math.min(a.right, b.right) - Math.max(a.left, b.left), hh = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (w > 2 && hh > 2 && (w * hh) / Math.min(a.width * a.height, b.width * b.height) > 0.18) qaIssues.push({ kind: 'svg', msg: where + ': надписи накладываются — «' + texts[i].label + '» и «' + texts[j].label + '»' });
      }
    });
  }
  function qaReport(main) {
    $$('details:not(.chart__table)', main).forEach((d) => (d.open = true));
    qaSvgChecks(main);
    $$('.mermaid-out > svg', main).forEach((svg) => {
      const vb = svg.viewBox && svg.viewBox.baseVal, w = svg.getBoundingClientRect().width;
      const fig = svg.closest('figure');
      if (vb && vb.width && w && w / vb.width < 0.74) qaIssues.push({ kind: 'mermaid-scale', msg: (fig && fig.id ? '#' + fig.id : 'схема') + ': схема ужата до ' + Math.round((w / vb.width) * 100) + '% — текст мелкий. Добавь фигуре класс wide, разверни направление (TD вместо LR) или разбей на две схемы' });
    });
    const ids = {};
    $$('[id]', main).forEach((node) => { ids[node.id] = (ids[node.id] || 0) + 1; });
    Object.entries(ids).filter(([, n]) => n > 1).forEach(([id]) => qaIssues.push({ kind: 'id', msg: 'Повторяющийся id: ' + id }));
    $$('a[href^="#"]', main).forEach((a) => { const id = decodeURIComponent(a.getAttribute('href').slice(1)); if (!id || !document.getElementById(id)) qaIssues.push({ kind: 'link', msg: 'Ссылка в никуда: ' + a.getAttribute('href') + ' («' + a.textContent.trim().slice(0, 30) + '»)' }); });
    $$('img', main).forEach((img) => { if (!img.complete || !img.naturalWidth) qaIssues.push({ kind: 'img', msg: 'Картинка не загрузилась: ' + img.getAttribute('src') }); });
    const vw = document.documentElement.clientWidth;
    const wideOnes = [];
    $$('main.chapter *').forEach((node) => {
      if (node.closest('.fig__panel, .table-wrap, pre, .chart-tip, svg')) return;
      const r = node.getBoundingClientRect();
      if (r.width && r.right > vw + 2 && !wideOnes.some((w) => w.contains(node))) wideOnes.push(node);
    });
    wideOnes.slice(0, 8).forEach((node) => qaIssues.push({ kind: 'overflow', msg: 'Вылезает за правый край: <' + node.tagName.toLowerCase() + (node.id ? '#' + node.id : '') + (node.className && typeof node.className === 'string' ? '.' + node.className.split(' ').join('.') : '') + '>' }));
    const figs = $$('figure.fig', main).map((fig, i) => ({
      i: i + 1, id: fig.id, height: Math.ceil(fig.getBoundingClientRect().height),
      kind: $('.mermaid-out, .mermaid-error', fig) ? 'mermaid' : $('.chart', fig) ? 'chart' : $('svg.diagram', fig) ? 'svg' : $('.pipeline, .layers, .versus', fig) ? 'html' : 'other',
      caption: (($('figcaption', fig) || {}).textContent || '').slice(0, 90),
    }));
    const sections = $$(':scope > section', main).map((sec, i) => ({ i: i + 1, id: sec.id, title: (($('h2', sec) || {}).textContent || '').trim(), height: Math.ceil(sec.getBoundingClientRect().height), words: sec.textContent.trim().split(/\s+/).length }));
    const prose = main.cloneNode(true);
    $$('pre, script, svg, .chart, .toc, table', prose).forEach((node) => node.remove());
    const kinds = {};
    figs.forEach((f) => { kinds[f.kind] = (kinds[f.kind] || 0) + 1; });
    const notes = {};
    $$('.note', main).forEach((n) => { const k = ['key', 'warn', 'practice', 'debate', 'field'].find((c) => n.classList.contains(c)) || 'other'; notes[k] = (notes[k] || 0) + 1; });
    const report = {
      title: document.title,
      issues: qaIssues,
      stats: {
        words_prose: prose.textContent.trim().split(/\s+/).length,
        sections: sections.length, figures: figs.length, figure_kinds: kinds,
        code_blocks: $$('.code', main).length, tables: $$('table', main).length - $$('.chart table', main).length,
        notes, margin_notes: $$('aside.margin', main).length, quiz: $$('.quiz details', main).length,
        checklist: $$('ul.checklist > li', main).length, sources: $$('ol.sources > li', main).length, cites: $$('a.cite', main).length,
        external_links: $$('a[href^="http"]', main).length, page_height: document.documentElement.scrollHeight, viewport: vw,
      },
      figures: figs, sections,
    };
    const out = h('script', { type: 'application/json', id: 'qa-report' });
    out.textContent = JSON.stringify(report);
    document.body.append(out);
    return report;
  }
  function qaOnly(main) {
    const only = params.get('only');
    if (!only || only === 'top') return;
    const m = only.match(/^(fig|sec):(\d+)(?:-(\d+))?$/);
    if (!m) return;
    const from = Number(m[2]), to = Number(m[3] || m[2]);
    const pool = m[1] === 'fig' ? $$('figure.fig', main) : $$(':scope > section', main);
    const keep = pool.slice(from - 1, to);
    root.classList.add('qa-only', 'qa-only-' + m[1]);
    main.replaceChildren(...keep);
  }

  /* ---------- запуск ---------- */
  async function start() {
    const main = $('main.chapter');
    if (!main) { initIndex(); root.dataset.ready = '1'; return; }
    const { toc } = buildChrome(main);
    const heads = numberSections(main);
    buildToc(toc, heads);
    initCode(main);
    initTables(main);
    initFigures(main);
    initCharts(main);
    initChecklist(main);
    await initMermaid(main);
    initTabs(main);
    buildFooterNav(main);
    const meta = $('.chapter-meta', main);
    if (meta && !meta.textContent.trim()) {
      const words = main.textContent.trim().split(/\s+/).length;
      meta.textContent = 'Читать около ' + Math.max(5, Math.round(words / 170 / 5) * 5) + ' минут. Актуально на ' + (BOOK.updated || '') + ' года.';
    }
    scrollSpy(toc, heads);
    if (location.hash) { const target = document.getElementById(decodeURIComponent(location.hash.slice(1))); if (target) target.scrollIntoView(); }
    if (QA) {
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      qaReport(main);
      qaOnly(main);
    }
    root.dataset.ready = '1';
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
