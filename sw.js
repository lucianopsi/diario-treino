/* Service worker: guarda o app no aparelho para funcionar sem internet.
   Ao publicar uma versão nova, aumente VERSAO para o celular baixar os arquivos novos. */
const VERSAO = 'treino-v2.4.1';
const ARQUIVOS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './graficos.js',
  './saude.js',
  './nuvem.js',
  './firebase-config.js',
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
// SDK do Firebase (versão fixa): guardado para o app abrir sem internet já logado.
const FIREBASE = [
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERSAO)
      .then((c) => c.addAll(ARQUIVOS).then(() => Promise.all(FIREBASE.map((u) => c.add(new Request(u, { mode: 'cors' })).catch(() => {})))))
      .then(() => self.skipWaiting())
  );
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
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const mesmaOrigem = url.origin === self.location.origin;
  const sdkFirebase = url.origin === 'https://www.gstatic.com' && url.pathname.startsWith('/firebasejs/');
  if (!mesmaOrigem && !sdkFirebase) return; // Firestore, login etc. passam direto pela rede
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => { const copia = res.clone(); caches.open(VERSAO).then((c) => c.put('./index.html', copia)); return res; })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }
  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) { const copia = res.clone(); caches.open(VERSAO).then((c) => c.put(req, copia)); }
      return res;
    }))
  );
});
