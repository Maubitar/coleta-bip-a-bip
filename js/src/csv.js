// CSV — parse e geração, sem dependências externas. Separador vírgula, aspas RFC4180.

export function paraCampoCSV(valor) {
  const s = valor === null || valor === undefined ? '' : String(valor);
  if (/[",\n\r;]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

export function gerarCSV(colunas, linhas) {
  const cabecalho = colunas.join(',');
  const corpo = linhas
    .map((linha) => colunas.map((c) => paraCampoCSV(linha[c])).join(','))
    .join('\r\n');
  return cabecalho + '\r\n' + corpo + (corpo ? '\r\n' : '');
}

// Parser CSV tolerante a aspas, vírgulas dentro de campos e quebras de linha (\r\n ou \n).
// Retorna array de objetos usando a primeira linha como cabeçalho.
export function parseCSV(texto) {
  if (texto.charCodeAt(0) === 0xfeff) texto = texto.slice(1); // remove BOM
  const linhas = [];
  let linhaAtual = [];
  let campoAtual = '';
  let dentroAspas = false;
  let i = 0;
  const n = texto.length;

  function fimCampo() {
    linhaAtual.push(campoAtual);
    campoAtual = '';
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
    if (c === ',') {
      fimCampo();
      i++;
      continue;
    }
    if (c === '\r') {
      i++;
      continue;
    }
    if (c === '\n') {
      fimLinha();
      i++;
      continue;
    }
    campoAtual += c;
    i++;
  }
  if (campoAtual.length > 0 || linhaAtual.length > 0) fimLinha();

  const linhasNaoVazias = linhas.filter((l) => !(l.length === 1 && l[0] === ''));
  if (linhasNaoVazias.length === 0) return [];
  const cabecalho = linhasNaoVazias[0].map((h) => h.trim());
  const registros = [];
  for (let li = 1; li < linhasNaoVazias.length; li++) {
    const l = linhasNaoVazias[li];
    const obj = {};
    cabecalho.forEach((h, idx) => {
      obj[h] = l[idx] !== undefined ? l[idx] : '';
    });
    registros.push(obj);
  }
  return registros;
}

export function lerArquivoComoTexto(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file, 'utf-8');
  });
}
