// Gerado automaticamente a partir de js/src/corrigir.js — não editar direto. Ver js/src/.
(() => {
  // ../../../../../../../../Desktop/SOGI  BIP a BIP/js/src/util.js
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
  async function salvarCorrecaoEan({ ean, sku, descricao, operador }) {
    const db = await abrirDB();
    return tx(db, ["correcoes"], "readwrite", async (t) => {
      const registro = {
        ean: String(ean).trim(),
        sku: String(sku).trim(),
        descricao: descricao || "",
        data_correcao: (/* @__PURE__ */ new Date()).toISOString(),
        operador: operador || ""
      };
      t.objectStore("correcoes").put(registro);
      return registro;
    });
  }
  async function listarCorrecoes() {
    const db = await abrirDB();
    return tx(db, ["correcoes"], "readonly", async (t) => {
      const todas = await reqProm(t.objectStore("correcoes").getAll());
      return todas.sort((a, b) => new Date(b.data_correcao) - new Date(a.data_correcao));
    });
  }
  async function buscarProdutoPorEanComCorrecao(ean) {
    const db = await abrirDB();
    const eanLimpo = String(ean).trim();
    return tx(db, ["produtos", "correcoes"], "readonly", async (t) => {
      const direto = await reqProm(t.objectStore("produtos").get(eanLimpo));
      if (direto) return { ...direto, viaCorrecao: false };
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
        venda: produtoAtual ? produtoAtual.venda : 0,
        viaCorrecao: true
      };
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

  // ../../../../../../../../Desktop/SOGI  BIP a BIP/js/src/corrigir.js
  var CHAVE_OPERADOR_LS = "bipabip_operador_correcao";
  var todosProdutos = [];
  var eanEmCorrecao = null;
  montarGateSenha({
    onLiberado: () => {
      document.getElementById("view-corrigir").classList.remove("hidden");
      inicializar();
    }
  });
  async function inicializar() {
    const inputOperador = document.getElementById("inputOperadorCorrecao");
    try {
      inputOperador.value = localStorage.getItem(CHAVE_OPERADOR_LS) || "";
    } catch (e) {
    }
    inputOperador.addEventListener("change", () => {
      try {
        localStorage.setItem(CHAVE_OPERADOR_LS, inputOperador.value.trim());
      } catch (e) {
      }
    });
    todosProdutos = await obterTodosProdutos();
    await renderizarCorrecoes();
  }
  var inputEan = document.getElementById("inputEanCorrigir");
  var resultadoBusca = document.getElementById("resultadoBusca");
  var cardBusca = document.getElementById("cardBuscaProduto");
  var inputBuscaProduto = document.getElementById("inputBuscaProduto");
  inputEan.addEventListener("keydown", async (ev) => {
    if (ev.key !== "Enter") return;
    ev.preventDefault();
    const ean = inputEan.value.trim();
    if (!ean) return;
    await consultarEan(ean);
  });
  async function consultarEan(ean) {
    eanEmCorrecao = ean;
    const produto = await buscarProdutoPorEanComCorrecao(ean);
    if (produto) {
      const origem = produto.viaCorrecao ? "via corre\xE7\xE3o j\xE1 cadastrada" : "na base original";
      resultadoBusca.innerHTML = `
      <div class="card" style="border-color:var(--accent)">
        \u2713 EAN <b>${ean}</b> j\xE1 resolve para <b>SKU ${produto.sku}</b> \u2014 ${produto.descricao || "(sem descri\xE7\xE3o)"} (${origem}).
        <div style="margin-top:0.6em"><button id="btnCorrigirMesmoAssim" class="ghost">N\xE3o \xE9 esse o produto certo? Corrigir manualmente</button></div>
      </div>`;
      document.getElementById("btnCorrigirMesmoAssim").addEventListener("click", () => abrirBusca());
      cardBusca.classList.add("hidden");
    } else {
      resultadoBusca.innerHTML = `<div class="card" style="border-color:var(--warn)">\u26A0 EAN <b>${ean}</b> n\xE3o encontrado \u2014 nem na base original, nem em corre\xE7\xF5es j\xE1 feitas. Busque o produto certo abaixo.</div>`;
      abrirBusca();
    }
  }
  function abrirBusca() {
    cardBusca.classList.remove("hidden");
    inputBuscaProduto.value = "";
    inputBuscaProduto.focus();
    renderizarResultadosBusca("");
  }
  inputBuscaProduto.addEventListener("input", () => renderizarResultadosBusca(inputBuscaProduto.value.trim().toLowerCase()));
  function renderizarResultadosBusca(termo) {
    const tbody = document.getElementById("tabelaBuscaProduto");
    const filtrados = termo ? todosProdutos.filter((p) => p.sku.toLowerCase().includes(termo) || (p.descricao || "").toLowerCase().includes(termo)) : todosProdutos.slice(0, 50);
    tbody.innerHTML = filtrados.slice(0, 50).map((p) => `
    <tr>
      <td>${p.sku}</td><td>${p.descricao || ""}</td>
      <td><button data-sku="${p.sku}" class="primary">Selecionar</button></td>
    </tr>
  `).join("") || '<tr><td colspan="3" style="color:var(--text-dim)">Nenhum produto encontrado.</td></tr>';
    tbody.querySelectorAll("[data-sku]").forEach((btn) => {
      btn.addEventListener("click", () => selecionarProduto(btn.getAttribute("data-sku")));
    });
  }
  async function selecionarProduto(sku) {
    const produto = todosProdutos.find((p) => p.sku === sku);
    if (!produto || !eanEmCorrecao) return;
    const operador = document.getElementById("inputOperadorCorrecao").value.trim();
    if (!operador) {
      toast("Informe o operador respons\xE1vel pela corre\xE7\xE3o.", "erro");
      return;
    }
    const ok = await confirmar(`Mapear EAN ${eanEmCorrecao} para SKU ${produto.sku} \u2014 ${produto.descricao || "(sem descri\xE7\xE3o)"}?`);
    if (!ok) return;
    await salvarCorrecaoEan({ ean: eanEmCorrecao, sku: produto.sku, descricao: produto.descricao, operador });
    toast("Corre\xE7\xE3o salva.", "");
    inputEan.value = "";
    resultadoBusca.innerHTML = "";
    cardBusca.classList.add("hidden");
    eanEmCorrecao = null;
    inputEan.focus();
    await renderizarCorrecoes();
  }
  async function renderizarCorrecoes() {
    const correcoes = await listarCorrecoes();
    document.getElementById("tabelaCorrecoes").innerHTML = correcoes.map((c) => `
    <tr>
      <td>${c.ean}</td><td>${c.sku}</td><td>${c.descricao || ""}</td>
      <td>${formatarDataHora(c.data_correcao)}</td><td>${c.operador}</td>
    </tr>
  `).join("") || '<tr><td colspan="5" style="color:var(--text-dim)">Nenhuma corre\xE7\xE3o feita ainda.</td></tr>';
  }
  document.getElementById("btnExportarCorrecoes").addEventListener("click", async () => {
    const correcoes = await listarCorrecoes();
    if (correcoes.length === 0) {
      toast("Nenhuma corre\xE7\xE3o para exportar.", "aviso");
      return;
    }
    const csv = gerarCSV(
      ["ean_correto", "sku", "descricao", "data_correcao", "operador"],
      correcoes.map((c) => ({ ean_correto: c.ean, sku: c.sku, descricao: c.descricao, data_correcao: c.data_correcao, operador: c.operador }))
    );
    baixarArquivo(`correcoes_ean_${carimboArquivo()}.csv`, csv);
  });
})();
