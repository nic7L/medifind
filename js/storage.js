const KEYS = {
  facilities: 'medifind.facilities.v1',
  feedback: 'medifind.feedback.v1',
  favorites: 'medifind.favorites.v1',
  compare: 'medifind.compare.v1',
  theme: 'medifind.theme.v1',
  admin: 'medifind.admin.session.v1'
};

export const basePath = document.documentElement.dataset.base || '.';

function read(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent('medifind:storage', { detail: { key, value } }));
  return value;
}

export async function ensureSeeded() {
  const existing = read(KEYS.facilities, null);
  if (Array.isArray(existing) && existing.length) return existing;

  const response = await fetch(`${basePath}/data/facilities.json`, { cache: 'no-store' });
  if (!response.ok) throw new Error('Unable to load facility data.');
  const facilities = await response.json();
  write(KEYS.facilities, facilities);
  if (!localStorage.getItem(KEYS.feedback)) write(KEYS.feedback, {});
  if (!localStorage.getItem(KEYS.favorites)) write(KEYS.favorites, []);
  if (!localStorage.getItem(KEYS.compare)) write(KEYS.compare, []);
  return facilities;
}

export const getFacilities = () => read(KEYS.facilities, []);
export const saveFacilities = (items) => write(KEYS.facilities, items);
export const getFacility = (id) => getFacilities().find((item) => item.id === id);

export function upsertFacility(facility) {
  const items = getFacilities();
  const index = items.findIndex((item) => item.id === facility.id);
  if (index >= 0) items[index] = facility;
  else items.push(facility);
  return saveFacilities(items);
}

export function deleteFacility(id) {
  const items = getFacilities().filter((item) => item.id !== id);
  write(KEYS.compare, getCompare().filter((value) => value !== id));
  write(KEYS.favorites, getFavorites().filter((value) => value !== id));
  const feedback = getAllFeedback();
  delete feedback[id];
  write(KEYS.feedback, feedback);
  return saveFacilities(items);
}

export const getAllFeedback = () => read(KEYS.feedback, {});
export const getFeedback = (id) => getAllFeedback()[id] || [];

export function addFeedback(id, entry) {
  const all = getAllFeedback();
  all[id] = [...(all[id] || []), entry];
  write(KEYS.feedback, all);
  return all[id];
}

export function deleteFeedback(id, feedbackId) {
  const all = getAllFeedback();
  all[id] = (all[id] || []).filter((entry) => entry.id !== feedbackId);
  write(KEYS.feedback, all);
  return all[id];
}

export const getFavorites = () => read(KEYS.favorites, []);
export function toggleFavorite(id) {
  const values = getFavorites();
  const next = values.includes(id) ? values.filter((value) => value !== id) : [...values, id];
  return write(KEYS.favorites, next);
}

export const getCompare = () => read(KEYS.compare, []);
export function toggleCompare(id) {
  const values = getCompare();
  if (values.includes(id)) return write(KEYS.compare, values.filter((value) => value !== id));
  if (values.length >= 3) return values;
  return write(KEYS.compare, [...values, id]);
}
export const clearCompare = () => write(KEYS.compare, []);

export const getTheme = () => localStorage.getItem(KEYS.theme) || 'dark';
export function setTheme(theme) {
  localStorage.setItem(KEYS.theme, theme);
}

export const isAdminLoggedIn = () => sessionStorage.getItem(KEYS.admin) === 'true';
export const setAdminLoggedIn = (value) => sessionStorage.setItem(KEYS.admin, String(Boolean(value)));

export function resetDemoData() {
  Object.values(KEYS).forEach((key) => localStorage.removeItem(key));
  sessionStorage.removeItem(KEYS.admin);
}
