import { basePath, getFavorites, getCompare, toggleFavorite, toggleCompare, getFeedback } from './storage.js';

export const pageUrl = (name) => `${basePath}/pages/${name}`;
export const assetUrl = (path) => `${basePath}/${path}`.replace('/./', '/');

export function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[char]);
}

export function mapsUrl(facility) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(facility.address)}`;
}

export function isOpenNow(facility, now = new Date()) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const value = facility.hours?.[days[now.getDay()]] || 'Closed';
  if (value === '24 Hours') return true;
  if (value === 'Closed') return false;
  const [open, close] = value.split('-');
  if (!open || !close) return false;
  const minutes = now.getHours() * 60 + now.getMinutes();
  const toMinutes = (time) => {
    const [hours, mins] = time.split(':').map(Number);
    return hours * 60 + mins;
  };
  return minutes >= toMinutes(open) && minutes < toMinutes(close);
}

export function ratingData(facility) {
  const local = getFeedback(facility.id);
  const baseCount = Number(facility.reviewCount || 0);
  const baseTotal = Number(facility.rating || 0) * baseCount;
  const localTotal = local.reduce((sum, item) => sum + Number(item.rating || 0), 0);
  const count = baseCount + local.length;
  const rating = count ? (baseTotal + localTotal) / count : 0;
  const breakdown = { ...(facility.ratingBreakdown || { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }) };
  local.forEach((item) => { breakdown[item.rating] = Number(breakdown[item.rating] || 0) + 1; });
  return { rating, count, breakdown, local };
}

export function stars(value) {
  const rounded = Math.round(Number(value));
  return `<span class="stars" aria-label="${Number(value).toFixed(1)} out of 5 stars">${'★'.repeat(rounded)}${'☆'.repeat(5 - rounded)}</span>`;
}

export function facilityCard(facility, options = {}) {
  const { rating, count } = ratingData(facility);
  const favorites = getFavorites();
  const compare = getCompare();
  const open = isOpenNow(facility);
  const compact = options.compact ? ' compact' : '';
  return `
    <article class="facility-card glass tilt-target reveal${compact}" data-id="${facility.id}" tabindex="0">
      <div class="facility-media">
        <img src="${assetUrl(facility.photo || 'assets/placeholder.svg')}" alt="Abstract placeholder for ${escapeHtml(facility.name)}" loading="lazy">
        <span class="status-badge ${open ? 'open' : 'closed'}">${open ? 'Open now' : 'Closed'}</span>
        <button class="icon-btn favorite-btn ${favorites.includes(facility.id) ? 'active' : ''}" data-favorite="${facility.id}" aria-label="${favorites.includes(facility.id) ? 'Remove from' : 'Add to'} favorites">♥</button>
      </div>
      <div class="facility-body">
        <div class="eyebrow-row">
          <span class="category-chip">${escapeHtml(facility.category)}</span>
          <span class="verified-badge ${facility.verified ? 'verified' : 'unverified'}">${facility.verified ? '✓ Verified' : 'Unverified'}</span>
        </div>
        <h3>${escapeHtml(facility.name)}</h3>
        <p class="muted clamp-2">${escapeHtml(facility.description)}</p>
        <p class="location-line">⌖ ${escapeHtml(facility.area)}, ${escapeHtml(facility.city)}</p>
        <div class="rating-line">${stars(rating)} <strong>${rating.toFixed(1)}</strong> <span class="muted">(${count})</span></div>
        <div class="card-actions">
          <a class="btn btn-primary ripple" href="${pageUrl(`facility.html?id=${encodeURIComponent(facility.id)}`)}">View profile</a>
          <button class="btn btn-ghost compare-btn ${compare.includes(facility.id) ? 'active' : ''}" data-compare="${facility.id}">${compare.includes(facility.id) ? 'Added' : 'Compare'}</button>
        </div>
      </div>
    </article>`;
}

export function bindFacilityCardActions(container = document) {
  container.querySelectorAll('[data-favorite]').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.preventDefault(); event.stopPropagation();
      const id = button.dataset.favorite;
      const values = toggleFavorite(id);
      button.classList.toggle('active', values.includes(id));
      button.setAttribute('aria-label', values.includes(id) ? 'Remove from favorites' : 'Add to favorites');
      toast(values.includes(id) ? 'Saved to favorites' : 'Removed from favorites');
    });
  });

  container.querySelectorAll('[data-compare]').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.preventDefault(); event.stopPropagation();
      const id = button.dataset.compare;
      const before = getCompare();
      const values = toggleCompare(id);
      if (!before.includes(id) && !values.includes(id)) {
        toast('You can compare up to 3 facilities.', 'warning');
        return;
      }
      button.classList.toggle('active', values.includes(id));
      button.textContent = values.includes(id) ? 'Added' : 'Compare';
      updateCompareCount();
      toast(values.includes(id) ? 'Added to comparison' : 'Removed from comparison');
    });
  });
}

export function toast(message, type = 'info') {
  let region = document.querySelector('.toast-region');
  if (!region) {
    region = document.createElement('div');
    region.className = 'toast-region';
    region.setAttribute('aria-live', 'polite');
    document.body.append(region);
  }
  const item = document.createElement('div');
  item.className = `toast ${type}`;
  item.textContent = message;
  region.append(item);
  requestAnimationFrame(() => item.classList.add('show'));
  setTimeout(() => {
    item.classList.remove('show');
    setTimeout(() => item.remove(), 250);
  }, 2600);
}

export function updateCompareCount() {
  document.querySelectorAll('[data-compare-count]').forEach((node) => {
    node.textContent = getCompare().length;
  });
}

export function initReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
}

export function initTilt() {
  document.querySelectorAll('.tilt-target').forEach((card) => {
    if (card.dataset.tiltBound) return;
    card.dataset.tiltBound = 'true';
    card.addEventListener('pointermove', (event) => {
      if (window.matchMedia('(pointer: coarse)').matches) return;
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      card.style.transform = `perspective(900px) rotateX(${(-y * 5).toFixed(2)}deg) rotateY(${(x * 6).toFixed(2)}deg) translateY(-3px)`;
      card.style.setProperty('--mx', `${(x + 0.5) * 100}%`);
      card.style.setProperty('--my', `${(y + 0.5) * 100}%`);
    });
    card.addEventListener('pointerleave', () => { card.style.transform = ''; });
  });
}

export function initRipples() {
  document.addEventListener('click', (event) => {
    const target = event.target.closest('.ripple');
    if (!target) return;
    const rect = target.getBoundingClientRect();
    const wave = document.createElement('span');
    wave.className = 'ripple-wave';
    wave.style.left = `${event.clientX - rect.left}px`;
    wave.style.top = `${event.clientY - rect.top}px`;
    target.append(wave);
    setTimeout(() => wave.remove(), 650);
  });
}

export function formatHours(value) {
  return value === 'Closed' || value === '24 Hours' ? value : value.replace('-', ' – ');
}
