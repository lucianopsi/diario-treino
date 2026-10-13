/* Service worker: guarda o app no aparelho para funcionar sem internet. */
const VERSAO = 'treino-v1.1.0';
const ARQUIVOS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png',
  './fonts/barlow-latin-400-normal.woff2',
  './fonts/barlow-latin-500-normal.woff2',
  './fonts/barlow-latin-600-normal.woff2',
  './fonts/barlow-latin-700-normal.woff2',
  './fonts/barlow-condensed-latin-600-normal.woff2',
  './fonts/barlow-condensed-latin-700-normal.woff2'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSAO).then((c) => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n !== VERSAO).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  // Página: tenta a rede primeiro (pega atualizações), cai para o cache sem internet.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copia = res.clone();
          caches.open(VERSAO).then((c) => c.put('./index.html', copia));
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }
  // Demais arquivos: cache primeiro.
  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) {
        const copia = res.clone();
        caches.open(VERSAO).then((c) => c.put(req, copia));
      }
      return res;
    }))
  );
});
