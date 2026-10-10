/**
 * BEACON Quest V2 — Service Worker (/sw.js)
 * Enables Android PWA installation (WebAPK / Standalone App Mode) and
 * provides Network-First with Offline Cache Fallback for core shell & workouts.
 */

const CACHE_NAME = 'beacon-quest-v2-20261010v1';
const CORE_SHELL_URLS = [
  '/',
  '/manifest.json',
  '/static/css/v2_styles.css',
  '/static/js/state_and_telemetry.js',
  '/static/js/v1_math_bank.js',
  '/static/js/student_ui.js',
  '/static/js/parent_dashboard.js',
  '/static/icons/icon-192.png',
  '/static/icons/icon-512.png',
  '/static/icons/icon.svg'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        CORE_SHELL_URLS.map((url) =>
          fetch(url, { cache: 'reload' }).then((res) => {
            if (res && res.ok) {
              return cache.put(url, res);
            }
          })
        )
      );
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Never intercept mutable student progress API calls (state_and_telemetry.js handles localStorage fallback)
  if (
    url.pathname.startsWith('/api/v2/progress') ||
    url.pathname.startsWith('/api/v2/trial') ||
    url.pathname.startsWith('/api/v2/queue') ||
    url.pathname.startsWith('/api/v2/reset') ||
    url.pathname.startsWith('/api/progress') ||
    url.pathname.startsWith('/api/reset')
  ) {
    return;
  }

  // Network-First with Cache Fallback for navigation, static assets, curriculum, and workouts
  event.respondWith(
    fetch(req)
      .then((networkRes) => {
        if (networkRes && networkRes.status === 200 && url.origin === self.location.origin) {
          const resClone = networkRes.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(req, resClone);
          });
        }
        return networkRes;
      })
      .catch(() =>
        caches.match(req).then((cachedRes) => {
          if (cachedRes) return cachedRes;
          if (req.mode === 'navigate') {
            return caches.match('/');
          }
          return new Response('Offline', { status: 503, statusText: 'Offline' });
        })
      )
  );
});
