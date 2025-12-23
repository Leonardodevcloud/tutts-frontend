// Service Worker - Sistema Tutts PWA
// IMPORTANTE: Mude este número a cada deploy para forçar atualização!
const CACHE_VERSION = '20241222_001';
const CACHE_NAME = `tutts-cache-${CACHE_VERSION}`;
const API_URL = 'https://tutts-backend-production.up.railway.app';

// Arquivos que SEMPRE devem buscar da rede (críticos)
const NETWORK_FIRST_FILES = [
  '/app.js',
  '/index.html',
  '/'
];

// Arquivos para cachear (shell da aplicação)
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/app.js',
  '/tutts-novatos.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// CDNs externos para cachear (estes podem usar Cache First pois não mudam)
const EXTERNAL_ASSETS = [
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/react@18/umd/react.production.min.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js'
];

// Instalação - cacheia arquivos estáticos
self.addEventListener('install', (event) => {
  console.log(`🔧 Service Worker ${CACHE_VERSION}: Instalando...`);
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('📦 Service Worker: Cacheando arquivos estáticos');
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
      // FORÇA ativação imediata (não espera abas fecharem)
      return self.skipWaiting();
    })
  );
});

// Ativação - limpa TODOS os caches antigos
self.addEventListener('activate', (event) => {
  console.log(`🚀 Service Worker ${CACHE_VERSION}: Ativando...`);
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Remove qualquer cache que não seja o atual
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Service Worker: Removendo cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('✅ Service Worker: Ativado e caches limpos!');
      // FORÇA controle imediato de todas as abas
      return self.clients.claim();
    }).then(() => {
      // Notifica todas as abas que há uma nova versão
      return self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'SW_UPDATED',
            version: CACHE_VERSION
          });
        });
      });
    })
  );
});

// Verifica se é um arquivo crítico que deve usar Network First
function isNetworkFirstFile(url) {
  const pathname = new URL(url).pathname;
  return NETWORK_FIRST_FILES.some(file => 
    pathname === file || pathname.endsWith(file)
  );
}

// Verifica se é um CDN externo (pode usar Cache First)
function isExternalCDN(url) {
  return EXTERNAL_ASSETS.some(cdn => url.startsWith(cdn));
}

// Fetch - estratégia inteligente de cache
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Ignora requisições não-GET
  if (event.request.method !== 'GET') {
    return;
  }
  
  // API requests - Network First (sempre busca online)
  if (url.href.includes(API_URL)) {
    event.respondWith(networkFirstStrategy(event.request, false));
    return;
  }
  
  // Arquivos críticos (app.js, index.html) - NETWORK FIRST
  if (isNetworkFirstFile(event.request.url)) {
    event.respondWith(networkFirstStrategy(event.request, true));
    return;
  }
  
  // CDNs externos - Cache First (não mudam)
  if (isExternalCDN(event.request.url)) {
    event.respondWith(cacheFirstStrategy(event.request));
    return;
  }
  
  // Outros assets - Stale While Revalidate (cache + atualiza em background)
  event.respondWith(staleWhileRevalidate(event.request));
});

// Estratégia Network First - busca na rede, fallback para cache
async function networkFirstStrategy(request, shouldCache) {
  try {
    const response = await fetch(request);
    
    // Se sucesso e deve cachear, atualiza o cache
    if (response.ok && shouldCache) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    // Offline - tenta o cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Se é documento, retorna a página principal
    if (request.destination === 'document') {
      return caches.match('/');
    }
    
    throw error;
  }
}

// Estratégia Cache First - busca no cache, fallback para rede
async function cacheFirstStrategy(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const response = await fetch(request);
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
    return response;
  } catch (error) {
    throw error;
  }
}

// Estratégia Stale While Revalidate - retorna cache, atualiza em background
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  // Busca atualização em background
  const fetchPromise = fetch(request).then(response => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => null);
  
  // Retorna cache se existir, senão espera a rede
  return cachedResponse || fetchPromise;
}

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
      for (const client of clientList) {
        if (client.url.includes('tutts') && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data.url || '/');
      }
    })
  );
});

// Background Sync
self.addEventListener('sync', (event) => {
  console.log('🔄 Background Sync:', event.tag);
  
  if (event.tag === 'sync-solicitacoes') {
    event.waitUntil(syncPendingSubmissions());
  }
});

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
    
    await cache.delete('pending-submissions');
    console.log('✅ Solicitações sincronizadas!');
  } catch (error) {
    console.error('❌ Erro ao sincronizar:', error);
  }
}

// Mensagem para verificar versão
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_VERSION });
  }
  
  // Força atualização quando solicitado
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log(`🚀 Service Worker ${CACHE_VERSION} carregado!`);
