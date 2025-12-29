/// <reference lib="webworker" />

// Custom service worker used by VitePWA (injectManifest)
// Handles both offline precaching and web-push notifications.

import { precacheAndRoute } from 'workbox-precaching';

declare let self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<any>;
};

// Precache build assets
precacheAndRoute(self.__WB_MANIFEST);

// Push notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push event received');

  let data: {
    title?: string;
    body?: string;
    icon?: string;
    badge?: string;
    data?: { url?: string };
  } = {
    title: 'FuelFinder',
    body: 'Time to log your activity!',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    data: { url: '/' },
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (e) {
      console.log('[SW] Could not parse push data:', e);
    }
  }

  // Keep options minimal for maximum cross-browser compatibility
  const options: NotificationOptions = {
    body: data.body,
    icon: data.icon || '/pwa-192x192.png',
    badge: data.badge || '/pwa-192x192.png',
    data: data.data || { url: '/' },
    tag: 'fuelfinder-reminder',
  };

  event.waitUntil(self.registration.showNotification(data.title || 'FuelFinder', options));
});

self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);

  event.notification.close();

  const urlToOpen = (event.notification.data as any)?.url || '/';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client) {
            client.focus();
            if (event.action === 'log') {
              client.postMessage({ type: 'OPEN_LOG_FORM' });
            }
            return;
          }
        }
        return self.clients.openWindow ? self.clients.openWindow(urlToOpen) : undefined;
      })
  );
});

self.addEventListener('notificationclose', () => {
  console.log('[SW] Notification closed');
});
