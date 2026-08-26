const sidebar = document.getElementById('sidebarNav');
const toggle = document.getElementById('sidebarToggleBtn');
const mobile = document.getElementById('mobileMenuBtn');
const overlay = document.getElementById('sidebarOverlay');
const desktop = window.matchMedia('(min-width: 1025px)');
const apply = () => {
  const collapsed = localStorage.getItem('arcadefx_sidebar_collapsed') === 'true';
  document.body.classList.toggle('sidebar-collapsed', collapsed && desktop.matches);
  if (toggle) { toggle.setAttribute('aria-expanded', String(!collapsed)); toggle.setAttribute('aria-label', `${collapsed ? 'Expand' : 'Collapse'} sidebar`); }
};
const closeMobile = () => { sidebar?.classList.remove('open'); overlay?.classList.remove('open'); document.body.classList.remove('menu-open'); };
toggle?.addEventListener('click', () => { localStorage.setItem('arcadefx_sidebar_collapsed', String(!document.body.classList.contains('sidebar-collapsed'))); apply(); });
mobile?.addEventListener('click', () => { sidebar?.classList.toggle('open'); overlay?.classList.toggle('open'); document.body.classList.toggle('menu-open'); });
import { initSidebarLiveClock } from './liveClock.js';

import { settingsStore } from './data/SettingsStore.js';

overlay?.addEventListener('click', closeMobile);
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeMobile(); });
desktop.addEventListener('change', apply);
apply();
initSidebarLiveClock();

// Header Quick Theme Toggle Button Handler (Works across News, Tools, Signals, Alerts, etc.)
const headerThemeToggleBtn = document.getElementById('headerThemeToggleBtn');
const themeToggleIcon = document.getElementById('themeToggleIcon');

const updateHeaderThemeIcon = () => {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  if (themeToggleIcon) {
    themeToggleIcon.innerText = isDark ? '🌙' : '☀️';
  }
};

if (headerThemeToggleBtn) {
  updateHeaderThemeIcon();
  headerThemeToggleBtn.onclick = () => {
    const effective = settingsStore.resolveEffectiveTheme();
    const nextTheme = effective === 'dark' ? 'light' : 'dark';
    settingsStore.set('theme', nextTheme);
    updateHeaderThemeIcon();
  };
}

settingsStore.subscribe(() => {
  updateHeaderThemeIcon();
});

// Environment-aware navigation resolution for static preview & local hosts
document.addEventListener('click', (e) => {
  const link = e.target.closest('a[href*=".php"]');
  if (link && (window.location.pathname.endsWith('.html') || window.location.protocol === 'file:')) {
    const rawHref = link.getAttribute('href');
    if (rawHref && rawHref.includes('.php')) {
      const targetHtml = rawHref.replace(/\.php(\?.*)?$/, '.html$1');
      e.preventDefault();
      window.location.href = targetHtml;
    }
  }
});
