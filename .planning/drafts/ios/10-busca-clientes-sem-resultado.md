# 10 — Busca de clientes sem resultado (iOS)

## Como chegar aqui

Na tela "Meus clientes" (aba Aniversariantes, draft 08): tocar
`filterable-top-tab-bar-search-input-input`, digitar um nome inexistente
("Nomenaoexistente") e tocar a tecla `Search` do teclado.

## Capturas

- `32-busca-sem-resultado.xml` / `.png` — busca aplicada, print mostra o card de erro.
- `33-busca-sem-resultado-2.xml` / `.png` — segunda captura, mesmo estado.

## Elementos

| type | name | label | value | rect | enabled | visible |
|---|---|---|---|---|---|---|
| `TextField` | `filterable-top-tab-bar-search-input-input` | — | `Nomenaoexistente` | `[18,297 324x39]` | true | true |
| `Other` | `segmented-control-tab-hoje-(0)` | `Hoje (0)` | — | `[21,361 181x32]` | true | true |
| `Other` | `segmented-control-tab-na-semana-(0)` | `Na semana (0)` | — | `[201,361 181x32]` | true | true |

**Nenhum nó existe na faixa `y` entre 380 e 600** em nenhuma das duas capturas (confirmado
por inspeção completa da árvore, `--all` incluído) — é exatamente onde o card de erro
aparece no print.

**Só no print**: card com ícone de alerta, título "Nenhum cliente encontrado!" e texto
"Parece que o cliente que você procura não está cadastrado ou está com o nome incorreto.
Verifique e tente novamente!".

## Seletor proposto

- Campo de busca → `~filterable-top-tab-bar-search-input-input` (de `name`, já coberto no
  draft 08).
- Card "Nenhum cliente encontrado!" → **sem seletor de árvore possível.** O predicate usado
  hoje em `clientesPage.noResultsMessage`
  (`-ios predicate string:name CONTAINS "Nenhum cliente encontrado!"`) **não encontra nada**
  nesta captura — confirmado por grep no XML bruto pelo texto exato: zero ocorrências.

## Equivalência entre plataformas

- `clientesPage.noResultsMessage`: `ios: predicate name CONTAINS "Nenhum cliente encontrado!"` →
  **diverge da baseline assumida pelo código**. O comentário/uso atual (em
  `waitForNoResults()`, chamado por CLI-07) assume que esse predicate encontra o elemento —
  nesta sessão, com o app 1.6.0, **não encontra**. Se a baseline de 26/08 (`Locators-iOS-Arys.docx`,
  não disponível para este agente) de fato dava esse empty state como exposto, isso é uma
  **divergência de comportamento do app entre sessões/builds**, não um erro de seletor: o
  texto continua certo, só não há nenhum nó — nem com esse texto, nem com nenhum outro —
  na região onde o card aparece.
- `clientesPage.waitForNoResults()` → **vai falhar por timeout** em execução real contra
  este build, do mesmo jeito que `openSortFilter()`/`selectSortOption()` falham no draft 09.
  CLI-07 está marcado `[x]` no `REQUIREMENTS.md`, mas essa marca provavelmente se refere só
  ao Android — não há evidência nesta sessão de que passe no iOS.
- **Android**: sem captura iOS anterior para comparar diretamente; o ponto de atenção é que
  o Android usa `@text="Nenhum cliente encontrado!"` via XPath, que funciona porque o
  Android expõe o texto na árvore — não há razão estrutural para o iOS não expor (não é um
  bottom sheet, é uma tela normal), o que torna esta ausência mais parecida com um bug de
  acessibilidade pontual do app do que com uma limitação de plataforma.

## Timing e gestos

- Sem medição de tempo entre o toque em `Search` e o card aparecer no print — a busca de
  clientes usa `browser.pause(2000)` no código (`searchClient()`), não contestado nem
  confirmado por esta captura.

## Armadilhas

- **Divergência de árvore × print mais séria desta sessão**: aqui não é uma questão de
  timing (como nas capturas 04-07 do login) — são **duas capturas separadas** (32 e 33),
  supostamente após o estado já estabilizado, e nenhuma das duas tem o nó na árvore. Não é
  plausível atribuir a um atraso de renderização; é o card não estar exposto à
  acessibilidade.
- Isso **bloqueia CLI-07 no iOS** exatamente como CLI-06 (sort) já está bloqueado — mas
  diferente do sort (que é um bottom sheet, categoria conhecida de anomalia), aqui é uma
  tela comum, o que sugere que o problema é específico deste componente de card de erro,
  não uma categoria genérica de "sheets sem filhos". Ver `RELATORIO-ANOMALIAS-IOS.md`.
- Os segmentos (`Hoje (0)`/`Na semana (0)`) continuam presentes e corretos durante a busca
  sem resultado — não há regressão nos elementos que já funcionavam, só a ausência do card
  de erro.
