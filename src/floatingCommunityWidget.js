/**
 * floatingCommunityWidget.js — Global Floating WhatsApp & Telegram Widget
 * Mounts fixed bottom-right floating community icons across Arcade FX.
 */

import { COMMUNITY_LINKS } from './config/community.js';

export function initFloatingCommunityWidget() {
  if (typeof document === 'undefined') return;
  if (window.location.pathname.toLowerCase().includes('trading') || document.body.classList.contains('trading-page')) {
    return;
  }

  if (document.getElementById('floatingCommunityWidget')) {
    return;
  }

  const widget = document.createElement('div');
  widget.id = 'floatingCommunityWidget';
  widget.className = 'floating-community-widget';

  widget.innerHTML = `
    <a href="${COMMUNITY_LINKS.whatsapp}"
       target="_blank"
       rel="noopener noreferrer"
       class="floating-community-btn whatsapp-btn"
       aria-label="Join Arcade FX WhatsApp Community"
       title="Join Arcade FX WhatsApp Community">
      <svg class="community-icon" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.81 9.81 0 0012.04 2zm5.82 14.07c-.24.68-1.22 1.25-2.02 1.33-.55.06-1.27.1-3.69-.87-3.09-1.24-5.07-4.38-5.23-4.59-.15-.2-1.25-1.67-1.25-3.19 0-1.52.79-2.26 1.07-2.57.28-.31.61-.39.81-.39.2 0 .4.01.57.01.18 0 .43-.07.67.51.24.59.82 2.01.89 2.16.07.15.12.33.02.53-.1.2-.15.33-.3.51-.15.18-.32.39-.46.53-.15.15-.3.31-.13.61.17.3.77 1.27 1.66 2.06 1.14 1.02 2.11 1.34 2.41 1.49.3.15.48.13.66-.08.18-.2.77-.9.98-1.21.2-.31.41-.26.69-.15.28.1.77 1.83 2.07.9.24 1.03.36 1.12.36.76 0 1.44-.57 1.68-1.25z"/>
      </svg>
      <span class="community-btn-tooltip">WhatsApp Community</span>
    </a>
    <a href="${COMMUNITY_LINKS.telegram}"
       target="_blank"
       rel="noopener noreferrer"
       class="floating-community-btn telegram-btn"
       aria-label="Join Affiniti Group Kenya Telegram Community"
       title="Join Affiniti Group Kenya Telegram Community">
      <svg class="community-icon" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.02-1.96 1.25-5.54 3.69-.52.36-1 .54-1.43.53-.48-.01-1.4-.27-2.09-.49-.84-.27-1.51-.42-1.45-.89.03-.25.38-.51 1.07-.78 4.2-1.83 7.01-3.04 8.42-3.63 4.01-1.67 4.84-1.96 5.39-1.97.12 0 .39.03.57.17.15.12.19.28.21.41-.01.06.01.24 0 .38z"/>
      </svg>
      <span class="community-btn-tooltip">Telegram Community</span>
    </a>
  `;

  document.body.appendChild(widget);
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    initFloatingCommunityWidget();
  } else {
    document.addEventListener('DOMContentLoaded', initFloatingCommunityWidget);
  }
}
