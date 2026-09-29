# 08 — Meus clientes (iOS)

## Como chegar aqui

Três rotas convergem aqui: (a) na home, `btn-customer-section-view-all` ("ver todos" de Meus
clientes); (b) atalho `~btn-customer-tag-1-aniversariantes` (ou os outros dois atalhos); (c)
tab bar `~tab-customers-2`. Todas abrem já na aba **Aniversariantes** (capturas 26-28
idênticas). A tela tem 4 abas no total, mas só 3 cabem na largura da tela ao abrir: `Cashback
Exp.` nasce em `x = -109` (fora da tela, à esquerda), `Aniversariantes` e `Favoritos` visíveis;
`Pós Vendas` não existe na árvore até um arrasto horizontal na faixa da tab bar
(`dragFromToForDuration`, y≈228, de 0.85w para 0.15w) — aí `Pós Vendas` aparece em `x=17`,
`Cashback Exp.` em `x=178`, `Aniversariantes` em `x=339` (captura 35), e `Favoritos` some da
árvore.

## Capturas

- `26-meus-clientes.xml` / `.png` — chegando por "ver todos" (aba Aniversariantes).
- `27-atalho-aniversariantes.xml` / `.png` — mesma tela, chegando pelo atalho da home.
- `28-aba-clientes.xml` / `.png` — mesma tela, chegando por `tab-customers-2`.
- `29-aba-favoritos.xml` / `.png` — aba Favoritos, `Total de clientes: 0`, empty state.
- `31-aba-aniversariantes.xml` / `.png` — aba Aniversariantes, segmentos zerados.
- `34-tabs-arrastadas.xml` / `.png` — durante/após o arrasto da tab bar (campo de busca com
  teclado aberto nesta captura — ver Armadilhas).
- `35-aba-pos-vendas.xml`, `36-aba-pos-vendas-2.xml` — após o arrasto, `Pós Vendas` visível
  mas segmentos ainda `Hoje/Na semana` (1º toque na aba não selecionou).
- `37-aba-pos-vendas-3.xml` / `.png` — 2º toque em `Pós Vendas`: segmentos mudam para
  `A contatar (0)` / `Contatados (0)`.
- `38-aba-cashback.xml` / `.png` — aba Cashback Exp., segmentos `Hoje/Na semana`.

## Elementos

| type | name | label | value | rect | enabled | visible |
|---|---|---|---|---|---|---|
| `Other` | `customers-header` | — | — | `[0,142 402x24]` | true | true |
| `Other` | `navigation-back-button` | — | — | `[14,142 49x24]` | true | true |
| `StaticText` | `Meus clientes` | — | `Meus clientes` | `[154,143 94x22]` | true | true — **tem `name` E `value` iguais aqui** (diferente da home) |
| `Link` | `navigation-notifications` | `2` | — | `[364,142 24x24]` | true | true |
| `Other` | `Cashback Exp.` | — | — | `[-109,190 154x77]` (fora da tela ao abrir) / `[178,190 155x77]` (após arrasto) / `[20,190 154x79]` (aba ativa) | true | true (mesmo fora da tela — ver Armadilhas) |
| `Other` | `Aniversariantes` | — | — | `[51,190 155x79]` / `[339,190 155x77]` / `[180,190 155x77]` | true | true |
| `Other` | `Favoritos` | — | — | `[212,190 156x77]` / ausente após arrasto / `[341,190 156x77]` | true | true (quando presente) |
| `Other` | `Pós Vendas` | — | — | **ausente** até o arrasto; `[17,190 155x77]` após / `[-271,190 155x77]` (invisível, fora da tela, quando outra aba está no fim) / `[-142,190 155x77]` | true | `false` quando fora da faixa visível (ver Armadilhas) |
| `TextField` | `filterable-top-tab-bar-search-input-input` | — | placeholder `Buscar...` / texto digitado | `[18,297 324x39]` | true | true |
| `Other` | `filterable-top-tab-bar-sort-button` | — | — | `[349,299 36x36]` | true | true |
| `Other` | `segmented-control-tab-hoje-(0)` | `Hoje (0)` | — | `[21,361 181x32]` | true | true (abas Aniversariantes/Cashback/Favoritos*) |
| `Other` | `segmented-control-tab-na-semana-(0)` | `Na semana (0)` | — | `[201,361 181x32]` | true | true |
| `Other` | `segmented-control-tab-a-contatar-(0)` | `A contatar (0)` | — | `[21,361 181x32]` | true | true (só na aba Pós Vendas, após o 2º toque) |
| `Other` | `segmented-control-tab-contatados-(0)` | `Contatados (0)` | — | `[201,361 181x32]` | true | true (idem) |
| `StaticText` | `Total de clientes: 0` | — | idem | `[17,371 368x19]` | true | true (só na aba Favoritos) |
| `Other` | `, Nenhum cliente favorito, Você ainda não marcou nenhum cliente como favorito.` | — | — | `[17,410 368x88]` | true | true (só na aba Favoritos — nome agregado começa com vírgula) |

