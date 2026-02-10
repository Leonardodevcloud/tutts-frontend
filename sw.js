// Service Worker - Sistema Tutts PWA v4 NUCLEAR
// ZERO CACHE - Force fresh code until stabilized
const CACHE_VERSION = '20250210_004';
const CACHE_NAME = `tutts-cache-${CACHE_VERSION}`;

// Install: limpar TODOS os caches antigos
self.addEventListener('install', (event) => {
  console.log('SW v4 NUCLEAR instalando...');
  event.waitUntil(
    caches.keys().then(keys => 
      Promise.all(keys.map(key => caches.delete(key)))
    ).then(() => self.skipWaiting())
  );
});

// Activate: tomar controle imediatamente
self.addEventListener('activate', (event) => {
  console.log('SW v4 NUCLEAR ativado');
  event.waitUntil(
    caches.keys().then(keys => 
      Promise.all(keys.map(key => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: PASS-THROUGH TOTAL — ZERO cache
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.protocol === 'chrome-extension:') return;
  
  // TUDO vai direto para a rede
  event.respondWith(
    fetch(event.request).catch(() => {
      if (event.request.destination === 'document') {
        return new Response('<h1>Offline</h1><p>Recarregue quando estiver online.</p>', {
          headers: { 'Content-Type': 'text/html' }
        });
      }
      return new Response('Offline', { status: 503 });
    })
  );
});

// Push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-96.png',
      vibrate: [100, 50, 100],
      data: { url: data.url || '/' },
      actions: [
        { action: 'open', title: 'Abrir' },
        { action: 'close', title: 'Fechar' }
      ]
    };
    event.waitUntil(self.registration.showNotification(data.title || 'Tutts', options));
  } catch (e) {
    console.error('Push error:', e);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'close') return;
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if (client.url.includes(self.location.origin)) return client.focus();
      }
      return clients.openWindow(event.notification.data?.url || '/');
    })
  );
});
