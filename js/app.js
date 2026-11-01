import { ensureSeeded, basePath, getTheme, setTheme, getFacilities, getCompare } from './storage.js';
import { pageUrl, toast, initReveal, initTilt, initRipples, updateCompareCount, escapeHtml, isOpenNow } from './ui.js';

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
          <button class="icon-btn command-trigger" type="button" aria-label="Open search command palette">⌕<span class="kbd-hint">⌘K</span></button>
          <button class="icon-btn theme-toggle" type="button" aria-label="Toggle light and dark theme">◐</button>
        </div>
      </nav>`;
  }

  const footer = document.querySelector('[data-site-footer]');
  if (footer) footer.innerHTML = `<div class="container footer-inner">CSE326 Project, Team [Member 1], [Member 2], [Member 3]</div>`;

  if (!document.querySelector('.page-orbs')) {
    const orbs = document.createElement('div');
    orbs.className = 'page-orbs';
    orbs.setAttribute('aria-hidden', 'true');
    orbs.innerHTML = '<span></span><span></span><span></span>';
    document.body.prepend(orbs);
  }
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
    setTheme(theme);
  };
  apply(getTheme());
  document.querySelector('.theme-toggle')?.addEventListener('click', () => {
    apply(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
    toast(`Switched to ${document.documentElement.dataset.theme} theme`);
  });
}

function initCommandPalette() {
  const dialog = document.createElement('dialog');
  dialog.className = 'command-palette glass';
  dialog.innerHTML = `
    <div class="command-head"><span>⌕</span><input type="search" aria-label="Search facilities" placeholder="Search a clinic, lab, pharmacy or service…"><button type="button" class="icon-btn" data-close aria-label="Close">×</button></div>
    <div class="command-results" role="listbox"></div>
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
      <button class="command-item ${i === active ? 'active' : ''}" type="button" role="option" aria-selected="${i === active}" data-id="${f.id}">
        <span><strong>${escapeHtml(f.name)}</strong><small>${escapeHtml(f.category)} · ${escapeHtml(f.area)}, ${escapeHtml(f.city)}</small></span><span>↗</span>
      </button>`).join('') : '<p class="empty-state">No matching facilities.</p>';
  };

  const open = () => { draw(); dialog.showModal(); setTimeout(() => input.focus(), 30); };
  const close = () => dialog.close();
  document.querySelector('.command-trigger')?.addEventListener('click', open);
  dialog.querySelector('[data-close]').addEventListener('click', close);
  dialog.addEventListener('click', (event) => { if (event.target === dialog) close(); });
  input.addEventListener('input', draw);
  results.addEventListener('click', (event) => {
    const item = event.target.closest('[data-id]');
    if (item) location.href = pageUrl(`facility.html?id=${encodeURIComponent(item.dataset.id)}`);
  });
  dialog.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown') { event.preventDefault(); active = Math.min(active + 1, matches.length - 1); draw(); }
    if (event.key === 'ArrowUp') { event.preventDefault(); active = Math.max(active - 1, 0); draw(); }
    if (event.key === 'Enter' && matches[active]) { event.preventDefault(); location.href = pageUrl(`facility.html?id=${encodeURIComponent(matches[active].id)}`); }
  });
  document.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); dialog.open ? close() : open(); }
  });
}

function initChatAssistant() {
  const wrap = document.createElement('div');
  wrap.className = 'chat-widget';
  wrap.innerHTML = `
    <button class="chat-launcher ripple" type="button" aria-expanded="false" aria-label="Open MediFind assistant">✦</button>
    <section class="chat-panel glass" aria-label="MediFind assistant">
      <div class="chat-header"><div><strong>MediFind Assistant</strong><small>Rule-based directory helper</small></div><button type="button" class="icon-btn" data-chat-close aria-label="Close assistant">×</button></div>
      <div class="chat-messages" aria-live="polite"><div class="chat-msg bot">Ask me things like “Find a 24-hour pharmacy” or “Show verified labs in Phagwara”.</div></div>
      <form class="chat-form"><input aria-label="Message" placeholder="Ask about facilities…" required><button class="btn btn-primary ripple" aria-label="Send">➤</button></form>
    </section>`;
  document.body.append(wrap);
  const launch = wrap.querySelector('.chat-launcher');
  const panel = wrap.querySelector('.chat-panel');
  const messages = wrap.querySelector('.chat-messages');
  const input = wrap.querySelector('input');
  const setOpen = (value) => { panel.classList.toggle('open', value); launch.setAttribute('aria-expanded', String(value)); if (value) input.focus(); };
  launch.addEventListener('click', () => setOpen(!panel.classList.contains('open')));
  wrap.querySelector('[data-chat-close]').addEventListener('click', () => setOpen(false));

  const answer = (query) => {
    const q = query.toLowerCase();
    let items = getFacilities();
    if (q.includes('pharmacy')) items = items.filter((f) => f.category === 'Pharmacy');
    else if (q.includes('clinic')) items = items.filter((f) => f.category === 'Clinic');
    else if (q.includes('lab') || q.includes('diagnostic')) items = items.filter((f) => f.category === 'Lab');
    else if (q.includes('support') || q.includes('counselling') || q.includes('physio')) items = items.filter((f) => f.category === 'Support Facility');
    if (q.includes('24-hour') || q.includes('24 hour') || q.includes('24/7')) items = items.filter((f) => Object.values(f.hours || {}).every((v) => v === '24 Hours'));
    if (q.includes('open now')) items = items.filter(isOpenNow);
    if (q.includes('verified')) items = items.filter((f) => f.verified);
    const cities = ['phagwara', 'jalandhar', 'ludhiana', 'amritsar', 'kapurthala'];
    const city = cities.find((value) => q.includes(value));
    if (city) items = items.filter((f) => f.city.toLowerCase() === city);
    const serviceFiltered = items.filter((f) => (f.services || []).some((s) => q.includes(s.toLowerCase().split(' ')[0])));
    if (serviceFiltered.length) items = serviceFiltered;
    items = items.slice(0, 4);
    if (!items.length) return 'I could not find a direct match. Try a category, city, “verified”, “open now”, or “24-hour”.';
    return `I found ${items.length} match${items.length > 1 ? 'es' : ''}: ` + items.map((f) => `<a href="${pageUrl(`facility.html?id=${encodeURIComponent(f.id)}`)}">${escapeHtml(f.name)}</a>`).join(', ') + '.';
  };

  wrap.querySelector('.chat-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const query = input.value.trim();
    if (!query) return;
    messages.insertAdjacentHTML('beforeend', `<div class="chat-msg user">${escapeHtml(query)}</div>`);
    input.value = '';
    setTimeout(() => {
      messages.insertAdjacentHTML('beforeend', `<div class="chat-msg bot">${answer(query)}</div>`);
      messages.scrollTop = messages.scrollHeight;
    }, 180);
  });
}

function initPageTransitions() {
  requestAnimationFrame(() => document.body.classList.add('page-ready'));
  document.addEventListener('click', (event) => {
    const link = event.target.closest('a');
    if (!link || link.target === '_blank' || link.hasAttribute('download') || event.metaKey || event.ctrlKey) return;
    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('http')) return;
    event.preventDefault();
    document.body.classList.remove('page-ready');
    setTimeout(() => { location.href = link.href; }, 130);
  });
}

async function boot() {
  renderShell();
  initTheme();
  initNavigation();
  initRipples();
  initPageTransitions();
  try {
    await ensureSeeded();
    updateCompareCount();
    initCommandPalette();
    initChatAssistant();
    initReveal();
    initTilt();
    window.dispatchEvent(new CustomEvent('medifind:ready'));
  } catch (error) {
    console.error(error);
    toast('MediFind data could not be loaded. Run the project through a local web server.', 'error');
  }
}

boot();
