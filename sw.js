/**
 * Service Worker for Arcade FX PWA
 * Caches core application assets and safe runtime responses for offline operation.
 */

const CACHE_NAME = 'arcade-fx-v2.2.1-signals-engine';

const ASSETS_TO_CACHE = [
  './',
  './css/styles.css',
  './styles.css',
  './manifest.json',
  './Arcade Fx logo.jpeg',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './src/main.js',
  './src/engine.js',
  './src/dashboardEnhancement.js',
  './src/motionEngine.js',
  './src/pwaManager.js',
  './src/signalsController.js',
  './src/data/ApiClient.js',
  './src/data/SettingsStore.js',
  './src/data/MarketDataProvider.js',
  './src/data/MarketDataEngine.js',
  './src/modules/PreviousWeekRange.js',
  './src/modules/PreviousDayRange.js',
  './src/modules/CRTModule.js',
  './src/modules/FVGModule.js',
  './src/modules/OrderBlockModule.js',
  './src/modules/StructureModule.js',
  './src/modules/LiquidityModule.js',
  './src/modules/VolumeModule.js',
  './src/modules/MomentumModule.js',
  './src/modules/DxyCorrelation.js',
  './src/modules/SessionModule.js',
  './src/modules/SignalScoring.js',
  './src/modules/EntryEngine.js',
  './src/modules/RiskManagement.js',
  './src/modules/AlertEngine.js',
  './src/visualizer/SettingsCenter.js',
  './src/visualizer/ChartEngine.js',
  './src/visualizer/TradingViewWidget.js',
  './src/visualizer/DrawingTools.js',
  './src/visualizer/OverlayRenderer.js',
  './src/visualizer/SubpanelRenderer.js',
  './src/visualizer/DebugPanel.js',
  './src/visualizer/WatchlistPanel.js'
];

// Install Event - Pre-cache Assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Pre-caching Arcade FX PWA App Shell');
      return cache.addAll(ASSETS_TO_CACHE).catch(err => {
        console.warn('[ServiceWorker] Pre-cache partial warning:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate Event - Clean Up Old Caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[ServiceWorker] Removing old cache', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Stale-While-Revalidate with Network-First for API
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Network-First for API calls
  if (url.pathname.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const contentType = response.headers.get('Content-Type') || '';
          if (response && response.status === 200 && contentType.startsWith('application/json')) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // HTML documents & navigation routes. Network-first avoids replaying stale cached pages.
  if (event.request.mode === 'navigate' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const contentType = response.headers.get('Content-Type') || '';
          if (response && response.status === 200 && url.origin === self.location.origin && contentType.startsWith('text/html')) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          }
          return response;
        })
        .catch(() => caches.match(event.request).then((cachedResponse) => {
          return cachedResponse || caches.match('./');
        }))
    );
    return;
  }

  // Stale-While-Revalidate for Static Assets & HTML Templates
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && url.origin === self.location.origin) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch((err) => {
        console.warn('[ServiceWorker] Offline fetch fallback:', err);
      });

      return cachedResponse || fetchPromise || caches.match('./');
    })
  );
});
