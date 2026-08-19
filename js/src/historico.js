import './swRegistro.js';
import { listarSessoes, obterItensSessao, obterLogSessao, excluirSessao } from './db.js';
import { formatarDataHora } from './util.js';
import { toast, abrirModal } from './ui.js';
import { exportarArquivosSessao } from './exportarSessao.js';
import { montarGateSenha } from './authGate.js';

let todasSessoes = [];
let sessaoSelecionada = null;

const viewLista = document.getElementById('view-lista');
const viewDetalhe = document.getElementById('view-detalhe');

montarGateSenha({ onLiberado: () => { viewLista.classList.remove('hidden'); carregar(); } });

async function carregar() {
  todasSessoes = (await listarSessoes({})).sort((a, b) => new Date(b.inicio) - new Date(a.inicio));

  const setores = [...new Set(todasSessoes.map((s) => s.setor))];
  const operadores = [...new Set(todasSessoes.map((s) => s.operador))];
  document.getElementById('filtroSetor').innerHTML = '<option value="">Todos</option>' + setores.map((s) => `<option>${s}</option>`).join('');
  document.getElementById('filtroOperador').innerHTML = '<option value="">Todos</option>' + operadores.map((o) => `<option>${o}</option>`).join('');

  renderizarLista();
}

function renderizarLista() {
  const fSetor = document.getElementById('filtroSetor').value;
  const fOperador = document.getElementById('filtroOperador').value;
  const fStatus = document.getElementById('filtroStatus').value;

  const filtradas = todasSessoes.filter((s) =>
    (!fSetor || s.setor === fSetor) &&
    (!fOperador || s.operador === fOperador) &&
    (!fStatus || s.status === fStatus)
  );

  document.getElementById('tabelaSessoes').innerHTML = filtradas.map((s) => `
    <tr>
      <td><span class="pill ${s.status}">${s.status}</span></td>
      <td>${s.setor}</td><td>${s.operador}</td>
      <td>${formatarDataHora(s.inicio)}</td><td>${formatarDataHora(s.fim)}</td>
      <td>${s.maquina}</td>
      <td><button data-abrir="${s.id}" class="ghost">Abrir →</button></td>
      <td><button data-excluir="${s.id}" class="danger">🗑️ Excluir</button></td>
    </tr>
  `).join('') || '<tr><td colspan="8" style="color:var(--text-dim)">Nenhuma sessão encontrada.</td></tr>';

  document.querySelectorAll('[data-abrir]').forEach((btn) => {
    btn.addEventListener('click', () => abrirDetalhe(btn.getAttribute('data-abrir')));
  });
  document.querySelectorAll('[data-excluir]').forEach((btn) => {
    btn.addEventListener('click', () => excluirSessaoDaLista(btn.getAttribute('data-excluir')));
  });
}

['filtroSetor', 'filtroOperador', 'filtroStatus'].forEach((id) => {
  document.getElementById(id).addEventListener('change', renderizarLista);
});

