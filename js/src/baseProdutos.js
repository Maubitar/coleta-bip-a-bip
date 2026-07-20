// Adapta CSVs de base de produtos para o formato interno, aceitando dois formatos:
//  - "onepet": exportação nativa do Onepet (colunas fixas, ver COLUNAS_ONEPET)
//  - "simples": ean,sku,descricao,custo,venda (formato de teste / planilha manual)
import { parseNumeroBR } from './util.js';

const COLUNAS_ONEPET = ['Cód', 'Código de barras', 'Nome', 'Preço Tabela', 'Custo', 'Estoque', 'Status'];

export function detectarFormatoBase(linhas) {
  if (!linhas || linhas.length === 0) return 'desconhecido';
  const colunas = Object.keys(linhas[0]);
  if (COLUNAS_ONEPET.every((c) => colunas.includes(c))) return 'onepet';
  if (['ean', 'sku'].every((c) => colunas.includes(c))) return 'simples';
  return 'desconhecido';
}

// Cada linha do Onepet pode ter até 4 códigos de barras (principal + 3 alternativos).
// Todos apontam para o mesmo SKU — bipar qualquer um resolve certo, sem exigir
// nenhuma correção manual depois (isso é diferente da tela "Corrigir Código", que
// serve para EANs que nem sequer vieram cadastrados no Onepet).
function normalizarOnepet(linhas) {
  const produtos = [];
  let ignoradosInativos = 0;
  let ignoradosSemSku = 0;

  for (const l of linhas) {
    const status = (l['Status'] || '').trim();
    if (status && status.toLowerCase() !== 'ativo') { ignoradosInativos++; continue; }

    const sku = String(l['Cód'] || '').trim();
    if (!sku) { ignoradosSemSku++; continue; }

    const descricao = (l['Nome'] || '').trim();
    const custo = parseNumeroBR(l['Custo']);
    const venda = parseNumeroBR(l['Preço Tabela']);
    const estoque = parseNumeroBR(l['Estoque']);
    const grupoLinha = (l['Grupo linha'] || '').trim();
    const subGrupo = (l['Sub grupo'] || '').trim();

    const eans = [
      l['Código de barras'],
      l['Código de barras 2'],
      l['Código de barras 3'],
      l['Código de barras 4'],
    ].map((e) => (e || '').trim()).filter(Boolean);

    for (const ean of eans) {
      produtos.push({ ean, sku, descricao, custo, venda, estoque, grupoLinha, subGrupo });
    }
  }

  return { produtos, ignoradosInativos, ignoradosSemSku };
}

function normalizarSimples(linhas) {
  const produtos = [];
  let ignoradosSemSku = 0;
  for (const l of linhas) {
    if (!l.ean || !l.sku) { ignoradosSemSku++; continue; }
    produtos.push({
      ean: l.ean,
      sku: l.sku,
      descricao: l.descricao || '',
      custo: parseNumeroBR(l.custo),
      venda: parseNumeroBR(l.venda),
      estoque: 0,
      grupoLinha: '',
      subGrupo: '',
    });
  }
  return { produtos, ignoradosInativos: 0, ignoradosSemSku };
}

// Retorna { formato, produtos, ignoradosInativos, ignoradosSemSku, totalLinhasOriginais }.
// 'produtos' já vem em formato pronto para importarProdutos() — 1 entrada por EAN
// (o mesmo SKU pode aparecer várias vezes, uma por EAN alternativo).
export function normalizarBaseProdutos(linhas) {
  const formato = detectarFormatoBase(linhas);
  const totalLinhasOriginais = linhas.length;
  if (formato === 'onepet') return { formato, totalLinhasOriginais, ...normalizarOnepet(linhas) };
  if (formato === 'simples') return { formato, totalLinhasOriginais, ...normalizarSimples(linhas) };
  return { formato: 'desconhecido', totalLinhasOriginais, produtos: [], ignoradosInativos: 0, ignoradosSemSku: 0 };
}
