import { getFacilities } from './storage.js';
import { facilityCard, bindFacilityCardActions, initReveal, initTilt, pageUrl } from './ui.js';

function initTyping() {
  const node = document.querySelector('[data-typing]');
  if (!node) return;
  const phrases = ['care you can compare', 'labs you can verify', 'pharmacies open now', 'support near your city'];
  let p = 0, i = 0, deleting = false;
  const tick = () => {
    const text = phrases[p];
    node.textContent = deleting ? text.slice(0, i--) : text.slice(0, i++);
    if (!deleting && i > text.length + 6) deleting = true;
    if (deleting && i < 0) { deleting = false; p = (p + 1) % phrases.length; i = 0; }
    setTimeout(tick, deleting ? 42 : 72);
  };
  tick();
}

function initCounters() {
  const facilities = getFacilities();
  const values = {
    facilities: facilities.length,
    verified: facilities.filter((f) => f.verified).length,
    cities: new Set(facilities.map((f) => f.city)).size,
    categories: new Set(facilities.map((f) => f.category)).size
  };
  document.querySelectorAll('[data-counter]').forEach((node) => {
    const target = values[node.dataset.counter] || 0;
    let start = 0;
    const animate = () => {
      start += Math.max(1, Math.ceil((target - start) / 7));
      node.textContent = Math.min(start, target);
      if (start < target) requestAnimationFrame(animate);
    };
    animate();
  });
}

function initFeatured() {
  const grid = document.querySelector('[data-featured]');
  if (!grid) return;
  const items = [...getFacilities()].sort((a, b) => Number(b.rating) - Number(a.rating)).slice(0, 6);
  grid.innerHTML = items.map((f) => facilityCard(f, { compact: true })).join('');
  bindFacilityCardActions(grid);
  initReveal(); initTilt();
}

function initHeroGlow() {
  const hero = document.querySelector('.hero');
  const glow = document.querySelector('.hero-cursor-glow');
  if (!hero || !glow) return;
  hero.addEventListener('pointermove', (event) => {
    const rect = hero.getBoundingClientRect();
    glow.style.left = `${event.clientX - rect.left}px`;
    glow.style.top = `${event.clientY - rect.top}px`;
  });
}

function initHeroSearch() {
  const form = document.querySelector('[data-hero-search]');
  if (!form) return;
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const q = form.querySelector('input').value.trim();
    location.href = `${pageUrl('directory.html')}${q ? `?q=${encodeURIComponent(q)}` : ''}`;
  });
}

window.addEventListener('medifind:ready', () => {
  initTyping(); initCounters(); initFeatured(); initHeroGlow(); initHeroSearch();
});