async function abrirDetalhe(sessaoId) {
  const sessao = todasSessoes.find((s) => s.id === sessaoId);
  if (!sessao) return;
  sessaoSelecionada = sessao;

  const itens = (await obterItensSessao(sessaoId)).filter((i) => i.qtd !== 0);
  const skus = itens.filter((i) => !String(i.chave).startsWith('DESCONHECIDO:')).sort((a, b) => a.sku.localeCompare(b.sku));
  const desconhecidos = itens.filter((i) => String(i.chave).startsWith('DESCONHECIDO:'));
  const log = await obterLogSessao(sessaoId);

  document.getElementById('detalheResumo').innerHTML = `
    <h2>${sessao.setor} — ${sessao.operador}</h2>
    <span class="pill ${sessao.status}">${sessao.status}</span>
    <p style="color:var(--text-dim);margin-top:0.6em">
      Início: ${formatarDataHora(sessao.inicio)} · Fim: ${formatarDataHora(sessao.fim)} · Dispositivo: ${sessao.maquina}<br>
      ID da sessão: <code>${sessao.id}</code>
    </p>
    <p><b>${skus.length}</b> SKUs distintos · <b>${skus.reduce((a, i) => a + i.qtd, 0)}</b> unidades · <b>${desconhecidos.length}</b> desconhecidos</p>
  `;

  document.getElementById('detalheItens').innerHTML = skus.map((i) => `<tr><td>${i.sku}</td><td>${i.descricao || ''}</td><td>${i.qtd}</td></tr>`).join('') || '<tr><td colspan="3" style="color:var(--text-dim)">Nenhum item.</td></tr>';
  document.getElementById('detalheDesconhecidos').innerHTML = desconhecidos.map((i) => `<tr><td>${i.ean}</td><td>${i.qtd}</td></tr>`).join('') || '<tr><td colspan="2" style="color:var(--text-dim)">Nenhum desconhecido.</td></tr>';
  document.getElementById('detalheLog').innerHTML = log.map((r) => `<tr><td>${formatarDataHora(r.ts)}</td><td>${r.chave || '—'}</td><td>${r.delta}</td><td>${r.origem}</td></tr>`).join('') || '<tr><td colspan="4" style="color:var(--text-dim)">Sem eventos.</td></tr>';

  viewLista.classList.add('hidden');
  viewDetalhe.classList.remove('hidden');
}

document.getElementById('btnVoltarLista').addEventListener('click', () => {
  viewDetalhe.classList.add('hidden');
  viewLista.classList.remove('hidden');
});

document.getElementById('btnReexportar').addEventListener('click', async () => {
  if (!sessaoSelecionada) return;
  await exportarArquivosSessao(sessaoSelecionada);
  toast('Arquivos reexportados.', '');
});

// ---------- Excluir sessão específica ----------
const PALAVRA_CONFIRMACAO = 'APAGAR';

async function confirmarExclusaoSessao(sessao) {
  const avisoConsolidacao = sessao.status === 'finalizada'
    ? '<p style="color:var(--danger)">Se esta sessão já foi exportada (.zip) e importada no Consolidador, isso <b>não desfaz</b> o que já foi consolidado — só remove o registro local deste dispositivo.</p>'
    : '';

  const confirmado = await abrirModal(`
    <h3 style="color:var(--danger)">🗑️ Excluir esta sessão</h3>
    <p style="color:var(--text-dim)">
      <b>${sessao.setor}</b> — ${sessao.operador} (${formatarDataHora(sessao.inicio)}, status: ${sessao.status})
    </p>
    <p style="color:var(--text-dim)">Apaga a contagem e o log desta sessão específica. Nenhuma outra sessão, nem a base de produtos, é afetada.</p>
    ${avisoConsolidacao}
    <p style="color:var(--danger);font-weight:700">Esta ação não pode ser desfeita.</p>
    <div class="field">
      <label>Digite <b>${PALAVRA_CONFIRMACAO}</b> para confirmar</label>
      <input type="text" id="inputConfirmarExclusao" autocomplete="off">
    </div>
    <div class="row" style="margin-top:1em">
      <button data-acao="nao" class="ghost">Cancelar</button>
      <button data-acao="sim" class="danger" disabled>Excluir sessão</button>
    </div>
  `, {
    onAbrir(overlay, fechar) {
      const inputConfirmar = overlay.querySelector('#inputConfirmarExclusao');
      const btnConfirmar = overlay.querySelector('[data-acao="sim"]');
      inputConfirmar.addEventListener('input', () => {
        btnConfirmar.disabled = inputConfirmar.value.trim() !== PALAVRA_CONFIRMACAO;
      });
      overlay.querySelector('[data-acao="nao"]').addEventListener('click', () => fechar(false));
      btnConfirmar.addEventListener('click', () => { if (!btnConfirmar.disabled) fechar(true); });
      inputConfirmar.focus();
    }
  });

  return confirmado;
}

async function excluirSessaoDaLista(sessaoId) {
  const sessao = todasSessoes.find((s) => s.id === sessaoId);
  if (!sessao) return;

  const ok = await confirmarExclusaoSessao(sessao);
  if (!ok) return;

  await excluirSessao(sessaoId);
  toast('Sessão excluída.', '');
  await carregar();
}
