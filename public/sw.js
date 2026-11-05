/**
 * Service Worker for Quản Lý Dòng Họ Đàm An PWA
 * Handles background lifecycle and Web Push Notifications for Android (Chrome) & iOS (Safari 16.4+)
 */

const STATIC_CACHE = 'dodo-static-v2';
const PAGE_CACHE = 'dodo-pages-v2';
const API_CACHE = 'dodo-api-v2';
const CURRENT_CACHES = [STATIC_CACHE, PAGE_CACHE, API_CACHE];

// Read-only data worth having offline (e.g. viewing the tree at the family altar
// with poor signal). Cached network-first, so online users always get fresh data.
const OFFLINE_API = [/^\/api\/persons\/tree/, /^\/api\/persons\/\d+$/, /^\/api\/homepage\/data/, /^\/api\/anniversaries/, /^\/api\/posts/];

// 1. Install Event: Skip waiting to activate immediately without waiting for page reload
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// 2. Activate Event: Claim clients immediately so this SW controls all active tabs
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      // Clean up old caches if any
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((name) => {
            if (!CURRENT_CACHES.includes(name)) {
              return caches.delete(name);
            }
          })
        );
      })
    ])
  );
});

// Offline support: hashed assets cache-first, pages and selected API GETs network-first
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Cached member data must not outlive the session on a shared phone
  if (request.method === 'POST' && url.pathname === '/api/auth/logout') {
    event.waitUntil(caches.delete(API_CACHE));
    return;
  }
  if (request.method !== 'GET') return;

  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
  } else if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, PAGE_CACHE));
  } else if (OFFLINE_API.some((re) => re.test(url.pathname))) {
    event.respondWith(networkFirst(request, API_CACHE));
  }
});

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) (await caches.open(cacheName)).put(request, response.clone());
  return response;
}

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) (await caches.open(cacheName)).put(request, response.clone());
    return response;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (request.mode === 'navigate') {
      const home = await caches.match('/');
      if (home) return home;
    }
    throw err;
  }
}

// 3. Push Event: Listen for server push messages and show notifications
self.addEventListener('push', (event) => {
  let data = {};

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = {
        title: 'Thông báo Dòng Họ Đàm An',
        body: event.data.text()
      };
    }
  }

  const title = data.title || 'Thông báo Dòng Họ Đàm An';
  const options = {
    body: data.body || 'Bạn có thông báo mới từ tộc phả dòng họ.',
    icon: data.icon || '/icons/icon-192x192.png',
    badge: data.badge || '/icons/badge-72x72.png',
    vibrate: [200, 100, 200],
    tag: data.tag || `dodo-push-${Date.now()}`,
    renotify: true,
    data: {
      url: data.url || '/',
      dateOfArrival: Date.now()
    },
    actions: [
      { action: 'open', title: 'Xem chi tiết' },
      { action: 'close', title: 'Đóng' }
    ]
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// 4. Notification Click Event: Close notification and navigate to target URL
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  const rawUrl = event.notification.data && event.notification.data.url ? event.notification.data.url : '/';
  const targetUrl = new URL(rawUrl, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open with the same origin, focus it and navigate
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client && client.url !== targetUrl) {
            return client.navigate(targetUrl);
          }
          return;
        }
      }
      // Otherwise open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
