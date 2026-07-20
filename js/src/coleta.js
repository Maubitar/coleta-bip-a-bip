import {
  criarSessao, atualizarSessao, obterSessao, listarSessoes,
  registrarLeitura, definirQuantidadeManual, desfazerUltimaLeitura, registrarMarcador,
  obterItensSessao, obterLogSessao, getConfig, setConfig,
  obterTodosProdutos, listarCorrecoes,
} from './db.js';
import { uuid, agoraISO, formatarDataHora, nomeDispositivoPadrao, tocarBip, tocarAlerta, distanciaEdicaoAteUm } from './util.js';
import { toast, abrirModal, confirmar } from './ui.js';
import { exportarArquivosSessao } from './exportarSessao.js';

const JANELA_REPETICAO_MS = 10000;
const LIMITE_REPETICAO = 15;

const SETORES_PADRAO = ['Depósito', 'Loja', 'Banho e Tosa', 'Outros'];
const maquina = nomeDispositivoPadrao();

const views = {
  sessao: document.getElementById('view-sessao'),
  contagem: document.getElementById('view-contagem'),
  finalizacao: document.getElementById('view-finalizacao'),
  concluido: document.getElementById('view-concluido'),
};
function mostrarView(nome) {
  Object.entries(views).forEach(([k, el]) => el.classList.toggle('hidden', k !== nome));
}

// Estado da sessão ativa em memória
let sessaoAtual = null;
let pilhaDesfazer = [];
let totalBipsAtivos = 0;
let chavesComQtd = new Set();
let itemAtualChave = null;

// Leve, só em memória — não toca o banco a cada bip. Zerado a cada entrada em sessão.
let historicoLeiturasPorEan = new Map(); // ean -> [timestamps]
let indiceEansConhecidos = []; // [{ean, sku, descricao}] — base + correções, carregado 1x por sessão
let sugestaoPendente = null; // { logIdDesconhecido, eanDigitado, sugestao: {ean, sku, descricao} }

const elInputLeitura = document.getElementById('inputLeitura');

// ---------------- VIEW: NOVA / CONTINUAR SESSÃO ----------------

async function popularSetores() {
  const custom = await getConfig('setoresCustom', []);
  const select = document.getElementById('selectSetor');
  select.innerHTML = '';
  [...SETORES_PADRAO, ...custom].forEach((s) => {
    const op = document.createElement('option');
    op.value = s; op.textContent = s;
    select.appendChild(op);
  });
}

async function popularOperadores() {
  const todas = await listarSessoes({});
  const nomes = [...new Set(todas.map((s) => s.operador).filter(Boolean))];
  const datalist = document.getElementById('listaOperadores');
  datalist.innerHTML = nomes.map((n) => `<option value="${n.replace(/"/g, '&quot;')}">`).join('');
}

async function popularSessoesAbertas() {
  const abertas = await listarSessoes({ maquina, status: 'aberta' });
  const pausadas = await listarSessoes({ maquina, status: 'pausada' });
  const emAndamento = [...abertas, ...pausadas].sort((a, b) => new Date(b.inicio) - new Date(a.inicio));
  const div = document.getElementById('listaSessoesAbertas');
  if (emAndamento.length === 0) {
    div.innerHTML = '<p style="color:var(--text-dim)">Nenhuma sessão em andamento.</p>';
    return;
  }
  div.innerHTML = emAndamento.map((s) => `
    <div class="row" style="align-items:center;border-bottom:1px solid var(--border);padding:0.6em 0">
      <div style="flex:2">
        <span class="pill ${s.status}">${s.status}</span>
        <b>${s.setor}</b> — ${s.operador}
        <div style="color:var(--text-dim);font-size:0.8rem">Início: ${formatarDataHora(s.inicio)}</div>
      </div>
      <button data-continuar="${s.id}" class="primary" style="flex:0 0 auto">Continuar</button>
    </div>
  `).join('');
  div.querySelectorAll('[data-continuar]').forEach((btn) => {
    btn.addEventListener('click', () => entrarNaSessao(btn.getAttribute('data-continuar')));
  });
}

