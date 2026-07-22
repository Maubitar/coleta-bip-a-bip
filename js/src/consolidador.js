import { parseCSV, lerArquivoComoTexto, gerarCSV } from './csv.js';
import { carimboArquivo, formatarMoeda, baixarArquivo } from './util.js';
import { toast, abrirModal } from './ui.js';
import { lerZip, criarZip } from './zip.js';
import { montarGateSenha } from './authGate.js';
import { obterTodosProdutos, contarProdutos, listarCorrecoes, resetarDadosDispositivo } from './db.js';

montarGateSenha({ onLiberado: () => document.getElementById('view-consolidador').classList.remove('hidden') });

// ---------- Resetar dados deste dispositivo ----------
// Apaga só sessões/leituras (contagens) locais. Nunca toca em produtos/correções/config —
// o gerente pode querer limpar uma contagem de teste sem perder a base recém-importada.
const PALAVRA_CONFIRMACAO = 'APAGAR';

document.getElementById('btnResetarDispositivo').addEventListener('click', async () => {
  const [totalProdutos, correcoes] = await Promise.all([contarProdutos(), listarCorrecoes()]);

  const confirmado = await abrirModal(`
    <h3 style="color:var(--danger)">🗑️ Resetar dados deste dispositivo</h3>
    <p style="color:var(--text-dim)">Isso apaga <b>todas as sessões de contagem</b> (finalizadas ou em andamento) e o log deste dispositivo — como se o app tivesse acabado de ser instalado.</p>
    <p style="color:var(--text-dim)">A base de produtos (<b>${totalProdutos}</b> códigos), as correções de EAN (<b>${correcoes.length}</b>) e as configurações do dispositivo <b>não são apagadas</b>.</p>
    <p style="color:var(--danger);font-weight:700">Esta ação não pode ser desfeita. Ela afeta só este dispositivo — outros PCs e arquivos já exportados não são alterados.</p>
    <div class="field">
      <label>Digite <b>${PALAVRA_CONFIRMACAO}</b> para confirmar</label>
      <input type="text" id="inputConfirmarReset" autocomplete="off">
    </div>
    <div class="row" style="margin-top:1em">
      <button data-acao="nao" class="ghost">Cancelar</button>
      <button data-acao="sim" class="danger" disabled>Resetar agora</button>
    </div>
  `, {
    onAbrir(overlay, fechar) {
      const inputConfirmar = overlay.querySelector('#inputConfirmarReset');
      const btnConfirmar = overlay.querySelector('[data-acao="sim"]');
      inputConfirmar.addEventListener('input', () => {
        btnConfirmar.disabled = inputConfirmar.value.trim() !== PALAVRA_CONFIRMACAO;
      });
      overlay.querySelector('[data-acao="nao"]').addEventListener('click', () => fechar(false));
      btnConfirmar.addEventListener('click', () => { if (!btnConfirmar.disabled) fechar(true); });
      inputConfirmar.focus();
    }
  });

  if (!confirmado) return;

  const resultado = await resetarDadosDispositivo();
  document.getElementById('statusResetDispositivo').innerHTML =
    `✅ Resetado em ${new Date().toLocaleString('pt-BR')}: <b>${resultado.sessoesApagadas}</b> sessão(ões) e <b>${resultado.leiturasApagadas}</b> leitura(s) de log apagadas. ` +
    `Mantidos: base de produtos (${totalProdutos} códigos) e correções de EAN (${correcoes.length}).`;
  toast('Dados de contagem deste dispositivo foram resetados.', '');
});

function lerArquivoComoArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

let sessoesImportadas = []; // { sessao_id, setor, operador, inicio, fim, dispositivo, arquivo, itens: [{sku,qtd}] }
let desconhecidosImportados = []; // { ean, qtd, arquivo }
let estoqueOnepet = null; // Map sku -> qtd_sistema — vem da base local (automático) ou de upload manual
let produtosPorSku = new Map(); // sku -> { descricao, grupoLinha, subGrupo, estoque }

const inputArquivos = document.getElementById('inputArquivos');
const resumoArquivos = document.getElementById('resumoArquivos');
const cardResumo = document.getElementById('cardResumo');

