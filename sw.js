const CACHE = 'calderas-v2';
const STATIC = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap'
];

// Instalar y pre-cachear archivos estáticos
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(STATIC)).then(() => self.skipWaiting())
  );
});

// Limpiar versiones anteriores del cache
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Estrategia: cache-first para recursos locales, network-first para externos
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // No interceptar peticiones a Google Sheets / Apps Script
  if (url.hostname.includes('script.google') || url.hostname.includes('sheets.google')) return;

  // Para recursos locales: cache-first
  if (url.origin === self.location.origin) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(res => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return res;
        }).catch(() => caches.match('/index.html'));
      })
    );
    return;
  }

  // Para fuentes de Google: cache-first, sin fallar si no hay red
  if (url.hostname.includes('fonts.g')) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(res => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return res;
        }).catch(() => new Response('', { status: 408 }));
      })
    );
    return;
  }
});

// Recordatorio por periodic background sync
self.addEventListener('periodicsync', e => {
  if (e.tag === 'calderas-reminder') {
    e.waitUntil(
      self.registration.showNotification('¡Seguí con el curso! 🔥', {
        body: 'Retomá donde dejaste. Cada clase suma.',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'calderas-reminder',
        renotify: false
      })
    );
  }
});