document.getElementById('btnNovoSetor').addEventListener('click', async () => {
  const nome = prompt('Nome do novo setor:');
  if (!nome || !nome.trim()) return;
  const custom = await getConfig('setoresCustom', []);
  if (!custom.includes(nome.trim())) {
    custom.push(nome.trim());
    await setConfig('setoresCustom', custom);
  }
  await popularSetores();
  document.getElementById('selectSetor').value = nome.trim();
});

document.getElementById('btnIniciarSessao').addEventListener('click', async () => {
  const operador = document.getElementById('inputOperador').value.trim();
  const setor = document.getElementById('selectSetor').value;
  if (!operador) { toast('Informe o nome do operador.', 'erro'); return; }
  if (!setor) { toast('Selecione um setor.', 'erro'); return; }

  const modoQtdManualPadrao = await getConfig('modoQtdManualPadrao', 'substituir');
  const sessao = {
    id: uuid(),
    setor, operador, maquina,
    inicio: agoraISO(),
    fim: null,
    status: 'aberta',
    modoQtdManualPadrao,
  };
  await criarSessao(sessao);
  await entrarNaSessao(sessao.id);
});

// ---------------- VIEW: CONTAGEM ----------------

async function entrarNaSessao(sessaoId) {
  const sessao = await obterSessao(sessaoId);
  if (!sessao) { toast('Sessão não encontrada.', 'erro'); return; }
  if (sessao.status === 'finalizada') { toast('Esta sessão já foi finalizada.', 'erro'); return; }

  sessaoAtual = sessao;
  if (sessao.status === 'pausada') {
    await atualizarSessao(sessao.id, { status: 'aberta' });
    sessaoAtual.status = 'aberta';
  }

  const log = await obterLogSessao(sessaoId);
  pilhaDesfazer = [];
  totalBipsAtivos = 0;
  for (const r of log) {
    if (r.origem === 'bip' || r.origem === 'manual') {
      pilhaDesfazer.push(r.id);
      if (r.origem === 'bip') totalBipsAtivos++;
    } else if (r.origem === 'undo') {
      pilhaDesfazer.pop();
      const original = log.find((x) => x.id === r.revertsId);
      if (original && original.origem === 'bip') totalBipsAtivos--;
    }
  }
  const ultimaLeituraValida = [...log].reverse().find((r) => r.origem === 'bip' || r.origem === 'manual');
  itemAtualChave = ultimaLeituraValida ? ultimaLeituraValida.chave : null;

  const itens = await obterItensSessao(sessaoId);
  chavesComQtd = new Set(itens.filter((i) => i.qtd > 0).map((i) => i.chave));

  historicoLeiturasPorEan = new Map();
  sugestaoPendente = null;
  document.getElementById('cardSugestaoEan').classList.add('hidden');
  document.getElementById('painelAtual').classList.remove('alerta-repeticao');
  document.getElementById('avisoRepeticao').classList.add('hidden');
  const [produtos, correcoes] = await Promise.all([obterTodosProdutos(), listarCorrecoes()]);
  indiceEansConhecidos = [
    ...produtos.map((p) => ({ ean: p.ean, sku: p.sku, descricao: p.descricao })),
    ...correcoes.map((c) => ({ ean: c.ean, sku: c.sku, descricao: c.descricao })),
  ];

  document.getElementById('hdrSetor').textContent = sessao.setor;
  document.getElementById('hdrOperador').textContent = sessao.operador;
  document.getElementById('hdrMaquina').textContent = `Dispositivo: ${maquina}`;

  atualizarContadores();
  if (itemAtualChave) {
    const item = itens.find((i) => i.chave === itemAtualChave);
    if (item) atualizarPainelAtual(item);
  } else {
    document.getElementById('painelEan').textContent = 'Aguardando primeira leitura…';
    document.getElementById('painelDescricao').textContent = '—';
    document.getElementById('painelSku').textContent = '';
    document.getElementById('painelQtd').textContent = '0';
  }

  mostrarView('contagem');
  elInputLeitura.value = '';
  elInputLeitura.focus();
}

function metaAtual() {
  return { setor: sessaoAtual.setor, operador: sessaoAtual.operador, maquina };
}