// A base de produtos (com a coluna Estoque do Onepet) é local a este dispositivo —
// se ela foi importada aqui em Configurações, usamos como referência automática de
// "quanto o Onepet acha que tem", sem exigir nenhum upload extra nesta tela.
const produtosLocaisPromise = (async () => {
  const produtos = await obterTodosProdutos();
  produtos.forEach((p) => {
    if (!produtosPorSku.has(p.sku)) {
      produtosPorSku.set(p.sku, {
        descricao: p.descricao || '',
        grupoLinha: p.grupoLinha || '',
        subGrupo: p.subGrupo || '',
        estoque: p.estoque || 0,
      });
    }
  });
  if (produtosPorSku.size > 0) {
    estoqueOnepet = new Map([...produtosPorSku.entries()].map(([sku, info]) => [sku, info.estoque]));
    document.getElementById('resumoOnepet').textContent =
      `Referência carregada automaticamente da base local: ${produtosPorSku.size} produtos com estoque do Onepet.`;
  }
})();

function categoriaDoSku(sku) {
  const info = produtosPorSku.get(sku);
  return (info && info.grupoLinha) ? info.grupoLinha : 'Sem categoria';
}

// Agregação única por SKU, reaproveitada pela valorização, exportação e prioridade de ajuste.
function agregarPorSku() {
  const porSku = new Map(); // sku -> { qtd, custoTotal, vendaTotal }
  sessoesImportadas.forEach((s) => {
    s.itens.forEach((i) => {
      const atual = porSku.get(i.sku) || { sku: i.sku, qtd: 0, custoTotal: 0, vendaTotal: 0 };
      atual.qtd += i.qtd;
      atual.custoTotal += i.valorTotalCusto;
      atual.vendaTotal += i.valorTotalVenda;
      porSku.set(i.sku, atual);
    });
  });
  return porSku;
}

inputArquivos.addEventListener('change', async () => {
  const arquivos = Array.from(inputArquivos.files);
  if (arquivos.length === 0) return;
  await produtosLocaisPromise;

  sessoesImportadas = [];
  desconhecidosImportados = [];
  const idsVistos = new Set();
  let ignorados = [];

  // Normaliza a entrada: arquivos .zip viram uma lista de {nome, texto} extraída; .csv soltos idem.
  const entradas = [];
  for (const file of arquivos) {
    if (/\.zip$/i.test(file.name)) {
      try {
        const buffer = await lerArquivoComoArrayBuffer(file);
        const dentro = await lerZip(buffer);
        dentro.forEach((e) => entradas.push({ nome: e.nome, texto: e.texto, origemZip: file.name }));
      } catch (e) {
        ignorados.push(`${file.name} (erro ao abrir zip: ${e.message})`);
      }
    } else {
      const texto = await lerArquivoComoTexto(file);
      entradas.push({ nome: file.name, texto, origemZip: null });
    }
  }

  for (const { nome, texto } of entradas) {
    const linhas = parseCSV(texto);

    if (/_sessao\.csv$/i.test(nome)) {
      if (linhas.length === 0) { ignorados.push(nome + ' (vazio)'); continue; }
      const sessaoId = linhas[0].sessao_id;
      if (idsVistos.has(sessaoId)) { ignorados.push(nome + ' (sessão duplicada, ignorada)'); continue; }
      idsVistos.add(sessaoId);
      sessoesImportadas.push({
        sessao_id: sessaoId,
        setor: linhas[0].setor,
        operador: linhas[0].operador,
        inicio: linhas[0].inicio,
        fim: linhas[0].fim,
        dispositivo: linhas[0].dispositivo,
        arquivo: nome,
        itens: linhas.map((l) => ({
          sku: l.sku,
          qtd: Number(l.qtd) || 0,
          custoUnit: Number(l.custo_unit) || 0,
          valorTotalCusto: Number(l.valor_total_custo) || 0,
          vendaUnit: Number(l.venda_unit) || 0,
          valorTotalVenda: Number(l.valor_total_venda) || 0,
        })),
      });
    } else if (/_desconhecidos\.csv$/i.test(nome)) {
      linhas.forEach((l) => desconhecidosImportados.push({ ean: l.ean, qtd: Number(l.qtd) || 0, arquivo: nome }));
    } else if (/_log\.csv$/i.test(nome)) {
      // log bruto não entra na consolidação — apenas auditoria detalhada por sessão (ver Histórico)
    } else {
      ignorados.push(nome + ' (tipo não reconhecido)');
    }
  }

  resumoArquivos.innerHTML = `${sessoesImportadas.length} sessão(ões) e ${desconhecidosImportados.length} linha(s) de desconhecidos carregadas.` +
    (ignorados.length ? `<br><span style="color:var(--warn)">Ignorados: ${ignorados.join(', ')}</span>` : '');

  renderizarResumo();
});

