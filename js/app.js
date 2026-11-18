import { ensureSeeded, markReady, basePath, getTheme, setTheme, getFacilities, getCompare } from './storage.js';
import { pageUrl, toast, initReveal, updateCompareCount, escapeHtml, isOpenNow } from './ui.js';

import { initCatDoc } from './catdoc.js';

function renderShell() {
  const header = document.querySelector('[data-site-header]');
  if (header) {
    header.innerHTML = `
      <a class="skip-link" href="#main">Skip to content</a>
      <nav class="site-nav container" aria-label="Primary navigation">
        <a class="brand" href="${basePath}/index.html" aria-label="MediFind home"><span class="brand-mark">+</span><span>MediFind</span></a>
        <button class="nav-toggle" aria-expanded="false" aria-controls="nav-links" aria-label="Open navigation">☰</button>
        <div class="nav-links" id="nav-links">
          <a href="${basePath}/index.html">Home</a>
          <a href="${pageUrl('directory.html')}">Directory</a>
          <a href="${pageUrl('compare.html')}">Compare <span class="count-pill" data-compare-count>0</span></a>
          <a href="${pageUrl('about.html')}">About</a>
          <a href="${pageUrl('admin.html')}">Admin</a>
        </div>
        <div class="nav-tools">
          <button class="icon-btn command-trigger" type="button" aria-label="Open search command palette">⌕<span class="kbd-hint">Ctrl/⌘ K</span></button>
          <button class="icon-btn theme-toggle" type="button" aria-label="Toggle light and dark theme">◐</button>
        </div>
      </nav>`;
  }

  const footer = document.querySelector('[data-site-footer]');
  if (footer) footer.innerHTML = `<div class="container footer-inner">CSE326 Project, Team Veronic, Sunil, Sushanth</div>`;

  const notice = document.createElement('div');
  notice.className = 'demo-strip';
  notice.textContent = 'Academic demonstration • Fictional listings, contacts, ratings and verification';
  header.after(notice);
}

function initNavigation() {
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  toggle?.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!open));
    links?.classList.toggle('open', !open);
  });

  const current = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach((link) => {
    const href = link.getAttribute('href') || '';
    if (href.endsWith(current)) link.setAttribute('aria-current', 'page');
  });
}

function initTheme() {
  const apply = (theme) => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('.theme-toggle')?.setAttribute('aria-pressed', String(theme === 'dark'));
    setTheme(theme);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0B1210' : '#EAF3EE');
  };
  apply(getTheme());
  document.querySelector('.theme-toggle')?.addEventListener('click', () => {
    apply(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
    toast(`Switched to ${document.documentElement.dataset.theme} theme`);
  });
}

