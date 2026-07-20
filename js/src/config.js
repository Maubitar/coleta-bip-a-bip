import { importarProdutos, contarProdutos, obterTodosProdutos, getConfig, setConfig } from './db.js';
import { parseCSV, lerArquivoComoTexto } from './csv.js';
import { nomeDispositivoPadrao, formatarDataHora } from './util.js';
import { toast, confirmar } from './ui.js';
import { exportarBackupAgora } from './backup.js';
import { senhaGerenteConfigurada, definirSenhaGerente, verificarSenhaGerente } from './auth.js';
import { normalizarBaseProdutos } from './baseProdutos.js';

const CHAVE_DISPOSITIVO_LS = 'bipabip_maquina_id';

async function textoStatusBase() {
  const total = await contarProdutos();
  if (total === 0) return '<span style="color:var(--warn)">Nenhuma base importada.</span>';
  const produtos = await obterTodosProdutos();
  const skusDistintos = new Set(produtos.map((p) => p.sku)).size;
  return `Base atual: <b>${skusDistintos}</b> produtos (<b>${total}</b> códigos de barras mapeados, incluindo alternativos).`;
}

async function iniciar() {
  document.getElementById('statusBaseAtual').innerHTML = await textoStatusBase();

  document.getElementById('inputNomeDispositivo').value = nomeDispositivoPadrao();

  const modoQtd = await getConfig('modoQtdManualPadrao', 'substituir');
  document.getElementById('selectModoQtd').value = modoQtd;
  const travarSetor = await getConfig('travarSetorNaSessao', true);
  document.getElementById('checkTravarSetor').checked = travarSetor;

  const ultimoBackup = await getConfig('ultimoBackupEm', null);
  document.getElementById('infoUltimoBackup').textContent = ultimoBackup
    ? `Último backup: ${formatarDataHora(ultimoBackup)}`
    : 'Nenhum backup realizado ainda.';

  await renderizarSetoresCustom();
  await renderizarStatusSenhaGerente();
}

async function renderizarStatusSenhaGerente() {
  const configurada = await senhaGerenteConfigurada();
  document.getElementById('statusSenhaGerente').textContent = configurada
    ? 'Senha configurada. Para trocar, informe a senha atual e a nova.'
    : 'Nenhuma senha configurada — a Área do Gerente pedirá para criar uma na primeira vez que for aberta.';
  document.getElementById('campoSenhaAtualConfig').classList.toggle('hidden', !configurada);
  document.getElementById('lblSenhaNovaConfig').textContent = configurada ? 'Nova senha' : 'Senha';
}

document.getElementById('btnSalvarSenhaConfig').addEventListener('click', async () => {
  const erroEl = document.getElementById('senhaConfigErro');
  erroEl.textContent = '';

  const configurada = await senhaGerenteConfigurada();
  const nova = document.getElementById('inputSenhaNovaConfig').value;
  const novaConfirmar = document.getElementById('inputSenhaNovaConfirmarConfig').value;

  if (!nova || nova.length < 4) { erroEl.textContent = 'A senha precisa ter pelo menos 4 caracteres.'; return; }
  if (nova !== novaConfirmar) { erroEl.textContent = 'As senhas não conferem.'; return; }

  if (configurada) {
    const atual = document.getElementById('inputSenhaAtualConfig').value;
    const ok = await verificarSenhaGerente(atual);
    if (!ok) { erroEl.textContent = 'Senha atual incorreta.'; return; }
  }

  await definirSenhaGerente(nova);
  document.getElementById('inputSenhaAtualConfig').value = '';
  document.getElementById('inputSenhaNovaConfig').value = '';
  document.getElementById('inputSenhaNovaConfirmarConfig').value = '';
  await renderizarStatusSenhaGerente();
  toast('Senha do Gerente salva.', '');
});

