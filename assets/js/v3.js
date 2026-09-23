/* Proposal 3 · "The story" — progressive enhancement only.
   1. "Reserve" (top right) opens the dates dialog; without JS the same link scrolls to the page's #reserve section.
   2. One type-on reveal for the first chapter title, once, never with reduced motion; the text stays in the DOM throughout.
      The untyped rest is laid out (transparent) behind the typed part, so a centred, balanced title never re-wraps or shifts. */
(() => {
  const d = document;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const dlg = d.querySelector('[data-reserve-dialog]');
  if (dlg && typeof dlg.showModal === 'function') {
    d.querySelectorAll('[data-reserve]').forEach(a => a.addEventListener('click', ev => {
      ev.preventDefault();
      dlg.showModal();
      const first = dlg.querySelector('input:not([type=hidden]), select');
      first && first.focus();
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
      if (i < full.length) setTimeout(step, full[i - 1] === ' ' ? 110 : 42);
      else setTimeout(() => { live.remove(); h.classList.remove('is-typing'); }, 900);
    };
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { io.disconnect(); setTimeout(step, 350); } }), { threshold: 0.4 });
    io.observe(h);
    addEventListener('beforeprint', () => { live.remove(); h.classList.remove('is-typing'); });
  }
})();