\* Na aba Favoritos não há segmentos `Hoje`/`Na semana` — em vez disso aparece
`Total de clientes: 0` e o empty state (ver acima).

## Seletor proposto

- `customers-header` → `~customers-header` (de `name`, captura 26).
- Título "Meus clientes" (nesta tela) → `~Meus clientes` (de `name`, captura 26) — **aqui
  sim** o `StaticText` tem `name="Meus clientes"` além de `value` igual, diferente da home
  (ver Equivalência).
- Abas → `~Cashback Exp.`, `~Aniversariantes`, `~Favoritos`, `~Pós Vendas` (de `name`,
  capturas 26/29/35) — todas simples accessibility id pelo texto visível.
- `filterable-top-tab-bar-search-input-input` → `~filterable-top-tab-bar-search-input-input`
  (de `name`, captura 26).
- `filterable-top-tab-bar-sort-button` → `~filterable-top-tab-bar-sort-button` (de `name`,
  captura 26).
- Segmentos → `-ios predicate string:name BEGINSWITH "segmented-control-tab-hoje"` /
  `"segmented-control-tab-na-semana"` / `"segmented-control-tab-a-contatar"` /
  `"segmented-control-tab-contatados"` (de `name`, capturas 26/31/37/38) — **o `name`
  inclui a contagem entre parênteses** (`segmented-control-tab-hoje-(0)`), por isso o
  predicate precisa ser `BEGINSWITH`, nunca igualdade.
- `Total de clientes: 0` → `-ios predicate string:name BEGINSWITH "Total de clientes"` (de
  `name`, captura 29).
- Empty state de Favoritos → **exposto na árvore**, mas o `name` inteiro é o texto
  agregado começando com vírgula: `-ios predicate string:name CONTAINS "Nenhum cliente favorito"`
  (de `name`, captura 29) — **não capturado no page object hoje**.

## Equivalência entre plataformas

- `clientesPage.screenTitle`: `ios: '~Meus clientes'` → **confirma** (aqui o `name` bate
  exatamente, diferente da ressalva feita na home/campanhas para outros títulos).
- `clientesPage.totalClientesLabel`: `ios: predicate name BEGINSWITH "Total de clientes"` →
  **confirma** (captura 29).
- `clientesPage.sortFilterBtn`: `ios: '~filterable-top-tab-bar-sort-button'` → **confirma**.
- `clientesPage.hojeLabel`: `ios: predicate name BEGINSWITH "segmented-control-tab-hoje"` →
  **confirma**, e confirma a observação do código de que "o `name` dos segmentos inclui a
  contagem" — o predicate `BEGINSWITH` já é a escolha certa, não precisa mudar.
- `clientesPage.contatadosLabel`: `ios: predicate name BEGINSWITH "segmented-control-tab-contatados"` →
  **confirma** (captura 37, só após o 2º toque em Pós Vendas).
- `clientesPage.searchField`: `ios: '~filterable-top-tab-bar-search-input-input'` →
  **confirma**.
- `clientesPage.tabByName()`: usa `~${name}` direto — **confirma** para os quatro nomes
  (`Cashback Exp.`, `Aniversariantes`, `Favoritos`, `Pós Vendas`).
