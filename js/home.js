import { onReady, getFacilities } from './storage.js';
import { facilityCard, bindFacilityCardActions, initReveal, ratingData, pageUrl } from './ui.js';

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
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { node.textContent = target; return; }
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
  const items = [...getFacilities()].sort((a, b) => ratingData(b).rating - ratingData(a).rating).slice(0, 6);
  grid.innerHTML = items.length ? items.map((f) => facilityCard(f, { compact: true })).join('') : '<p class="empty-card">No facilities currently in the directory.</p>';
  bindFacilityCardActions(grid);
  initReveal();
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

onReady(() => {
  initCounters(); initFeatured(); initHeroSearch();
});
