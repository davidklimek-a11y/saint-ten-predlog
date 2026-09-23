/* Saint Ten · Proposal 1 "Book direct" — progressive enhancement only; site.js does the shared behaviour.
   Without this file the room rows still scroll by touch, trackpad and keyboard, and every card is visible. */
(() => {
  const d = document, reduce = matchMedia('(prefers-reduced-motion: reduce)');

  /* Room rows: previous / next move by the cards that are fully in view. The controls appear only when the row
     overflows; at either end the button is aria-disabled, so keyboard focus stays where it is. */
  d.querySelectorAll('[data-rail-nav]').forEach(nav => {
    const rail = d.getElementById(nav.dataset.railNav);
    const list = rail && rail.querySelector('.rrow__list');
    if (!list) return;
    const [prev, next] = nav.querySelectorAll('button[data-dir]');
    const bar = d.querySelector(`[data-rail-bar="${rail.id}"]`), thumb = bar && bar.firstElementChild;
    const step = () => {
      const items = list.children;
      if (items.length < 2) return rail.clientWidth;
      const pitch = items[1].getBoundingClientRect().left - items[0].getBoundingClientRect().left;
      const room = rail.clientWidth - parseFloat(getComputedStyle(list).paddingLeft);
      return Math.max(1, Math.floor((room + 1) / pitch)) * pitch;
    };
    /* the brass position line: its length is the share of the row in view, its offset how far the row has moved */
    const update = () => {
      const max = rail.scrollWidth - rail.clientWidth, x = Math.min(Math.max(rail.scrollLeft, 0), max);
      nav.hidden = max <= 2;
      if (bar) bar.hidden = nav.hidden;
      rail.toggleAttribute('data-enhanced', !nav.hidden);
      prev.setAttribute('aria-disabled', String(x <= 2));
      next.setAttribute('aria-disabled', String(x >= max - 2));
      if (thumb && max > 2) {
        const w = bar.clientWidth, t = Math.max(24, w * rail.clientWidth / rail.scrollWidth);
        thumb.style.width = `${t}px`;
        thumb.style.transform = `translateX(${((w - t) * x / max).toFixed(1)}px)`;
      }
    };
    nav.addEventListener('click', e => {
      const b = e.target.closest('button[data-dir]');
      if (!b || b.getAttribute('aria-disabled') === 'true') return;
      rail.scrollBy({ left: Number(b.dataset.dir) * step(), behavior: reduce.matches ? 'auto' : 'smooth' });
    });
    let frame = 0;
    rail.addEventListener('scroll', () => { if (!frame) frame = requestAnimationFrame(() => { frame = 0; update(); }); }, { passive: true });
    if ('ResizeObserver' in window) new ResizeObserver(update).observe(rail); else addEventListener('resize', update);
    update();
  });

  /* Header language menu (a <details>): close on Escape (focus back on its summary), an outside click, or when focus
     leaves it. */
  d.querySelectorAll('.lang-dd').forEach(dd => {
    const sum = dd.querySelector('summary');
    d.addEventListener('click', e => { if (dd.open && !dd.contains(e.target)) dd.open = false; });
    dd.addEventListener('keydown', e => { if (e.key === 'Escape' && dd.open) { dd.open = false; sum.focus(); } });
    dd.addEventListener('focusout', e => { if (dd.open && e.relatedTarget && !dd.contains(e.relatedTarget)) dd.open = false; });
  });

  /* Reload or back navigation in the middle of a page: blocks already scrolled past show at once instead of
     replaying their entrance on the way back up (site.js reveals the rest as they enter). */
  addEventListener('pageshow', () => d.querySelectorAll('[data-reveal]:not(.is-in)').forEach(el => {
    if (el.getBoundingClientRect().bottom < 0) el.classList.add('is-in');
  }));

  /* Room finder: after the first filter change, cards that come back fade in (v1.css, @starting-style); first paint
     never animates. This listener runs before site.js hides and shows the cards; the count for screen readers is
     read a frame later, once they are shown or hidden (at zero the finder's own "no match" status speaks). */
  const grid = d.querySelector('.rgrid'), count = d.querySelector('[data-finder-count]');
  if (grid) d.querySelectorAll('[data-filter]').forEach(f => f.addEventListener('change', () => {
    grid.dataset.live = '1';
    if (count) requestAnimationFrame(() => {
      const cards = [...grid.querySelectorAll('[data-tags]')], n = cards.filter(c => !c.hidden).length;
      count.textContent = n ? count.dataset.tpl.replace('{n}', n).replace('{t}', cards.length) : '';
    });
  }));

  /* Menu sheet (site.js toggles html.nav-open): while it is open the page behind it is inert, so Tab stays in the
     header and the sheet instead of walking the covered page (WCAG 2.4.11); the sheet is sized to the screen left
     below the header (at the top of a page the draft band pushed 100dvh past the bottom edge). */
  const root = d.documentElement, nav = d.getElementById('nav'), hd = d.querySelector('.hd'), burger = d.querySelector('[data-nav-toggle]');
  if (nav && hd && burger) {
    const behind = [d.querySelector('main'), d.querySelector('footer'), d.querySelector('.draft'), d.querySelector('.skip')].filter(Boolean);
    const fit = () => {
      if (getComputedStyle(burger).display === 'none') { burger.setAttribute('aria-expanded', 'false'); nav.dataset.open = ''; root.classList.remove('nav-open'); return; }
      nav.style.height = `${Math.max(0, innerHeight - hd.getBoundingClientRect().bottom)}px`;
    };
    let open = false;
    new MutationObserver(() => {
      const now = root.classList.contains('nav-open');
      if (now === open) return;
      open = now;
      behind.forEach(el => { el.inert = now; });
      if (now) { fit(); addEventListener('resize', fit); } else { nav.style.height = ''; removeEventListener('resize', fit); }
    }).observe(root, { attributes: true, attributeFilter: ['class'] });
  }

  /* Phones: the booking dock waits while the hero's own booking bar is on screen (two identical bars otherwise). */
  const bar = d.querySelector('.hero__dock');
  if (bar && 'IntersectionObserver' in window) new IntersectionObserver(([e]) => root.toggleAttribute('data-dock-hold', e.isIntersecting)).observe(bar);

  /* Pause / play for every looping video (WCAG 2.2.2). site.js starts a loop whenever it scrolls into view; one the
     visitor paused stays paused. The hero's and the frames' buttons appear once their video plays (so never with
     reduced motion or Save-Data, when nothing moves); a reel's appears at once, a keyboard route to its
     click-to-play. */
  const narrow = matchMedia('(max-width: 760px)');
  d.querySelectorAll('.vpp').forEach(bt => {
    const v = d.getElementById(bt.getAttribute('aria-controls'));
    if (!v) return;
    const sync = () => {
      bt.dataset.state = v.paused ? 'paused' : 'playing';
      bt.setAttribute('aria-label', v.paused ? bt.dataset.play : bt.dataset.pause);
    };
    v.addEventListener('play', () => { if (v.dataset.held) { v.pause(); return; } bt.hidden = false; sync(); });
    v.addEventListener('pause', sync);
    const fig = bt.closest('[data-reel]');
    if (fig) {
      bt.hidden = false; sync();
      /* a click on the reel itself (site.js toggles it): pausing holds it, playing releases it */
      fig.addEventListener('click', e => { if (e.target.closest('a, .vpp')) return; if (v.paused) delete v.dataset.held; else v.dataset.held = '1'; }, true);
    }
    bt.addEventListener('click', ev => {
      ev.stopPropagation(); // the reel figure's own click handler would toggle it straight back
      if (!v.paused) { v.dataset.held = '1'; v.pause(); return; }
      delete v.dataset.held;
      if (!v.dataset.loaded) {
        const src = (narrow.matches && v.dataset.srcMobile) || v.dataset.src;
        if (src) { v.src = src; v.dataset.loaded = '1'; }
      }
      const pr = v.play(); if (pr) pr.catch(() => {});
    });
  });
})();
