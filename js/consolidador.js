// Gerado automaticamente a partir de js/src/consolidador.js — não editar direto. Ver js/src/.
(() => {
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
  function parseCSV(texto) {
    if (texto.charCodeAt(0) === 65279) texto = texto.slice(1);
    const linhas = [];
    let linhaAtual = [];
    let campoAtual = "";
    let dentroAspas = false;
    let i = 0;
    const n = texto.length;
    function fimCampo() {
      linhaAtual.push(campoAtual);
      campoAtual = "";
    }
    function fimLinha() {
      fimCampo();
      linhas.push(linhaAtual);
      linhaAtual = [];
    }
    while (i < n) {
      const c = texto[i];
      if (dentroAspas) {
        if (c === '"') {
          if (texto[i + 1] === '"') {
            campoAtual += '"';
            i += 2;
            continue;
          }
          dentroAspas = false;
          i++;
          continue;
        }
        campoAtual += c;
        i++;
        continue;
      }
      if (c === '"') {
        dentroAspas = true;
        i++;
        continue;
      }
      if (c === ",") {
        fimCampo();
        i++;
        continue;
      }
      if (c === "\r") {
        i++;
        continue;
      }
      if (c === "\n") {
        fimLinha();
        i++;
        continue;
      }
      campoAtual += c;
      i++;
    }
    if (campoAtual.length > 0 || linhaAtual.length > 0) fimLinha();
    const linhasNaoVazias = linhas.filter((l) => !(l.length === 1 && l[0] === ""));
    if (linhasNaoVazias.length === 0) return [];
    const cabecalho = linhasNaoVazias[0].map((h) => h.trim());
    const registros = [];
    for (let li = 1; li < linhasNaoVazias.length; li++) {
      const l = linhasNaoVazias[li];
      const obj = {};
      cabecalho.forEach((h, idx) => {
        obj[h] = l[idx] !== void 0 ? l[idx] : "";
      });
      registros.push(obj);
    }
    return registros;
  }
  function lerArquivoComoTexto(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file, "utf-8");
    });
  }

  // ../../../../../../../../Desktop/SOGI  BIP a BIP/js/src/util.js
  function carimboArquivo(data = /* @__PURE__ */ new Date()) {
    const p = (n) => String(n).padStart(2, "0");
    return data.getFullYear().toString() + p(data.getMonth() + 1) + p(data.getDate()) + "_" + p(data.getHours()) + p(data.getMinutes()) + p(data.getSeconds());
  }
  function baixarArquivo(nome, conteudo, tipo = "text/csv;charset=utf-8") {
    const blob = new Blob(["\uFEFF" + conteudo], { type: tipo });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nome;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1e4);
  }
  function formatarMoeda(valor) {
    return (Number(valor) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
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
  async function lerZip(arrayBuffer) {
    const bytes = new Uint8Array(arrayBuffer);
    const view = new DataView(arrayBuffer);
    let eocdPos = -1;
    for (let i = bytes.length - 22; i >= 0 && i >= bytes.length - 22 - 65557; i--) {
      if (view.getUint32(i, true) === 101010256) {
        eocdPos = i;
        break;
      }
    }
    if (eocdPos === -1) throw new Error("Arquivo .zip inv\xE1lido ou corrompido.");
    const totalEntradas = view.getUint16(eocdPos + 10, true);
    let cdOffset = view.getUint32(eocdPos + 16, true);
    const dec = new TextDecoder("utf-8");
    const resultado = [];
    for (let i = 0; i < totalEntradas; i++) {
      if (view.getUint32(cdOffset, true) !== 33639248) throw new Error("Diret\xF3rio central do .zip corrompido.");
      const metodo = view.getUint16(cdOffset + 10, true);
      const tamanhoComprimido = view.getUint32(cdOffset + 20, true);
      const tamanhoOriginal = view.getUint32(cdOffset + 24, true);
      const nomeLen = view.getUint16(cdOffset + 28, true);
      const extraLen = view.getUint16(cdOffset + 30, true);
      const comentarioLen = view.getUint16(cdOffset + 32, true);
      const localHeaderOffset = view.getUint32(cdOffset + 42, true);
      const nome = dec.decode(bytes.slice(cdOffset + 46, cdOffset + 46 + nomeLen));
      if (metodo !== 0) {
        throw new Error(`Arquivo "${nome}" est\xE1 compactado (n\xE3o suportado). Reexporte pelo app ou extraia o .zip antes de importar.`);
      }
      const localNomeLen = view.getUint16(localHeaderOffset + 26, true);
      const localExtraLen = view.getUint16(localHeaderOffset + 28, true);
      const dadosInicio = localHeaderOffset + 30 + localNomeLen + localExtraLen;
      const dados = bytes.slice(dadosInicio, dadosInicio + tamanhoOriginal);
      resultado.push({ nome, texto: dec.decode(dados) });
      cdOffset += 46 + nomeLen + extraLen + comentarioLen;
    }
    return resultado;
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
  async function contarProdutos() {
    const db = await abrirDB();
    return tx(db, ["produtos"], "readonly", async (t) => {
      return await reqProm(t.objectStore("produtos").count());
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
  async function resetarDadosDispositivo() {
    const db = await abrirDB();
    return tx(db, ["sessoes", "log", "itens"], "readwrite", async (t) => {
      const totalSessoes = await reqProm(t.objectStore("sessoes").count());
      const totalLog = await reqProm(t.objectStore("log").count());
      await reqProm(t.objectStore("sessoes").clear());
      await reqProm(t.objectStore("log").clear());
      await reqProm(t.objectStore("itens").clear());
      return { sessoesApagadas: totalSessoes, leiturasApagadas: totalLog };
    });
  }

  // ../../../../../../../../Desktop/SOGI  BIP a BIP/js/src/auth.js
  var CHAVE_HASH = "senhaGerenteHash";
  var CHAVE_SALT = "senhaGerenteSalt";
  function paraHex(buffer) {
    return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  function gerarSalt() {
    const arr = crypto.getRandomValues(new Uint8Array(16));
    return paraHex(arr.buffer);
  }
  async function hashSenha(senha, salt) {
    const dados = new TextEncoder().encode(`${salt}:${senha}`);
    const buffer = await crypto.subtle.digest("SHA-256", dados);
    return paraHex(buffer);
  }
  async function senhaGerenteConfigurada() {
    return await getConfig(CHAVE_HASH, null) !== null;
  }
  async function definirSenhaGerente(novaSenha) {
    const salt = gerarSalt();
    const hash = await hashSenha(novaSenha, salt);
    await setConfig(CHAVE_SALT, salt);
    await setConfig(CHAVE_HASH, hash);
  }
  async function verificarSenhaGerente(senha) {
    const salt = await getConfig(CHAVE_SALT, null);
    const hashArmazenado = await getConfig(CHAVE_HASH, null);
    if (!salt || !hashArmazenado) return false;
    const hash = await hashSenha(senha, salt);
    return hash === hashArmazenado;
  }

  // ../../../../../../../../Desktop/SOGI  BIP a BIP/js/src/authGate.js
  function montarGateSenha({ viewLoginId = "view-login", onLiberado }) {
    const viewLogin = document.getElementById(viewLoginId);
    const inputSenha = document.getElementById("inputSenha");
    const inputSenhaConfirmar = document.getElementById("inputSenhaConfirmar");
    const campoConfirmarSenha = document.getElementById("campoConfirmarSenha");
    const loginInstrucao = document.getElementById("loginInstrucao");
    const lblSenha = document.getElementById("lblSenha");
    const loginErro = document.getElementById("loginErro");
    const btnEntrar = document.getElementById("btnEntrar");
    let modoDefinirSenha = false;
    async function iniciar() {
      modoDefinirSenha = !await senhaGerenteConfigurada();
      if (modoDefinirSenha) {
        loginInstrucao.textContent = "Nenhuma senha definida ainda. Crie a senha de acesso \xE0 \xE1rea do Gerente (s\xF3 ela mostra valores em R$).";
        lblSenha.textContent = "Nova senha";
        campoConfirmarSenha.classList.remove("hidden");
        btnEntrar.textContent = "Definir e entrar";
      } else {
        loginInstrucao.textContent = "Digite a senha do Gerente para continuar.";
        lblSenha.textContent = "Senha";
        campoConfirmarSenha.classList.add("hidden");
        btnEntrar.textContent = "Entrar";
      }
      inputSenha.value = "";
      inputSenhaConfirmar.value = "";
      loginErro.textContent = "";
      inputSenha.focus();
    }
    async function tentarEntrar() {
      loginErro.textContent = "";
      const senha = inputSenha.value;
      if (!senha || senha.length < 4) {
        loginErro.textContent = "A senha precisa ter pelo menos 4 caracteres.";
        return;
      }
      if (modoDefinirSenha) {
        if (senha !== inputSenhaConfirmar.value) {
          loginErro.textContent = "As senhas n\xE3o conferem.";
          return;
        }
        await definirSenhaGerente(senha);
        viewLogin.classList.add("hidden");
        onLiberado();
        return;
      }
      const ok = await verificarSenhaGerente(senha);
      if (ok) {
        viewLogin.classList.add("hidden");
        onLiberado();
        return;
      }
      loginErro.textContent = "Senha incorreta.";
      inputSenha.value = "";
      inputSenha.focus();
    }
    btnEntrar.addEventListener("click", tentarEntrar);
    inputSenha.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" && campoConfirmarSenha.classList.contains("hidden")) tentarEntrar();
    });
    inputSenhaConfirmar.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") tentarEntrar();
    });
    iniciar();
  }

  // ../../../../../../../../Desktop/SOGI  BIP a BIP/js/src/consolidador.js
  montarGateSenha({ onLiberado: () => document.getElementById("view-consolidador").classList.remove("hidden") });
  var PALAVRA_CONFIRMACAO = "APAGAR";
  document.getElementById("btnResetarDispositivo").addEventListener("click", async () => {
    const [totalProdutos, correcoes] = await Promise.all([contarProdutos(), listarCorrecoes()]);
    const confirmado = await abrirModal(`
    <h3 style="color:var(--danger)">\u{1F5D1}\uFE0F Resetar dados deste dispositivo</h3>
    <p style="color:var(--text-dim)">Isso apaga <b>todas as sess\xF5es de contagem</b> (finalizadas ou em andamento) e o log deste dispositivo \u2014 como se o app tivesse acabado de ser instalado.</p>
    <p style="color:var(--text-dim)">A base de produtos (<b>${totalProdutos}</b> c\xF3digos), as corre\xE7\xF5es de EAN (<b>${correcoes.length}</b>) e as configura\xE7\xF5es do dispositivo <b>n\xE3o s\xE3o apagadas</b>.</p>
    <p style="color:var(--danger);font-weight:700">Esta a\xE7\xE3o n\xE3o pode ser desfeita. Ela afeta s\xF3 este dispositivo \u2014 outros PCs e arquivos j\xE1 exportados n\xE3o s\xE3o alterados.</p>
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
        const inputConfirmar = overlay.querySelector("#inputConfirmarReset");
        const btnConfirmar = overlay.querySelector('[data-acao="sim"]');
        inputConfirmar.addEventListener("input", () => {
          btnConfirmar.disabled = inputConfirmar.value.trim() !== PALAVRA_CONFIRMACAO;
        });
        overlay.querySelector('[data-acao="nao"]').addEventListener("click", () => fechar(false));
        btnConfirmar.addEventListener("click", () => {
          if (!btnConfirmar.disabled) fechar(true);
        });
        inputConfirmar.focus();
      }
    });
    if (!confirmado) return;
    const resultado = await resetarDadosDispositivo();
    document.getElementById("statusResetDispositivo").innerHTML = `\u2705 Resetado em ${(/* @__PURE__ */ new Date()).toLocaleString("pt-BR")}: <b>${resultado.sessoesApagadas}</b> sess\xE3o(\xF5es) e <b>${resultado.leiturasApagadas}</b> leitura(s) de log apagadas. Mantidos: base de produtos (${totalProdutos} c\xF3digos) e corre\xE7\xF5es de EAN (${correcoes.length}).`;
    toast("Dados de contagem deste dispositivo foram resetados.", "");
  });
  function lerArquivoComoArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(file);
    });
  }
  var sessoesImportadas = [];
  var desconhecidosImportados = [];
  var estoqueOnepet = null;
  var produtosPorSku = /* @__PURE__ */ new Map();
  var inputArquivos = document.getElementById("inputArquivos");
  var resumoArquivos = document.getElementById("resumoArquivos");
  var cardResumo = document.getElementById("cardResumo");
  var produtosLocaisPromise = (async () => {
    const produtos = await obterTodosProdutos();
    produtos.forEach((p) => {
      if (!produtosPorSku.has(p.sku)) {
        produtosPorSku.set(p.sku, {
          descricao: p.descricao || "",
          grupoLinha: p.grupoLinha || "",
          subGrupo: p.subGrupo || "",
          estoque: p.estoque || 0
        });
      }
    });
    if (produtosPorSku.size > 0) {
      estoqueOnepet = new Map([...produtosPorSku.entries()].map(([sku, info]) => [sku, info.estoque]));
      document.getElementById("resumoOnepet").textContent = `Refer\xEAncia carregada automaticamente da base local: ${produtosPorSku.size} produtos com estoque do Onepet.`;
    }
  })();
  function categoriaDoSku(sku) {
    const info = produtosPorSku.get(sku);
    return info && info.grupoLinha ? info.grupoLinha : "Sem categoria";
  }
  function agregarPorSku() {
    const porSku = /* @__PURE__ */ new Map();
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
  inputArquivos.addEventListener("change", async () => {
    const arquivos = Array.from(inputArquivos.files);
    if (arquivos.length === 0) return;
    await produtosLocaisPromise;
    sessoesImportadas = [];
    desconhecidosImportados = [];
    const idsVistos = /* @__PURE__ */ new Set();
    let ignorados = [];
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
        if (linhas.length === 0) {
          ignorados.push(nome + " (vazio)");
          continue;
        }
        const sessaoId = linhas[0].sessao_id;
        if (idsVistos.has(sessaoId)) {
          ignorados.push(nome + " (sess\xE3o duplicada, ignorada)");
          continue;
        }
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
            valorTotalVenda: Number(l.valor_total_venda) || 0
          }))
        });
      } else if (/_desconhecidos\.csv$/i.test(nome)) {
        linhas.forEach((l) => desconhecidosImportados.push({ ean: l.ean, qtd: Number(l.qtd) || 0, arquivo: nome }));
      } else if (/_log\.csv$/i.test(nome)) {
      } else {
        ignorados.push(nome + " (tipo n\xE3o reconhecido)");
      }
    }
    resumoArquivos.innerHTML = `${sessoesImportadas.length} sess\xE3o(\xF5es) e ${desconhecidosImportados.length} linha(s) de desconhecidos carregadas.` + (ignorados.length ? `<br><span style="color:var(--warn)">Ignorados: ${ignorados.join(", ")}</span>` : "");
    renderizarResumo();
  });
  var inputEstoqueOnepet = document.getElementById("inputEstoqueOnepet");
  inputEstoqueOnepet.addEventListener("change", async () => {
    const file = inputEstoqueOnepet.files[0];
    if (!file) return;
    const texto = await lerArquivoComoTexto(file);
    const linhas = parseCSV(texto);
    estoqueOnepet = new Map(linhas.filter((l) => l.sku).map((l) => [String(l.sku).trim(), Number(l.qtd_sistema) || 0]));
    document.getElementById("resumoOnepet").textContent = `Refer\xEAncia substitu\xEDda manualmente: ${estoqueOnepet.size} SKUs carregados do arquivo.`;
    renderizarPrioridadeAjuste();
  });
  function calcularPrioridadeAjuste() {
    const porSku = agregarPorSku();
    const todosSkus = /* @__PURE__ */ new Set([...porSku.keys(), ...estoqueOnepet ? estoqueOnepet.keys() : []]);
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
    const card = document.getElementById("cardDivergencia");
    if (!estoqueOnepet || sessoesImportadas.length === 0) {
      card.classList.add("hidden");
      return;
    }
    const linhas = calcularPrioridadeAjuste();
    card.classList.remove("hidden");
    document.getElementById("tabelaDivergencia").innerHTML = linhas.map((l) => `
    <tr>
      <td>${l.sku}</td><td>${l.categoria}</td><td>${l.qtdContada}</td><td>${l.qtdSistema}</td>
      <td style="font-weight:700">${l.diffQtd > 0 ? "+" : ""}${l.diffQtd}</td>
      <td>${formatarMoeda(l.custoMedio)}</td>
      <td style="font-weight:700">${formatarMoeda(l.diffValor)}</td>
    </tr>
  `).join("") || '<tr><td colspan="7" style="color:var(--text-dim)">Tudo bate com o Onepet \u2014 nenhum ajuste priorit\xE1rio agora.</td></tr>';
    const porCategoria = /* @__PURE__ */ new Map();
    linhas.forEach((l) => {
      const atual = porCategoria.get(l.categoria) || { categoria: l.categoria, impacto: 0 };
      atual.impacto += l.diffValor;
      porCategoria.set(l.categoria, atual);
    });
    document.getElementById("tabelaPrioridadeCategoria").innerHTML = [...porCategoria.values()].sort((a, b) => Math.abs(b.impacto) - Math.abs(a.impacto)).map((c) => `<tr><td>${c.categoria}</td><td style="font-weight:700">${formatarMoeda(c.impacto)}</td></tr>`).join("") || '<tr><td colspan="2" style="color:var(--text-dim)">Sem dados.</td></tr>';
  }
  function renderizarResumo() {
    if (sessoesImportadas.length === 0) {
      cardResumo.classList.add("hidden");
      return;
    }
    cardResumo.classList.remove("hidden");
    const totalSkus = /* @__PURE__ */ new Set();
    let totalUnidades = 0;
    sessoesImportadas.forEach((s) => s.itens.forEach((i) => {
      totalSkus.add(i.sku);
      totalUnidades += i.qtd;
    }));
    document.getElementById("resSessoes").textContent = sessoesImportadas.length;
    document.getElementById("resSkus").textContent = totalSkus.size;
    document.getElementById("resUnidades").textContent = totalUnidades;
    document.getElementById("resDesconhecidos").textContent = new Set(desconhecidosImportados.map((d) => d.ean)).size;
    document.getElementById("tabelaAuditoria").innerHTML = sessoesImportadas.map((s) => `
    <tr>
      <td>${s.setor}</td><td>${s.operador}</td><td>${s.inicio}</td><td>${s.fim}</td>
      <td>${s.itens.length}</td><td>${s.itens.reduce((a, i) => a + i.qtd, 0)}</td>
      <td>${s.dispositivo}</td><td style="font-size:0.75rem">${s.sessao_id}</td><td>${s.arquivo}</td>
    </tr>
  `).join("");
    renderizarValorizacao();
    renderizarPrioridadeAjuste();
    document.getElementById("cardResumoIA").classList.remove("hidden");
  }
  function renderizarValorizacao() {
    let totalCusto = 0;
    let totalVenda = 0;
    const porSetor = /* @__PURE__ */ new Map();
    const porCategoria = /* @__PURE__ */ new Map();
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
    document.getElementById("cardFinanceiro").classList.remove("hidden");
    document.getElementById("valorTotalCusto").textContent = formatarMoeda(totalCusto);
    document.getElementById("valorTotalVenda").textContent = formatarMoeda(totalVenda);
    document.getElementById("tabelaValorPorSetor").innerHTML = [...porSetor.values()].sort((a, b) => b.custo - a.custo).map((s) => `<tr><td>${s.setor}</td><td>${formatarMoeda(s.custo)}</td><td>${formatarMoeda(s.venda)}</td></tr>`).join("") || '<tr><td colspan="3" style="color:var(--text-dim)">Sem dados.</td></tr>';
    document.getElementById("tabelaValorPorCategoria").innerHTML = [...porCategoria.values()].sort((a, b) => b.custo - a.custo).map((c) => `<tr><td>${c.categoria}</td><td>${formatarMoeda(c.custo)}</td><td>${formatarMoeda(c.venda)}</td></tr>`).join("") || '<tr><td colspan="3" style="color:var(--text-dim)">Sem dados.</td></tr>';
  }
  document.getElementById("btnGerar").addEventListener("click", () => {
    if (sessoesImportadas.length === 0) {
      toast("Nenhuma sess\xE3o importada.", "erro");
      return;
    }
    const carimbo = carimboArquivo();
    const totalPorSku = /* @__PURE__ */ new Map();
    const porSetor = /* @__PURE__ */ new Map();
    sessoesImportadas.forEach((s) => {
      s.itens.forEach((i) => {
        totalPorSku.set(i.sku, (totalPorSku.get(i.sku) || 0) + i.qtd);
        const chave = `${i.sku}::${s.setor}`;
        const atual = porSetor.get(chave) || { sku: i.sku, setor: s.setor, qtd: 0 };
        atual.qtd += i.qtd;
        porSetor.set(chave, atual);
      });
    });
    const csvTotal = gerarCSV(
      ["sku", "qtd_total"],
      [...totalPorSku.entries()].sort((a2, b) => a2[0].localeCompare(b[0])).map(([sku, qtd_total]) => ({ sku, qtd_total }))
    );
    const csvPorSetor = gerarCSV(
      ["sku", "setor", "qtd"],
      [...porSetor.values()].sort((a2, b) => a2.sku.localeCompare(b.sku) || a2.setor.localeCompare(b.setor))
    );
    const csvAuditoria = gerarCSV(
      ["setor", "operador", "inicio", "fim", "itens_unicos", "total_bips", "dispositivo", "sessao_id", "arquivo"],
      sessoesImportadas.map((s) => ({
        setor: s.setor,
        operador: s.operador,
        inicio: s.inicio,
        fim: s.fim,
        itens_unicos: s.itens.length,
        total_bips: s.itens.reduce((a2, i) => a2 + i.qtd, 0),
        dispositivo: s.dispositivo,
        sessao_id: s.sessao_id,
        arquivo: s.arquivo
      }))
    );
    const totalPorEan = /* @__PURE__ */ new Map();
    desconhecidosImportados.forEach((d) => totalPorEan.set(d.ean, (totalPorEan.get(d.ean) || 0) + d.qtd));
    const csvDesconhecidosGeral = gerarCSV(
      ["ean", "qtd_total"],
      [...totalPorEan.entries()].sort((a2, b) => a2[0].localeCompare(b[0])).map(([ean, qtd_total]) => ({ ean, qtd_total }))
    );
    const zip = criarZip([
      { nome: `CONSOLIDADO_TOTAL_${carimbo}.csv`, conteudo: csvTotal },
      { nome: `CONSOLIDADO_POR_SETOR_${carimbo}.csv`, conteudo: csvPorSetor },
      { nome: `AUDITORIA_SESSOES_${carimbo}.csv`, conteudo: csvAuditoria },
      { nome: `DESCONHECIDOS_GERAL_${carimbo}.csv`, conteudo: csvDesconhecidosGeral }
    ]);
    const url = URL.createObjectURL(zip);
    const a = document.createElement("a");
    a.href = url;
    a.download = `CONSOLIDACAO_${carimbo}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1e4);
    toast("4 arquivos gerados dentro de CONSOLIDACAO_" + carimbo + ".zip", "");
  });
  function montarTextoResumo() {
    const porSku = agregarPorSku();
    const totalSkus = porSku.size;
    const totalUnidades = [...porSku.values()].reduce((a, i) => a + i.qtd, 0);
    const totalCusto = [...porSku.values()].reduce((a, i) => a + i.custoTotal, 0);
    const totalVenda = [...porSku.values()].reduce((a, i) => a + i.vendaTotal, 0);
    const totalPorEan = /* @__PURE__ */ new Map();
    desconhecidosImportados.forEach((d) => totalPorEan.set(d.ean, (totalPorEan.get(d.ean) || 0) + d.qtd));
    let linhas = [];
    linhas.push("RESUMO DO BALAN\xC7O \u2014 Coleta Bip-a-Bip (Pet's Go)");
    linhas.push(`Gerado em: ${(/* @__PURE__ */ new Date()).toLocaleString("pt-BR")}`);
    linhas.push("");
    linhas.push("N\xDAMEROS PRINCIPAIS");
    linhas.push(`- Sess\xF5es consolidadas: ${sessoesImportadas.length}`);
    linhas.push(`- SKUs distintos contados: ${totalSkus}`);
    linhas.push(`- Unidades totais contadas: ${totalUnidades}`);
    linhas.push(`- Valor total do estoque a CUSTO: ${formatarMoeda(totalCusto)}`);
    linhas.push(`- Valor total do estoque a VENDA: ${formatarMoeda(totalVenda)}`);
    linhas.push(`- EANs desconhecidos (sem cadastro): ${totalPorEan.size}`);
    linhas.push("");
    if (estoqueOnepet) {
      const prioridades = calcularPrioridadeAjuste();
      linhas.push(`TOP ${Math.min(10, prioridades.length)} PRIORIDADES DE AJUSTE NO ONEPET (maior impacto financeiro, de ${prioridades.length} no total)`);
      if (prioridades.length === 0) {
        linhas.push("- Nenhum ajuste priorit\xE1rio \u2014 tudo bate com o Onepet.");
      } else {
        prioridades.slice(0, 10).forEach((d) => {
          linhas.push(`- SKU ${d.sku} (${d.categoria}): contado ${d.qtdContada} \xD7 Onepet ${d.qtdSistema} (${d.diffQtd > 0 ? "+" : ""}${d.diffQtd} un., impacto ${formatarMoeda(d.diffValor)})`);
        });
      }
    } else {
      linhas.push("PRIORIDADE DE AJUSTE: sem refer\xEAncia do Onepet dispon\xEDvel (importe a base de produtos com a coluna Estoque, ou envie o CSV manual).");
    }
    linhas.push("");
    linhas.push(`DESCONHECIDOS (EAN sem cadastro, ${totalPorEan.size} distintos)`);
    if (totalPorEan.size === 0) {
      linhas.push("- Nenhum.");
    } else {
      [...totalPorEan.entries()].sort((a, b) => b[1] - a[1]).forEach(([ean, qtd]) => {
        linhas.push(`- EAN ${ean}: ${qtd} unidade(s)`);
      });
    }
    return linhas.join("\n");
  }
  document.getElementById("btnResumoIA").addEventListener("click", async () => {
    if (sessoesImportadas.length === 0) {
      toast("Nenhuma sess\xE3o importada.", "erro");
      return;
    }
    const status = document.getElementById("statusResumoIA");
    const textarea = document.getElementById("textoResumoIA");
    const acoes = document.getElementById("acoesResumoIA");
    const texto = montarTextoResumo();
    textarea.value = texto;
    textarea.classList.remove("hidden");
    acoes.classList.remove("hidden");
    if (!navigator.onLine) {
      status.textContent = "Sem conex\xE3o \u2014 resumo executivo por IA indispon\xEDvel agora. O texto bruto abaixo j\xE1 est\xE1 pronto.";
      return;
    }
    status.textContent = "N\xFAmeros e prioridades calculados abaixo. A transforma\xE7\xE3o em resumo executivo por IA ainda depende de um backend com a chave da Anthropic (n\xE3o configurado nesta vers\xE3o) \u2014 por ora, use o texto bruto.";
  });
  document.getElementById("btnCopiarResumoIA").addEventListener("click", async () => {
    const texto = document.getElementById("textoResumoIA").value;
    try {
      await navigator.clipboard.writeText(texto);
      toast("Texto copiado.", "");
    } catch (e) {
      toast("N\xE3o foi poss\xEDvel copiar automaticamente \u2014 selecione o texto manualmente.", "erro");
    }
  });
  document.getElementById("btnBaixarResumoIA").addEventListener("click", () => {
    const texto = document.getElementById("textoResumoIA").value;
    baixarArquivo(`RESUMO_BALANCO_${carimboArquivo()}.txt`, texto, "text/plain;charset=utf-8");
  });
})();
