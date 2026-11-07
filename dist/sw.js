// Ryudev Temp Mail - Web Push Service Worker
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
        title: 'Email Baru Diterima',
        body: event.data.text()
      };
    }
  }

  const title = data.title || '📩 Email Baru Masuk';
  const options = {
    body: data.body || 'Kamu menerima pesan baru di Ryudev Temp Mail.',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    data: {
      url: data.url || '/'
    },
    tag: data.tag || `email-${Date.now()}`,
    renotify: true,
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
