import { obterItensSessao, obterLogSessao } from './db.js';
import { carimboArquivo, limparParaArquivo } from './util.js';
import { gerarCSV } from './csv.js';
import { criarZip } from './zip.js';

export function nomeBaseSessao(sessao) {
  return `SESSAO_${limparParaArquivo(sessao.setor)}_${limparParaArquivo(sessao.operador)}_${carimboArquivo(new Date(sessao.fim || sessao.inicio))}`;
}

// Gera os 3 CSVs da especificação e os empacota em um único .zip.
// Motivo: navegadores bloqueiam downloads automáticos múltiplos disparados em sequência
// (confirmado em teste: o 3º arquivo era silenciosamente descartado pelo Chrome).
// Um único arquivo por download evita esse bloqueio e facilita o envio ao dispositivo central.
export async function exportarArquivosSessao(sessao) {
  const itens = (await obterItensSessao(sessao.id)).filter((i) => i.qtd !== 0);
  const skus = itens.filter((i) => !String(i.chave).startsWith('DESCONHECIDO:'));
  const desconhecidos = itens.filter((i) => String(i.chave).startsWith('DESCONHECIDO:'));
  const log = await obterLogSessao(sessao.id);

  const base = nomeBaseSessao(sessao);

  const arred = (n) => Math.round(n * 100) / 100;
  const csvSessao = gerarCSV(
    ['sku', 'qtd', 'custo_unit', 'valor_total_custo', 'venda_unit', 'valor_total_venda', 'setor', 'operador', 'dispositivo', 'inicio', 'fim', 'sessao_id'],
    skus.map((i) => ({
      sku: i.sku, qtd: i.qtd,
      custo_unit: arred(i.custo || 0), valor_total_custo: arred((i.custo || 0) * i.qtd),
      venda_unit: arred(i.venda || 0), valor_total_venda: arred((i.venda || 0) * i.qtd),
      setor: sessao.setor, operador: sessao.operador, dispositivo: sessao.maquina, inicio: sessao.inicio, fim: sessao.fim, sessao_id: sessao.id,
    }))
  );
  const csvLog = gerarCSV(
    ['ts', 'sku_ou_desconhecido', 'delta', 'origem', 'setor', 'operador', 'dispositivo', 'sessao_id'],
    log.map((r) => ({ ts: r.ts, sku_ou_desconhecido: r.chave || '', delta: r.delta, origem: r.origem, setor: r.setor, operador: r.operador, dispositivo: r.maquina, sessao_id: sessao.id }))
  );
  const csvDesconhecidos = gerarCSV(
    ['ean', 'qtd'],
    desconhecidos.map((i) => ({ ean: i.ean, qtd: i.qtd }))
  );

  const zip = criarZip([
    { nome: `${base}_sessao.csv`, conteudo: csvSessao },
    { nome: `${base}_log.csv`, conteudo: csvLog },
    { nome: `${base}_desconhecidos.csv`, conteudo: csvDesconhecidos },
  ]);
  baixarArquivoBlob(`${base}.zip`, zip);
}

function baixarArquivoBlob(nome, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
