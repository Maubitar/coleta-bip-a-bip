# Coleta Bip-a-Bip — Pet's Go

Inventário físico por leitura de código de barras. Web/PWA, offline-first, sem instalação, sem dependências externas.

## ⚠ Como rodar (leia antes de usar)

Este app usa módulos JavaScript (ES Modules) e Service Worker para funcionar 100% offline depois do primeiro carregamento.
**Por isso ele precisa ser aberto por um endereço `http://` — abrir o `index.html` direto com duplo-clique (`file://`) NÃO funciona no Chrome/Edge** (o navegador bloqueia os módulos por segurança).

Duas formas de rodar, escolha uma:

### Opção A — Rede local / cada PC roda seu próprio servidor (mais simples, não depende de internet)
1. Instale o [Python](https://www.python.org/downloads/) (marque "Add to PATH" na instalação) — só precisa fazer isso uma vez por PC.
2. Copie a pasta `SOGI  BIP a BIP` para cada PC coletor (pendrive, rede, etc.).
3. Dentro da pasta, dê duplo-clique em `iniciar.bat`.
4. O navegador abre sozinho em `http://localhost:8000`. Clique em "Adicionar à tela inicial" / "Instalar app" para deixar com ícone, igual um app.
5. Depois do primeiro carregamento, funciona 100% offline (mesmo sem o `iniciar.bat` mais tarde, contanto que o navegador já tenha em cache — mas o mais seguro é sempre abrir via `iniciar.bat`).

### Opção B — Hospedar no GitHub Pages (recomendado para o padrão S.O.G.I., como os outros apps)
Publica o app em uma URL pública (ex.: `https://petsgo.github.io/bip-a-bip/`), todos os PCs acessam essa URL uma vez (precisa de internet só na primeira vez), instalam como PWA, e depois funciona offline. Não depende de Python em cada PC.
Isso exige criar/usar um repositório no GitHub e publicar os arquivos — é uma ação que fica disponível sob pedido, não foi feita automaticamente.

## Fluxo de uso

1. **Configurações** → importar `base_produtos.csv` (colunas: `ean,sku,descricao,custo,venda` — aceita `45,90` ou `45.90`). Custo e venda são sigilosos, nunca aparecem pro operador.
2. **Contagem** → Nova Sessão (Operador + Setor) → bipar continuamente.
   - `ENTER` processa a leitura (o leitor sem fio já manda isso sozinho)
   - `BACKSPACE` (com o campo vazio) desfaz a última leitura
   - `F2` define quantidade manual do item atual
   - `F9` marca uma pausa no log (não trava a contagem)
   - `F12` vai para a checagem final → "Finalizar e Exportar" baixa 1 arquivo `.zip` com os 3 CSVs da sessão
   - Leitura repetida do mesmo EAN mais de 15x em menos de 10s dispara um alerta visual/sonoro (não bloqueia)
   - EAN não encontrado, mas parecido (1 caractere de diferença) com um EAN da base sugere "Você quis dizer...?" com Aceitar/Ignorar
3. Envie o `.zip` de cada setor para o PC do gerente (pendrive, WhatsApp, e-mail, pasta de rede — como preferir).
4. No PC do gerente, abra **Consolidador** (pede senha — a primeira vez que abrir, cria a senha ali mesmo). Selecione todos os `.zip` das sessões do dia:
   - Mostra o **valor total do estoque a custo e a venda**, com detalhamento por setor (desconhecidos não entram nesse valor).
   - Opcional: importe `estoque_onepet_atual.csv` (`sku,qtd_sistema`) para ver a **divergência** entre o que foi contado e o que o Onepet tem registrado, em quantidade e em R$.
   - "Gerar Resumo Inteligente do Balanço" monta um texto com os números principais, pronto pra copiar/baixar (a transformação por IA depende de um backend com a chave da Anthropic, que ainda não existe nesta versão — combinado com o Mauricio).
   - "Gerar e baixar" → baixa 1 `.zip` com os 4 arquivos finais (sem valores em R$, só quantidade — mesmo formato de sempre).
5. Abra `CONSOLIDADO_TOTAL_*.csv` e aplique manualmente no Onepet: SKU + quantidade final, um por um, na tela de ajuste.
6. **Corrigir Código** (dentro da Área do Gerente, mesma senha): quando o código de barras físico do produto é diferente do EAN da nota fiscal, bipe o EAN físico → busque o produto certo por SKU/descrição → salva o mapeamento em `correcoes_ean.csv` (não mexe no `base_produtos.csv` original). A contagem passa a checar essa camada automaticamente antes de marcar como desconhecido.
7. **Histórico** permite consultar sessões antigas e reexportar arquivos a qualquer momento.

## Senha da Área do Gerente

Protege o Consolidador e o Corrigir Código (onde aparecem valores em R$ e mapeamentos de produto). Guardada como hash SHA-256 + salt no próprio navegador — nunca em texto puro no código. Pode ser definida/trocada em Configurações. **Importante**: isso é uma trava de UX, não segurança real — como é tudo local no navegador, alguém com acesso ao DevTools do PC consegue ler os dados de qualquer forma.

## Por que os exports viram `.zip`

Baixar 3-4 arquivos automaticamente de uma vez faz o Chrome bloquear os downloads depois do primeiro ("este site está tentando baixar vários arquivos"), e isso derrubaria silenciosamente parte dos dados. Por isso a exportação sempre gera **um único `.zip`** por ação. O Consolidador também aceita `.zip` diretamente (não precisa extrair antes).

## Regra de ouro

O estoque físico contado é a verdade. Este app **só conta e consolida** — nunca integra, nem calcula financeiro, nem mexe no Onepet sozinho. A aplicação final é sempre manual, feita pelo gerente.
