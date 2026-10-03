// Service Worker: faz o app abrir offline.
// Ao publicar uma versão nova, troque o número em VERSION para forçar atualização.
const VERSION = 'portal-ia-v3';
const SHELL = [
  './', './index.html', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png',
  './icons/maskable-512.png', './icons/apple-touch-icon.png', './icons/favicon-32.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Páginas: tenta rede primeiro (pega versão nova); sem internet, usa o cache.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(r => { caches.open(VERSION).then(c => c.put('./index.html', r.clone())); return r; })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Arquivos do app e fontes do Google: cache primeiro, atualiza em segundo plano.
  const ok = url.origin === location.origin || /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (!ok) return;
  e.respondWith(
    caches.match(req).then(hit => {
      const net = fetch(req).then(r => {
        if (r && (r.status === 200 || r.type === 'opaque')) caches.open(VERSION).then(c => c.put(req, r.clone()));
        return r;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
