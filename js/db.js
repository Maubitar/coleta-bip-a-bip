// Camada de dados — IndexedDB. Commit por leitura, sem exceção.
// Stores:
//   produtos  { ean (pk), sku, descricao, custo, venda }        index: sku
//   correcoes { ean (pk = ean físico correto), sku, descricao, data_correcao, operador }  index: sku
//              — camada adicional sobre 'produtos', nunca sobrescreve o base_produtos.csv original.
//   sessoes   { id (pk), setor, operador, maquina, inicio, fim, status, modoQtdManualPadrao }  index: status, maquina
//   log       { id (pk, auto), ts, sessaoId, chave, ean, delta, origem, revertsId, setor, operador, maquina }  index: sessaoId
//   itens     { id (pk = sessaoId::chave), sessaoId, chave, sku, ean, descricao, custo, venda, qtd }  index: sessaoId
//   config    { key (pk), value }
//
// custo/venda: preços sigilosos. Nunca são exibidos na tela de contagem (operador) —
// só aparecem na área do Gerente (consolidador.html), protegida por senha (ver js/auth.js).

import { parseNumeroBR } from './util.js';

const DB_NAME = 'bipabip_db';
const DB_VERSION = 2;

let _dbPromise = null;

export function abrirDB() {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (ev) => {
      const db = req.result;
      if (!db.objectStoreNames.contains('produtos')) {
        const s = db.createObjectStore('produtos', { keyPath: 'ean' });
        s.createIndex('sku', 'sku', { unique: false });
      }
      if (!db.objectStoreNames.contains('correcoes')) {
        const s = db.createObjectStore('correcoes', { keyPath: 'ean' });
        s.createIndex('sku', 'sku', { unique: false });
      }
      if (!db.objectStoreNames.contains('sessoes')) {
        const s = db.createObjectStore('sessoes', { keyPath: 'id' });
        s.createIndex('status', 'status', { unique: false });
        s.createIndex('maquina', 'maquina', { unique: false });
      }
      if (!db.objectStoreNames.contains('log')) {
        const s = db.createObjectStore('log', { keyPath: 'id', autoIncrement: true });
        s.createIndex('sessaoId', 'sessaoId', { unique: false });
      }
      if (!db.objectStoreNames.contains('itens')) {
        const s = db.createObjectStore('itens', { keyPath: 'id' });
        s.createIndex('sessaoId', 'sessaoId', { unique: false });
      }
      if (!db.objectStoreNames.contains('config')) {
        db.createObjectStore('config', { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('Upgrade do banco bloqueado por outra aba aberta.'));
  });
  return _dbPromise;
}

function tx(db, stores, modo, executor) {
  return new Promise((resolve, reject) => {
    const t = db.transaction(stores, modo);
    let resultado;
    t.oncomplete = () => resolve(resultado);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error || new Error('Transação abortada'));
    Promise.resolve(executor(t)).then((r) => {
      resultado = r;
    }).catch((e) => {
      try { t.abort(); } catch (_) {}
      reject(e);
    });
  });
}

