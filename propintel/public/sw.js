const CACHE = 'urbia-v1';
const PRECACHE = [
  '/',
  '/dashboard',
  '/mapa-resultados',
  '/alertas',
];

self.addEventListener('install', ev => {
  self.skipWaiting();
  ev.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE).catch(() => {}))
  );
});

self.addEventListener('activate', ev => {
  ev.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', ev => {
  if (ev.request.method !== 'GET') return;
  const url = new URL(ev.request.url);
  // Network-first for API calls
  if (url.pathname.startsWith('/api') || url.hostname !== self.location.hostname) {
    ev.respondWith(
      fetch(ev.request).catch(() => caches.match(ev.request))
    );
    return;
  }
  // Cache-first for static assets
  ev.respondWith(
    caches.match(ev.request).then(cached => {
      if (cached) return cached;
      return fetch(ev.request).then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(ev.request, clone));
        }
        return res;
      }).catch(() => caches.match('/'));
    })
  );
});

// Push notifications
self.addEventListener('push', ev => {
  const data = ev.data?.json() ?? {};
  const title = data.title ?? 'UrbIA — Nueva alerta';
  const options = {
    body: data.body ?? 'Hay cambios en alguna de tus alertas de precio.',
    icon: '/assets/logo_urbia.png',
    badge: '/assets/logo_urbia.png',
    tag: data.tag ?? 'urbia-alert',
    data: { url: data.url ?? '/alertas' },
    vibrate: [200, 100, 200],
    actions: [
      { action: 'ver', title: 'Ver alerta' },
      { action: 'cerrar', title: 'Cerrar' }
    ]
  };
  ev.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', ev => {
  ev.notification.close();
  if (ev.action === 'cerrar') return;
  const url = ev.notification.data?.url ?? '/alertas';
  ev.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      const c = clients.find(c => c.url.includes(url));
      if (c) return c.focus();
      return self.clients.openWindow(url);
    })
  );
});