function atualizarContadores() {
  document.getElementById('totalBips').textContent = totalBipsAtivos;
  document.getElementById('totalUnicos').textContent = chavesComQtd.size;
}

function atualizarPainelAtual(item) {
  const desconhecido = String(item.chave).startsWith('DESCONHECIDO:');
  document.getElementById('painelEan').textContent = item.ean ? `EAN: ${item.ean}` : '';
  document.getElementById('painelDescricao').textContent = desconhecido ? 'EAN não cadastrado na base' : (item.descricao || '(sem descrição)');
  document.getElementById('painelSku').textContent = desconhecido ? `Desconhecido: ${item.chave.replace('DESCONHECIDO:', '')}` : `SKU: ${item.sku}`;
  const qtdEl = document.getElementById('painelQtd');
  qtdEl.textContent = item.qtd;
  qtdEl.classList.toggle('desconhecido', desconhecido);
}

// Leve: só mantém um array de timestamps por EAN, podado pra janela de 10s. Sem I/O.
function verificarRepeticaoAnormal(ean) {
  const agora = Date.now();
  const lista = (historicoLeiturasPorEan.get(ean) || []).filter((t) => agora - t < JANELA_REPETICAO_MS);
  lista.push(agora);
  historicoLeiturasPorEan.set(ean, lista);

  const painel = document.getElementById('painelAtual');
  const aviso = document.getElementById('avisoRepeticao');
  if (lista.length > LIMITE_REPETICAO) {
    painel.classList.add('alerta-repeticao');
    aviso.classList.remove('hidden');
    tocarAlerta();
  } else {
    painel.classList.remove('alerta-repeticao');
    aviso.classList.add('hidden');
  }
}

// Leve: só roda quando a leitura já deu "desconhecido" (evento raro), sobre um
// índice em memória (sem consulta ao banco) carregado uma vez ao entrar na sessão.
function buscarSugestaoProximaEan(eanDigitado) {
  return indiceEansConhecidos.find((p) => distanciaEdicaoAteUm(eanDigitado, p.ean)) || null;
}

function mostrarSugestao(eanDigitado, sugestao, logId) {
  sugestaoPendente = { eanDigitado, sugestao, logId };
  document.getElementById('sugestaoTexto').textContent = `${sugestao.ean} — ${sugestao.descricao || sugestao.sku}`;
  document.getElementById('cardSugestaoEan').classList.remove('hidden');
}

function esconderSugestao() {
  sugestaoPendente = null;
  document.getElementById('cardSugestaoEan').classList.add('hidden');
}

document.getElementById('btnIgnorarSugestao').addEventListener('click', esconderSugestao);
document.getElementById('btnAceitarSugestao').addEventListener('click', async () => {
  if (!sugestaoPendente) return;
  const { sugestao, logId } = sugestaoPendente;
  esconderSugestao();
  // Só é seguro desfazer via pilha se a leitura desconhecida ainda for o topo —
  // ou seja, nada mais foi bipado/desfeito desde a sugestão (garantido pelo guard
  // no início de processarLeitura/executarDesfazer, que já limpa a sugestão nesse caso).
  if (pilhaDesfazer.length > 0 && pilhaDesfazer[pilhaDesfazer.length - 1] === logId) {
    await executarDesfazer();
  }
  await processarLeitura(sugestao.ean);
  toast('Corrigido para o item sugerido.', '');
});

async function processarLeitura(eanBruto) {
  const ean = eanBruto.trim();
  if (!ean) return;
  if (sugestaoPendente) esconderSugestao();
  try {
    const resultado = await registrarLeitura(sessaoAtual.id, ean, metaAtual());
    pilhaDesfazer.push(resultado.logId);
    totalBipsAtivos++;
    if (resultado.novaQtd === 1) chavesComQtd.add(resultado.chave);
    itemAtualChave = resultado.chave;

    atualizarPainelAtual({
      chave: resultado.chave, ean: resultado.ean, sku: resultado.sku,
      descricao: resultado.descricao, qtd: resultado.novaQtd,
    });
    atualizarContadores();
    tocarBip(true);
    verificarRepeticaoAnormal(ean);

    if (resultado.desconhecido) {
      toast(`EAN ${ean} não encontrado na base — registrado como desconhecido.`, 'aviso');
      const sugestao = buscarSugestaoProximaEan(ean);
      if (sugestao) mostrarSugestao(ean, sugestao, resultado.logId);
      else esconderSugestao();
    } else {
      esconderSugestao();
    }
  } catch (e) {
    tocarBip(false);
    toast('Erro ao registrar leitura: ' + e.message, 'erro');
  }
}

