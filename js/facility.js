import { getFacility, addFeedback, toggleFavorite, getFavorites, toggleCompare, getCompare } from './storage.js';
import { assetUrl, escapeHtml, mapsUrl, isOpenNow, ratingData, stars, formatHours, toast, pageUrl, updateCompareCount } from './ui.js';

let facility;

function render() {
  const root = document.querySelector('[data-facility-detail]');
  const id = new URLSearchParams(location.search).get('id');
  facility = getFacility(id);
  if (!facility) {
    root.innerHTML = `<div class="empty-card glass"><h1>Facility not found</h1><p>The requested profile does not exist or was removed from this demo.</p><a class="btn btn-primary" href="${pageUrl('directory.html')}">Back to directory</a></div>`;
    return;
  }
  document.title = `${facility.name} · MediFind`;
  const data = ratingData(facility);
  const favorite = getFavorites().includes(facility.id);
  const compared = getCompare().includes(facility.id);
  root.innerHTML = `
    <section class="detail-hero glass reveal">
      <div class="detail-image"><img src="${assetUrl(facility.photo)}" alt="Abstract placeholder for ${escapeHtml(facility.name)}"><span class="status-badge ${isOpenNow(facility) ? 'open' : 'closed'}">${isOpenNow(facility) ? 'Open now' : 'Closed'}</span></div>
      <div class="detail-copy">
        <div class="eyebrow-row"><span class="category-chip">${escapeHtml(facility.category)}</span><span class="verified-badge ${facility.verified ? 'verified' : 'unverified'}">${facility.verified ? '✓ Verified' : 'Unverified'}</span></div>
        <h1 class="gradient-text">${escapeHtml(facility.name)}</h1>
        <p>${escapeHtml(facility.description)}</p>
        <div class="rating-line large">${stars(data.rating)} <strong>${data.rating.toFixed(1)}</strong><span class="muted">${data.count} reviews</span></div>
        <div class="detail-actions"><button class="btn btn-primary ripple" data-detail-fav>${favorite ? '♥ Saved' : '♡ Save favorite'}</button><button class="btn btn-ghost" data-detail-compare>${compared ? '✓ In comparison' : '＋ Compare'}</button><a class="btn btn-ghost" href="${mapsUrl(facility)}" target="_blank" rel="noopener">Open in Maps ↗</a></div>
      </div>
    </section>

    <div class="detail-grid">
      <section class="glass panel reveal"><h2>Services</h2><div class="service-tags">${facility.services.map((s) => `<span>${escapeHtml(s)}</span>`).join('')}</div></section>
      <section class="glass panel reveal"><h2>Contact</h2><dl class="info-list"><div><dt>Phone</dt><dd><a href="tel:${facility.phone.replace(/\s/g, '')}">${escapeHtml(facility.phone)}</a></dd></div><div><dt>Email</dt><dd><a href="mailto:${escapeHtml(facility.email)}">${escapeHtml(facility.email)}</a></dd></div><div><dt>Website</dt><dd><a href="${escapeHtml(facility.website)}" target="_blank" rel="noopener">Visit website ↗</a></dd></div><div><dt>Address</dt><dd>${escapeHtml(facility.address)}</dd></div></dl></section>
      <section class="glass panel reveal"><h2>Opening hours</h2><div class="hours-list">${Object.entries(facility.hours).map(([day, value]) => `<div><span>${day}</span><strong>${formatHours(value)}</strong></div>`).join('')}</div></section>
      <section class="glass panel reveal"><h2>Rating breakdown</h2>${ratingBreakdown(data)}</section>
    </div>

    <section class="feedback-section reveal">
      <div class="section-heading"><div><span class="kicker">Community feedback</span><h2>Share your experience</h2></div></div>
      <div class="feedback-grid">
        <form class="glass panel feedback-form" data-feedback-form>
          <label>Your name <input name="name" maxlength="40" placeholder="Your name" required></label>
          <fieldset><legend>Your rating</legend><div class="star-input" role="radiogroup" aria-label="Rating">${[5,4,3,2,1].map((n) => `<input id="star-${n}" type="radio" name="rating" value="${n}" required><label for="star-${n}" aria-label="${n} stars">★</label>`).join('')}</div></fieldset>
          <label>Comment <textarea name="comment" rows="5" maxlength="500" placeholder="What was useful about this facility?" required></textarea></label>
          <button class="btn btn-primary ripple" type="submit">Post feedback</button>
          <small class="muted">Feedback is stored only in this browser using localStorage.</small>
        </form>
        <div class="feedback-list" data-feedback-list></div>
      </div>
    </section>`;
  drawFeedback();
  bind();
}

function ratingBreakdown(data) {
  return `<div class="rating-breakdown">${[5,4,3,2,1].map((n) => {
    const value = Number(data.breakdown[n] || 0);
    const pct = data.count ? (value / data.count) * 100 : 0;
    return `<div><span>${n}★</span><div class="bar"><span style="width:${pct}%"></span></div><small>${value}</small></div>`;
  }).join('')}</div>`;
}

function drawFeedback() {
  const list = document.querySelector('[data-feedback-list]');
  const entries = ratingData(facility).local.slice().reverse();
  list.innerHTML = entries.length ? entries.map((item) => `<article class="glass feedback-card"><div><strong>${escapeHtml(item.name)}</strong><span>${stars(item.rating)}</span></div><p>${escapeHtml(item.comment)}</p><small class="muted">${new Date(item.createdAt).toLocaleString()}</small></article>`).join('') : `<div class="glass empty-card"><h3>No local feedback yet</h3><p>Be the first person using this browser to add a review.</p></div>`;
}

function bind() {
  document.querySelector('[data-detail-fav]').addEventListener('click', (event) => {
    const values = toggleFavorite(facility.id);
    event.currentTarget.textContent = values.includes(facility.id) ? '♥ Saved' : '♡ Save favorite';
    toast(values.includes(facility.id) ? 'Saved to favorites' : 'Removed from favorites');
  });
  document.querySelector('[data-detail-compare]').addEventListener('click', (event) => {
    const before = getCompare();
    const values = toggleCompare(facility.id);
    if (!before.includes(facility.id) && !values.includes(facility.id)) { toast('You can compare up to 3 facilities.', 'warning'); return; }
    event.currentTarget.textContent = values.includes(facility.id) ? '✓ In comparison' : '＋ Compare';
    updateCompareCount();
  });
  document.querySelector('[data-feedback-form]').addEventListener('submit', (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    addFeedback(facility.id, { id: `fb-${Date.now()}`, name: form.get('name').trim(), rating: Number(form.get('rating')), comment: form.get('comment').trim(), createdAt: new Date().toISOString() });
    event.currentTarget.reset();
    toast('Thanks. Your feedback was saved locally.');
    render();
  });
}

window.addEventListener('medifind:ready', () => {
  setTimeout(() => { document.querySelector('[data-facility-skeleton]').hidden = true; document.querySelector('[data-facility-detail]').hidden = false; render(); }, 250);
});