- `clientesPage.scrollTabBarRight()`: usa `dragHorizontally` com `fromRatio=0.15,
  toRatio=0.85` a partir da âncora `Favoritos` → **confirma o mecanismo**; a captura de
  hoje usou `dragFromToForDuration` de `0.85w` para `0.15w` (sentido oposto de leitura, mas
  mesmo eixo/altura) e obteve o mesmo resultado (revelar `Pós Vendas`). Nenhuma divergência
  de direção real — a notação do código (`from 0.15 to 0.85`) descreve o mesmo gesto físico
  observado.
- **Não cobre**: a asserção de empty state de Favoritos
  (`, Nenhum cliente favorito, Você ainda não marcou nenhum cliente como favorito.`) não
  tem getter em nenhum page object — CLI-02 testa só "Total de clientes", não o empty
  state.
- **Android**: as abas são os mesmos accessibility ids (`~Clientes` etc. não aplicável aqui,
  mas os nomes de aba — `Favoritos`, `Aniversariantes`, `Cashback Exp.`, `Pós Vendas` — são
  os mesmos literais usados sem `byPlatform()` no código, por serem idênticos nas duas
  plataformas). Esta captura confirma que no iOS eles são `Other` com `name` = texto
  visível, compatível com o uso direto de `$(~nome)` já feito em `clientesPage.tabByName()`
  para ambas as plataformas.

## Timing e gestos

- Arrasto da tab bar: `dragFromToForDuration` com `duration: 0.8`, de `x = 0.85w` para
  `x = 0.15w`, na altura `y≈228` — revelou `Pós Vendas`/`Cashback Exp.`/`Aniversariantes`
  nas novas posições (captura 35). Medição direta desta sessão, não inferida.
- **1º toque em `~Pós Vendas` não selecionou a aba** (segmentos continuaram
  `Hoje (0)`/`Na semana (0)` nas capturas 35 e 36); o **2º toque, sim** (segmentos mudaram
  para `A contatar (0)`/`Contatados (0)` na captura 37). Mesma contagem exata de 2
  tentativas — não inflar para "sempre precisa de 2 toques" além do que foi medido aqui.
- Não medido: tempo de carregamento entre abrir a tela e os segmentos aparecerem.

## Armadilhas

- **`Cashback Exp.` nasce com `x` negativo** (`-109` na abertura) e ainda assim
  `visible="true"` na árvore — no iOS, diferente do Android, um elemento fora da faixa
  visível da tela **pode continuar existindo e "visível" na árvore** (a acessibilidade não
  reflete recorte de viewport da mesma forma). Um `isDisplayed()` baseado só em
  `visible="true"` pode dar falso positivo para elementos fora do que o usuário realmente
  vê — a distinção real está nas coordenadas (`x`, `width`) relativas à largura da tela
  (402 pt), não no atributo `visible`.
- **`Pós Vendas` não existe na árvore até o arrasto** — diferente do caso acima, aqui o nó
  simplesmente não está presente (não é "invisible", é "ausente"). Isso é a diferença
  estrutural citada nas instruções: no iOS, uma célula fora da viewport pode simplesmente
  não existir, enquanto no Android um nó fora da tela ainda pode estar na árvore. As duas
  situações (`Cashback Exp.` visível-mas-fora vs. `Pós Vendas` ausente) coexistem nesta
  mesma tab bar — não assumir um padrão único para "aba fora da tela".
- **1º toque perdido em `~Pós Vendas`** — mesmo padrão de outros elementos nesta sessão;
  validar pelo estado do segmento seguinte (`A contatar`/`Contatados`), nunca só pelo
  clique ter sido "aceito" sem erro.
- **Captura 34 tem o teclado aberto** e a tab bar mostra só `tab-home-1`/`tab-menu-5` (os
  outros dois botões da tab bar do app, não da tab bar de clientes, ficaram fora da lista
  de nós visíveis) — não gerar conclusões sobre a tab bar principal a partir desta captura
  específica; é um estado transitório do arrasto, não representativo.
- Empty state de Favoritos **exposto** (ao contrário do "Ordenar por" e do onboarding) —
  cuidado ao generalizar "sheets/empty states não têm filhos": aqui o empty state está
  acessível normalmente, só com um `name` estranho (começa com vírgula, é o rótulo
  agregado de um `Other` que engloba texto+subtexto).
