// Service Worker — cache do "app shell" para funcionamento 100% offline após o primeiro carregamento.
// Só entra em ação quando o app é aberto via http(s) (ex.: GitHub Pages — ver README).
// No uso local via file:// (duplo-clique, o padrão) o navegador nem permite registrar
// Service Worker, e não faz falta: todos os arquivos já estão em disco, não tem "rede"
// para cachear. Cada arquivo .js abaixo já é um pacote único (sem dependências soltas) —
// gerado a partir de js/src/ (ver js/src/ para o código-fonte editável).
//
// IMPORTANTE: sempre que este arquivo for publicado com QUALQUER mudança de código em
// outro lugar do app, incremente CACHE_NAME (ex.: v4 -> v5). O navegador só detecta que
// existe uma versão nova do Service Worker comparando o CONTEÚDO deste arquivo byte a
// byte — se ele ficar idêntico entre deploys, a atualização nunca é percebida, mesmo que
// o resto do código tenha mudado (foi exatamente isso que deixou dispositivos presos numa
// versão antiga por semanas). A estratégia de rede abaixo (network-first) já reduz bastante
// esse risco mesmo se o bump for esquecido, mas o bump continua sendo a garantia real.
const CACHE_NAME = 'bipabip-v4';
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
    caches.open(CACHE_NAME).then(async (cache) => {
      // cache: 'reload' ignora o cache HTTP do navegador — garante que o "primeiro
      // preenchimento" do cache do app já vem direto da rede, não de uma cópia velha.
      await Promise.all(ARQUIVOS.map(async (url) => {
        try {
          const resposta = await fetch(url, { cache: 'reload' });
          if (resposta && resposta.status === 200) await cache.put(url, resposta);
        } catch (e) { /* offline no primeiro install: segue sem essa entrada, tenta de novo depois */ }
      }));
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

// Network-first com fallback pro cache: enquanto online, SEMPRE busca a versão mais
// recente do servidor (nunca fica "preso" numa cópia antiga, mesmo que alguém esqueça
// de trocar o CACHE_NAME num deploy futuro). Só usa o cache quando a rede falha ou demora
// demais (>3s) — é o que garante o funcionamento offline.
const TIMEOUT_REDE_MS = 3000;

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(buscarComPrioridadeDeRede(event.request));
});

function buscarComPrioridadeDeRede(request) {
  return new Promise((resolve) => {
    let respondido = false;

    const timeoutId = setTimeout(async () => {
      if (respondido) return;
      const cacheado = await caches.match(request);
      if (cacheado) { respondido = true; resolve(cacheado); }
    }, TIMEOUT_REDE_MS);

    fetch(request, { cache: 'no-store' })
      .then((resposta) => {
        clearTimeout(timeoutId);
        if (resposta && resposta.status === 200) {
          const clone = resposta.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        if (!respondido) { respondido = true; resolve(resposta); }
      })
      .catch(async () => {
        clearTimeout(timeoutId);
        if (respondido) return;
        const cacheado = await caches.match(request);
        respondido = true;
        resolve(cacheado || Response.error());
      });
  });
}
