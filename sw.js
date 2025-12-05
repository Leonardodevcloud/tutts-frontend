// Service Worker - Sistema Tutts PWA
const CACHE_NAME = 'tutts-cache-v1';
const API_URL = 'https://tutts-backend-production.up.railway.app';

// Arquivos para cachear (shell da aplicação)
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/tutts-novatos.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// CDNs externos para cachear
const EXTERNAL_ASSETS = [
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/react@18/umd/react.production.min.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
  'https://unpkg.com/@babel/standalone/babel.min.js'
];

// Instalação - cacheia arquivos estáticos
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker: Instalando...');
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('📦 Service Worker: Cacheando arquivos estáticos');
      // Cacheia assets externos primeiro (mais importantes)
      return Promise.all([
        ...EXTERNAL_ASSETS.map(url => 
          cache.add(url).catch(err => console.log('⚠️ Não cacheou:', url))
        ),
        ...STATIC_ASSETS.map(url => 
          cache.add(url).catch(err => console.log('⚠️ Não cacheou:', url))
        )
      ]);
    }).then(() => {
      console.log('✅ Service Worker: Instalação completa!');
      return self.skipWaiting();
    })
  );
});

// Ativação - limpa caches antigos
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker: Ativando...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Service Worker: Removendo cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('✅ Service Worker: Ativado!');
      return self.clients.claim();
    })
  );
});

// Fetch - estratégia de cache
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Ignora requisições não-GET
  if (event.request.method !== 'GET') {
    return;
  }
  
  // API requests - Network First (sempre busca online, fallback para cache)
  if (url.href.includes(API_URL)) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Clona e cacheia a resposta para uso offline
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            // Só cacheia GETs de listagem (não dados sensíveis)
            if (url.pathname.includes('/disponibilidade/') || 
                url.pathname.includes('/promocoes')) {
              cache.put(event.request, responseClone);
            }
          });
          return response;
        })
        .catch(() => {
          // Offline - tenta retornar do cache
          return caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Retorna resposta de erro offline
            return new Response(
              JSON.stringify({ error: 'offline', message: 'Você está offline. Conecte-se para ver dados atualizados.' }),
              { headers: { 'Content-Type': 'application/json' } }
            );
          });
        })
    );
    return;
  }
  
  // Assets estáticos e CDNs - Cache First (busca no cache primeiro)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Retorna do cache, mas atualiza em background
        fetch(event.request).then((response) => {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, response);
          });
        }).catch(() => {});
        
        return cachedResponse;
      }
      
      // Não está no cache - busca na rede
      return fetch(event.request).then((response) => {
        // Cacheia para próxima vez
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
        return response;
      }).catch(() => {
        // Offline e não está no cache
        if (event.request.destination === 'document') {
          return caches.match('/');
        }
      });
    })
  );
});

// Push Notifications (preparado para uso futuro)
self.addEventListener('push', (event) => {
  console.log('📬 Push recebido:', event);
  
  let data = { title: 'Sistema Tutts', body: 'Nova notificação!' };
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }
  
  const options = {
    body: data.body,
    icon: '/icon-192.png',
    badge: '/icon-96.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/'
    },
    actions: [
      { action: 'open', title: 'Abrir' },
      { action: 'close', title: 'Fechar' }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Clique na notificação
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 Notificação clicada:', event.action);
  
  event.notification.close();
  
  if (event.action === 'close') {
    return;
  }
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Se já tem uma aba aberta, foca nela
      for (const client of clientList) {
        if (client.url.includes('tutts') && 'focus' in client) {
          return client.focus();
        }
      }
      // Se não, abre nova aba
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data.url || '/');
      }
    })
  );
});

// Background Sync (para enviar dados quando voltar online)
self.addEventListener('sync', (event) => {
  console.log('🔄 Background Sync:', event.tag);
  
  if (event.tag === 'sync-solicitacoes') {
    event.waitUntil(syncPendingSubmissions());
  }
});

// Função para sincronizar solicitações pendentes
async function syncPendingSubmissions() {
  try {
    const cache = await caches.open(CACHE_NAME);
    const pendingRequests = await cache.match('pending-submissions');
    
    if (!pendingRequests) return;
    
    const submissions = await pendingRequests.json();
    
    for (const submission of submissions) {
      await fetch(`${API_URL}/solicitacoes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submission)
      });
    }
    
    // Limpa pendentes após sincronizar
    await cache.delete('pending-submissions');
    console.log('✅ Solicitações sincronizadas!');
  } catch (error) {
    console.error('❌ Erro ao sincronizar:', error);
  }
}

console.log('🚀 Service Worker carregado!');
