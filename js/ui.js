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

// All sample listings are in India; opening hours use the facility's time zone.
export function indiaTime(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(now).map(({type, value}) => [type, value]));
  return {day: parts.weekday, minutes: Number(parts.hour) * 60 + Number(parts.minute)};
}

export function isOpenNow(facility, now = new Date()) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const {day, minutes} = indiaTime(now);
  const today = facility.hours?.[day] || 'Closed';
  const yesterday = facility.hours?.[days[(days.indexOf(day)+6)%7]] || 'Closed';
  const parse = value => /^([01]\d|2[0-3]):[0-5]\d-([01]\d|2[0-3]):[0-5]\d$/.test(value)
    ? value.split('-').map(time => { const [h,m] = time.split(':').map(Number); return h*60+m; }) : null;
  const previous = parse(yesterday);
  if (previous && previous[1] < previous[0] && minutes < previous[1]) return true;
  if (today === '24 Hours') return true;
  const hours = parse(today);
  if (!hours) return false;
  const [start,end] = hours;
  return start < end ? minutes >= start && minutes < end : start > end && minutes >= start;
}

export function statusMarkup(facility) {
  const open = isOpenNow(facility);
  return `<span data-open-id="${escapeHtml(facility.id)}" class="status-badge ${open ? 'open' : 'closed'}">${open ? 'Open now' : 'Closed'}</span>`;
}

export function phoneUrl(phone) { return `tel:${String(phone).replace(/[^+\d]/g, '')}`; }
export function safeWebsite(url) {
  try { const parsed = new URL(url); return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : 'https://example.com/'; }
  catch { return 'https://example.com/'; }
}

export function ratingData(facility) {
  const local = getFeedback(facility.id);
  const baseCount = Number(facility.reviewCount || 0);
  const baseTotal = Object.entries(facility.ratingBreakdown || {}).reduce((sum, [star, count]) => sum + Number(star) * Number(count), 0);
  const localTotal = local.reduce((sum, item) => sum + Number(item.rating || 0), 0);
  const count = baseCount + local.length;
  const rating = count ? (baseTotal + localTotal) / count : 0;
  const breakdown = { ...(facility.ratingBreakdown || { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }) };
  local.forEach((item) => { breakdown[item.rating] = Number(breakdown[item.rating] || 0) + 1; });
  return { rating, count, breakdown, local };
}

export function stars(value) {
  const rounded = Math.max(0, Math.min(5, Math.round(Number(value) || 0)));
  return `<span class="stars" aria-label="${Number(value).toFixed(1)} out of 5 stars">${'★'.repeat(rounded)}${'☆'.repeat(5 - rounded)}</span>`;
}

export function facilityCard(facility, options = {}) {
  const { rating, count } = ratingData(facility);
  const favorites = getFavorites();
  const compare = getCompare();
  const compact = options.compact ? ' compact' : '';
  return `
    <article class="facility-card reveal${compact}" data-id="${escapeHtml(facility.id)}">
      <div class="facility-media">
        <span class="facility-index" aria-hidden="true">${({Clinic:'01',Lab:'02',Pharmacy:'03','Support Facility':'04'})[facility.category] || '—'}</span>
        <div class="media-actions">${statusMarkup(facility)}
        <button type="button" class="icon-btn favorite-btn ${favorites.includes(facility.id) ? 'active' : ''}" data-favorite="${facility.id}" aria-pressed="${favorites.includes(facility.id)}" aria-label="${favorites.includes(facility.id) ? 'Remove from' : 'Add to'} favorites">${favorites.includes(facility.id) ? '♥' : '♡'}</button></div>
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
          <a class="btn btn-primary" href="${pageUrl(`facility.html?id=${encodeURIComponent(facility.id)}`)}">View profile</a>
          <button class="btn btn-ghost compare-btn ${compare.includes(facility.id) ? 'active' : ''}" data-compare="${facility.id}" aria-pressed="${compare.includes(facility.id)}">${compare.includes(facility.id) ? 'Added' : 'Compare'}</button>
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
      button.textContent = values.includes(id) ? '♥' : '♡';
      button.setAttribute('aria-pressed', String(values.includes(id)));
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
      button.setAttribute('aria-pressed', String(values.includes(id)));
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

// Reuse one observer for dynamically rendered cards and respect reduced motion.
let revealObserver;
export function initReveal() {
  if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  revealObserver ||= new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) {
      entry.target.classList.add('revealed'); revealObserver.unobserve(entry.target);
    }
  }, {threshold: .08});
  document.querySelectorAll('.reveal:not(.revealed)').forEach(el => revealObserver.observe(el));
}

export function formatHours(value) {
  return value === 'Closed' || value === '24 Hours' ? value : value.replace('-', ' – ');
}
