/* Saint Ten · proposal 2 — progressive enhancement only. No dependencies, no storage.
   1. Every decorative loop sits over its own still (the LCP); the loop fades in once it actually plays.
   2. Motion: whatever the visitor has already reached when the page opens (a reload halfway down, a jump to #menu) is
      never hidden again: it is marked .is-in before site.js arms the scroll reveals (this file runs first).
   3. A plate that would travel into the next page (cross-document view transition) stays behind when it is off screen
      or when the next page opens at an anchor, so it never flies across the screen from nowhere.
   4. The L'Adresse menu's enamel-plate tabs follow the section in view (aria-current) and the sticky strip
      scrolls the active plate into sight.
   5. The phone menu sheet covers the page: while it is open, everything behind it except the pinned door bar is inert,
      so keyboard focus and screen readers stay in the sheet (site.js opens and closes it).
   6. Small repairs to shared behaviour, in the page language: the lightbox buttons get their names from v2.py,
      a copy button says "Copied" once it has copied, and a request form never offers a date in the past.
   7. Desktop: the door bar rises as soon as the header's own "Book a room" | "Book a table" pair is out of view
      (html[data-bar]); below 1100 px the bar is always pinned (v2.css). */
(() => {
  document.querySelectorAll('video[data-autoplay]').forEach(v => {
    v.addEventListener('playing', () => v.classList.add('is-live'), { once: true });
  });
})();
(() => {
  const reached = () => document.querySelectorAll('[data-reveal]:not(.is-in)').forEach(el => {
    if (el.getBoundingClientRect().top < innerHeight * .92) el.classList.add('is-in');
  });
  reached();
  // the browser may restore the scroll position a moment later (reload, back): check once more at that point
  addEventListener('pageshow', reached, { once: true });
})();
addEventListener('pageswap', e => {
  if (!e.viewTransition) return;
  const entry = e.activation && e.activation.entry;
  const anchored = entry && entry.url ? new URL(entry.url).hash.length > 1 : false;
  document.querySelectorAll('[data-vt]').forEach(p => {
    const r = p.getBoundingClientRect();
    if (anchored || r.bottom < 0 || r.top > innerHeight) p.style.viewTransitionName = 'none';
  });
});
(() => {
  const tabs = [...document.querySelectorAll('.menu__tab')];
  if (!tabs.length || !('IntersectionObserver' in window)) return;
  const strip = tabs[0].parentElement;
  const byId = new Map(tabs.map(t => [t.getAttribute('href').slice(1), t]));
  const sections = [...byId.keys()].map(id => document.getElementById(id)).filter(Boolean);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let current = null;
  const set = sec => {
    if (sec === current) return;
    current = sec;
    tabs.forEach(t => t.removeAttribute('aria-current'));
    const tab = byId.get(sec.id);
    if (!tab) return;
    tab.setAttribute('aria-current', 'true');
    strip.scrollTo({ left: tab.offsetLeft - strip.clientWidth / 2 + tab.offsetWidth / 2, behavior: reduce ? 'auto' : 'smooth' });
  };
  const clear = () => { current = null; tabs.forEach(t => t.removeAttribute('aria-current')); };
  const io = new IntersectionObserver(entries => {
    const hit = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
    if (hit) set(hit.target);
    else if (sections[0].getBoundingClientRect().top > innerHeight * .15) clear();   // back above the menu: no plate is current
  }, { rootMargin: '-15% 0px -70% 0px', threshold: 0 });
  sections.forEach(s => io.observe(s));
  // the whole menu out of view (scrolled past it, or jumped back to the top): no plate stays current
  const menu = document.getElementById('menu');
  menu && new IntersectionObserver(es => { if (!es[0].isIntersecting) clear(); }).observe(menu);
  tabs.forEach(t => t.addEventListener('click', () => { const s = document.getElementById(t.getAttribute('href').slice(1)); s && set(s); }));
})();
(() => {
  const tog = document.querySelector('[data-nav-toggle]');
  if (!tog) return;
  const behind = () => [...document.body.children].filter(el => !el.matches('.hdr, .doorbar, script, dialog'));
  new MutationObserver(() => {
    const open = tog.getAttribute('aria-expanded') === 'true';
    behind().forEach(el => { el.inert = open; });
  }).observe(tog, { attributes: true, attributeFilter: ['aria-expanded'] });
  // the door bar stays over the open sheet: its links close the sheet first, so "#book" or "#table" opens on the page
  document.querySelectorAll('.doorbar a').forEach(a => a.addEventListener('click', () => {
    if (tog.getAttribute('aria-expanded') === 'true') tog.click();
  }));
  // the sheet exists below 1100 px only: widening the window (or turning a tablet) with it open closes it
  const wide = matchMedia('(min-width: 1100px)');
  wide.addEventListener('change', () => { if (wide.matches && tog.getAttribute('aria-expanded') === 'true') tog.click(); });
})();
(() => {
  const pad = n => String(n).padStart(2, '0'), d = new Date();
  const today = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  document.querySelectorAll('.mf input[type="date"]').forEach(i => { if (!i.min) i.min = today; });
  document.querySelectorAll('[data-copy][data-copied]').forEach(b => new MutationObserver(() => {
    if (b.hasAttribute('data-done')) b.textContent = b.dataset.copied;
  }).observe(b, { attributes: true, attributeFilter: ['data-done'] }));
  // site.js builds the lightbox after this file has run; by DOMContentLoaded it exists
  addEventListener('DOMContentLoaded', () => {
    const src = document.querySelector('[data-lb-close]'), box = document.querySelector('dialog.lightbox');
    if (!src || !box) return;
    [['x', 'lbClose'], ['prev', 'lbPrev'], ['next', 'lbNext']].forEach(([k, key]) => {
      const b = box.querySelector('.lightbox__' + k);
      if (b && src.dataset[key]) b.setAttribute('aria-label', src.dataset[key]);
    });
  });
})();
(() => {
  const pair = document.querySelector('.hdr .pair');
  if (!pair || !('IntersectionObserver' in window)) return;
  new IntersectionObserver(([e]) => {
    document.documentElement.dataset.bar = !e.isIntersecting && e.boundingClientRect.bottom < 0 ? '1' : '';
  }).observe(pair);
})();
