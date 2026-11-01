import { getCompare, getFacilities, toggleCompare, clearCompare } from './storage.js';
import { escapeHtml, isOpenNow, ratingData, stars, pageUrl, updateCompareCount, toast } from './ui.js';

function render() {
  const ids = getCompare();
  const all = getFacilities();
  const items = ids.map((id) => all.find((f) => f.id === id)).filter(Boolean);
  const root = document.querySelector('[data-compare-root]');
  const picker = document.querySelector('#compare-picker');
  picker.innerHTML = '<option value="">Add a facility…</option>' + all.filter((f) => !ids.includes(f.id)).map((f) => `<option value="${f.id}">${escapeHtml(f.name)} — ${escapeHtml(f.city)}</option>`).join('');
  document.querySelector('[data-compare-limit]').textContent = `${items.length}/3 selected`;
  if (!items.length) {
    root.innerHTML = `<div class="empty-card glass"><h2>No facilities selected</h2><p>Add up to three facilities from the directory or use the selector above.</p><a class="btn btn-primary" href="${pageUrl('directory.html')}">Browse directory</a></div>`;
    return;
  }
  root.innerHTML = `
    <div class="compare-table-wrap glass">
      <table class="compare-table">
        <thead><tr><th>Detail</th>${items.map((f) => `<th><span class="category-chip">${escapeHtml(f.category)}</span><h2>${escapeHtml(f.name)}</h2><button class="text-btn" data-remove="${f.id}">Remove</button></th>`).join('')}</tr></thead>
        <tbody>
          ${row('Status', items, (f) => `<span class="status-badge ${isOpenNow(f) ? 'open' : 'closed'}">${isOpenNow(f) ? 'Open now' : 'Closed'}</span>`)}
          ${row('Verified', items, (f) => f.verified ? '<span class="verified-badge verified">✓ Verified</span>' : '<span class="verified-badge unverified">Unverified</span>')}
          ${row('Rating', items, (f) => { const d = ratingData(f); return `${stars(d.rating)}<br><strong>${d.rating.toFixed(1)}</strong> <span class="muted">(${d.count})</span>`; })}
          ${row('Location', items, (f) => `${escapeHtml(f.area)}, ${escapeHtml(f.city)}`)}
          ${row('Hours today', items, (f) => f.hours[['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date().getDay()]])}
          ${row('Services', items, (f) => `<ul class="mini-list">${f.services.map((s) => `<li>${escapeHtml(s)}</li>`).join('')}</ul>`)}
          ${row('Contact', items, (f) => `<a href="tel:${f.phone.replace(/\s/g, '')}">${escapeHtml(f.phone)}</a><br><a href="mailto:${escapeHtml(f.email)}">Email</a>`)}
          ${row('Profile', items, (f) => `<a class="btn btn-primary" href="${pageUrl(`facility.html?id=${encodeURIComponent(f.id)}`)}">View</a>`)}
        </tbody>
      </table>
    </div>`;
  root.querySelectorAll('[data-remove]').forEach((button) => button.addEventListener('click', () => { toggleCompare(button.dataset.remove); updateCompareCount(); render(); }));
}

function row(label, items, formatter) {
  return `<tr><th scope="row">${label}</th>${items.map((f) => `<td>${formatter(f)}</td>`).join('')}</tr>`;
}

window.addEventListener('medifind:ready', () => {
  render();
  document.querySelector('#compare-picker').addEventListener('change', (event) => {
    if (!event.target.value) return;
    const before = getCompare();
    const values = toggleCompare(event.target.value);
    if (values.length === before.length) toast('You can compare up to 3 facilities.', 'warning');
    updateCompareCount(); render();
  });
  document.querySelector('[data-clear-compare]').addEventListener('click', () => { clearCompare(); updateCompareCount(); render(); });
});
