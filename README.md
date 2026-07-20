# Coleta Bip-a-Bip — Pet's Go

Inventário físico por leitura de código de barras. Site estático, offline-first, sem instalação, sem dependências externas, sem servidor.

## Como abrir (é só isso)

1. Copie a pasta `SOGI  BIP a BIP` inteira para cada PC coletor (pendrive, rede, etc.) — não precisa instalar nada nela.
2. Dentro da pasta, dê **2 cliques** em `Criar atalho na Area de Trabalho.bat` (só uma vez, por PC). Isso cria um ícone **"Coleta Bip-a-Bip"** na Área de Trabalho.
3. Do dia a dia em diante: **2 cliques no ícone** abre o app direto no navegador padrão. Não tem servidor, não tem janela de terminal, não precisa de Python nem de internet.

Se preferir não usar o `.bat`, dá pra abrir manualmente: dois cliques direto no `index.html` dentro da pasta funciona igual (é só um atalho de conveniência a mais).

### Publicar num endereço de internet (opcional, não necessário hoje)
Também é possível publicar este app no GitHub Pages (endereço público, ex.: `https://petsgo.github.io/bip-a-bip/`) — nesse caso ele também funciona offline depois do primeiro acesso, via Service Worker. Isso é só uma alternativa para quando/se fizer sentido; hoje o fluxo padrão é o `file://` local acima, mais simples e sem depender de internet nenhuma hora.

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

## Nota técnica (só para quem for mexer no código depois)

O código-fonte editável fica em `js/src/*.js` (com `import`/`export`, organizado em módulos). Os arquivos que o navegador realmente carrega são `js/*.js` (ex.: `js/coleta.js`), gerados a partir de `js/src/` com [esbuild](https://esbuild.github.io/), num único arquivo por página, sem `import`/`export`. Isso existe porque o Chrome/Edge bloqueia (por CORS) o carregamento de módulos ES em páginas abertas via `file://` — sem esse empacotamento, o app não funcionaria com duplo-clique direto, e exigiria manter um servidor local rodando (o que já foi tentado e descartado por ser mais frágil e menos prático no dia a dia da loja). IndexedDB, que é toda a base de dados do app, funciona normalmente em `file://` — só os módulos ES é que não.

Se editar algo em `js/src/`, é preciso rodar o build de novo para os arquivos em `js/*.js` refletirem a mudança (o `.bat` de abrir o app não faz isso sozinho). Quem for mexer no código pode pedir para o Claude Code refazer o empacotamento.

## Regra de ouro

O estoque físico contado é a verdade. Este app **só conta e consolida** — nunca integra, nem calcula financeiro, nem mexe no Onepet sozinho. A aplicação final é sempre manual, feita pelo gerente.
