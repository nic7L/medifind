import { onReady, getFacilities, getFavorites } from './storage.js';
import { facilityCard, bindFacilityCardActions, initReveal, ratingData, isOpenNow, escapeHtml } from './ui.js';

const state = { query: '', category: 'All', area: 'All', open: false, verified: false, minRating: 0, sort: 'rating-desc', favoritesOnly: false };
let facilities = [];

function filtered() {
  const q = state.query.toLowerCase();
  const items = facilities.filter((f) => {
    const haystack = [f.name, f.description, f.category, f.area, f.city, ...(f.services || [])].join(' ').toLowerCase();
    const { rating } = ratingData(f);
    return (!q || haystack.includes(q)) &&
      (state.category === 'All' || f.category === state.category) &&
      (state.area === 'All' || f.city === state.area || `${f.area}, ${f.city}` === state.area) && (!state.favoritesOnly || getFavorites().includes(f.id)) &&
      (!state.open || isOpenNow(f)) &&
      (!state.verified || f.verified) &&
      rating >= state.minRating;
  });
  return items.sort((a, b) => {
    if (state.sort === 'name-asc') return a.name.localeCompare(b.name);
    if (state.sort === 'name-desc') return b.name.localeCompare(a.name);
    if (state.sort === 'reviews-desc') return ratingData(b).count - ratingData(a).count;
    return ratingData(b).rating - ratingData(a).rating;
  });
}

function draw() {
  const grid = document.querySelector('[data-directory-grid]');
  const count = document.querySelector('[data-result-count]');
  const items = filtered();
  count.textContent = `${items.length} ${items.length === 1 ? 'facility' : 'facilities'}`;
  grid.innerHTML = items.length ? items.map((f) => facilityCard(f)).join('') : `<div class="empty-card"><h3>No matches found</h3><p>Try removing a filter or searching for a broader service.</p><button class="btn btn-primary" data-reset>Reset filters</button></div>`;
  bindFacilityCardActions(grid);
  grid.querySelector('[data-reset]')?.addEventListener('click', resetFilters);
  initReveal();
}

function suggestions() {
  const input = document.querySelector('#directory-search');
  const box = document.querySelector('[data-suggestions]');
  const q = input.value.trim().toLowerCase();
  if (!q) { box.hidden = true; return; }
  const matches = facilities.filter((f) => [f.name, f.category, f.area, f.city, ...(f.services || [])].join(' ').toLowerCase().includes(q)).slice(0, 6);
  box.innerHTML = matches.map((f) => `<button type="button" data-suggestion="${escapeHtml(f.name)}"><strong>${escapeHtml(f.name)}</strong><span>${escapeHtml(f.category)} · ${escapeHtml(f.area)}</span></button>`).join('');
  box.hidden = !matches.length;
}

function syncStateFromUI() {
  state.query = document.querySelector('#directory-search').value.trim();
  state.category = document.querySelector('#filter-category').value;
  state.area = document.querySelector('#filter-area').value;
  state.open = document.querySelector('#filter-open').checked;
  state.favoritesOnly = document.querySelector('#filter-favorites').checked;
  state.verified = document.querySelector('#filter-verified').checked;
  state.minRating = Number(document.querySelector('#filter-rating').value);
  state.sort = document.querySelector('#sort-by').value;
  document.querySelector('[data-rating-value]').textContent = state.minRating ? `${state.minRating.toFixed(1)}+` : 'Any';
}

function resetFilters() {
  document.querySelector('#directory-search').value = '';
  document.querySelector('#filter-category').value = 'All';
  document.querySelector('#filter-area').value = 'All';
  document.querySelector('#filter-open').checked = false;
  document.querySelector('#filter-verified').checked = false;
  document.querySelector('#filter-favorites').checked = false;
  document.querySelector('[data-suggestions]').hidden = true;
  document.querySelector('#filter-rating').value = 0;
  document.querySelector('#sort-by').value = 'rating-desc';
  syncStateFromUI(); draw();
}

function bind() {
  const controls = document.querySelector('[data-filters]');
  controls.addEventListener('input', (event) => {
    syncStateFromUI();
    if (event.target.id === 'directory-search') suggestions();
    draw();
  });
  controls.addEventListener('change', () => { syncStateFromUI(); draw(); });
  document.querySelector('[data-suggestions]').addEventListener('click', (event) => {
    const item = event.target.closest('[data-suggestion]');
    if (!item) return;
    document.querySelector('#directory-search').value = item.dataset.suggestion;
    document.querySelector('[data-suggestions]').hidden = true;
    syncStateFromUI(); draw();
  });
  document.addEventListener('click', (event) => {
    if (!event.target.closest('.search-wrap')) document.querySelector('[data-suggestions]').hidden = true;
  });
  document.querySelector('[data-reset-filters]').addEventListener('click', resetFilters);
}

onReady(() => {
  facilities = getFacilities();
  const areaSelect = document.querySelector('#filter-area');
  [...new Set(facilities.flatMap(f => [f.city, `${f.area}, ${f.city}`]))].sort().forEach((value) => areaSelect.insertAdjacentHTML('beforeend', `<option>${escapeHtml(value)}</option>`));
  const params = new URLSearchParams(location.search);
  document.querySelector('#directory-search').value = params.get('q') || '';
  const category = params.get('category');
  if (['Clinic','Lab','Pharmacy','Support Facility'].includes(category)) document.querySelector('#filter-category').value = category;
  syncStateFromUI();
  setTimeout(() => { document.querySelector('[data-skeletons]').hidden = true; document.querySelector('[data-directory-grid]').hidden = false; draw(); }, 350);
  bind();
  window.addEventListener('medifind:storage', event => { if (state.favoritesOnly && event.detail.key.includes('.favorites.')) queueMicrotask(draw); });
  document.querySelector('#directory-search').addEventListener('keydown', event => { if (event.key === 'Escape') document.querySelector('[data-suggestions]').hidden = true; if (event.key === 'ArrowDown') document.querySelector('[data-suggestions]:not([hidden]) button')?.focus(); });
  setInterval(() => { if (state.open && !document.querySelector('[data-directory-grid]').contains(document.activeElement)) draw(); }, 15000);
});