const inputEstoqueOnepet = document.getElementById('inputEstoqueOnepet');
inputEstoqueOnepet.addEventListener('change', async () => {
  const file = inputEstoqueOnepet.files[0];
  if (!file) return;
  const texto = await lerArquivoComoTexto(file);
  const linhas = parseCSV(texto);
  estoqueOnepet = new Map(linhas.filter((l) => l.sku).map((l) => [String(l.sku).trim(), Number(l.qtd_sistema) || 0]));
  document.getElementById('resumoOnepet').textContent = `Referência substituída manualmente: ${estoqueOnepet.size} SKUs carregados do arquivo.`;
  renderizarPrioridadeAjuste();
});

// Pesado (roda só no Consolidador, sob demanda): compara qtd contada × qtd_sistema do Onepet.
// Custo unitário médio = custoTotal/qtd acumulado da própria contagem (pondera variações entre sessões).
// Isso não é uma lista de erros — o estoque do Onepet é sabidamente impreciso, e é exatamente
// por isso que o balanço físico existe. É uma ferramenta de priorização: mostra rápido onde o
// ajuste no Onepet tem mais impacto financeiro, para o gerente decidir por onde começar.
function calcularPrioridadeAjuste() {
  const porSku = agregarPorSku();
  const todosSkus = new Set([...porSku.keys(), ...(estoqueOnepet ? estoqueOnepet.keys() : [])]);
  const linhas = [...todosSkus].map((sku) => {
    const contado = porSku.get(sku);
    const qtdContada = contado ? contado.qtd : 0;
    const qtdSistema = estoqueOnepet.get(sku) ?? 0;
    const custoMedio = contado && contado.qtd > 0 ? contado.custoTotal / contado.qtd : 0;
    const diffQtd = qtdContada - qtdSistema;
    return { sku, categoria: categoriaDoSku(sku), qtdContada, qtdSistema, diffQtd, custoMedio, diffValor: diffQtd * custoMedio };
  }).filter((l) => l.diffQtd !== 0);

  linhas.sort((a, b) => Math.abs(b.diffValor) - Math.abs(a.diffValor));
  return linhas;
}

function renderizarPrioridadeAjuste() {
  const card = document.getElementById('cardDivergencia');
  if (!estoqueOnepet || sessoesImportadas.length === 0) { card.classList.add('hidden'); return; }

  const linhas = calcularPrioridadeAjuste();
  card.classList.remove('hidden');

  document.getElementById('tabelaDivergencia').innerHTML = linhas.map((l) => `
    <tr>
      <td>${l.sku}</td><td>${l.categoria}</td><td>${l.qtdContada}</td><td>${l.qtdSistema}</td>
      <td style="font-weight:700">${l.diffQtd > 0 ? '+' : ''}${l.diffQtd}</td>
      <td>${formatarMoeda(l.custoMedio)}</td>
      <td style="font-weight:700">${formatarMoeda(l.diffValor)}</td>
    </tr>
  `).join('') || '<tr><td colspan="7" style="color:var(--text-dim)">Tudo bate com o Onepet — nenhum ajuste prioritário agora.</td></tr>';

  const porCategoria = new Map(); // categoria -> valor absoluto de impacto
  linhas.forEach((l) => {
    const atual = porCategoria.get(l.categoria) || { categoria: l.categoria, impacto: 0 };
    atual.impacto += l.diffValor;
    porCategoria.set(l.categoria, atual);
  });
  document.getElementById('tabelaPrioridadeCategoria').innerHTML = [...porCategoria.values()]
    .sort((a, b) => Math.abs(b.impacto) - Math.abs(a.impacto))
    .map((c) => `<tr><td>${c.categoria}</td><td style="font-weight:700">${formatarMoeda(c.impacto)}</td></tr>`)
    .join('') || '<tr><td colspan="2" style="color:var(--text-dim)">Sem dados.</td></tr>';
}

