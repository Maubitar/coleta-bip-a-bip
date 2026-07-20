// Gerado automaticamente a partir de js/src/index.js — não editar direto. Ver js/src/.
(() => {
  // ../../../../../../../../Desktop/SOGI  BIP a BIP/js/src/util.js
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
  async function contarProdutos() {
    const db = await abrirDB();
    return tx(db, ["produtos"], "readonly", async (t) => {
      return await reqProm(t.objectStore("produtos").count());
    });
  }
  async function listarSessoes({ maquina: maquina2 = null, status = null } = {}) {
    const db = await abrirDB();
    return tx(db, ["sessoes"], "readonly", async (t) => {
      const todas = await reqProm(t.objectStore("sessoes").getAll());
      return todas.filter((s) => (maquina2 ? s.maquina === maquina2 : true) && (status ? s.status === status : true));
    });
  }

  // ../../../../../../../../Desktop/SOGI  BIP a BIP/js/src/index.js
  var maquina = nomeDispositivoPadrao();
  document.getElementById("infoDispositivo").textContent = `Dispositivo: ${maquina}`;
  (async () => {
    const ultimoBackup = await getConfig("ultimoBackupEm", null);
    const umDiaMs = 24 * 60 * 60 * 1e3;
    if (!ultimoBackup || Date.now() - new Date(ultimoBackup).getTime() > umDiaMs) {
      document.getElementById("cardLembreteBackup").classList.remove("hidden");
    }
    const total = await contarProdutos();
    const statusBase = document.getElementById("statusBase");
    if (total > 0) {
      statusBase.innerHTML = `Base de produtos carregada: <b>${total}</b> EANs mapeados.`;
    } else {
      statusBase.innerHTML = `<span style="color:var(--warn)">Nenhuma base de produtos importada ainda.</span> V\xE1 em Configura\xE7\xF5es para importar o base_produtos.csv.`;
    }
    const abertas = await listarSessoes({ maquina, status: "aberta" });
    const pausadas = await listarSessoes({ maquina, status: "pausada" });
    const emAndamento = [...abertas, ...pausadas];
    const div = document.getElementById("statusSessoesAbertas");
    if (emAndamento.length > 0) {
      div.innerHTML = '<p style="margin-top:0.8em">Sess\xF5es em andamento neste dispositivo:</p>' + emAndamento.map((s) => `<div>\u2022 <b>${s.setor}</b> \u2014 ${s.operador} (iniciada em ${formatarDataHora(s.inicio)}) <a href="coleta.html?sessao=${s.id}">continuar \u2192</a></div>`).join("");
    }
  })();
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => {
      });
    });
  }
})();
