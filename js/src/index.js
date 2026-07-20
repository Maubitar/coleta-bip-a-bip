import { contarProdutos, listarSessoes, getConfig } from './db.js';
import { nomeDispositivoPadrao, formatarDataHora } from './util.js';

const maquina = nomeDispositivoPadrao();
document.getElementById('infoDispositivo').textContent = `Dispositivo: ${maquina}`;

(async () => {
  const ultimoBackup = await getConfig('ultimoBackupEm', null);
  const umDiaMs = 24 * 60 * 60 * 1000;
  if (!ultimoBackup || Date.now() - new Date(ultimoBackup).getTime() > umDiaMs) {
    document.getElementById('cardLembreteBackup').classList.remove('hidden');
  }

  const total = await contarProdutos();
  const statusBase = document.getElementById('statusBase');
  if (total > 0) {
    statusBase.innerHTML = `Base de produtos carregada: <b>${total}</b> EANs mapeados.`;
  } else {
    statusBase.innerHTML = `<span style="color:var(--warn)">Nenhuma base de produtos importada ainda.</span> Vá em Configurações para importar o base_produtos.csv.`;
  }

  const abertas = await listarSessoes({ maquina, status: 'aberta' });
  const pausadas = await listarSessoes({ maquina, status: 'pausada' });
  const emAndamento = [...abertas, ...pausadas];
  const div = document.getElementById('statusSessoesAbertas');
  if (emAndamento.length > 0) {
    div.innerHTML = '<p style="margin-top:0.8em">Sessões em andamento neste dispositivo:</p>' +
      emAndamento.map(s => `<div>• <b>${s.setor}</b> — ${s.operador} (iniciada em ${formatarDataHora(s.inicio)}) <a href="coleta.html?sessao=${s.id}">continuar →</a></div>`).join('');
  }
})();

// Só tem efeito quando hospedado em http(s) (ex.: GitHub Pages). Em file:// (uso local
// normal deste app) o navegador não permite Service Worker — a chamada falha em silêncio
// e não afeta em nada o funcionamento do app, que não depende dela.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
