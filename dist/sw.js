// Ryudev Temp Mail - Web Push Service Worker
const defaultIcon = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="%234338ca"/><path d="M25 35h50a5 5 0 0 1 5 5v25a5 5 0 0 1-5 5H25a5 5 0 0 1-5-5V40a5 5 0 0 1 5-5z" fill="%23ffffff"/><path d="M22 38l28 20 28-20" fill="none" stroke="%234338ca" stroke-width="4"/></svg>';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data = {
        title: '📩 Email Baru Diterima',
        body: event.data.text()
      };
    }
  }

  const title = data.title || '📩 Email Baru Masuk';
  const targetUrl = (data.data && data.data.url) || data.url || '/';

  const options = {
    body: data.body || 'Kamu menerima pesan baru di Ryudev Temp Mail.',
    icon: defaultIcon,
    badge: defaultIcon,
    data: {
      url: targetUrl
    },
    tag: data.tag || `email-${Date.now()}`,
    renotify: true,
    requireInteraction: false,
    vibrate: [200, 100, 200]
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