elInputLeitura.addEventListener('keydown', async (ev) => {
  if (ev.key === 'Enter') {
    ev.preventDefault();
    const valor = elInputLeitura.value;
    elInputLeitura.value = '';
    await processarLeitura(valor);
  } else if (ev.key === 'Backspace' && elInputLeitura.value === '') {
    ev.preventDefault();
    await executarDesfazer();
  }
});
elInputLeitura.addEventListener('blur', () => {
  if (!views.contagem.classList.contains('hidden')) {
    setTimeout(() => elInputLeitura.focus(), 50);
  }
});

async function executarDesfazer() {
  if (pilhaDesfazer.length === 0) { toast('Nada para desfazer.', 'aviso'); return; }
  if (sugestaoPendente && pilhaDesfazer[pilhaDesfazer.length - 1] !== sugestaoPendente.logId) esconderSugestao();
  const ultimoId = pilhaDesfazer.pop();
  try {
    const resultado = await desfazerUltimaLeitura(sessaoAtual.id, ultimoId, metaAtual());
    const itens = await obterItensSessao(sessaoAtual.id);
    const item = itens.find((i) => i.chave === resultado.chaveDesfeita);
    const novaQtd = item ? item.qtd : 0;
    if (novaQtd <= 0) chavesComQtd.delete(resultado.chaveDesfeita); else chavesComQtd.add(resultado.chaveDesfeita);

    if (resultado.origemOriginal === 'bip') totalBipsAtivos--;

    itemAtualChave = resultado.chaveDesfeita;
    if (item) atualizarPainelAtual(item);
    atualizarContadores();
    toast('Última leitura desfeita.', '');
  } catch (e) {
    toast('Erro ao desfazer: ' + e.message, 'erro');
  }
}
document.getElementById('btnDesfazer').addEventListener('click', executarDesfazer);

async function abrirModalQtdManual() {
  if (!itemAtualChave) { toast('Nenhum item selecionado ainda.', 'aviso'); return; }
  if (sugestaoPendente) esconderSugestao();
  const itens = await obterItensSessao(sessaoAtual.id);
  const item = itens.find((i) => i.chave === itemAtualChave) || { qtd: 0, chave: itemAtualChave };
  const modoPadrao = sessaoAtual.modoQtdManualPadrao || 'substituir';

  const valor = await abrirModal(`
    <h3>Quantidade manual</h3>
    <p style="color:var(--text-dim)">Item atual: <b>${item.descricao || item.chave}</b> (qtd. atual: ${item.qtd})</p>
    <div class="field">
      <label>Modo</label>
      <select id="mqModo">
        <option value="substituir" ${modoPadrao === 'substituir' ? 'selected' : ''}>Substituir quantidade total</option>
        <option value="somar" ${modoPadrao === 'somar' ? 'selected' : ''}>Somar à quantidade atual</option>
      </select>
    </div>
    <div class="field">
      <label>Valor</label>
      <input type="number" id="mqValor" value="${item.qtd}" autofocus>
    </div>
    <div class="row">
      <button data-acao="cancelar" class="ghost">Cancelar</button>
      <button data-acao="confirmar" class="primary">Aplicar</button>
    </div>
  `, {
    onAbrir(overlay, fechar) {
      const input = overlay.querySelector('#mqValor');
      input.focus(); input.select();
      overlay.querySelector('[data-acao="cancelar"]').addEventListener('click', () => fechar(null));
      overlay.querySelector('[data-acao="confirmar"]').addEventListener('click', () => {
        fechar({ valor: Number(overlay.querySelector('#mqValor').value), modo: overlay.querySelector('#mqModo').value });
      });
      input.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') { ev.preventDefault(); overlay.querySelector('[data-acao="confirmar"]').click(); }
      });
    }
  });

  if (!valor || Number.isNaN(valor.valor)) return;
  const resultado = await definirQuantidadeManual(sessaoAtual.id, itemAtualChave, valor.valor, valor.modo, metaAtual());
  pilhaDesfazer.push(resultado.logId);
  const itens2 = await obterItensSessao(sessaoAtual.id);
  const item2 = itens2.find((i) => i.chave === itemAtualChave);
  if (item2.qtd > 0) chavesComQtd.add(itemAtualChave); else chavesComQtd.delete(itemAtualChave);
  atualizarPainelAtual(item2);
  atualizarContadores();
  toast('Quantidade manual aplicada.', '');
}
document.getElementById('btnQtdManual').addEventListener('click', abrirModalQtdManual);

