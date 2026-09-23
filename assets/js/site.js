/* Saint Ten proposals — shared behaviour. No dependencies, no cookies, no tracking.
   Hooks (data attributes): booking, mailto, copy, autoplay videos, film dialog, gallery lightbox, reels,
   room filters, reveal/iris on scroll, Belgrade clock, nav toggle. Content stays visible without JS. */
(() => {
  const d = document, root = d.documentElement;
  root.classList.add('js');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const saveData = navigator.connection && navigator.connection.saveData;
  const narrow = () => matchMedia('(max-width: 760px)').matches;
  const $$ = (s, el = d) => [...el.querySelectorAll(s)];
  const pad = n => String(n).padStart(2, '0');
  const iso = dt => `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
  const us = s => { const [y, m, dd] = s.split('-'); return `${m}/${dd}/${y}`; };

  /* Booking → the hotel's own engine, dates as MM/DD/YYYY. Defaults: tomorrow, 2 nights. */
  $$('[data-booking]').forEach(f => {
    const a = f.querySelector('[data-in]'), b = f.querySelector('[data-out]'), msg = f.querySelector('.bk__msg');
    const t = new Date(); t.setDate(t.getDate() + 1);
    const o = new Date(t); o.setDate(o.getDate() + 2);
    if (a && !a.value) { a.value = iso(t); a.min = iso(new Date()); }
    if (b && !b.value) { b.value = iso(o); b.min = iso(t); }
    a && a.addEventListener('change', () => {
      const n = new Date(a.value + 'T12:00'); n.setDate(n.getDate() + 1);
      b.min = iso(n); if (!b.value || b.value <= a.value) b.value = iso(n);
    });
    f.addEventListener('submit', ev => {
      $$('input[data-gen]', f).forEach(x => x.remove());
      if (a && b && a.value && b.value) {
        if (b.value <= a.value) { ev.preventDefault(); if (msg) { msg.textContent = f.dataset.err; msg.hidden = false; } b.focus(); return; }
        [['datein', us(a.value)], ['dateout', us(b.value)]].forEach(([n, v]) => {
          const i = d.createElement('input'); i.type = 'hidden'; i.name = n; i.value = v; i.dataset.gen = ''; f.append(i);
        });
      }
      const ch = f.querySelector('[data-children]');
      if (ch && +ch.value > 0) { const i = d.createElement('input'); i.type = 'hidden'; i.name = 'children'; i.value = ch.value; i.dataset.gen = ''; f.append(i); }
      const code = f.querySelector('[name=identifier]');
      if (code && !code.value.trim()) code.disabled = true, setTimeout(() => code.disabled = false, 0);
      if (msg) msg.hidden = true;
    });
  });

  /* Forms that open the visitor's own e-mail app. Nothing is sent by the page. */
  $$('[data-mailto]').forEach(f => {
    const text = () => $$('[data-label]', f).filter(x => x.value && x.value.trim()).map(x => `${x.dataset.label}: ${x.value.trim()}`).join('\n');
    const copyBtn = f.querySelector('[data-copy]');
    f.addEventListener('submit', ev => {
      ev.preventDefault();
      location.href = `mailto:${f.dataset.to}?subject=${encodeURIComponent(f.dataset.subject)}&body=${encodeURIComponent(text())}`;
      if (copyBtn) copyBtn.hidden = false;
    });
    copyBtn && copyBtn.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(`${f.dataset.to}\n${f.dataset.subject}\n\n${text()}`); copyBtn.dataset.done = ''; } catch (e) { /* the address stays visible */ }
    });
  });

  /* Decorative loops: load when near the viewport, play only while visible; never with reduced motion or Save-Data. */
  const vids = $$('video[data-autoplay], [data-reel] video');
  const load = v => {
    if (v.dataset.loaded) return;
    const src = (narrow() && v.dataset.srcMobile) || v.dataset.src;
    if (narrow() && v.dataset.posterMobile) v.poster = v.dataset.posterMobile;
    v.src = src; v.dataset.loaded = '1';
  };
  if (narrow()) vids.forEach(v => { if (v.dataset.posterMobile) v.poster = v.dataset.posterMobile; });
  if (!reduce && !saveData && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(e => {
      const v = e.target;
      if (e.isIntersecting) { load(v); const p = v.play(); p && p.catch(() => {}); }
      else if (!v.paused) v.pause();
    }), { rootMargin: '200px 0px', threshold: 0.15 });
    vids.forEach(v => io.observe(v));
  }
  $$('[data-reel]').forEach(fig => fig.addEventListener('click', ev => {
    if (ev.target.closest('a')) return;
    const v = fig.querySelector('video'); load(v);
    v.paused ? v.play().catch(() => {}) : v.pause();
  }));

  /* Film dialog (the hotel's own film, with sound and controls). */
  $$('[data-film]').forEach(btn => {
    const dlg = btn.parentElement.querySelector('[data-film-dialog]') || d.querySelector('[data-film-dialog]');
    if (!dlg) return;
    const v = dlg.querySelector('video');
    btn.addEventListener('click', () => { if (!v.src) v.src = v.dataset.src; dlg.showModal(); v.play().catch(() => {}); });
    dlg.addEventListener('close', () => v.pause());
    dlg.querySelector('[data-close]').addEventListener('click', () => dlg.close());
    dlg.addEventListener('click', ev => { if (ev.target === dlg) dlg.close(); });
  });

  /* Gallery lightbox: links keep working without JS (they open the large image). */
  const items = $$('[data-gallery-item]');
  if (items.length) {
    const box = d.createElement('dialog'); box.className = 'lightbox';
    const ico = p => `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false"><path d="${p}" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"/></svg>`;
    box.innerHTML = `<button class="lightbox__x" type="button" aria-label="Close">${ico('M5 5l14 14M19 5L5 19')}</button><button class="lightbox__prev" type="button" aria-label="Previous">${ico('M15 4l-8 8 8 8')}</button><figure><img alt=""><figcaption></figcaption></figure><button class="lightbox__next" type="button" aria-label="Next">${ico('M9 4l8 8-8 8')}</button>`;
    d.body.append(box);
    let i = 0;
    const img = box.querySelector('img'), cap = box.querySelector('figcaption');
    const show = n => { const vis = items.filter(x => !x.closest('[hidden]')); i = (n + vis.length) % vis.length; const a = vis[i]; img.src = a.href; img.alt = a.dataset.caption || ''; cap.textContent = a.dataset.caption || ''; };
    items.forEach(a => a.addEventListener('click', ev => { ev.preventDefault(); const vis = items.filter(x => !x.closest('[hidden]')); show(vis.indexOf(a)); box.showModal(); }));
    box.querySelector('.lightbox__x').addEventListener('click', () => box.close());
    box.querySelector('.lightbox__prev').addEventListener('click', () => show(i - 1));
    box.querySelector('.lightbox__next').addEventListener('click', () => show(i + 1));
    box.addEventListener('keydown', ev => { if (ev.key === 'ArrowLeft') show(i - 1); if (ev.key === 'ArrowRight') show(i + 1); });
    box.addEventListener('click', ev => { if (ev.target === box) box.close(); });
  }
  /* Gallery tabs: [data-gallery-tab="rooms"] shows figures with data-group containing that word. */
  $$('[data-gallery-tab]').forEach(tab => tab.addEventListener('click', () => {
    const g = tab.dataset.galleryTab;
    $$('[data-gallery-tab]').forEach(t => t.setAttribute('aria-pressed', String(t === tab)));
    $$('[data-group]').forEach(fig => { fig.hidden = g !== 'all' && !fig.dataset.group.split(' ').includes(g); });
  }));

  /* Room finder: checkboxes [data-filter=tag]; cards [data-tags="a b"]. */
  const filters = $$('[data-filter]');
  if (filters.length) {
    const cards = $$('[data-tags]'), none = d.querySelector('[data-filter-none]');
    const apply = () => {
      const want = filters.filter(f => f.checked).map(f => f.dataset.filter);
      let n = 0;
      cards.forEach(c => { const tags = c.dataset.tags.split(' '); const ok = want.every(w => tags.includes(w)); c.hidden = !ok; n += ok; });
      cards.forEach(c => c.classList.add('is-in'));
      if (none) none.hidden = n > 0;
    };
    filters.forEach(f => f.addEventListener('change', apply));
  }

  /* Reveal / iris: elements with [data-reveal] get .is-in when they enter. Hidden state exists only under html.js. */
  const rev = $$('[data-reveal]');
  if (rev.length) {
    if (reduce || !('IntersectionObserver' in window)) rev.forEach(el => el.classList.add('is-in'));
    else {
      root.classList.add('reveal-ready');
      const ro = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); ro.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
      rev.forEach(el => ro.observe(el));
      d.addEventListener('focusin', e => { const r = e.target.closest('[data-reveal]'); r && r.classList.add('is-in'); });
      addEventListener('beforeprint', () => rev.forEach(el => el.classList.add('is-in')));
    }
  }

  /* Belgrade local time for [data-clock]. */
  const clocks = $$('[data-clock]');
  if (clocks.length) {
    const loc = { sr: 'sr-Latn-RS', ru: 'ru-RU', de: 'de-DE', tr: 'tr-TR' }[root.lang] || 'en-GB';
    const fmt = new Intl.DateTimeFormat(loc, { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Belgrade' });
    const tick = () => clocks.forEach(c => { c.textContent = fmt.format(new Date()); });
    tick(); setInterval(tick, 30000);
  }

  /* Mobile navigation. */
  $$('[data-nav-toggle]').forEach(btn => {
    const nav = d.getElementById(btn.getAttribute('aria-controls'));
    if (!nav) return;
    const set = open => { btn.setAttribute('aria-expanded', String(open)); nav.dataset.open = open ? '1' : ''; root.classList.toggle('nav-open', open); };
    btn.addEventListener('click', () => set(btn.getAttribute('aria-expanded') !== 'true'));
    d.addEventListener('keydown', e => { if (e.key === 'Escape' && btn.getAttribute('aria-expanded') === 'true') { set(false); btn.focus(); } });
    $$('a', nav).forEach(a => a.addEventListener('click', () => set(false)));
  });

  /* Header state after scrolling past the first screen (variants style [data-scrolled]). */
  let ticking = false;
  const mark = () => { root.dataset.scrolled = scrollY > 40 ? '1' : ''; ticking = false; };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(mark); } }, { passive: true });
  mark();
})();
