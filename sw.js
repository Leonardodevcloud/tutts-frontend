// Service Worker - Sistema Tutts PWA v7 NO-503-FALLBACK
// Bumped de v6 → v7 para forçar reinstalação e limpar SW antigo nas máquinas.
//
// 🔧 BUGFIX "disconnect no F5":
//   A v6 interceptava TODOS os fetches e, em caso de falha, retornava um
//   Response sintético com status 503. Isso enganava o frontend fazendo-o
//   acreditar que o BACKEND tinha retornado 503, quando na verdade era o
//   próprio SW mascarando uma falha de rede. Resultado: usuário "deslogava"
//   ou via tela "Offline" por qualquer hiccup de rede no F5.
//
//   A v7 NÃO intercepta nenhuma request da API nem cross-origin. Só toca em
//   navegações de documento (HTML da própria origem), e mesmo assim só
//   mostra a página offline se o fetch DE VERDADE falhar.
const CACHE_VERSION = '20260411_BOMFIX_v8';
const CACHE_NAME = `tutts-cache-${CACHE_VERSION}`;

// Install: limpar TODOS os caches antigos
self.addEventListener('install', (event) => {
  console.log('SW v7 instalando (fix 503 fallback)...');
  event.waitUntil(
    caches.keys().then(keys => 
      Promise.all(keys.map(key => caches.delete(key)))
    ).then(() => self.skipWaiting())
  );
});

// Activate: tomar controle imediatamente
self.addEventListener('activate', (event) => {
  console.log('SW v7 ativado (fix 503 fallback)');
  event.waitUntil(
    caches.keys().then(keys => 
      Promise.all(keys.map(key => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: bypass TOTAL para API e cross-origin. Só intercepta navegação de
// documento da própria origem para mostrar página offline se estiver
// genuinamente offline.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // ── Bypass hard: não toca em nada disso, o browser trata direto ──
  if (url.protocol === 'chrome-extension:') return;

  // Cross-origin (API Railway, Vercel assets, CDNs, etc) → bypass total.
  // NUNCA retornar Response sintético pra cross-origin, senão o frontend
  // recebe status falso e pode interpretar como erro de backend.
  if (url.origin !== self.location.origin) return;

  // Same-origin mas rota de API → bypass (backend pode estar em mesmo host
  // em alguns setups). Defensivo.
  if (url.pathname.startsWith('/api/')) return;

  // Assets same-origin (js, css, imagens) → bypass, deixa o browser lidar
  // com cache e erro natural.
  if (event.request.destination !== 'document') return;

  // A partir daqui: só sobra navegação de HTML da própria origem.
  // Tenta buscar da rede; se falhar DE VERDADE (network error real, não
  // response com status HTTP), mostra a página offline.
  event.respondWith(
    fetch(event.request).catch(() => {
      return new Response(
        '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><title>Sem conexão — Central Tutts</title>' +
        '<style>body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#1e1e2e;color:#cdd6f4;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:20px;text-align:center}' +
        'h1{color:#cba6f7;margin:0 0 12px}p{color:#a6adc8;margin:4px 0}button{margin-top:20px;padding:10px 20px;background:#cba6f7;color:#1e1e2e;border:none;border-radius:6px;font-size:14px;font-weight:600;cursor:pointer}</style>' +
        '</head><body><div><h1>Sem conexão</h1><p>Não foi possível carregar a página.</p><p>Verifique sua internet e tente de novo.</p>' +
        '<button onclick="location.reload()">🔄 Tentar novamente</button></div></body></html>',
        { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: 200 }
      );
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