function initCommandPalette() {
  const dialog = document.createElement('dialog');
  dialog.className = 'command-palette';
  dialog.setAttribute('aria-label', 'Search directory');
  dialog.innerHTML = `
    <div class="command-head"><span>⌕</span><input type="search" aria-label="Search facilities" placeholder="Search a clinic, lab, pharmacy or service…"><button type="button" class="icon-btn" data-close aria-label="Close">×</button></div>
    <div class="command-results" aria-label="Search results"></div>
    <div class="command-foot"><span><kbd>↑</kbd><kbd>↓</kbd> navigate</span><span><kbd>Enter</kbd> open</span><span><kbd>Esc</kbd> close</span></div>`;
  document.body.append(dialog);
  const input = dialog.querySelector('input');
  const results = dialog.querySelector('.command-results');
  let active = 0;
  let matches = [];

  const draw = () => {
    const q = input.value.trim().toLowerCase();
    matches = getFacilities().filter((f) => !q || [f.name, f.category, f.area, f.city, ...(f.services || [])].join(' ').toLowerCase().includes(q)).slice(0, 8);
    active = Math.min(active, Math.max(0, matches.length - 1));
    results.innerHTML = matches.length ? matches.map((f, i) => `
      <button class="command-item ${i === active ? 'active' : ''}" type="button" aria-current="${i === active ? 'true' : 'false'}" data-id="${f.id}">
        <span><strong>${escapeHtml(f.name)}</strong><small>${escapeHtml(f.category)} · ${escapeHtml(f.area)}, ${escapeHtml(f.city)}</small></span><span>↗</span>
      </button>`).join('') : '<p class="empty-state">No matching facilities.</p>';
  };

  const open = () => { if (dialog.open) return; active = 0; draw(); dialog.showModal(); setTimeout(() => input.focus(), 30); };
  const close = () => dialog.close();
  document.querySelector('.command-trigger')?.addEventListener('click', open);
  dialog.querySelector('[data-close]').addEventListener('click', close);
  dialog.addEventListener('click', (event) => { if (event.target === dialog) close(); });
  input.addEventListener('input', () => { active = 0; draw(); });
  results.addEventListener('click', (event) => {
    const item = event.target.closest('[data-id]');
    if (item) location.href = pageUrl(`facility.html?id=${encodeURIComponent(item.dataset.id)}`);
  });
  dialog.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown') { event.preventDefault(); active = Math.max(0, Math.min(active + 1, matches.length - 1)); draw(); }
    if (event.key === 'ArrowUp') { event.preventDefault(); active = Math.max(active - 1, 0); draw(); }
    if (event.key === 'Enter' && matches[active]) { event.preventDefault(); location.href = pageUrl(`facility.html?id=${encodeURIComponent(matches[active].id)}`); }
  });
  document.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); dialog.open ? close() : open(); }
  });
}

function initPageTransitions() {
  window.addEventListener('pageshow', () => document.body.classList.remove('page-leaving'));
  document.addEventListener('click', event => {
    const link = event.target.closest('a');
    if (!link || event.defaultPrevented || event.button !== 0 || link.target || link.hasAttribute('download') || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const href = link.getAttribute('href') || '';
    if (!href || href.startsWith('#') || link.origin !== location.origin || !/^https?:/.test(link.protocol)) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    event.preventDefault(); document.body.classList.add('page-leaving');
    setTimeout(() => { location.href = link.href; }, 130);
  });
}

function initCursor() {
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const cursor = document.createElement('div'); cursor.className = 'cursor-follower'; cursor.setAttribute('aria-hidden', 'true'); document.body.append(cursor);
  document.addEventListener('pointermove', e => {
    cursor.style.left = `${e.clientX}px`; cursor.style.top = `${e.clientY}px`;
    cursor.classList.add('visible'); cursor.classList.toggle('over-link', Boolean(e.target.closest('a,button')));
  });
  document.documentElement.addEventListener('pointerleave', () => cursor.classList.remove('visible'));
}

function refreshStatuses() {
  const facilities = getFacilities();
  document.querySelectorAll('[data-open-id]').forEach(node => {
    const facility = facilities.find(f => f.id === node.dataset.openId);
    if (!facility) return;
    const open = isOpenNow(facility);
    node.textContent = open ? 'Open now' : 'Closed'; node.classList.toggle('open', open); node.classList.toggle('closed', !open);
  });
}

async function boot() {
  renderShell();
  initTheme();
  initNavigation();
  initCursor();
  initPageTransitions();
  try {
    await ensureSeeded();
    updateCompareCount();
    initCommandPalette();
    initCatDoc();
    initReveal();
    setInterval(refreshStatuses, 15000);
    markReady();
  } catch (error) {
    document.querySelectorAll('.skeleton').forEach(node => node.hidden = true);
    const message = document.createElement('p'); message.className = 'container empty-card'; message.setAttribute('role','alert'); message.textContent = 'The directory could not load. Open this site using an HTTP server or GitHub Pages, and reload.'; document.querySelector('main').prepend(message);
    toast('MediFind data could not be loaded. Run the project through a local web server.', 'error');
  }
}

boot();
