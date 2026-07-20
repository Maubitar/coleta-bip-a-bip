// Gerado automaticamente a partir de js/src/historico.js — não editar direto. Ver js/src/.
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
  function limparParaArquivo(texto) {
    return String(texto || "SEM_NOME").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "").toUpperCase() || "SEM_NOME";
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
  async function listarSessoes({ maquina = null, status = null } = {}) {
    const db = await abrirDB();
    return tx(db, ["sessoes"], "readonly", async (t) => {
      const todas = await reqProm(t.objectStore("sessoes").getAll());
      return todas.filter((s) => (maquina ? s.maquina === maquina : true) && (status ? s.status === status : true));
    });
  }
  async function obterItensSessao(sessaoId) {
    const db = await abrirDB();
    return tx(db, ["itens"], "readonly", async (t) => {
      const idx = t.objectStore("itens").index("sessaoId");
      return await reqProm(idx.getAll(IDBKeyRange.only(sessaoId)));
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

  // ../../../../../../../../Desktop/SOGI  BIP a BIP/js/src/historico.js
  var todasSessoes = [];
  var sessaoSelecionada = null;
  var viewLista = document.getElementById("view-lista");
  var viewDetalhe = document.getElementById("view-detalhe");
  async function carregar() {
    todasSessoes = (await listarSessoes({})).sort((a, b) => new Date(b.inicio) - new Date(a.inicio));
    const setores = [...new Set(todasSessoes.map((s) => s.setor))];
    const operadores = [...new Set(todasSessoes.map((s) => s.operador))];
    document.getElementById("filtroSetor").innerHTML = '<option value="">Todos</option>' + setores.map((s) => `<option>${s}</option>`).join("");
    document.getElementById("filtroOperador").innerHTML = '<option value="">Todos</option>' + operadores.map((o) => `<option>${o}</option>`).join("");
    renderizarLista();
  }
  function renderizarLista() {
    const fSetor = document.getElementById("filtroSetor").value;
    const fOperador = document.getElementById("filtroOperador").value;
    const fStatus = document.getElementById("filtroStatus").value;
    const filtradas = todasSessoes.filter(
      (s) => (!fSetor || s.setor === fSetor) && (!fOperador || s.operador === fOperador) && (!fStatus || s.status === fStatus)
    );
    document.getElementById("tabelaSessoes").innerHTML = filtradas.map((s) => `
    <tr>
      <td><span class="pill ${s.status}">${s.status}</span></td>
      <td>${s.setor}</td><td>${s.operador}</td>
      <td>${formatarDataHora(s.inicio)}</td><td>${formatarDataHora(s.fim)}</td>
      <td>${s.maquina}</td>
      <td><button data-abrir="${s.id}" class="ghost">Abrir \u2192</button></td>
    </tr>
  `).join("") || '<tr><td colspan="7" style="color:var(--text-dim)">Nenhuma sess\xE3o encontrada.</td></tr>';
    document.querySelectorAll("[data-abrir]").forEach((btn) => {
      btn.addEventListener("click", () => abrirDetalhe(btn.getAttribute("data-abrir")));
    });
  }
  ["filtroSetor", "filtroOperador", "filtroStatus"].forEach((id) => {
    document.getElementById(id).addEventListener("change", renderizarLista);
  });
  async function abrirDetalhe(sessaoId) {
    const sessao = todasSessoes.find((s) => s.id === sessaoId);
    if (!sessao) return;
    sessaoSelecionada = sessao;
    const itens = (await obterItensSessao(sessaoId)).filter((i) => i.qtd !== 0);
    const skus = itens.filter((i) => !String(i.chave).startsWith("DESCONHECIDO:")).sort((a, b) => a.sku.localeCompare(b.sku));
    const desconhecidos = itens.filter((i) => String(i.chave).startsWith("DESCONHECIDO:"));
    const log = await obterLogSessao(sessaoId);
    document.getElementById("detalheResumo").innerHTML = `
    <h2>${sessao.setor} \u2014 ${sessao.operador}</h2>
    <span class="pill ${sessao.status}">${sessao.status}</span>
    <p style="color:var(--text-dim);margin-top:0.6em">
      In\xEDcio: ${formatarDataHora(sessao.inicio)} \xB7 Fim: ${formatarDataHora(sessao.fim)} \xB7 Dispositivo: ${sessao.maquina}<br>
      ID da sess\xE3o: <code>${sessao.id}</code>
    </p>
    <p><b>${skus.length}</b> SKUs distintos \xB7 <b>${skus.reduce((a, i) => a + i.qtd, 0)}</b> unidades \xB7 <b>${desconhecidos.length}</b> desconhecidos</p>
  `;
    document.getElementById("detalheItens").innerHTML = skus.map((i) => `<tr><td>${i.sku}</td><td>${i.descricao || ""}</td><td>${i.qtd}</td></tr>`).join("") || '<tr><td colspan="3" style="color:var(--text-dim)">Nenhum item.</td></tr>';
    document.getElementById("detalheDesconhecidos").innerHTML = desconhecidos.map((i) => `<tr><td>${i.ean}</td><td>${i.qtd}</td></tr>`).join("") || '<tr><td colspan="2" style="color:var(--text-dim)">Nenhum desconhecido.</td></tr>';
    document.getElementById("detalheLog").innerHTML = log.map((r) => `<tr><td>${formatarDataHora(r.ts)}</td><td>${r.chave || "\u2014"}</td><td>${r.delta}</td><td>${r.origem}</td></tr>`).join("") || '<tr><td colspan="4" style="color:var(--text-dim)">Sem eventos.</td></tr>';
    viewLista.classList.add("hidden");
    viewDetalhe.classList.remove("hidden");
  }
  document.getElementById("btnVoltarLista").addEventListener("click", () => {
    viewDetalhe.classList.add("hidden");
    viewLista.classList.remove("hidden");
  });
  document.getElementById("btnReexportar").addEventListener("click", async () => {
    if (!sessaoSelecionada) return;
    await exportarArquivosSessao(sessaoSelecionada);
    toast("Arquivos reexportados.", "");
  });
  carregar();
})();
