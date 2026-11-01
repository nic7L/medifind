import { getFacilities, upsertFacility, deleteFacility, getAllFeedback, deleteFeedback, isAdminLoggedIn, setAdminLoggedIn, resetDemoData, ensureSeeded } from './storage.js';
import { escapeHtml, toast, ratingData } from './ui.js';

let editingId = null;

function showView() {
  const loggedIn = isAdminLoggedIn();
  document.querySelector('[data-admin-login]').hidden = loggedIn;
  document.querySelector('[data-admin-dashboard]').hidden = !loggedIn;
  if (loggedIn) renderDashboard();
}

function renderDashboard() {
  const facilities = getFacilities();
  document.querySelector('[data-admin-stat="facilities"]').textContent = facilities.length;
  document.querySelector('[data-admin-stat="verified"]').textContent = facilities.filter((f) => f.verified).length;
  document.querySelector('[data-admin-stat="feedback"]').textContent = Object.values(getAllFeedback()).reduce((sum, list) => sum + list.length, 0);
  document.querySelector('[data-admin-table]').innerHTML = facilities.map((f) => `<tr>
    <td><strong>${escapeHtml(f.name)}</strong><small>${escapeHtml(f.id)}</small></td><td>${escapeHtml(f.category)}</td><td>${escapeHtml(f.city)}</td><td>${ratingData(f).rating.toFixed(1)}</td><td><button class="verified-badge ${f.verified ? 'verified' : 'unverified'}" data-toggle-verified="${f.id}">${f.verified ? '✓ Verified' : 'Unverified'}</button></td><td class="admin-actions"><button class="text-btn" data-edit="${f.id}">Edit</button><button class="text-btn danger" data-delete="${f.id}">Delete</button></td>
  </tr>`).join('');
  bindRows();
  renderFeedbackAdmin();
}

function renderFeedbackAdmin() {
  const all = getAllFeedback();
  const facilities = getFacilities();
  const entries = Object.entries(all).flatMap(([facilityId, items]) => items.map((item) => ({ ...item, facilityId })));
  const root = document.querySelector('[data-feedback-admin]');
  root.innerHTML = entries.length ? entries.slice().reverse().map((item) => {
    const f = facilities.find((value) => value.id === item.facilityId);
    return `<article class="admin-feedback"><div><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(f?.name || item.facilityId)} · ${item.rating}★</small></div><p>${escapeHtml(item.comment)}</p><button class="text-btn danger" data-delete-feedback="${item.facilityId}|${item.id}">Delete feedback</button></article>`;
  }).join('') : '<p class="muted">No browser-local feedback has been submitted yet.</p>';
  root.querySelectorAll('[data-delete-feedback]').forEach((button) => button.addEventListener('click', () => {
    const [facilityId, id] = button.dataset.deleteFeedback.split('|');
    deleteFeedback(facilityId, id); toast('Feedback deleted'); renderDashboard();
  }));
}

function bindRows() {
  document.querySelectorAll('[data-toggle-verified]').forEach((button) => button.addEventListener('click', () => {
    const f = getFacilities().find((value) => value.id === button.dataset.toggleVerified);
    upsertFacility({ ...f, verified: !f.verified }); renderDashboard();
  }));
  document.querySelectorAll('[data-edit]').forEach((button) => button.addEventListener('click', () => openEditor(button.dataset.edit)));
  document.querySelectorAll('[data-delete]').forEach((button) => button.addEventListener('click', () => {
    const f = getFacilities().find((value) => value.id === button.dataset.delete);
    if (confirm(`Delete ${f.name}? This also removes its local feedback.`)) { deleteFacility(f.id); toast('Facility deleted'); renderDashboard(); }
  }));
}

function openEditor(id = null) {
  editingId = id;
  const dialog = document.querySelector('#facility-editor');
  const form = dialog.querySelector('form');
  form.reset();
  const f = id ? getFacilities().find((value) => value.id === id) : null;
  dialog.querySelector('[data-editor-title]').textContent = f ? 'Edit facility' : 'Add facility';
  if (f) {
    ['name','category','area','city','address','phone','email','website','description'].forEach((key) => { form.elements[key].value = f[key] || ''; });
    form.elements.services.value = (f.services || []).join(', ');
    form.elements.verified.checked = Boolean(f.verified);
    form.elements.rating.value = Number(f.rating || 4.2);
    form.elements.weekday.value = f.hours?.Mon || '09:00-18:00';
    form.elements.saturday.value = f.hours?.Sat || '09:00-14:00';
    form.elements.sunday.value = f.hours?.Sun || 'Closed';
  }
  dialog.showModal();
}

function saveEditor(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  const old = editingId ? getFacilities().find((f) => f.id === editingId) : null;
  const id = editingId || `mf-${Date.now()}`;
  const rating = Number(data.get('rating') || 4.2);
  const reviewCount = old?.reviewCount || 0;
  const facility = {
    id,
    name: data.get('name').trim(),
    description: data.get('description').trim(),
    category: data.get('category'),
    photo: old?.photo || 'assets/placeholder.svg',
    services: data.get('services').split(',').map((v) => v.trim()).filter(Boolean),
    address: data.get('address').trim(), area: data.get('area').trim(), city: data.get('city').trim(),
    phone: data.get('phone').trim(), email: data.get('email').trim(), website: data.get('website').trim() || 'https://example.com',
    hours: { Mon:data.get('weekday'), Tue:data.get('weekday'), Wed:data.get('weekday'), Thu:data.get('weekday'), Fri:data.get('weekday'), Sat:data.get('saturday'), Sun:data.get('sunday') },
    rating, reviewCount, ratingBreakdown: old?.ratingBreakdown || { 5:0, 4:0, 3:0, 2:0, 1:0 },
    verified: data.get('verified') === 'on', emergency: false
  };
  upsertFacility(facility);
  document.querySelector('#facility-editor').close();
  toast(editingId ? 'Facility updated' : 'Facility added');
  editingId = null;
  renderDashboard();
}

window.addEventListener('medifind:ready', () => {
  showView();
  document.querySelector('[data-admin-login] form').addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    if (data.get('username') === 'admin' && data.get('password') === 'medifind326') { setAdminLoggedIn(true); toast('Demo admin session started'); showView(); }
    else toast('Incorrect demo credentials', 'error');
  });
  document.querySelector('[data-admin-logout]').addEventListener('click', () => { setAdminLoggedIn(false); showView(); });
  document.querySelector('[data-add-facility]').addEventListener('click', () => openEditor());
  document.querySelector('#facility-editor form').addEventListener('submit', saveEditor);
  document.querySelector('[data-close-editor]').addEventListener('click', () => document.querySelector('#facility-editor').close());
  document.querySelector('[data-reset-demo]').addEventListener('click', async () => {
    if (!confirm('Reset all facilities, favorites, comparisons and feedback to the original sample data?')) return;
    resetDemoData(); await ensureSeeded(); setAdminLoggedIn(true); toast('Demo data reset'); renderDashboard();
  });
});
