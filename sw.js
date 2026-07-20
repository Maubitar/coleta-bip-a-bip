// Service Worker — cache do "app shell" para funcionamento 100% offline após o primeiro carregamento.
// Só entra em ação quando o app é aberto via http(s) (ex.: GitHub Pages — ver README).
// No uso local via file:// (duplo-clique, o padrão) o navegador nem permite registrar
// Service Worker, e não faz falta: todos os arquivos já estão em disco, não tem "rede"
// para cachear. Cada arquivo .js abaixo já é um pacote único (sem dependências soltas) —
// gerado a partir de js/src/ (ver js/src/ para o código-fonte editável).
const CACHE_NAME = 'bipabip-v3';
const ARQUIVOS = [
  './',
  './index.html',
  './coleta.html',
  './consolidador.html',
  './corrigir.html',
  './historico.html',
  './config.html',
  './css/style.css',
  './js/index.js',
  './js/coleta.js',
  './js/consolidador.js',
  './js/corrigir.js',
  './js/historico.js',
  './js/config.js',
  './manifest.webmanifest',
  './icons/icon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ARQUIVOS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cacheado) => {
      const buscaRede = fetch(event.request)
        .then((resposta) => {
          if (resposta && resposta.status === 200) {
            const clone = resposta.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return resposta;
        })
        .catch(() => cacheado);
      return cacheado || buscaRede;
    })
  );
});
