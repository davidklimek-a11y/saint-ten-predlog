/* Proposal 3 · "The story" — progressive enhancement only.
   1. "Reserve" (top right) opens the dates dialog; without JS the same link scrolls to the page's #reserve section.
   2. One type-on reveal for the first chapter title, once, never with reduced motion; the text stays in the DOM throughout.
      The untyped rest is laid out (transparent) behind the typed part, so a centred, balanced title never re-wraps or shifts.
   3. Chapters the reader has already passed (a reload further down, an anchor from another page) are shown at once:
      the iris and the focus pull only play for what comes into view, never for what is behind the reader.
   4. The gallery's filter tabs let returning pictures settle in (v3.css, html.gal-live).
   5. Opening the menu first brings the header to the top edge, so the list never starts under it.
   6. The full-screen menu holds keyboard focus: while it is open everything outside the header is inert and focus starts
      on its first link; closing it (the toggle, Escape, a link, or a window grown past the menu breakpoint) gives the page back.
   7. The home title sequence never holds the page: the first key, click, touch or wheel shows everything at once.
   8. Every moving film carries a pause / play control (loops while they play, reels always). */
(() => {
  const d = document, root = d.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const dlg = d.querySelector('[data-reserve-dialog]');
  if (dlg && typeof dlg.showModal === 'function') {
    d.querySelectorAll('[data-reserve]').forEach(a => a.addEventListener('click', ev => {
      ev.preventDefault();
      dlg.showModal();
      // from the keyboard (or a mouse) the dates are ready to type; a tap on a phone does not pop the date picker open at once
      const first = dlg.querySelector('input:not([type=hidden]), select');
      if (first && (ev.detail === 0 || !matchMedia('(pointer: coarse)').matches)) first.focus();
    }));
    dlg.querySelector('[data-close]').addEventListener('click', () => dlg.close());
    dlg.addEventListener('click', ev => { if (ev.target === dlg) dlg.close(); });
  }

  const h = d.querySelector('[data-typeon]');
  if (h && !reduce && 'IntersectionObserver' in window) {
    const full = h.textContent;
    const live = d.createElement('span');
    live.className = 'typeon__live';
    live.setAttribute('aria-hidden', 'true');
    const typed = d.createTextNode('');
    const dot = d.createElement('i');
    dot.className = 'typeon__dot';
    const rest = d.createElement('span');
    rest.className = 'typeon__rest';
    rest.textContent = full;
    live.append(typed, dot, rest);
    h.classList.add('typeon', 'is-typing');
    h.append(live);
    let i = 0;
    const step = () => {
      i += 1;
      typed.textContent = full.slice(0, i);
      rest.textContent = full.slice(i);
      if (i < full.length) setTimeout(step, full[i - 1] === ' ' ? 90 : 36);
      else setTimeout(() => { live.remove(); h.classList.remove('is-typing'); }, 700);
    };
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { io.disconnect(); setTimeout(step, 300); } }), { threshold: 0.4 });
    io.observe(h);
    addEventListener('beforeprint', () => { live.remove(); h.classList.remove('is-typing'); });
  }

  if (!reduce) {
    const keep = () => {
      const passed = [...d.querySelectorAll('[data-reveal]:not(.is-in)')].filter(el => el.getBoundingClientRect().bottom < 0);
      if (!passed.length) return;
      passed.forEach(el => el.classList.add('no-anim', 'is-in'));
      requestAnimationFrame(() => requestAnimationFrame(() => passed.forEach(el => el.classList.remove('no-anim'))));
    };
    addEventListener('load', keep);
    addEventListener('scroll', keep, { once: true, passive: true });
    addEventListener('hashchange', keep);
  }

  /* the menu opens under the header: while the draft band still shows above it, bring the header to the top edge first */
  d.querySelectorAll('[data-nav-toggle]').forEach(btn => btn.addEventListener('click', () => {
    if (btn.getAttribute('aria-expanded') === 'true') return;
    const top = btn.closest('.hd').getBoundingClientRect().top;
    if (top > 0) scrollTo({ top: scrollY + top, behavior: 'instant' });
  }));

  d.querySelectorAll('[data-gallery-tab]').forEach(t => t.addEventListener('click', () => root.classList.add('gal-live'), { once: true }));

  const tgl = d.querySelector('[data-nav-toggle]');
  if (tgl) {
    const wide = matchMedia('(min-width: 1280px)');
    const sync = () => {
      const open = tgl.getAttribute('aria-expanded') === 'true';
      [...d.body.children].forEach(el => { if (!el.matches('.hd, script, dialog')) el.inert = open; });
      if (open) { const first = d.querySelector('#nav a'); first && first.focus({ preventScroll: true }); }
    };
    new MutationObserver(sync).observe(tgl, { attributes: true, attributeFilter: ['aria-expanded'] });
    wide.addEventListener('change', () => { if (wide.matches && tgl.getAttribute('aria-expanded') === 'true') tgl.click(); });
  }

  /* 8. Every moving film can be paused (WCAG 2.2.2). A loop's control appears once the loop really plays (never with reduced
        motion or Save-Data, when nothing moves); a reel's is always there, so a reel also starts and stops from the keyboard,
        and a click on the reel itself goes through the same switch. A film paused by hand stays paused when it scrolls back
        into view (site.js would play it again). */
  d.querySelectorAll('[data-loop-ctl]').forEach(btn => {
    const fig = btn.closest('[data-reel]');
    const scope = fig || btn.closest('.ch__media, .card, .hero');
    const v = scope && scope.querySelector(fig ? 'video' : 'video[data-autoplay]');
    if (!v) return;
    const show = () => {
      btn.setAttribute('aria-label', v.paused ? btn.dataset.lPlay : btn.dataset.lPause);
      btn.classList.toggle('is-held', v.paused);
    };
    const toggle = () => {
      if (v.paused) {
        delete v.dataset.held;
        if (!v.dataset.loaded) { v.src = v.dataset.src; v.dataset.loaded = '1'; }
        const p = v.play(); p && p.catch(() => {});
      } else { v.dataset.held = '1'; v.pause(); }
    };
    v.addEventListener('play', () => { if (v.dataset.held) v.pause(); });
    v.addEventListener('playing', () => { btn.hidden = false; show(); });
    v.addEventListener('pause', show);
    btn.addEventListener('click', ev => { ev.stopPropagation(); toggle(); });
    if (fig) {
      btn.hidden = false; show();
      fig.addEventListener('click', ev => { if (ev.target.closest('a, [data-loop-ctl]')) return; ev.stopImmediatePropagation(); toggle(); });
    }
  });

  if (!reduce && d.body.classList.contains('p-home')) {
    const evs = ['keydown', 'pointerdown', 'wheel', 'touchstart'];
    const skip = () => { root.classList.add('intro-skip'); evs.forEach(t => removeEventListener(t, skip, true)); };
    evs.forEach(t => addEventListener(t, skip, { capture: true, passive: true }));
  }
})();
