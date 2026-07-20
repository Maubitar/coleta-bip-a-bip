// Gerado automaticamente a partir de js/src/coleta.js — não editar direto. Ver js/src/.
(() => {
  // ../../../../../../../../Desktop/SOGI  BIP a BIP/js/src/util.js
  function uuid() {
    if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === "x" ? r : r & 3 | 8;
      return v.toString(16);
    });
  }
  function agoraISO() {
    return (/* @__PURE__ */ new Date()).toISOString();
  }
  function carimboArquivo(data = /* @__PURE__ */ new Date()) {
    const p = (n) => String(n).padStart(2, "0");
    return data.getFullYear().toString() + p(data.getMonth() + 1) + p(data.getDate()) + "_" + p(data.getHours()) + p(data.getMinutes()) + p(data.getSeconds());
  }
  function formatarDataHora(iso) {
    if (!iso) return "\u2014";
    const d = new Date(iso);
    const p = (n) => String(n).padStart(2, "0");
    return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  }
  function limparParaArquivo(texto) {
    return String(texto || "SEM_NOME").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "").toUpperCase() || "SEM_NOME";
  }
  var CHAVE_DISPOSITIVO = "bipabip_maquina_id";
  function nomeDispositivoPadrao() {
    let existente = null;
    try {
      existente = localStorage.getItem(CHAVE_DISPOSITIVO);
    } catch (e) {
      existente = null;
    }
    if (existente) return existente;
    const sufixo = Math.random().toString(16).slice(2, 6).toUpperCase();
    const gerado = `PC-${sufixo}`;
    try {
      localStorage.setItem(CHAVE_DISPOSITIVO, gerado);
    } catch (e) {
    }
    return gerado;
  }
  function tocarAlerta() {
    try {
      const ctx = tocarBip._ctx || (tocarBip._ctx = new (window.AudioContext || window.webkitAudioContext)());
      [0, 0.14].forEach((atraso) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "square";
        osc.frequency.value = 420;
        gain.gain.setValueAtTime(1e-3, ctx.currentTime + atraso);
        gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + atraso + 0.02);
        gain.gain.exponentialRampToValueAtTime(1e-3, ctx.currentTime + atraso + 0.12);
        osc.connect(gain).connect(ctx.destination);
        osc.start(ctx.currentTime + atraso);
        osc.stop(ctx.currentTime + atraso + 0.13);
      });
    } catch (e) {
    }
  }
  function tocarBip(sucesso = true) {
    try {
      const ctx = tocarBip._ctx || (tocarBip._ctx = new (window.AudioContext || window.webkitAudioContext)());
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = sucesso ? 880 : 220;
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(1e-3, ctx.currentTime + 0.12);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch (e) {
    }
  }
  function distanciaEdicaoAteUm(a, b) {
    if (a === b) return true;
    const la = a.length;
    const lb = b.length;
    if (Math.abs(la - lb) > 1) return false;
    if (la === lb) {
      let diferencas = 0;
      for (let i2 = 0; i2 < la; i2++) {
        if (a[i2] !== b[i2]) {
          diferencas++;
          if (diferencas > 1) return false;
        }
      }
      return diferencas <= 1;
    }
    const menor = la < lb ? a : b;
    const maior = la < lb ? b : a;
    let i = 0;
    let j = 0;
    let pulos = 0;
    while (i < menor.length && j < maior.length) {
      if (menor[i] === maior[j]) {
        i++;
        j++;
      } else {
        j++;
        pulos++;
        if (pulos > 1) return false;
      }
    }
    return true;
  }

  // ../../../../../../../../Desktop/SOGI  BIP a BIP/js/src/db.js
  var DB_NAME = "bipabip_db";
  var DB_VERSION = 2;
  var _dbPromise = null;
  function abrirDB() {
    if (_dbPromise) return _dbPromise;
    _dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (ev) => {
        const db = req.result;
        if (!db.objectStoreNames.contains("produtos")) {
          const s = db.createObjectStore("produtos", { keyPath: "ean" });
          s.createIndex("sku", "sku", { unique: false });
        }
        if (!db.objectStoreNames.contains("correcoes")) {
          const s = db.createObjectStore("correcoes", { keyPath: "ean" });
          s.createIndex("sku", "sku", { unique: false });
        }
        if (!db.objectStoreNames.contains("sessoes")) {
          const s = db.createObjectStore("sessoes", { keyPath: "id" });
          s.createIndex("status", "status", { unique: false });
          s.createIndex("maquina", "maquina", { unique: false });
        }
        if (!db.objectStoreNames.contains("log")) {
          const s = db.createObjectStore("log", { keyPath: "id", autoIncrement: true });
          s.createIndex("sessaoId", "sessaoId", { unique: false });
        }
        if (!db.objectStoreNames.contains("itens")) {
          const s = db.createObjectStore("itens", { keyPath: "id" });
          s.createIndex("sessaoId", "sessaoId", { unique: false });
        }
        if (!db.objectStoreNames.contains("config")) {
          db.createObjectStore("config", { keyPath: "key" });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      req.onblocked = () => reject(new Error("Upgrade do banco bloqueado por outra aba aberta."));
    });
    return _dbPromise;
  }
  function tx(db, stores, modo, executor) {
    return new Promise((resolve, reject) => {
      const t = db.transaction(stores, modo);
      let resultado;
      t.oncomplete = () => resolve(resultado);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error || new Error("Transa\xE7\xE3o abortada"));
      Promise.resolve(executor(t)).then((r) => {
        resultado = r;
      }).catch((e) => {
        try {
          t.abort();
        } catch (_) {
        }
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
  async function getConfig(chave, padrao = null) {
    const db = await abrirDB();
    return tx(db, ["config"], "readonly", async (t) => {
      const r = await reqProm(t.objectStore("config").get(chave));
      return r ? r.value : padrao;
    });
  }
  async function setConfig(chave, valor) {
    const db = await abrirDB();
    return tx(db, ["config"], "readwrite", async (t) => {
      t.objectStore("config").put({ key: chave, value: valor });
    });
  }
  async function obterTodosProdutos() {
    const db = await abrirDB();
    return tx(db, ["produtos"], "readonly", async (t) => {
      return await reqProm(t.objectStore("produtos").getAll());
    });
  }
  async function listarCorrecoes() {
    const db = await abrirDB();
    return tx(db, ["correcoes"], "readonly", async (t) => {
      const todas = await reqProm(t.objectStore("correcoes").getAll());
      return todas.sort((a, b) => new Date(b.data_correcao) - new Date(a.data_correcao));
    });
  }
  async function criarSessao(sessao) {
    const db = await abrirDB();
    return tx(db, ["sessoes"], "readwrite", async (t) => {
      t.objectStore("sessoes").put(sessao);
      return sessao;
    });
  }
  async function atualizarSessao(id, patch) {
    const db = await abrirDB();
    return tx(db, ["sessoes"], "readwrite", async (t) => {
      const store = t.objectStore("sessoes");
      const atual = await reqProm(store.get(id));
      if (!atual) throw new Error("Sess\xE3o n\xE3o encontrada: " + id);
      const nova = { ...atual, ...patch };
      store.put(nova);
      return nova;
    });
  }
  async function obterSessao(id) {
    const db = await abrirDB();
    return tx(db, ["sessoes"], "readonly", async (t) => {
      return await reqProm(t.objectStore("sessoes").get(id));
    });
  }
  async function listarSessoes({ maquina: maquina2 = null, status = null } = {}) {
    const db = await abrirDB();
    return tx(db, ["sessoes"], "readonly", async (t) => {
      const todas = await reqProm(t.objectStore("sessoes").getAll());
      return todas.filter((s) => (maquina2 ? s.maquina === maquina2 : true) && (status ? s.status === status : true));
    });
  }
  function idItem(sessaoId, chave) {
    return `${sessaoId}::${chave}`;
  }
  async function obterItensSessao(sessaoId) {
    const db = await abrirDB();
    return tx(db, ["itens"], "readonly", async (t) => {
      const idx = t.objectStore("itens").index("sessaoId");
      return await reqProm(idx.getAll(IDBKeyRange.only(sessaoId)));
    });
  }
  async function aplicarDelta(t, { sessaoId, chave, ean, sku, descricao, custo, venda, delta, origem, revertsId, setor, operador, maquina: maquina2 }) {
    const logStore = t.objectStore("log");
    const itensStore = t.objectStore("itens");
    const entradaLog = {
      ts: (/* @__PURE__ */ new Date()).toISOString(),
      sessaoId,
      chave,
      ean: ean || null,
      delta,
      origem,
      revertsId: revertsId || null,
      setor,
      operador,
      maquina: maquina2
    };
    const logId = await reqProm(logStore.add(entradaLog));
    const id = idItem(sessaoId, chave);
    const existente = await reqProm(itensStore.get(id));
    const novaQtd = (existente ? existente.qtd : 0) + delta;
    const registro = {
      id,
      sessaoId,
      chave,
      sku: sku !== void 0 ? sku : existente ? existente.sku : null,
      ean: ean || (existente ? existente.ean : null),
      descricao: descricao !== void 0 ? descricao : existente ? existente.descricao : "",
      custo: custo !== void 0 ? custo : existente ? existente.custo : 0,
      venda: venda !== void 0 ? venda : existente ? existente.venda : 0,
      qtd: novaQtd
    };
    itensStore.put(registro);
    return { logId, ...entradaLog, novaQtd };
  }
  async function resolverEan(t, eanLimpo) {
    const direto = await reqProm(t.objectStore("produtos").get(eanLimpo));
    if (direto) return direto;
    const correcao = await reqProm(t.objectStore("correcoes").get(eanLimpo));
    if (!correcao) return null;
    const idx = t.objectStore("produtos").index("sku");
    const porSku = await reqProm(idx.getAll(IDBKeyRange.only(correcao.sku)));
    const produtoAtual = porSku[0];
    return {
      ean: eanLimpo,
      sku: correcao.sku,
      descricao: produtoAtual ? produtoAtual.descricao : correcao.descricao,
      custo: produtoAtual ? produtoAtual.custo : 0,
      venda: produtoAtual ? produtoAtual.venda : 0
    };
  }
  async function registrarLeitura(sessaoId, ean, meta) {
    const db = await abrirDB();
    return tx(db, ["produtos", "correcoes", "log", "itens"], "readwrite", async (t) => {
      const eanLimpo = String(ean).trim();
      const produto = await resolverEan(t, eanLimpo);
      const desconhecido = !produto;
      const chave = desconhecido ? `DESCONHECIDO:${eanLimpo}` : produto.sku;
      const resultado = await aplicarDelta(t, {
        sessaoId,
        chave,
        ean: eanLimpo,
        sku: desconhecido ? null : produto.sku,
        descricao: desconhecido ? "" : produto.descricao,
        custo: desconhecido ? 0 : produto.custo || 0,
        venda: desconhecido ? 0 : produto.venda || 0,
        delta: 1,
        origem: "bip",
        ...meta
      });
      return { ...resultado, desconhecido, sku: desconhecido ? null : produto.sku, descricao: desconhecido ? "" : produto.descricao, ean: eanLimpo };
    });
  }
  async function definirQuantidadeManual(sessaoId, chave, novoValor, modo, meta) {
    const db = await abrirDB();
    return tx(db, ["log", "itens"], "readwrite", async (t) => {
      const itensStore = t.objectStore("itens");
      const id = idItem(sessaoId, chave);
      const existente = await reqProm(itensStore.get(id));
      const qtdAtual = existente ? existente.qtd : 0;
      const delta = modo === "somar" ? novoValor : novoValor - qtdAtual;
      const resultado = await aplicarDelta(t, {
        sessaoId,
        chave,
        ean: existente ? existente.ean : null,
        sku: existente ? existente.sku : String(chave).startsWith("DESCONHECIDO:") ? null : chave,
        descricao: existente ? existente.descricao : "",
        delta,
        origem: "manual",
        ...meta
      });
      return resultado;
    });
  }
  async function desfazerUltimaLeitura(sessaoId, ultimoLogId, meta) {
    const db = await abrirDB();
    return tx(db, ["log", "itens"], "readwrite", async (t) => {
      const logStore = t.objectStore("log");
      const original = await reqProm(logStore.get(ultimoLogId));
      if (!original || original.sessaoId !== sessaoId) throw new Error("Leitura original n\xE3o encontrada para desfazer.");
      const resultado = await aplicarDelta(t, {
        sessaoId,
        chave: original.chave,
        ean: original.ean,
        delta: -original.delta,
        origem: "undo",
        revertsId: original.id,
        ...meta
      });
      return { ...resultado, chaveDesfeita: original.chave, origemOriginal: original.origem };
    });
  }
  async function registrarMarcador(sessaoId, origem, meta) {
    const db = await abrirDB();
    return tx(db, ["log"], "readwrite", async (t) => {
      const entrada = {
        ts: (/* @__PURE__ */ new Date()).toISOString(),
        sessaoId,
        chave: null,
        ean: null,
        delta: 0,
        origem,
        revertsId: null,
        ...meta
      };
      const id = await reqProm(t.objectStore("log").add(entrada));
      return { id, ...entrada };
    });
  }
  async function obterLogSessao(sessaoId) {
    const db = await abrirDB();
    return tx(db, ["log"], "readonly", async (t) => {
      const idx = t.objectStore("log").index("sessaoId");
      const registros = await reqProm(idx.getAll(IDBKeyRange.only(sessaoId)));
      registros.sort((a, b) => a.id - b.id);
      return registros;
    });
  }

  // ../../../../../../../../Desktop/SOGI  BIP a BIP/js/src/ui.js
  function toast(mensagem, tipo = "") {
    const container = document.getElementById("toastContainer") || document.body;
    const el = document.createElement("div");
    el.className = "toast" + (tipo ? " " + tipo : "");
    el.textContent = mensagem;
    container.appendChild(el);
    requestAnimationFrame(() => el.classList.add("show"));
    setTimeout(() => {
      el.classList.remove("show");
      setTimeout(() => el.remove(), 250);
    }, 2600);
  }
  function abrirModal(htmlConteudo, { onAbrir } = {}) {
    return new Promise((resolve) => {
      const overlay = document.createElement("div");
      overlay.className = "modal-overlay";
      overlay.innerHTML = `<div class="modal-box">${htmlConteudo}</div>`;
      document.body.appendChild(overlay);
      function fechar(valor) {
        overlay.remove();
        document.removeEventListener("keydown", onEsc, true);
        resolve(valor);
      }
      function onEsc(ev) {
        if (ev.key === "Escape") {
          ev.preventDefault();
          fechar(null);
        }
      }
      document.addEventListener("keydown", onEsc, true);
      overlay.addEventListener("click", (ev) => {
        if (ev.target === overlay) fechar(null);
      });
      if (onAbrir) onAbrir(overlay, fechar);
    });
  }
  function confirmar(mensagem) {
    return new Promise((resolve) => {
      abrirModal(`
      <h3>${mensagem}</h3>
      <div class="row" style="margin-top:1em">
        <button data-acao="nao" class="ghost">Cancelar</button>
        <button data-acao="sim" class="danger">Confirmar</button>
      </div>
    `, {
        onAbrir(overlay, fechar) {
          overlay.querySelector('[data-acao="sim"]').addEventListener("click", () => fechar(true));
          overlay.querySelector('[data-acao="nao"]').addEventListener("click", () => fechar(false));
        }
      }).then(resolve);
    });
  }

  // ../../../../../../../../Desktop/SOGI  BIP a BIP/js/src/csv.js
  function paraCampoCSV(valor) {
    const s = valor === null || valor === void 0 ? "" : String(valor);
    if (/[",\n\r;]/.test(s)) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  }
  function gerarCSV(colunas, linhas) {
    const cabecalho = colunas.join(",");
    const corpo = linhas.map((linha) => colunas.map((c) => paraCampoCSV(linha[c])).join(",")).join("\r\n");
    return cabecalho + "\r\n" + corpo + (corpo ? "\r\n" : "");
  }

  // ../../../../../../../../Desktop/SOGI  BIP a BIP/js/src/zip.js
  var enc = new TextEncoder();
  function crc32(bytes) {
    let c = ~0;
    for (let i = 0; i < bytes.length; i++) {
      c ^= bytes[i];
      for (let k = 0; k < 8; k++) c = c >>> 1 ^ 3988292384 & -(c & 1);
    }
    return ~c >>> 0;
  }
  function u16(n) {
    return new Uint8Array([n & 255, n >>> 8 & 255]);
  }
  function u32(n) {
    return new Uint8Array([n & 255, n >>> 8 & 255, n >>> 16 & 255, n >>> 24 & 255]);
  }
  function concatU8(arrays) {
    const total = arrays.reduce((s, a) => s + a.length, 0);
    const out = new Uint8Array(total);
    let o = 0;
    for (const a of arrays) {
      out.set(a, o);
      o += a.length;
    }
    return out;
  }
  function dosDateTime(d = /* @__PURE__ */ new Date()) {
    const time = (d.getHours() & 31) << 11 | (d.getMinutes() & 63) << 5 | d.getSeconds() >> 1 & 31;
    const date = (d.getFullYear() - 1980 & 127) << 9 | (d.getMonth() + 1 & 15) << 5 | d.getDate() & 31;
    return { time, date };
  }
  function criarZip(arquivos) {
    const { time, date } = dosDateTime();
    const localParts = [];
    const centralParts = [];
    let offset = 0;
    for (const arq of arquivos) {
      const nameBytes = enc.encode(arq.nome);
      const dataBytes = enc.encode(arq.conteudo);
      const crc = crc32(dataBytes);
      const local = concatU8([
        u32(67324752),
        u16(20),
        u16(2048),
        u16(0),
        u16(time),
        u16(date),
        u32(crc),
        u32(dataBytes.length),
        u32(dataBytes.length),
        u16(nameBytes.length),
        u16(0),
        nameBytes
      ]);
      localParts.push(local, dataBytes);
      const central = concatU8([
        u32(33639248),
        u16(20),
        u16(20),
        u16(2048),
        u16(0),
        u16(time),
        u16(date),
        u32(crc),
        u32(dataBytes.length),
        u32(dataBytes.length),
        u16(nameBytes.length),
        u16(0),
        u16(0),
        u16(0),
        u16(0),
        u32(0),
        u32(offset),
        nameBytes
      ]);
      centralParts.push(central);
      offset += local.length + dataBytes.length;
    }
    const cdOffset = offset;
    const cdBytes = concatU8(centralParts);
    const eocd = concatU8([
      u32(101010256),
      u16(0),
      u16(0),
      u16(arquivos.length),
      u16(arquivos.length),
      u32(cdBytes.length),
      u32(cdOffset),
      u16(0)
    ]);
    return new Blob([...localParts, cdBytes, eocd], { type: "application/zip" });
  }

  // ../../../../../../../../Desktop/SOGI  BIP a BIP/js/src/exportarSessao.js
  function nomeBaseSessao(sessao) {
    return `SESSAO_${limparParaArquivo(sessao.setor)}_${limparParaArquivo(sessao.operador)}_${carimboArquivo(new Date(sessao.fim || sessao.inicio))}`;
  }
  async function exportarArquivosSessao(sessao) {
    const itens = (await obterItensSessao(sessao.id)).filter((i) => i.qtd !== 0);
    const skus = itens.filter((i) => !String(i.chave).startsWith("DESCONHECIDO:"));
    const desconhecidos = itens.filter((i) => String(i.chave).startsWith("DESCONHECIDO:"));
    const log = await obterLogSessao(sessao.id);
    const base = nomeBaseSessao(sessao);
    const arred = (n) => Math.round(n * 100) / 100;
    const csvSessao = gerarCSV(
      ["sku", "qtd", "custo_unit", "valor_total_custo", "venda_unit", "valor_total_venda", "setor", "operador", "dispositivo", "inicio", "fim", "sessao_id"],
      skus.map((i) => ({
        sku: i.sku,
        qtd: i.qtd,
        custo_unit: arred(i.custo || 0),
        valor_total_custo: arred((i.custo || 0) * i.qtd),
        venda_unit: arred(i.venda || 0),
        valor_total_venda: arred((i.venda || 0) * i.qtd),
        setor: sessao.setor,
        operador: sessao.operador,
        dispositivo: sessao.maquina,
        inicio: sessao.inicio,
        fim: sessao.fim,
        sessao_id: sessao.id
      }))
    );
    const csvLog = gerarCSV(
      ["ts", "sku_ou_desconhecido", "delta", "origem", "setor", "operador", "dispositivo", "sessao_id"],
      log.map((r) => ({ ts: r.ts, sku_ou_desconhecido: r.chave || "", delta: r.delta, origem: r.origem, setor: r.setor, operador: r.operador, dispositivo: r.maquina, sessao_id: sessao.id }))
    );
    const csvDesconhecidos = gerarCSV(
      ["ean", "qtd"],
      desconhecidos.map((i) => ({ ean: i.ean, qtd: i.qtd }))
    );
    const zip = criarZip([
      { nome: `${base}_sessao.csv`, conteudo: csvSessao },
      { nome: `${base}_log.csv`, conteudo: csvLog },
      { nome: `${base}_desconhecidos.csv`, conteudo: csvDesconhecidos }
    ]);
    baixarArquivoBlob(`${base}.zip`, zip);
  }
  function baixarArquivoBlob(nome, blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nome;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1e4);
  }

  // ../../../../../../../../Desktop/SOGI  BIP a BIP/js/src/coleta.js
  var JANELA_REPETICAO_MS = 1e4;
  var LIMITE_REPETICAO = 15;
  var SETORES_PADRAO = ["Dep\xF3sito", "Loja", "Banho e Tosa", "Outros"];
  var maquina = nomeDispositivoPadrao();
  var views = {
    sessao: document.getElementById("view-sessao"),
    contagem: document.getElementById("view-contagem"),
    finalizacao: document.getElementById("view-finalizacao"),
    concluido: document.getElementById("view-concluido")
  };
  function mostrarView(nome) {
    Object.entries(views).forEach(([k, el]) => el.classList.toggle("hidden", k !== nome));
  }
  var sessaoAtual = null;
  var pilhaDesfazer = [];
  var totalBipsAtivos = 0;
  var chavesComQtd = /* @__PURE__ */ new Set();
  var itemAtualChave = null;
  var historicoLeiturasPorEan = /* @__PURE__ */ new Map();
  var indiceEansConhecidos = [];
  var sugestaoPendente = null;
  var elInputLeitura = document.getElementById("inputLeitura");
  async function popularSetores() {
    const custom = await getConfig("setoresCustom", []);
    const select = document.getElementById("selectSetor");
    select.innerHTML = "";
    [...SETORES_PADRAO, ...custom].forEach((s) => {
      const op = document.createElement("option");
      op.value = s;
      op.textContent = s;
      select.appendChild(op);
    });
  }
  async function popularOperadores() {
    const todas = await listarSessoes({});
    const nomes = [...new Set(todas.map((s) => s.operador).filter(Boolean))];
    const datalist = document.getElementById("listaOperadores");
    datalist.innerHTML = nomes.map((n) => `<option value="${n.replace(/"/g, "&quot;")}">`).join("");
  }
  async function popularSessoesAbertas() {
    const abertas = await listarSessoes({ maquina, status: "aberta" });
    const pausadas = await listarSessoes({ maquina, status: "pausada" });
    const emAndamento = [...abertas, ...pausadas].sort((a, b) => new Date(b.inicio) - new Date(a.inicio));
    const div = document.getElementById("listaSessoesAbertas");
    if (emAndamento.length === 0) {
      div.innerHTML = '<p style="color:var(--text-dim)">Nenhuma sess\xE3o em andamento.</p>';
      return;
    }
    div.innerHTML = emAndamento.map((s) => `
    <div class="row" style="align-items:center;border-bottom:1px solid var(--border);padding:0.6em 0">
      <div style="flex:2">
        <span class="pill ${s.status}">${s.status}</span>
        <b>${s.setor}</b> \u2014 ${s.operador}
        <div style="color:var(--text-dim);font-size:0.8rem">In\xEDcio: ${formatarDataHora(s.inicio)}</div>
      </div>
      <button data-continuar="${s.id}" class="primary" style="flex:0 0 auto">Continuar</button>
    </div>
  `).join("");
    div.querySelectorAll("[data-continuar]").forEach((btn) => {
      btn.addEventListener("click", () => entrarNaSessao(btn.getAttribute("data-continuar")));
    });
  }
  document.getElementById("btnNovoSetor").addEventListener("click", async () => {
    const nome = prompt("Nome do novo setor:");
    if (!nome || !nome.trim()) return;
    const custom = await getConfig("setoresCustom", []);
    if (!custom.includes(nome.trim())) {
      custom.push(nome.trim());
      await setConfig("setoresCustom", custom);
    }
    await popularSetores();
    document.getElementById("selectSetor").value = nome.trim();
  });
  document.getElementById("btnIniciarSessao").addEventListener("click", async () => {
    const operador = document.getElementById("inputOperador").value.trim();
    const setor = document.getElementById("selectSetor").value;
    if (!operador) {
      toast("Informe o nome do operador.", "erro");
      return;
    }
    if (!setor) {
      toast("Selecione um setor.", "erro");
      return;
    }
    const modoQtdManualPadrao = await getConfig("modoQtdManualPadrao", "substituir");
    const sessao = {
      id: uuid(),
      setor,
      operador,
      maquina,
      inicio: agoraISO(),
      fim: null,
      status: "aberta",
      modoQtdManualPadrao
    };
    await criarSessao(sessao);
    await entrarNaSessao(sessao.id);
  });
  async function entrarNaSessao(sessaoId) {
    const sessao = await obterSessao(sessaoId);
    if (!sessao) {
      toast("Sess\xE3o n\xE3o encontrada.", "erro");
      return;
    }
    if (sessao.status === "finalizada") {
      toast("Esta sess\xE3o j\xE1 foi finalizada.", "erro");
      return;
    }
    sessaoAtual = sessao;
    if (sessao.status === "pausada") {
      await atualizarSessao(sessao.id, { status: "aberta" });
      sessaoAtual.status = "aberta";
    }
    const log = await obterLogSessao(sessaoId);
    pilhaDesfazer = [];
    totalBipsAtivos = 0;
    for (const r of log) {
      if (r.origem === "bip" || r.origem === "manual") {
        pilhaDesfazer.push(r.id);
        if (r.origem === "bip") totalBipsAtivos++;
      } else if (r.origem === "undo") {
        pilhaDesfazer.pop();
        const original = log.find((x) => x.id === r.revertsId);
        if (original && original.origem === "bip") totalBipsAtivos--;
      }
    }
    const ultimaLeituraValida = [...log].reverse().find((r) => r.origem === "bip" || r.origem === "manual");
    itemAtualChave = ultimaLeituraValida ? ultimaLeituraValida.chave : null;
    const itens = await obterItensSessao(sessaoId);
    chavesComQtd = new Set(itens.filter((i) => i.qtd > 0).map((i) => i.chave));
    historicoLeiturasPorEan = /* @__PURE__ */ new Map();
    sugestaoPendente = null;
    document.getElementById("cardSugestaoEan").classList.add("hidden");
    document.getElementById("painelAtual").classList.remove("alerta-repeticao");
    document.getElementById("avisoRepeticao").classList.add("hidden");
    const [produtos, correcoes] = await Promise.all([obterTodosProdutos(), listarCorrecoes()]);
    indiceEansConhecidos = [
      ...produtos.map((p) => ({ ean: p.ean, sku: p.sku, descricao: p.descricao })),
      ...correcoes.map((c) => ({ ean: c.ean, sku: c.sku, descricao: c.descricao }))
    ];
    document.getElementById("hdrSetor").textContent = sessao.setor;
    document.getElementById("hdrOperador").textContent = sessao.operador;
    document.getElementById("hdrMaquina").textContent = `Dispositivo: ${maquina}`;
    atualizarContadores();
    if (itemAtualChave) {
      const item = itens.find((i) => i.chave === itemAtualChave);
      if (item) atualizarPainelAtual(item);
    } else {
      document.getElementById("painelEan").textContent = "Aguardando primeira leitura\u2026";
      document.getElementById("painelDescricao").textContent = "\u2014";
      document.getElementById("painelSku").textContent = "";
      document.getElementById("painelQtd").textContent = "0";
    }
    mostrarView("contagem");
    elInputLeitura.value = "";
    elInputLeitura.focus();
  }
  function metaAtual() {
    return { setor: sessaoAtual.setor, operador: sessaoAtual.operador, maquina };
  }
  function atualizarContadores() {
    document.getElementById("totalBips").textContent = totalBipsAtivos;
    document.getElementById("totalUnicos").textContent = chavesComQtd.size;
  }
  function atualizarPainelAtual(item) {
    const desconhecido = String(item.chave).startsWith("DESCONHECIDO:");
    document.getElementById("painelEan").textContent = item.ean ? `EAN: ${item.ean}` : "";
    document.getElementById("painelDescricao").textContent = desconhecido ? "EAN n\xE3o cadastrado na base" : item.descricao || "(sem descri\xE7\xE3o)";
    document.getElementById("painelSku").textContent = desconhecido ? `Desconhecido: ${item.chave.replace("DESCONHECIDO:", "")}` : `SKU: ${item.sku}`;
    const qtdEl = document.getElementById("painelQtd");
    qtdEl.textContent = item.qtd;
    qtdEl.classList.toggle("desconhecido", desconhecido);
  }
  function verificarRepeticaoAnormal(ean) {
    const agora = Date.now();
    const lista = (historicoLeiturasPorEan.get(ean) || []).filter((t) => agora - t < JANELA_REPETICAO_MS);
    lista.push(agora);
    historicoLeiturasPorEan.set(ean, lista);
    const painel = document.getElementById("painelAtual");
    const aviso = document.getElementById("avisoRepeticao");
    if (lista.length > LIMITE_REPETICAO) {
      painel.classList.add("alerta-repeticao");
      aviso.classList.remove("hidden");
      tocarAlerta();
    } else {
      painel.classList.remove("alerta-repeticao");
      aviso.classList.add("hidden");
    }
  }
  function buscarSugestaoProximaEan(eanDigitado) {
    return indiceEansConhecidos.find((p) => distanciaEdicaoAteUm(eanDigitado, p.ean)) || null;
  }
  function mostrarSugestao(eanDigitado, sugestao, logId) {
    sugestaoPendente = { eanDigitado, sugestao, logId };
    document.getElementById("sugestaoTexto").textContent = `${sugestao.ean} \u2014 ${sugestao.descricao || sugestao.sku}`;
    document.getElementById("cardSugestaoEan").classList.remove("hidden");
  }
  function esconderSugestao() {
    sugestaoPendente = null;
    document.getElementById("cardSugestaoEan").classList.add("hidden");
  }
  document.getElementById("btnIgnorarSugestao").addEventListener("click", esconderSugestao);
  document.getElementById("btnAceitarSugestao").addEventListener("click", async () => {
    if (!sugestaoPendente) return;
    const { sugestao, logId } = sugestaoPendente;
    esconderSugestao();
    if (pilhaDesfazer.length > 0 && pilhaDesfazer[pilhaDesfazer.length - 1] === logId) {
      await executarDesfazer();
    }
    await processarLeitura(sugestao.ean);
    toast("Corrigido para o item sugerido.", "");
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
        chave: resultado.chave,
        ean: resultado.ean,
        sku: resultado.sku,
        descricao: resultado.descricao,
        qtd: resultado.novaQtd
      });
      atualizarContadores();
      tocarBip(true);
      verificarRepeticaoAnormal(ean);
      if (resultado.desconhecido) {
        toast(`EAN ${ean} n\xE3o encontrado na base \u2014 registrado como desconhecido.`, "aviso");
        const sugestao = buscarSugestaoProximaEan(ean);
        if (sugestao) mostrarSugestao(ean, sugestao, resultado.logId);
        else esconderSugestao();
      } else {
        esconderSugestao();
      }
    } catch (e) {
      tocarBip(false);
      toast("Erro ao registrar leitura: " + e.message, "erro");
    }
  }
  elInputLeitura.addEventListener("keydown", async (ev) => {
    if (ev.key === "Enter") {
      ev.preventDefault();
      const valor = elInputLeitura.value;
      elInputLeitura.value = "";
      await processarLeitura(valor);
    } else if (ev.key === "Backspace" && elInputLeitura.value === "") {
      ev.preventDefault();
      await executarDesfazer();
    }
  });
  elInputLeitura.addEventListener("blur", () => {
    if (!views.contagem.classList.contains("hidden")) {
      setTimeout(() => elInputLeitura.focus(), 50);
    }
  });
  async function executarDesfazer() {
    if (pilhaDesfazer.length === 0) {
      toast("Nada para desfazer.", "aviso");
      return;
    }
    if (sugestaoPendente && pilhaDesfazer[pilhaDesfazer.length - 1] !== sugestaoPendente.logId) esconderSugestao();
    const ultimoId = pilhaDesfazer.pop();
    try {
      const resultado = await desfazerUltimaLeitura(sessaoAtual.id, ultimoId, metaAtual());
      const itens = await obterItensSessao(sessaoAtual.id);
      const item = itens.find((i) => i.chave === resultado.chaveDesfeita);
      const novaQtd = item ? item.qtd : 0;
      if (novaQtd <= 0) chavesComQtd.delete(resultado.chaveDesfeita);
      else chavesComQtd.add(resultado.chaveDesfeita);
      if (resultado.origemOriginal === "bip") totalBipsAtivos--;
      itemAtualChave = resultado.chaveDesfeita;
      if (item) atualizarPainelAtual(item);
      atualizarContadores();
      toast("\xDAltima leitura desfeita.", "");
    } catch (e) {
      toast("Erro ao desfazer: " + e.message, "erro");
    }
  }
  document.getElementById("btnDesfazer").addEventListener("click", executarDesfazer);
  async function abrirModalQtdManual() {
    if (!itemAtualChave) {
      toast("Nenhum item selecionado ainda.", "aviso");
      return;
    }
    if (sugestaoPendente) esconderSugestao();
    const itens = await obterItensSessao(sessaoAtual.id);
    const item = itens.find((i) => i.chave === itemAtualChave) || { qtd: 0, chave: itemAtualChave };
    const modoPadrao = sessaoAtual.modoQtdManualPadrao || "substituir";
    const valor = await abrirModal(`
    <h3>Quantidade manual</h3>
    <p style="color:var(--text-dim)">Item atual: <b>${item.descricao || item.chave}</b> (qtd. atual: ${item.qtd})</p>
    <div class="field">
      <label>Modo</label>
      <select id="mqModo">
        <option value="substituir" ${modoPadrao === "substituir" ? "selected" : ""}>Substituir quantidade total</option>
        <option value="somar" ${modoPadrao === "somar" ? "selected" : ""}>Somar \xE0 quantidade atual</option>
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
        const input = overlay.querySelector("#mqValor");
        input.focus();
        input.select();
        overlay.querySelector('[data-acao="cancelar"]').addEventListener("click", () => fechar(null));
        overlay.querySelector('[data-acao="confirmar"]').addEventListener("click", () => {
          fechar({ valor: Number(overlay.querySelector("#mqValor").value), modo: overlay.querySelector("#mqModo").value });
        });
        input.addEventListener("keydown", (ev) => {
          if (ev.key === "Enter") {
            ev.preventDefault();
            overlay.querySelector('[data-acao="confirmar"]').click();
          }
        });
      }
    });
    if (!valor || Number.isNaN(valor.valor)) return;
    const resultado = await definirQuantidadeManual(sessaoAtual.id, itemAtualChave, valor.valor, valor.modo, metaAtual());
    pilhaDesfazer.push(resultado.logId);
    const itens2 = await obterItensSessao(sessaoAtual.id);
    const item2 = itens2.find((i) => i.chave === itemAtualChave);
    if (item2.qtd > 0) chavesComQtd.add(itemAtualChave);
    else chavesComQtd.delete(itemAtualChave);
    atualizarPainelAtual(item2);
    atualizarContadores();
    toast("Quantidade manual aplicada.", "");
  }
  document.getElementById("btnQtdManual").addEventListener("click", abrirModalQtdManual);
  async function marcarPausa() {
    await registrarMarcador(sessaoAtual.id, "pausa", metaAtual());
    const banner = document.getElementById("bannerPausa");
    banner.classList.remove("hidden");
    toast("Pausa marcada no log. A contagem continua liberada.", "");
    setTimeout(() => banner.classList.add("hidden"), 4e3);
  }
  document.getElementById("btnPausa").addEventListener("click", marcarPausa);
  async function irParaChecagem() {
    if (sugestaoPendente) esconderSugestao();
    const itens = (await obterItensSessao(sessaoAtual.id)).filter((i) => i.qtd !== 0);
    const skus = itens.filter((i) => !String(i.chave).startsWith("DESCONHECIDO:")).sort((a, b) => a.sku.localeCompare(b.sku));
    const desconhecidos = itens.filter((i) => String(i.chave).startsWith("DESCONHECIDO:"));
    document.getElementById("chkTotalSkus").textContent = skus.length;
    document.getElementById("chkTotalUnidades").textContent = skus.reduce((s, i) => s + i.qtd, 0);
    document.getElementById("chkTotalDesconhecidos").textContent = desconhecidos.length;
    document.getElementById("tabelaItens").innerHTML = skus.map((i) => `<tr><td>${i.sku}</td><td>${i.descricao || ""}</td><td>${i.qtd}</td></tr>`).join("") || '<tr><td colspan="3" style="color:var(--text-dim)">Nenhum item contado.</td></tr>';
    document.getElementById("tabelaDesconhecidos").innerHTML = desconhecidos.map((i) => `<tr><td>${i.ean}</td><td>${i.qtd}</td></tr>`).join("") || '<tr><td colspan="2" style="color:var(--text-dim)">Nenhum desconhecido.</td></tr>';
    mostrarView("finalizacao");
  }
  document.getElementById("btnFinalizar").addEventListener("click", irParaChecagem);
  document.getElementById("btnVoltarContagem").addEventListener("click", () => {
    mostrarView("contagem");
    elInputLeitura.focus();
  });
  async function confirmarFinalizacao() {
    const ok = await confirmar("Finalizar sess\xE3o? Depois disso ela vira somente leitura e os arquivos ser\xE3o exportados.");
    if (!ok) return;
    const fim = agoraISO();
    await atualizarSessao(sessaoAtual.id, { status: "finalizada", fim });
    sessaoAtual.fim = fim;
    sessaoAtual.status = "finalizada";
    await exportarArquivosSessao(sessaoAtual);
    mostrarView("concluido");
  }
  document.getElementById("btnConfirmarFinalizar").addEventListener("click", confirmarFinalizacao);
  document.addEventListener("keydown", (ev) => {
    if (views.contagem.classList.contains("hidden")) return;
    if (ev.key === "F2") {
      ev.preventDefault();
      abrirModalQtdManual();
    } else if (ev.key === "F9") {
      ev.preventDefault();
      marcarPausa();
    } else if (ev.key === "F12") {
      ev.preventDefault();
      irParaChecagem();
    }
  });
  (async () => {
    await popularSetores();
    await popularOperadores();
    await popularSessoesAbertas();
    const params = new URLSearchParams(location.search);
    const sessaoParam = params.get("sessao");
    if (sessaoParam) {
      await entrarNaSessao(sessaoParam);
    } else {
      mostrarView("sessao");
    }
  })();
})();
