// Service Worker - Sistema Tutts PWA
// IMPORTANTE: Mude este numero a cada deploy para forcar atualizacao!
const CACHE_VERSION = '20250210_001';
const CACHE_NAME = `tutts-cache-${CACHE_VERSION}`;
const API_URL = 'https://tutts-backend-production.up.railway.app';

// Arquivos que SEMPRE devem buscar da rede (criticos)
const NETWORK_FIRST_FILES = [
  '/app.js',
  '/index.html',
  '/'
];

// Arquivos para cachear (shell da aplicacao)
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/app.js',
  '/tutts-novatos.html',
  '/manifest.json',
  '/icon-192.png',
  '/ModuloFinanceiro.js',
  '/modulo-operacional.js',
  '/modulo-config.js',
  '/modulo-disponibilidade.js',
  '/filas.js',
  '/icon-512.png'
];

// CDNs externos para cachear (estes podem usar Cache First pois nao mudam)
const EXTERNAL_ASSETS = [
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/react@18/umd/react.production.min.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js'
];

// Instalacao - cacheia arquivos estaticos
self.addEventListener('install', (event) => {
  console.log(`Service Worker ${CACHE_VERSION}: Instalando...`);
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Service Worker: Cacheando arquivos estaticos');
      return Promise.all([
        ...EXTERNAL_ASSETS.map(url => 
          cache.add(url).catch(err => console.log('Nao cacheou:', url))
        ),
        ...STATIC_ASSETS.map(url => 
          cache.add(url).catch(err => console.log('Nao cacheou:', url))
        )
      ]);
    }).then(() => {
      console.log('Service Worker: Instalacao completa!');
      // Forca ativacao imediata - nao espera abas fecharem
      return self.skipWaiting();
    })
  );
});

// Ativacao - limpa caches antigos
self.addEventListener('activate', (event) => {
  console.log(`Service Worker ${CACHE_VERSION}: Ativando...`);
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Remove qualquer cache que nao seja o atual
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Removendo cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: Ativado e caches limpos!');
      // Assume controle imediato de todas as abas abertas
      return self.clients.claim();
    })
  );
});

// Verifica se eh um arquivo critico que deve usar Network First
function isNetworkFirstFile(url) {
  const pathname = new URL(url).pathname;
  return NETWORK_FIRST_FILES.some(file => 
    pathname === file || pathname.endsWith(file)
  );
}

// Verifica se eh um CDN externo (pode usar Cache First)
function isExternalCDN(url) {
  return EXTERNAL_ASSETS.some(cdn => url.startsWith(cdn));
}

// Fetch - estrategia inteligente de cache
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Ignora requisicoes nao-GET
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Ignora requisicoes de extensoes do Chrome
  if (url.protocol === 'chrome-extension:') {
    return;
  }
  
  // API requests - Network Only (nao cacheia API)
  if (url.href.includes(API_URL)) {
    event.respondWith(networkOnlyStrategy(event.request));
    return;
  }
  
  // Arquivos criticos (app.js, index.html) - NETWORK FIRST
  if (isNetworkFirstFile(event.request.url)) {
    event.respondWith(networkFirstStrategy(event.request, true));
    return;
  }
  
  // CDNs externos - Cache First (nao mudam)
  if (isExternalCDN(event.request.url)) {
    event.respondWith(cacheFirstStrategy(event.request));
    return;
  }
  
  // Outros assets - Stale While Revalidate (cache + atualiza em background)
  event.respondWith(staleWhileRevalidate(event.request));
});

// Estrategia Network Only - apenas rede, sem cache (para API)
async function networkOnlyStrategy(request) {
  try {
    const response = await fetch(request);
    return response;
  } catch (error) {
    // Se falhar, retorna erro generico ao inves de quebrar
    console.log('Erro de rede:', request.url);
    return new Response(JSON.stringify({ error: 'Offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Estrategia Network First - busca na rede, fallback para cache
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
      console.log('Usando cache para:', request.url);
      return cachedResponse;
    }
    
    // Se eh documento, retorna a pagina principal
    if (request.destination === 'document') {
      const indexCache = await caches.match('/');
      if (indexCache) return indexCache;
    }
    
    // Retorna pagina de erro offline
    return new Response('Offline - Sem conexao com a internet', {
      status: 503,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

// Estrategia Cache First - busca no cache, fallback para rede
async function cacheFirstStrategy(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.log('Erro ao buscar:', request.url);
    return new Response('', { status: 503 });
  }
}

// Estrategia Stale While Revalidate - retorna cache, atualiza em background
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  // Busca atualizacao em background (nao bloqueia)
  const fetchPromise = fetch(request).then(response => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => null);
  
  // Retorna cache se existir, senao espera a rede
  if (cachedResponse) {
    return cachedResponse;
  }
  
  const networkResponse = await fetchPromise;
  if (networkResponse) {
    return networkResponse;
  }
  
  return new Response('', { status: 503 });
}

// Push Notifications
self.addEventListener('push', (event) => {
  console.log('Push recebido:', event);
  
  let data = { title: 'Sistema Tutts', body: 'Nova notificacao!' };
  
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
  '/ModuloFinanceiro.js',
  '/modulo-operacional.js',
  '/modulo-config.js',
  '/modulo-disponibilidade.js',
  '/filas.js',
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

// Clique na notificacao
self.addEventListener('notificationclick', (event) => {
  console.log('Notificacao clicada:', event.action);
  
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

// Mensagem para verificar versao
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_VERSION });
  }
  
  // Forca atualizacao APENAS quando o usuario clicar no banner
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('Usuario solicitou atualizacao, aplicando...');
    self.skipWaiting();
  }
});

console.log(`Service Worker ${CACHE_VERSION} carregado!`);
