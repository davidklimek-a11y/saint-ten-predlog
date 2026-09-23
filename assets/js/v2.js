/* Saint Ten · proposal 2 — progressive enhancement only. No dependencies, no storage.
   1. Every decorative loop sits over its own still (the LCP); the loop fades in once it actually plays.
   2. The L'Adresse menu's enamel-plate tabs follow the section in view (aria-current) and the sticky strip
      scrolls the active plate into sight. */
(() => {
  document.querySelectorAll('video[data-autoplay]').forEach(v => {
    v.addEventListener('playing', () => v.classList.add('is-live'), { once: true });
  });
})();
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
