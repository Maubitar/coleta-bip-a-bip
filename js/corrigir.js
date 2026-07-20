import { buscarProdutoPorEanComCorrecao, obterTodosProdutos, salvarCorrecaoEan, listarCorrecoes } from './db.js';
import { formatarDataHora, baixarArquivo, carimboArquivo } from './util.js';
import { gerarCSV } from './csv.js';
import { toast, confirmar } from './ui.js';
import { montarGateSenha } from './authGate.js';

const CHAVE_OPERADOR_LS = 'bipabip_operador_correcao';

let todosProdutos = [];
let eanEmCorrecao = null;

montarGateSenha({
  onLiberado: () => {
    document.getElementById('view-corrigir').classList.remove('hidden');
    inicializar();
  },
});

async function inicializar() {
  const inputOperador = document.getElementById('inputOperadorCorrecao');
  try { inputOperador.value = localStorage.getItem(CHAVE_OPERADOR_LS) || ''; } catch (e) {}
  inputOperador.addEventListener('change', () => {
    try { localStorage.setItem(CHAVE_OPERADOR_LS, inputOperador.value.trim()); } catch (e) {}
  });

  todosProdutos = await obterTodosProdutos();
  await renderizarCorrecoes();
}

const inputEan = document.getElementById('inputEanCorrigir');
const resultadoBusca = document.getElementById('resultadoBusca');
const cardBusca = document.getElementById('cardBuscaProduto');
const inputBuscaProduto = document.getElementById('inputBuscaProduto');

inputEan.addEventListener('keydown', async (ev) => {
  if (ev.key !== 'Enter') return;
  ev.preventDefault();
  const ean = inputEan.value.trim();
  if (!ean) return;
  await consultarEan(ean);
});

async function consultarEan(ean) {
  eanEmCorrecao = ean;
  const produto = await buscarProdutoPorEanComCorrecao(ean);

  if (produto) {
    const origem = produto.viaCorrecao ? 'via correção já cadastrada' : 'na base original';
    resultadoBusca.innerHTML = `
      <div class="card" style="border-color:var(--accent)">
        ✓ EAN <b>${ean}</b> já resolve para <b>SKU ${produto.sku}</b> — ${produto.descricao || '(sem descrição)'} (${origem}).
        <div style="margin-top:0.6em"><button id="btnCorrigirMesmoAssim" class="ghost">Não é esse o produto certo? Corrigir manualmente</button></div>
      </div>`;
    document.getElementById('btnCorrigirMesmoAssim').addEventListener('click', () => abrirBusca());
    cardBusca.classList.add('hidden');
  } else {
    resultadoBusca.innerHTML = `<div class="card" style="border-color:var(--warn)">⚠ EAN <b>${ean}</b> não encontrado — nem na base original, nem em correções já feitas. Busque o produto certo abaixo.</div>`;
    abrirBusca();
  }
}

function abrirBusca() {
  cardBusca.classList.remove('hidden');
  inputBuscaProduto.value = '';
  inputBuscaProduto.focus();
  renderizarResultadosBusca('');
}

inputBuscaProduto.addEventListener('input', () => renderizarResultadosBusca(inputBuscaProduto.value.trim().toLowerCase()));

function renderizarResultadosBusca(termo) {
  const tbody = document.getElementById('tabelaBuscaProduto');
  const filtrados = termo
    ? todosProdutos.filter((p) => p.sku.toLowerCase().includes(termo) || (p.descricao || '').toLowerCase().includes(termo))
    : todosProdutos.slice(0, 50);

  tbody.innerHTML = filtrados.slice(0, 50).map((p) => `
    <tr>
      <td>${p.sku}</td><td>${p.descricao || ''}</td>
      <td><button data-sku="${p.sku}" class="primary">Selecionar</button></td>
    </tr>
  `).join('') || '<tr><td colspan="3" style="color:var(--text-dim)">Nenhum produto encontrado.</td></tr>';

  tbody.querySelectorAll('[data-sku]').forEach((btn) => {
    btn.addEventListener('click', () => selecionarProduto(btn.getAttribute('data-sku')));
  });
}

async function selecionarProduto(sku) {
  const produto = todosProdutos.find((p) => p.sku === sku);
  if (!produto || !eanEmCorrecao) return;

  const operador = document.getElementById('inputOperadorCorrecao').value.trim();
  if (!operador) { toast('Informe o operador responsável pela correção.', 'erro'); return; }

  const ok = await confirmar(`Mapear EAN ${eanEmCorrecao} para SKU ${produto.sku} — ${produto.descricao || '(sem descrição)'}?`);
  if (!ok) return;

  await salvarCorrecaoEan({ ean: eanEmCorrecao, sku: produto.sku, descricao: produto.descricao, operador });
  toast('Correção salva.', '');

  inputEan.value = '';
  resultadoBusca.innerHTML = '';
  cardBusca.classList.add('hidden');
  eanEmCorrecao = null;
  inputEan.focus();
  await renderizarCorrecoes();
}

async function renderizarCorrecoes() {
  const correcoes = await listarCorrecoes();
  document.getElementById('tabelaCorrecoes').innerHTML = correcoes.map((c) => `
    <tr>
      <td>${c.ean}</td><td>${c.sku}</td><td>${c.descricao || ''}</td>
      <td>${formatarDataHora(c.data_correcao)}</td><td>${c.operador}</td>
    </tr>
  `).join('') || '<tr><td colspan="5" style="color:var(--text-dim)">Nenhuma correção feita ainda.</td></tr>';
}

document.getElementById('btnExportarCorrecoes').addEventListener('click', async () => {
  const correcoes = await listarCorrecoes();
  if (correcoes.length === 0) { toast('Nenhuma correção para exportar.', 'aviso'); return; }
  const csv = gerarCSV(
    ['ean_correto', 'sku', 'descricao', 'data_correcao', 'operador'],
    correcoes.map((c) => ({ ean_correto: c.ean, sku: c.sku, descricao: c.descricao, data_correcao: c.data_correcao, operador: c.operador }))
  );
  baixarArquivo(`correcoes_ean_${carimboArquivo()}.csv`, csv);
});