async function marcarPausa() {
  await registrarMarcador(sessaoAtual.id, 'pausa', metaAtual());
  const banner = document.getElementById('bannerPausa');
  banner.classList.remove('hidden');
  toast('Pausa marcada no log. A contagem continua liberada.', '');
  setTimeout(() => banner.classList.add('hidden'), 4000);
}
document.getElementById('btnPausa').addEventListener('click', marcarPausa);

async function irParaChecagem() {
  if (sugestaoPendente) esconderSugestao();
  const itens = (await obterItensSessao(sessaoAtual.id)).filter((i) => i.qtd !== 0);
  const skus = itens.filter((i) => !String(i.chave).startsWith('DESCONHECIDO:')).sort((a, b) => a.sku.localeCompare(b.sku));
  const desconhecidos = itens.filter((i) => String(i.chave).startsWith('DESCONHECIDO:'));

  document.getElementById('chkTotalSkus').textContent = skus.length;
  document.getElementById('chkTotalUnidades').textContent = skus.reduce((s, i) => s + i.qtd, 0);
  document.getElementById('chkTotalDesconhecidos').textContent = desconhecidos.length;

  document.getElementById('tabelaItens').innerHTML = skus.map((i) => `<tr><td>${i.sku}</td><td>${i.descricao || ''}</td><td>${i.qtd}</td></tr>`).join('') || '<tr><td colspan="3" style="color:var(--text-dim)">Nenhum item contado.</td></tr>';
  document.getElementById('tabelaDesconhecidos').innerHTML = desconhecidos.map((i) => `<tr><td>${i.ean}</td><td>${i.qtd}</td></tr>`).join('') || '<tr><td colspan="2" style="color:var(--text-dim)">Nenhum desconhecido.</td></tr>';

  mostrarView('finalizacao');
}
document.getElementById('btnFinalizar').addEventListener('click', irParaChecagem);
document.getElementById('btnVoltarContagem').addEventListener('click', () => {
  mostrarView('contagem');
  elInputLeitura.focus();
});

async function confirmarFinalizacao() {
  const ok = await confirmar('Finalizar sessão? Depois disso ela vira somente leitura e os arquivos serão exportados.');
  if (!ok) return;

  const fim = agoraISO();
  await atualizarSessao(sessaoAtual.id, { status: 'finalizada', fim });
  sessaoAtual.fim = fim;
  sessaoAtual.status = 'finalizada';

  await exportarArquivosSessao(sessaoAtual);

  mostrarView('concluido');
}
document.getElementById('btnConfirmarFinalizar').addEventListener('click', confirmarFinalizacao);

// ---------------- Atalhos globais F2 / F9 / F12 ----------------

document.addEventListener('keydown', (ev) => {
  if (views.contagem.classList.contains('hidden')) return;
  if (ev.key === 'F2') { ev.preventDefault(); abrirModalQtdManual(); }
  else if (ev.key === 'F9') { ev.preventDefault(); marcarPausa(); }
  else if (ev.key === 'F12') { ev.preventDefault(); irParaChecagem(); }
});

// ---------------- Inicialização ----------------

(async () => {
  await popularSetores();
  await popularOperadores();
  await popularSessoesAbertas();

  const params = new URLSearchParams(location.search);
  const sessaoParam = params.get('sessao');
  if (sessaoParam) {
    await entrarNaSessao(sessaoParam);
  } else {
    mostrarView('sessao');
  }
})();
