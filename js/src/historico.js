import { listarSessoes, obterItensSessao, obterLogSessao } from './db.js';
import { formatarDataHora } from './util.js';
import { toast } from './ui.js';
import { exportarArquivosSessao } from './exportarSessao.js';

let todasSessoes = [];
let sessaoSelecionada = null;

const viewLista = document.getElementById('view-lista');
const viewDetalhe = document.getElementById('view-detalhe');

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
    </tr>
  `).join('') || '<tr><td colspan="7" style="color:var(--text-dim)">Nenhuma sessão encontrada.</td></tr>';

  document.querySelectorAll('[data-abrir]').forEach((btn) => {
    btn.addEventListener('click', () => abrirDetalhe(btn.getAttribute('data-abrir')));
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

carregar();