document.getElementById('inputBaseProdutos').addEventListener('change', async (ev) => {
  const file = ev.target.files[0];
  if (!file) return;
  const texto = await lerArquivoComoTexto(file);
  const linhas = parseCSV(texto);

  if (linhas.length === 0) { toast('Arquivo vazio.', 'erro'); ev.target.value = ''; return; }

  const resultado = normalizarBaseProdutos(linhas);
  if (resultado.formato === 'desconhecido') {
    toast('Não reconheci as colunas do arquivo. Esperado o export nativo do Onepet, ou o formato simples ean,sku,descricao,custo,venda.', 'erro');
    ev.target.value = '';
    return;
  }

  const skusDistintos = new Set(resultado.produtos.map((p) => p.sku)).size;
  const nomeFormato = resultado.formato === 'onepet' ? 'Onepet (nativo)' : 'simples (ean,sku,descricao,custo,venda)';
  let msg = `Formato detectado: ${nomeFormato}. Importar ${skusDistintos} produtos (${resultado.produtos.length} códigos de barras, incluindo alternativos)? Isso substitui totalmente a base atual.`;
  if (resultado.ignoradosInativos > 0) msg += ` ${resultado.ignoradosInativos} linha(s) com status diferente de "Ativo" foram ignoradas.`;
  if (resultado.ignoradosSemSku > 0) msg += ` ${resultado.ignoradosSemSku} linha(s) sem SKU/EAN foram ignoradas.`;

  const ok = await confirmar(msg);
  if (!ok) { ev.target.value = ''; return; }

  await importarProdutos(resultado.produtos);
  toast(`${skusDistintos} produtos importados (${resultado.produtos.length} códigos de barras).`, '');
  document.getElementById('statusBaseAtual').innerHTML = await textoStatusBase();
  ev.target.value = '';
});

document.getElementById('btnSalvarDispositivo').addEventListener('click', () => {
  const nome = document.getElementById('inputNomeDispositivo').value.trim();
  if (!nome) { toast('Nome não pode ser vazio.', 'erro'); return; }
  try { localStorage.setItem(CHAVE_DISPOSITIVO_LS, nome); } catch (e) {}
  toast('Nome do dispositivo salvo. Sessões futuras usarão este nome.', '');
});

document.getElementById('btnSalvarPrefs').addEventListener('click', async () => {
  await setConfig('modoQtdManualPadrao', document.getElementById('selectModoQtd').value);
  await setConfig('travarSetorNaSessao', document.getElementById('checkTravarSetor').checked);
  toast('Preferências salvas.', '');
});

document.getElementById('btnBackupAgora').addEventListener('click', async () => {
  await exportarBackupAgora();
  document.getElementById('infoUltimoBackup').textContent = `Último backup: ${formatarDataHora(new Date().toISOString())}`;
  toast('Backup exportado.', '');
});

async function renderizarSetoresCustom() {
  const custom = await getConfig('setoresCustom', []);
  const div = document.getElementById('listaSetoresCustom');
  div.innerHTML = custom.length
    ? custom.map((s, idx) => `<span class="pill finalizada" style="margin:0.2em">${s} <button data-remover="${idx}" class="ghost" style="padding:0 0.4em;font-size:0.7rem">✕</button></span>`).join('')
    : '<span style="color:var(--text-dim)">Nenhum setor adicional (usando os padrões: Depósito, Loja, Banho e Tosa, Outros).</span>';

  div.querySelectorAll('[data-remover]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const idx = Number(btn.getAttribute('data-remover'));
      const atual = await getConfig('setoresCustom', []);
      atual.splice(idx, 1);
      await setConfig('setoresCustom', atual);
      renderizarSetoresCustom();
    });
  });
}

document.getElementById('btnAdicionarSetorConfig').addEventListener('click', async () => {
  const input = document.getElementById('inputNovoSetorConfig');
  const nome = input.value.trim();
  if (!nome) return;
  const custom = await getConfig('setoresCustom', []);
  if (!custom.includes(nome)) {
    custom.push(nome);
    await setConfig('setoresCustom', custom);
  }
  input.value = '';
  renderizarSetoresCustom();
});

iniciar();
