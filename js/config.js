// Gerado automaticamente a partir de js/src/config.js — não editar direto. Ver js/src/.
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
  function parseNumeroBR(valor) {
    if (valor === null || valor === void 0) return 0;
    let s = String(valor).trim();
    if (s === "") return 0;
    s = s.replace(/[^\d,.-]/g, "");
    if (s.includes(",") && s.includes(".")) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else if (s.includes(",")) {
      s = s.replace(",", ".");
    }
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : 0;
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
  async function importarProdutos(lista) {
    const db = await abrirDB();
    return tx(db, ["produtos"], "readwrite", async (t) => {
      const store = t.objectStore("produtos");
      await reqProm(store.clear());
      for (const p of lista) {
        store.put({
          ean: String(p.ean).trim(),
          sku: String(p.sku).trim(),
          descricao: p.descricao ? String(p.descricao).trim() : "",
          custo: parseNumeroBR(p.custo),
          venda: parseNumeroBR(p.venda)
        });
      }
      return lista.length;
    });
  }
  async function contarProdutos() {
    const db = await abrirDB();
    return tx(db, ["produtos"], "readonly", async (t) => {
      return await reqProm(t.objectStore("produtos").count());
    });
  }
  async function exportarBancoCompleto() {
    const db = await abrirDB();
    const nomes = ["produtos", "correcoes", "sessoes", "log", "itens", "config"];
    return tx(db, nomes, "readonly", async (t) => {
      const saida = {};
      for (const nome of nomes) {
        saida[nome] = await reqProm(t.objectStore(nome).getAll());
      }
      saida._exportadoEm = (/* @__PURE__ */ new Date()).toISOString();
      saida._versao = DB_VERSION;
      return saida;
    });
  }

  // ../../../../../../../../Desktop/SOGI  BIP a BIP/js/src/csv.js
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

  // ../../../../../../../../Desktop/SOGI  BIP a BIP/js/src/backup.js
  async function exportarBackupAgora() {
    const dump = await exportarBancoCompleto();
    baixarArquivo(`BACKUP_BIPABIP_${carimboArquivo()}.json`, JSON.stringify(dump), "application/json;charset=utf-8");
    await setConfig("ultimoBackupEm", (/* @__PURE__ */ new Date()).toISOString());
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

  // ../../../../../../../../Desktop/SOGI  BIP a BIP/js/src/config.js
  var CHAVE_DISPOSITIVO_LS = "bipabip_maquina_id";
  async function iniciar() {
    const total = await contarProdutos();
    document.getElementById("statusBaseAtual").innerHTML = total > 0 ? `Base atual: <b>${total}</b> EANs mapeados.` : '<span style="color:var(--warn)">Nenhuma base importada.</span>';
    document.getElementById("inputNomeDispositivo").value = nomeDispositivoPadrao();
    const modoQtd = await getConfig("modoQtdManualPadrao", "substituir");
    document.getElementById("selectModoQtd").value = modoQtd;
    const travarSetor = await getConfig("travarSetorNaSessao", true);
    document.getElementById("checkTravarSetor").checked = travarSetor;
    const ultimoBackup = await getConfig("ultimoBackupEm", null);
    document.getElementById("infoUltimoBackup").textContent = ultimoBackup ? `\xDAltimo backup: ${formatarDataHora(ultimoBackup)}` : "Nenhum backup realizado ainda.";
    await renderizarSetoresCustom();
    await renderizarStatusSenhaGerente();
  }
  async function renderizarStatusSenhaGerente() {
    const configurada = await senhaGerenteConfigurada();
    document.getElementById("statusSenhaGerente").textContent = configurada ? "Senha configurada. Para trocar, informe a senha atual e a nova." : "Nenhuma senha configurada \u2014 a \xC1rea do Gerente pedir\xE1 para criar uma na primeira vez que for aberta.";
    document.getElementById("campoSenhaAtualConfig").classList.toggle("hidden", !configurada);
    document.getElementById("lblSenhaNovaConfig").textContent = configurada ? "Nova senha" : "Senha";
  }
  document.getElementById("btnSalvarSenhaConfig").addEventListener("click", async () => {
    const erroEl = document.getElementById("senhaConfigErro");
    erroEl.textContent = "";
    const configurada = await senhaGerenteConfigurada();
    const nova = document.getElementById("inputSenhaNovaConfig").value;
    const novaConfirmar = document.getElementById("inputSenhaNovaConfirmarConfig").value;
    if (!nova || nova.length < 4) {
      erroEl.textContent = "A senha precisa ter pelo menos 4 caracteres.";
      return;
    }
    if (nova !== novaConfirmar) {
      erroEl.textContent = "As senhas n\xE3o conferem.";
      return;
    }
    if (configurada) {
      const atual = document.getElementById("inputSenhaAtualConfig").value;
      const ok = await verificarSenhaGerente(atual);
      if (!ok) {
        erroEl.textContent = "Senha atual incorreta.";
        return;
      }
    }
    await definirSenhaGerente(nova);
    document.getElementById("inputSenhaAtualConfig").value = "";
    document.getElementById("inputSenhaNovaConfig").value = "";
    document.getElementById("inputSenhaNovaConfirmarConfig").value = "";
    await renderizarStatusSenhaGerente();
    toast("Senha do Gerente salva.", "");
  });
  document.getElementById("inputBaseProdutos").addEventListener("change", async (ev) => {
    const file = ev.target.files[0];
    if (!file) return;
    const texto = await lerArquivoComoTexto(file);
    const linhas = parseCSV(texto);
    const invalidas = linhas.filter((l) => !l.ean || !l.sku);
    if (linhas.length === 0) {
      toast("Arquivo vazio ou colunas inv\xE1lidas (esperado: ean,sku,descricao,custo,venda).", "erro");
      return;
    }
    const semPreco = linhas.filter((l) => l.ean && l.sku && (!l.custo || !l.venda)).length;
    const ok = await confirmar(`Importar ${linhas.length} produtos? Isso substitui totalmente a base atual.${invalidas.length ? ` (${invalidas.length} linha(s) sem ean/sku ser\xE3o ignoradas)` : ""}${semPreco ? ` (${semPreco} linha(s) sem custo/venda \u2014 valor ser\xE1 0)` : ""}`);
    if (!ok) {
      ev.target.value = "";
      return;
    }
    const validas = linhas.filter((l) => l.ean && l.sku);
    await importarProdutos(validas);
    toast(`${validas.length} produtos importados.`, "");
    document.getElementById("statusBaseAtual").innerHTML = `Base atual: <b>${validas.length}</b> EANs mapeados.`;
    ev.target.value = "";
  });
  document.getElementById("btnSalvarDispositivo").addEventListener("click", () => {
    const nome = document.getElementById("inputNomeDispositivo").value.trim();
    if (!nome) {
      toast("Nome n\xE3o pode ser vazio.", "erro");
      return;
    }
    try {
      localStorage.setItem(CHAVE_DISPOSITIVO_LS, nome);
    } catch (e) {
    }
    toast("Nome do dispositivo salvo. Sess\xF5es futuras usar\xE3o este nome.", "");
  });
  document.getElementById("btnSalvarPrefs").addEventListener("click", async () => {
    await setConfig("modoQtdManualPadrao", document.getElementById("selectModoQtd").value);
    await setConfig("travarSetorNaSessao", document.getElementById("checkTravarSetor").checked);
    toast("Prefer\xEAncias salvas.", "");
  });
  document.getElementById("btnBackupAgora").addEventListener("click", async () => {
    await exportarBackupAgora();
    document.getElementById("infoUltimoBackup").textContent = `\xDAltimo backup: ${formatarDataHora((/* @__PURE__ */ new Date()).toISOString())}`;
    toast("Backup exportado.", "");
  });
  async function renderizarSetoresCustom() {
    const custom = await getConfig("setoresCustom", []);
    const div = document.getElementById("listaSetoresCustom");
    div.innerHTML = custom.length ? custom.map((s, idx) => `<span class="pill finalizada" style="margin:0.2em">${s} <button data-remover="${idx}" class="ghost" style="padding:0 0.4em;font-size:0.7rem">\u2715</button></span>`).join("") : '<span style="color:var(--text-dim)">Nenhum setor adicional (usando os padr\xF5es: Dep\xF3sito, Loja, Banho e Tosa, Outros).</span>';
    div.querySelectorAll("[data-remover]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const idx = Number(btn.getAttribute("data-remover"));
        const atual = await getConfig("setoresCustom", []);
        atual.splice(idx, 1);
        await setConfig("setoresCustom", atual);
        renderizarSetoresCustom();
      });
    });
  }
  document.getElementById("btnAdicionarSetorConfig").addEventListener("click", async () => {
    const input = document.getElementById("inputNovoSetorConfig");
    const nome = input.value.trim();
    if (!nome) return;
    const custom = await getConfig("setoresCustom", []);
    if (!custom.includes(nome)) {
      custom.push(nome);
      await setConfig("setoresCustom", custom);
    }
    input.value = "";
    renderizarSetoresCustom();
  });
  iniciar();
})();
