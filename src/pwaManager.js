/**
 * pwaManager.js — PWA Service Worker Registration & Installation Manager.
 * Handles beforeinstallprompt events, platform detection (iOS/Android/Desktop),
 * offline cache readiness, and interactive modal installation instructions.
 */

export class PWAManager {
  constructor() {
    this.deferredPrompt = null;
    this.init();
  }

  init() {
    this.registerServiceWorker();
    this.listenInstallPrompt();
    this.bindUIEvents();
  }

  registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
          .then((reg) => {
            console.log('[PWA] Service Worker registered successfully:', reg.scope);
          })
          .catch((err) => {
            console.warn('[PWA] Service Worker registration failed:', err);
          });
      });
    }
  }

  listenInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this.updateInstallButtons(false);
    });

    window.addEventListener('appinstalled', () => {
      this.deferredPrompt = null;
      this.updateInstallButtons(true);
      console.log('[PWA] Arcade FX installed as PWA app successfully!');
    });
  }

  detectPlatform() {
    const ua = navigator.userAgent || '';
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
    const isAndroid = /Android/.test(ua);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;

    if (isStandalone) return 'ALREADY_INSTALLED';
    if (isIOS) return 'IOS';
    if (isAndroid) return 'ANDROID';
    return 'DESKTOP';
  }

  openInstallModal() {
    const modal = document.getElementById('pwaModal');
    if (!modal) return;

    const platform = this.detectPlatform();

    // Hide all step views first
    document.getElementById('pwaInstIOS').style.display = 'none';
    document.getElementById('pwaInstAndroid').style.display = 'none';
    document.getElementById('pwaInstDesktop').style.display = 'none';
    document.getElementById('pwaInstAlready').style.display = 'none';

    if (platform === 'ALREADY_INSTALLED') {
      document.getElementById('pwaInstAlready').style.display = 'block';
    } else if (platform === 'IOS') {
      document.getElementById('pwaInstIOS').style.display = 'block';
    } else if (platform === 'ANDROID') {
      document.getElementById('pwaInstAndroid').style.display = 'block';
    } else {
      document.getElementById('pwaInstDesktop').style.display = 'block';
    }

    modal.classList.add('active');

    // Trigger native prompt if available
    if (this.deferredPrompt) {
      this.deferredPrompt.prompt();
      this.deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('[PWA] User accepted the install prompt');
        }
        this.deferredPrompt = null;
      });
    }
  }

  closeInstallModal() {
    const modal = document.getElementById('pwaModal');
    if (modal) {
      modal.classList.remove('active');
    }
  }

  updateInstallButtons(isInstalled) {
    const installBtns = document.querySelectorAll('#pwaInstallBtn, #sidebarInstallBtn, .btn-pwa-install-trigger');

    installBtns.forEach(btn => {
      if (isInstalled) {
        btn.classList.add('installed');
        const label = btn.querySelector('.btn-label') || btn.querySelector('span:last-child');
        if (label) label.innerText = 'App Installed';
      }
    });
  }

  bindUIEvents() {
    const installBtns = document.querySelectorAll('#pwaInstallBtn, #sidebarInstallBtn, .btn-pwa-install-trigger');
    const closeBtn = document.getElementById('pwaModalCloseBtn');
    const modal = document.getElementById('pwaModal');

    installBtns.forEach(btn => {
      btn.onclick = (e) => {
        e.preventDefault();
        this.openInstallModal();
      };
    });

    if (closeBtn) closeBtn.onclick = () => this.closeInstallModal();

    if (modal) {
      modal.onclick = (e) => {
        if (e.target === modal) this.closeInstallModal();
      };
    }
  }
}
