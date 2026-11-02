/**
 * Frontend PWA & Push Notifications Initializer
 * Quản Lý Dòng Họ Đàm An
 * Compatible with Android (Chrome) and iOS (Safari 16.4+)
 */

(function () {
  'use strict';

  // Helper: Convert Base64 URL to Uint8Array for VAPID applicationServerKey
  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  const PWA = {
    // Check if browser supports Service Worker and Push API
    isSupported: function () {
      return (
        typeof window !== 'undefined' &&
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window
      );
    },

    // Register Service Worker in the background
    registerServiceWorker: async function () {
      if (!this.isSupported()) {
        console.warn('[PWA] Trình duyệt không hỗ trợ Service Worker hoặc Push Notifications.');
        return null;
      }

      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        });
        console.log('[PWA] Service Worker đã đăng ký thành công với scope:', registration.scope);
        return registration;
      } catch (error) {
        console.error('[PWA] Đăng ký Service Worker thất bại:', error);
        return null;
      }
    },

    // Get current Push Subscription status
    getSubscriptionStatus: async function () {
      if (!this.isSupported()) {
        return {
          supported: false,
          permission: 'unsupported',
          isSubscribed: false,
          subscription: null
        };
      }

      const permission = Notification.permission;
      let isSubscribed = false;
      let subscription = null;

      try {
        const registration = await navigator.serviceWorker.ready;
        subscription = await registration.pushManager.getSubscription();
        isSubscribed = subscription !== null;
      } catch (err) {
        console.warn('[PWA] Không lấy được trạng thái Subscription:', err);
      }

      return {
        supported: true,
        permission: permission,
        isSubscribed: isSubscribed,
        subscription: subscription
      };
    },

    /**
     * Request Push Notification permission & Subscribe
     * CRITICAL: Must be invoked directly from a User Gesture (e.g. click button) for iOS Safari 16.4+
     */
    requestPushPermission: async function () {
      if (!this.isSupported()) {
        throw new Error('Thiết bị hoặc trình duyệt của bạn không hỗ trợ tính năng thông báo đẩy.');
      }

      // 1. Request permission via User Gesture
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        throw new Error('Quyền thông báo đã bị từ chối hoặc bỏ qua.');
      }

      // 2. Ensure Service Worker is ready
      const registration = await navigator.serviceWorker.ready;

      // 3. Fetch VAPID Public Key from Backend
      const res = await fetch('/api/notifications/vapid-key');
      if (!res.ok) {
        throw new Error('Không lấy được khóa VAPID từ máy chủ.');
      }
      const data = await res.json();
      const vapidPublicKey = data.publicKey;
      if (!vapidPublicKey) {
        throw new Error('Khóa VAPID không hợp lệ.');
      }

      const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

      // 4. Subscribe with PushManager
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey
      });

      // 5. Send PushSubscription to Backend database
      const saveRes = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subscription: subscription.toJSON ? subscription.toJSON() : subscription,
          userAgent: navigator.userAgent
        })
      });

      if (!saveRes.ok) {
        throw new Error('Không lưu được thiết bị lên hệ thống máy chủ.');
      }

      // 6. Notify listeners
      window.dispatchEvent(
        new CustomEvent('pwa:push-subscribed', {
          detail: { subscription }
        })
      );

      console.log('[PWA] Đã kích hoạt thông báo đẩy thành công cho thiết bị!');
      return subscription;
    },

    // Unsubscribe from Push Notifications
    unsubscribePush: async function () {
      if (!this.isSupported()) return false;

      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();

        if (subscription) {
          const endpoint = subscription.endpoint;
          // Unsubscribe locally
          await subscription.unsubscribe();

          // Remove from backend database
          await fetch('/api/notifications/unsubscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint })
          });

          window.dispatchEvent(new CustomEvent('pwa:push-unsubscribed'));
          return true;
        }
      } catch (err) {
        console.error('[PWA] Lỗi khi hủy đăng ký thông báo:', err);
      }
      return false;
    }
  };

  // Expose to window for global access
  window.PWA = PWA;

  // Auto-register service worker when DOM is ready
  if (typeof window !== 'undefined' && 'addEventListener' in window) {
    window.addEventListener('load', () => {
      PWA.registerServiceWorker();
    });
  }
})();
