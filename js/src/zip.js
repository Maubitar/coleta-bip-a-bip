// ZIP mínimo (método STORE, sem compressão) — sem dependências externas.
// Motivo: navegadores bloqueiam múltiplos downloads automáticos disparados em sequência
// (ex.: os 3 CSVs de uma sessão). Empacotar em um único .zip evita o bloqueio.

const enc = new TextEncoder();

function crc32(bytes) {
  let c = ~0;
  for (let i = 0; i < bytes.length; i++) {
    c ^= bytes[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function u16(n) { return new Uint8Array([n & 0xff, (n >>> 8) & 0xff]); }
function u32(n) { return new Uint8Array([n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff]); }
function concatU8(arrays) {
  const total = arrays.reduce((s, a) => s + a.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const a of arrays) { out.set(a, o); o += a.length; }
  return out;
}

function dosDateTime(d = new Date()) {
  const time = ((d.getHours() & 0x1f) << 11) | ((d.getMinutes() & 0x3f) << 5) | ((d.getSeconds() >> 1) & 0x1f);
  const date = (((d.getFullYear() - 1980) & 0x7f) << 9) | (((d.getMonth() + 1) & 0xf) << 5) | (d.getDate() & 0x1f);
  return { time, date };
}

// arquivos: [{ nome: string, conteudo: string }]
export function criarZip(arquivos) {
  const { time, date } = dosDateTime();
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const arq of arquivos) {
    const nameBytes = enc.encode(arq.nome);
    const dataBytes = enc.encode(arq.conteudo);
    const crc = crc32(dataBytes);

    const local = concatU8([
      u32(0x04034b50), u16(20), u16(0x0800), u16(0),
      u16(time), u16(date),
      u32(crc), u32(dataBytes.length), u32(dataBytes.length),
      u16(nameBytes.length), u16(0),
      nameBytes,
    ]);
    localParts.push(local, dataBytes);

    const central = concatU8([
      u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0),
      u16(time), u16(date),
      u32(crc), u32(dataBytes.length), u32(dataBytes.length),
      u16(nameBytes.length), u16(0), u16(0), u16(0), u16(0), u32(0),
      u32(offset),
      nameBytes,
    ]);
    centralParts.push(central);

    offset += local.length + dataBytes.length;
  }

  const cdOffset = offset;
  const cdBytes = concatU8(centralParts);
  const eocd = concatU8([
    u32(0x06054b50), u16(0), u16(0),
    u16(arquivos.length), u16(arquivos.length),
    u32(cdBytes.length), u32(cdOffset), u16(0),
  ]);

  return new Blob([...localParts, cdBytes, eocd], { type: 'application/zip' });
}

// Lê um .zip gerado no formato STORE (sem compressão) e retorna [{ nome, texto }].
// Se encontrar um método de compressão diferente de STORE, lança erro explicativo.
export async function lerZip(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  const view = new DataView(arrayBuffer);

  // Localiza o End Of Central Directory a partir do final do arquivo.
  let eocdPos = -1;
  for (let i = bytes.length - 22; i >= 0 && i >= bytes.length - 22 - 65557; i--) {
    if (view.getUint32(i, true) === 0x06054b50) { eocdPos = i; break; }
  }
  if (eocdPos === -1) throw new Error('Arquivo .zip inválido ou corrompido.');

  const totalEntradas = view.getUint16(eocdPos + 10, true);
  let cdOffset = view.getUint32(eocdPos + 16, true);

  const dec = new TextDecoder('utf-8');
  const resultado = [];

  for (let i = 0; i < totalEntradas; i++) {
    if (view.getUint32(cdOffset, true) !== 0x02014b50) throw new Error('Diretório central do .zip corrompido.');
    const metodo = view.getUint16(cdOffset + 10, true);
    const tamanhoComprimido = view.getUint32(cdOffset + 20, true);
    const tamanhoOriginal = view.getUint32(cdOffset + 24, true);
    const nomeLen = view.getUint16(cdOffset + 28, true);
    const extraLen = view.getUint16(cdOffset + 30, true);
    const comentarioLen = view.getUint16(cdOffset + 32, true);
    const localHeaderOffset = view.getUint32(cdOffset + 42, true);
    const nome = dec.decode(bytes.slice(cdOffset + 46, cdOffset + 46 + nomeLen));

    if (metodo !== 0) {
      throw new Error(`Arquivo "${nome}" está compactado (não suportado). Reexporte pelo app ou extraia o .zip antes de importar.`);
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