function reqProm(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ---------- CONFIG ----------

export async function getConfig(chave, padrao = null) {
  const db = await abrirDB();
  return tx(db, ['config'], 'readonly', async (t) => {
    const r = await reqProm(t.objectStore('config').get(chave));
    return r ? r.value : padrao;
  });
}

export async function setConfig(chave, valor) {
  const db = await abrirDB();
  return tx(db, ['config'], 'readwrite', async (t) => {
    t.objectStore('config').put({ key: chave, value: valor });
  });
}

// ---------- PRODUTOS ----------

export async function importarProdutos(lista) {
  const db = await abrirDB();
  return tx(db, ['produtos'], 'readwrite', async (t) => {
    const store = t.objectStore('produtos');
    await reqProm(store.clear());
    for (const p of lista) {
      store.put({
        ean: String(p.ean).trim(),
        sku: String(p.sku).trim(),
        descricao: p.descricao ? String(p.descricao).trim() : '',
        custo: parseNumeroBR(p.custo),
        venda: parseNumeroBR(p.venda),
      });
    }
    return lista.length;
  });
}

export async function buscarProdutoPorEan(ean) {
  const db = await abrirDB();
  return tx(db, ['produtos'], 'readonly', async (t) => {
    return await reqProm(t.objectStore('produtos').get(String(ean).trim()));
  });
}

export async function contarProdutos() {
  const db = await abrirDB();
  return tx(db, ['produtos'], 'readonly', async (t) => {
    return await reqProm(t.objectStore('produtos').count());
  });
}

export async function obterTodosProdutos() {
  const db = await abrirDB();
  return tx(db, ['produtos'], 'readonly', async (t) => {
    return await reqProm(t.objectStore('produtos').getAll());
  });
}

export async function buscarProdutoPorSku(sku) {
  const db = await abrirDB();
  return tx(db, ['produtos'], 'readonly', async (t) => {
    const idx = t.objectStore('produtos').index('sku');
    const resultados = await reqProm(idx.getAll(IDBKeyRange.only(String(sku))));
    return resultados[0] || null;
  });
}

// ---------- CORREÇÕES DE EAN ----------
// Camada adicional sobre 'produtos' para EANs físicos divergentes da nota fiscal.
// Nunca sobrescreve o base_produtos.csv original.

export async function salvarCorrecaoEan({ ean, sku, descricao, operador }) {
  const db = await abrirDB();
  return tx(db, ['correcoes'], 'readwrite', async (t) => {
    const registro = {
      ean: String(ean).trim(),
      sku: String(sku).trim(),
      descricao: descricao || '',
      data_correcao: new Date().toISOString(),
      operador: operador || '',
    };
    t.objectStore('correcoes').put(registro);
    return registro;
  });
}

export async function listarCorrecoes() {
  const db = await abrirDB();
  return tx(db, ['correcoes'], 'readonly', async (t) => {
    const todas = await reqProm(t.objectStore('correcoes').getAll());
    return todas.sort((a, b) => new Date(b.data_correcao) - new Date(a.data_correcao));
  });
}

export async function removerCorrecaoEan(ean) {
  const db = await abrirDB();
  return tx(db, ['correcoes'], 'readwrite', async (t) => {
    t.objectStore('correcoes').delete(String(ean).trim());
  });
}

// Resolve um EAN checando primeiro a base original, depois as correções.
// Retorna um objeto no mesmo formato de 'produtos' (com custo/venda sempre atuais,
// buscados por SKU na base original) ou null se realmente desconhecido.
export async function buscarProdutoPorEanComCorrecao(ean) {
  const db = await abrirDB();
  const eanLimpo = String(ean).trim();
  return tx(db, ['produtos', 'correcoes'], 'readonly', async (t) => {
    const direto = await reqProm(t.objectStore('produtos').get(eanLimpo));
    if (direto) return { ...direto, viaCorrecao: false };

    const correcao = await reqProm(t.objectStore('correcoes').get(eanLimpo));
    if (!correcao) return null;

    const idx = t.objectStore('produtos').index('sku');
    const porSku = await reqProm(idx.getAll(IDBKeyRange.only(correcao.sku)));
    const produtoAtual = porSku[0];
    return {
      ean: eanLimpo,
      sku: correcao.sku,
      descricao: produtoAtual ? produtoAtual.descricao : correcao.descricao,
      custo: produtoAtual ? produtoAtual.custo : 0,
      venda: produtoAtual ? produtoAtual.venda : 0,
      viaCorrecao: true,
    };
  });
}

// ---------- SESSÕES ----------

export async function criarSessao(sessao) {
  const db = await abrirDB();
  return tx(db, ['sessoes'], 'readwrite', async (t) => {
    t.objectStore('sessoes').put(sessao);
    return sessao;
  });
}

export async function atualizarSessao(id, patch) {
  const db = await abrirDB();
  return tx(db, ['sessoes'], 'readwrite', async (t) => {
    const store = t.objectStore('sessoes');
    const atual = await reqProm(store.get(id));
    if (!atual) throw new Error('Sessão não encontrada: ' + id);
    const nova = { ...atual, ...patch };
    store.put(nova);
    return nova;
  });
}

export async function obterSessao(id) {
  const db = await abrirDB();
  return tx(db, ['sessoes'], 'readonly', async (t) => {
    return await reqProm(t.objectStore('sessoes').get(id));
  });
}

export async function listarSessoes({ maquina = null, status = null } = {}) {
  const db = await abrirDB();
  return tx(db, ['sessoes'], 'readonly', async (t) => {
    const todas = await reqProm(t.objectStore('sessoes').getAll());
    return todas.filter((s) => (maquina ? s.maquina === maquina : true) && (status ? s.status === status : true));
  });
}

// ---------- ITENS (consolidado em tempo real por sessão) ----------

function idItem(sessaoId, chave) {
  return `${sessaoId}::${chave}`;
}

export async function obterItensSessao(sessaoId) {
  const db = await abrirDB();
  return tx(db, ['itens'], 'readonly', async (t) => {
    const idx = t.objectStore('itens').index('sessaoId');
    return await reqProm(idx.getAll(IDBKeyRange.only(sessaoId)));
  });
}

// ---------- LOG + LEITURAS ----------
// Toda operação que altera quantidade grava uma entrada de log (delta) e
// atualiza o consolidado 'itens' na MESMA transação — commit atômico por leitura.

async function aplicarDelta(t, { sessaoId, chave, ean, sku, descricao, custo, venda, delta, origem, revertsId, setor, operador, maquina }) {
  const logStore = t.objectStore('log');
  const itensStore = t.objectStore('itens');

  const entradaLog = {
    ts: new Date().toISOString(),
    sessaoId,
    chave,
    ean: ean || null,
    delta,
    origem,
    revertsId: revertsId || null,
    setor,
    operador,
    maquina,
  };
  const logId = await reqProm(logStore.add(entradaLog));

  const id = idItem(sessaoId, chave);
  const existente = await reqProm(itensStore.get(id));
  const novaQtd = (existente ? existente.qtd : 0) + delta;
  const registro = {
    id,
    sessaoId,
    chave,
    sku: sku !== undefined ? sku : existente ? existente.sku : null,
    ean: ean || (existente ? existente.ean : null),
    descricao: descricao !== undefined ? descricao : existente ? existente.descricao : '',
    custo: custo !== undefined ? custo : existente ? existente.custo : 0,
    venda: venda !== undefined ? venda : existente ? existente.venda : 0,
    qtd: novaQtd,
  };
  itensStore.put(registro);

  return { logId, ...entradaLog, novaQtd };
}

async function resolverEan(t, eanLimpo) {
  const direto = await reqProm(t.objectStore('produtos').get(eanLimpo));
  if (direto) return direto;

  const correcao = await reqProm(t.objectStore('correcoes').get(eanLimpo));
  if (!correcao) return null;

  const idx = t.objectStore('produtos').index('sku');
  const porSku = await reqProm(idx.getAll(IDBKeyRange.only(correcao.sku)));
  const produtoAtual = porSku[0];
  return {
    ean: eanLimpo,
    sku: correcao.sku,
    descricao: produtoAtual ? produtoAtual.descricao : correcao.descricao,
    custo: produtoAtual ? produtoAtual.custo : 0,
    venda: produtoAtual ? produtoAtual.venda : 0,
  };
}

export async function registrarLeitura(sessaoId, ean, meta) {
  const db = await abrirDB();
  return tx(db, ['produtos', 'correcoes', 'log', 'itens'], 'readwrite', async (t) => {
    const eanLimpo = String(ean).trim();
    const produto = await resolverEan(t, eanLimpo);
    const desconhecido = !produto;
    const chave = desconhecido ? `DESCONHECIDO:${eanLimpo}` : produto.sku;
    const resultado = await aplicarDelta(t, {
      sessaoId,
      chave,
      ean: eanLimpo,
      sku: desconhecido ? null : produto.sku,
      descricao: desconhecido ? '' : produto.descricao,
      custo: desconhecido ? 0 : (produto.custo || 0),
      venda: desconhecido ? 0 : (produto.venda || 0),
      delta: 1,
      origem: 'bip',
      ...meta,
    });
    return { ...resultado, desconhecido, sku: desconhecido ? null : produto.sku, descricao: desconhecido ? '' : produto.descricao, ean: eanLimpo };
  });
}

export async function definirQuantidadeManual(sessaoId, chave, novoValor, modo, meta) {
  const db = await abrirDB();
  return tx(db, ['log', 'itens'], 'readwrite', async (t) => {
    const itensStore = t.objectStore('itens');
    const id = idItem(sessaoId, chave);
    const existente = await reqProm(itensStore.get(id));
    const qtdAtual = existente ? existente.qtd : 0;
    const delta = modo === 'somar' ? novoValor : novoValor - qtdAtual;
    const resultado = await aplicarDelta(t, {
      sessaoId,
      chave,
      ean: existente ? existente.ean : null,
      sku: existente ? existente.sku : (String(chave).startsWith('DESCONHECIDO:') ? null : chave),
      descricao: existente ? existente.descricao : '',
      delta,
      origem: 'manual',
      ...meta,
    });
    return resultado;
  });
}

export async function desfazerUltimaLeitura(sessaoId, ultimoLogId, meta) {
  const db = await abrirDB();
  return tx(db, ['log', 'itens'], 'readwrite', async (t) => {
    const logStore = t.objectStore('log');
    const original = await reqProm(logStore.get(ultimoLogId));
    if (!original || original.sessaoId !== sessaoId) throw new Error('Leitura original não encontrada para desfazer.');
    const resultado = await aplicarDelta(t, {
      sessaoId,
      chave: original.chave,
      ean: original.ean,
      delta: -original.delta,
      origem: 'undo',
      revertsId: original.id,
      ...meta,
    });
    return { ...resultado, chaveDesfeita: original.chave, origemOriginal: original.origem };
  });
}

export async function registrarMarcador(sessaoId, origem, meta) {
  const db = await abrirDB();
  return tx(db, ['log'], 'readwrite', async (t) => {
    const entrada = {
      ts: new Date().toISOString(),
      sessaoId,
      chave: null,
      ean: null,
      delta: 0,
      origem,
      revertsId: null,
      ...meta,
    };
    const id = await reqProm(t.objectStore('log').add(entrada));
    return { id, ...entrada };
  });
}

export async function obterLogSessao(sessaoId) {
  const db = await abrirDB();
  return tx(db, ['log'], 'readonly', async (t) => {
    const idx = t.objectStore('log').index('sessaoId');
    const registros = await reqProm(idx.getAll(IDBKeyRange.only(sessaoId)));
    registros.sort((a, b) => a.id - b.id);
    return registros;
  });
}

// Reconstrói a pilha de leituras "desfazíveis" a partir do log persistido.
// Garante retomada correta após fechar o app / queda de energia.
export async function reconstruirPilhaDesfazer(sessaoId) {
  const registros = await obterLogSessao(sessaoId);
  const pilha = [];
  for (const r of registros) {
    if (r.origem === 'bip' || r.origem === 'manual') {
      pilha.push(r.id);
    } else if (r.origem === 'undo') {
      pilha.pop();
    }
  }
  return pilha;
}

export async function exportarBancoCompleto() {
  const db = await abrirDB();
  const nomes = ['produtos', 'correcoes', 'sessoes', 'log', 'itens', 'config'];
  return tx(db, nomes, 'readonly', async (t) => {
    const saida = {};
    for (const nome of nomes) {
      saida[nome] = await reqProm(t.objectStore(nome).getAll());
    }
    saida._exportadoEm = new Date().toISOString();
    saida._versao = DB_VERSION;
    return saida;
  });
}