function renderizarResumo() {
  if (sessoesImportadas.length === 0) { cardResumo.classList.add('hidden'); return; }
  cardResumo.classList.remove('hidden');

  const totalSkus = new Set();
  let totalUnidades = 0;
  sessoesImportadas.forEach((s) => s.itens.forEach((i) => { totalSkus.add(i.sku); totalUnidades += i.qtd; }));

  document.getElementById('resSessoes').textContent = sessoesImportadas.length;
  document.getElementById('resSkus').textContent = totalSkus.size;
  document.getElementById('resUnidades').textContent = totalUnidades;
  document.getElementById('resDesconhecidos').textContent = new Set(desconhecidosImportados.map((d) => d.ean)).size;

  document.getElementById('tabelaAuditoria').innerHTML = sessoesImportadas.map((s) => `
    <tr>
      <td>${s.setor}</td><td>${s.operador}</td><td>${s.inicio}</td><td>${s.fim}</td>
      <td>${s.itens.length}</td><td>${s.itens.reduce((a, i) => a + i.qtd, 0)}</td>
      <td>${s.dispositivo}</td><td style="font-size:0.75rem">${s.sessao_id}</td><td>${s.arquivo}</td>
    </tr>
  `).join('');

  renderizarValorizacao();
  renderizarPrioridadeAjuste();
  document.getElementById('cardResumoIA').classList.remove('hidden');
}

// Valorização: soma direta das colunas valor_total_custo/valor_total_venda já calculadas
// no export de cada sessão (qtd × preço unitário no momento da leitura). Desconhecidos
// nunca entram aqui — não têm custo/venda, ficam de fora por não terem chave de SKU.
function renderizarValorizacao() {
  let totalCusto = 0;
  let totalVenda = 0;
  const porSetor = new Map(); // setor -> { custo, venda }
  const porCategoria = new Map(); // categoria -> { custo, venda }

  sessoesImportadas.forEach((s) => {
    s.itens.forEach((i) => {
      totalCusto += i.valorTotalCusto;
      totalVenda += i.valorTotalVenda;

      const atualSetor = porSetor.get(s.setor) || { setor: s.setor, custo: 0, venda: 0 };
      atualSetor.custo += i.valorTotalCusto;
      atualSetor.venda += i.valorTotalVenda;
      porSetor.set(s.setor, atualSetor);

      const categoria = categoriaDoSku(i.sku);
      const atualCat = porCategoria.get(categoria) || { categoria, custo: 0, venda: 0 };
      atualCat.custo += i.valorTotalCusto;
      atualCat.venda += i.valorTotalVenda;
      porCategoria.set(categoria, atualCat);
    });
  });

  document.getElementById('cardFinanceiro').classList.remove('hidden');
  document.getElementById('valorTotalCusto').textContent = formatarMoeda(totalCusto);
  document.getElementById('valorTotalVenda').textContent = formatarMoeda(totalVenda);
  document.getElementById('tabelaValorPorSetor').innerHTML = [...porSetor.values()]
    .sort((a, b) => b.custo - a.custo)
    .map((s) => `<tr><td>${s.setor}</td><td>${formatarMoeda(s.custo)}</td><td>${formatarMoeda(s.venda)}</td></tr>`)
    .join('') || '<tr><td colspan="3" style="color:var(--text-dim)">Sem dados.</td></tr>';
  document.getElementById('tabelaValorPorCategoria').innerHTML = [...porCategoria.values()]
    .sort((a, b) => b.custo - a.custo)
    .map((c) => `<tr><td>${c.categoria}</td><td>${formatarMoeda(c.custo)}</td><td>${formatarMoeda(c.venda)}</td></tr>`)
    .join('') || '<tr><td colspan="3" style="color:var(--text-dim)">Sem dados.</td></tr>';
}

