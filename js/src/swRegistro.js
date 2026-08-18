// Registro do Service Worker, reaproveitado em TODAS as páginas (não só index.html) —
// assim, um dispositivo que fica o dia inteiro parado em coleta.html também recebe
// atualizações automaticamente, sem depender de o operador voltar pra tela inicial.
// Só tem efeito quando hospedado em http(s) (ex.: GitHub Pages). Em file:// (uso local
// normal deste app) o navegador não permite Service Worker — a chamada falha em silêncio
// e não afeta em nada o funcionamento do app, que não depende dela.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('sw.js', { updateViaCache: 'none' }) // nunca usa cache HTTP pro sw.js em si
      .then((reg) => { reg.update().catch(() => {}); }) // força checagem imediata, sem esperar o throttle padrão do navegador
      .catch(() => {});
  });

  // Quando uma nova versão do Service Worker assume o controle (após detectar e
  // instalar uma atualização), recarrega a página sozinha UMA vez — o operador não
  // precisa saber que existe um Service Worker, muito menos limpar cache manualmente.
  let jaRecarregouPorAtualizacao = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (jaRecarregouPorAtualizacao) return;
    jaRecarregouPorAtualizacao = true;
    window.location.reload();
  });
}
