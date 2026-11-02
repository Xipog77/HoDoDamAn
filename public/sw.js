/**
 * Service Worker for Quản Lý Dòng Họ Đàm An PWA
 * Handles background lifecycle and Web Push Notifications for Android (Chrome) & iOS (Safari 16.4+)
 */

const CACHE_NAME = 'dodo-pwa-v1';

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
            if (name !== CACHE_NAME) {
              return caches.delete(name);
            }
          })
        );
      })
    ])
  );
});

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