document.getElementById('btnGerar').addEventListener('click', () => {
  if (sessoesImportadas.length === 0) { toast('Nenhuma sessão importada.', 'erro'); return; }
  const carimbo = carimboArquivo();

  // CONSOLIDADO_TOTAL: sku,qtd_total
  const totalPorSku = new Map();
  // CONSOLIDADO_POR_SETOR: sku,setor,qtd
  const porSetor = new Map(); // chave `${sku}::${setor}`

  sessoesImportadas.forEach((s) => {
    s.itens.forEach((i) => {
      totalPorSku.set(i.sku, (totalPorSku.get(i.sku) || 0) + i.qtd);
      const chave = `${i.sku}::${s.setor}`;
      const atual = porSetor.get(chave) || { sku: i.sku, setor: s.setor, qtd: 0 };
      atual.qtd += i.qtd;
      porSetor.set(chave, atual);
    });
  });

  const csvTotal = gerarCSV(['sku', 'qtd_total'],
    [...totalPorSku.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([sku, qtd_total]) => ({ sku, qtd_total })));

  const csvPorSetor = gerarCSV(['sku', 'setor', 'qtd'],
    [...porSetor.values()].sort((a, b) => a.sku.localeCompare(b.sku) || a.setor.localeCompare(b.setor)));

  const csvAuditoria = gerarCSV(
    ['setor', 'operador', 'inicio', 'fim', 'itens_unicos', 'total_bips', 'dispositivo', 'sessao_id', 'arquivo'],
    sessoesImportadas.map((s) => ({
      setor: s.setor, operador: s.operador, inicio: s.inicio, fim: s.fim,
      itens_unicos: s.itens.length, total_bips: s.itens.reduce((a, i) => a + i.qtd, 0),
      dispositivo: s.dispositivo, sessao_id: s.sessao_id, arquivo: s.arquivo,
    }))
  );

  const totalPorEan = new Map();
  desconhecidosImportados.forEach((d) => totalPorEan.set(d.ean, (totalPorEan.get(d.ean) || 0) + d.qtd));
  const csvDesconhecidosGeral = gerarCSV(['ean', 'qtd_total'],
    [...totalPorEan.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([ean, qtd_total]) => ({ ean, qtd_total })));

  // Empacotados em um único .zip — downloads múltiplos automáticos são bloqueados pelo navegador.
  const zip = criarZip([
    { nome: `CONSOLIDADO_TOTAL_${carimbo}.csv`, conteudo: csvTotal },
    { nome: `CONSOLIDADO_POR_SETOR_${carimbo}.csv`, conteudo: csvPorSetor },
    { nome: `AUDITORIA_SESSOES_${carimbo}.csv`, conteudo: csvAuditoria },
    { nome: `DESCONHECIDOS_GERAL_${carimbo}.csv`, conteudo: csvDesconhecidosGeral },
  ]);
  const url = URL.createObjectURL(zip);
  const a = document.createElement('a');
  a.href = url;
  a.download = `CONSOLIDACAO_${carimbo}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);

  toast('4 arquivos gerados dentro de CONSOLIDACAO_' + carimbo + '.zip', '');
});

// ---------------- Resumo Inteligente do Balanço ----------------
// Monta o texto localmente (sempre funciona, offline). A chamada a uma IA pra transformar
// esse texto num resumo executivo em prosa depende de um backend/proxy com a chave da
// Anthropic guardada no servidor — não existe hoje neste app estático, então essa etapa
// fica pendente e o texto bruto é o resultado entregue por enquanto.
function montarTextoResumo() {
  const porSku = agregarPorSku();
  const totalSkus = porSku.size;
  const totalUnidades = [...porSku.values()].reduce((a, i) => a + i.qtd, 0);
  const totalCusto = [...porSku.values()].reduce((a, i) => a + i.custoTotal, 0);
  const totalVenda = [...porSku.values()].reduce((a, i) => a + i.vendaTotal, 0);

  const totalPorEan = new Map();
  desconhecidosImportados.forEach((d) => totalPorEan.set(d.ean, (totalPorEan.get(d.ean) || 0) + d.qtd));

  let linhas = [];
  linhas.push('RESUMO DO BALANÇO — Coleta Bip-a-Bip (Pet\'s Go)');
  linhas.push(`Gerado em: ${new Date().toLocaleString('pt-BR')}`);
  linhas.push('');
  linhas.push('NÚMEROS PRINCIPAIS');
  linhas.push(`- Sessões consolidadas: ${sessoesImportadas.length}`);
  linhas.push(`- SKUs distintos contados: ${totalSkus}`);
  linhas.push(`- Unidades totais contadas: ${totalUnidades}`);
  linhas.push(`- Valor total do estoque a CUSTO: ${formatarMoeda(totalCusto)}`);
  linhas.push(`- Valor total do estoque a VENDA: ${formatarMoeda(totalVenda)}`);
  linhas.push(`- EANs desconhecidos (sem cadastro): ${totalPorEan.size}`);
  linhas.push('');

  if (estoqueOnepet) {
    const prioridades = calcularPrioridadeAjuste();
    linhas.push(`TOP ${Math.min(10, prioridades.length)} PRIORIDADES DE AJUSTE NO ONEPET (maior impacto financeiro, de ${prioridades.length} no total)`);
    if (prioridades.length === 0) {
      linhas.push('- Nenhum ajuste prioritário — tudo bate com o Onepet.');
    } else {
      prioridades.slice(0, 10).forEach((d) => {
        linhas.push(`- SKU ${d.sku} (${d.categoria}): contado ${d.qtdContada} × Onepet ${d.qtdSistema} (${d.diffQtd > 0 ? '+' : ''}${d.diffQtd} un., impacto ${formatarMoeda(d.diffValor)})`);
      });
    }
  } else {
    linhas.push('PRIORIDADE DE AJUSTE: sem referência do Onepet disponível (importe a base de produtos com a coluna Estoque, ou envie o CSV manual).');
  }
  linhas.push('');

  linhas.push(`DESCONHECIDOS (EAN sem cadastro, ${totalPorEan.size} distintos)`);
  if (totalPorEan.size === 0) {
    linhas.push('- Nenhum.');
  } else {
    [...totalPorEan.entries()].sort((a, b) => b[1] - a[1]).forEach(([ean, qtd]) => {
      linhas.push(`- EAN ${ean}: ${qtd} unidade(s)`);
    });
  }

  return linhas.join('\n');
}

document.getElementById('btnResumoIA').addEventListener('click', async () => {
  if (sessoesImportadas.length === 0) { toast('Nenhuma sessão importada.', 'erro'); return; }

  const status = document.getElementById('statusResumoIA');
  const textarea = document.getElementById('textoResumoIA');
  const acoes = document.getElementById('acoesResumoIA');

  const texto = montarTextoResumo();
  textarea.value = texto;
  textarea.classList.remove('hidden');
  acoes.classList.remove('hidden');

  if (!navigator.onLine) {
    status.textContent = 'Sem conexão — resumo executivo por IA indisponível agora. O texto bruto abaixo já está pronto.';
    return;
  }
  status.textContent = 'Números e prioridades calculados abaixo. A transformação em resumo executivo por IA ainda depende de um backend com a chave da Anthropic (não configurado nesta versão) — por ora, use o texto bruto.';
});

document.getElementById('btnCopiarResumoIA').addEventListener('click', async () => {
  const texto = document.getElementById('textoResumoIA').value;
  try {
    await navigator.clipboard.writeText(texto);
    toast('Texto copiado.', '');
  } catch (e) {
    toast('Não foi possível copiar automaticamente — selecione o texto manualmente.', 'erro');
  }
});

document.getElementById('btnBaixarResumoIA').addEventListener('click', () => {
  const texto = document.getElementById('textoResumoIA').value;
  baixarArquivo(`RESUMO_BALANCO_${carimboArquivo()}.txt`, texto, 'text/plain;charset=utf-8');
});
