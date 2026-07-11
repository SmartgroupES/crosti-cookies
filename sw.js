// ============================================================
// CROSTI COOKIES — Service Worker PWA
// Estrategia: Cache First para assets estáticos
//             Network First para APIs
// ============================================================

const CACHE_NAME = 'crosti-cookies-v1.2';
const CACHE_STATIC = [
  './',
  './index.html',
  './dashboard-operario.html',
  './dashboard-franquiciado.html',
  './dashboard-admin.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap',
];

// ── INSTALL: Cachear assets estáticos ────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CACHE_STATIC.map(url => {
        return new Request(url, { mode: 'no-cors' });
      })).catch(() => {
        // Ignorar errores de caché individuales (CDN fonts pueden fallar en install)
        console.log('[SW] Cache parcial completada');
      });
    })
  );
  self.skipWaiting();
});

// ── ACTIVATE: Limpiar caches antiguas ────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// ── FETCH: Estrategia híbrida ─────────────────────────────────
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // API calls → Network First (nunca cachear respuestas de API)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(
          JSON.stringify({ error: 'Sin conexión. Verifica tu red.' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
      })
    );
    return;
  }

  // Assets estáticos → Cache First, fallback a Network
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request).then((response) => {
        // Solo cachear respuestas válidas de mismo origen
        if (
          response.status === 200 &&
          (url.origin === self.location.origin ||
           url.hostname.includes('fonts.googleapis.com') ||
           url.hostname.includes('fonts.gstatic.com'))
        ) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return response;
      }).catch(() => {
        // Fallback offline para HTML
        if (event.request.destination === 'document') {
          return caches.match('./index.html');
        }
      });
    })
  );
});

// ── BACKGROUND SYNC: Mermas offline ──────────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-mermas') {
    event.waitUntil(syncPendingMermas());
  }
});

async function syncPendingMermas() {
  // Las mermas pendientes se guardan en IndexedDB cuando no hay red
  // y se sincronizan al recuperar conectividad
  console.log('[SW] Sincronizando mermas pendientes...');
}
