# 06 — Busca (home) e perfil do cliente (iOS)

## Como chegar aqui

A partir da home (draft 05): tocar `home-search-input-input` **não navega** — abre o
teclado ali mesmo, na própria home (captura 16). Digitar o nome (captura 17) e tocar a tecla
`Search` do teclado abre uma tela dedicada de resultados (captura 18). Tocar um card de
resultado abre o perfil do cliente (captura 19). Dois `navigation-back-button` sucessivos
voltam: 1º para os resultados (captura 20), 2º para a home (captura 21, já documentada no
draft 05, com "Buscas Recentes").

## Capturas

- `16-busca-aberta.xml` / `.png` — campo de busca da home focado, teclado aberto, sem texto.
- `17-busca-digitada.xml` / `.png` — "Fudaba" digitado no campo da home.
- `18-busca-resultado.xml` / `.png` — tela de resultados, 2 cards.
- `19-perfil-cliente.xml` / `.png` — perfil do cliente (Ricardo Fudaba Junior), abas.
- `20-voltar-1.xml` / `.png` — 1º back, volta à tela de resultados.
- (2º back → captura 21, ver draft 05)

## Elementos

### Busca (na home, capturas 16/17)

| type | name | label | value | rect | enabled | visible |
|---|---|---|---|---|---|---|
| `TextField` | `home-search-input-input` | — | placeholder / `Fudaba` | `[15,188 372x38]` | true | true |
| `Button` | `Search` | `search` | — | `[300,752 100x54]` | true | true — tecla do teclado |

### Tela de resultados (captura 18)

| type | name | label | value | rect | enabled | visible |
|---|---|---|---|---|---|---|
| `Other` | `navigation-back-button` | — | — | `[14,142 49x24]` | true | true |
| `StaticText` | (sem name) | — | `Buscar` (título) | `[177,143 48x22]` | true | true |
| `Link` | `navigation-notifications` | `2` | — | `[364,142 24x24]` | true | true |
| `Other` | `screen-customer-search-results` | — | — | `[0,187 402x605]` | true | true |
| `TextField` | `input-customer-search-input` | — | `Fudaba` | `[11,188 380x38]` | true | true |
| `StaticText` | (sem name) | — | `2 resultados encontrados` | `[10,237 382x19]` | true | true |
| `Other` | `list-customer-search-results` | — | — | `[0,276 402x516]` | true | true |
| `Other` | `customer-card-search-<id>` (ex.: `customer-card-search-68d705307ac6952b1e29854e`) | `Ricardo Fudaba Junior, Nivel 5, Este cliente pertence a outro vendedor` | — | `[14,276 374x197]` | true | true |
| `Other` | `customer-card-classification-<id>` | — | — | `[29,314 55x18]` | true | true |

`<id>` é um identificador dinâmico por cliente (Mongo-like), não um valor fixo — o seletor
precisa ser por `BEGINSWITH`, nunca por igualdade de um id específico.

### Perfil do cliente (captura 19)

| type | name | label | value | rect | enabled | visible |
|---|---|---|---|---|---|---|
| `Other` | `navigation-back-button` | — | — | `[14,142 49x24]` | true | true |
| `StaticText` | (sem name) | — | `Perfil do cliente` | `[148,143 106x22]` | true | true |
| `Link` | `navigation-notifications` | `2` | — | `[364,142 24x24]` | true | true |
| `Other` | `customer-detail-header` | — | — | `[0,187 402x149]` | true | true |
| `Other` | `Contatar` | — | — | `[274,187 114x42]` | true | true |
| `StaticText` | (sem name) | — | nome do cliente | `[14,195 254x26]` | true | true |
| `StaticText` | (sem name) | — | `Nivel 5` | `[29,234 39x19]` | true | true |
| `StaticText` | (sem name) | — | `Este cliente pertence a outro vendedor` | `[14,264 210x14]` | true | true |
| `Other` | `customer-data-card` | — | — | `[14,335 374x434]` | true | true |
| `Other` | `customer-data-registration-card` | `Cliente desde, 11/12/24, MDC, 1.39 produtos, Newsletter, Não, Aniversário, …` | — | `[14,370 374x175]` | true | true |
| `Other` | `customer-data-purchase-card` | `Última compra, 16/07/26, Valor total, R$ 4.297,72, Vendedor, …` | — | `[14,593 374x176]` | true | true |
| `Button` | `tab-index-0` | `, Dados` | `1` quando selecionada | `[10,801 91x57]` | true | true |
| `Button` | `tab-notes-1` | `Notas` | — | `[107,801 91x57]` | true | true |
| `Button` | `tab-purchases-2` | `, Histórico` | — | `[204,801 91x57]` | true | true |
| `Button` | `tab-recommendations-3` | `, Sugestões` | — | `[301,801 91x57]` | true | true |

## Seletor proposto

- Tecla `Search` do teclado → `-ios predicate string:type == "XCUIElementTypeButton" AND name == "Search"`
  (de `type`+`name`, captura 16) — o rótulo (`label`) do idioma acompanha `"search"`
  minúsculo; usar `name`, mais estável.
- `navigation-back-button` → `~navigation-back-button` (de `name`, capturas 18-20) — **mesmo
  id nas duas telas** (resultados e perfil); usado duas vezes em sequência para voltar até a
  home (ver Armadilhas).
- `screen-customer-search-results` → `~screen-customer-search-results` (de `name`, captura 18).
- `input-customer-search-input` → `~input-customer-search-input` (de `name`, captura 18).
- Cards de resultado → `-ios predicate string:name BEGINSWITH "customer-card-search"` (de
  `name`, captura 18) — id dinâmico por cliente.
- `Perfil do cliente` (título) → `-ios predicate string:name == "Perfil do cliente"` — **não
  tem `name` próprio**: o `StaticText` só tem `value="Perfil do cliente"`, sem atributo
  `name` (grep confirma). O getter atual usa `~Perfil do cliente` (equivalente a
  `name == "Perfil do cliente"`); ver Equivalência para o risco.
- Abas do perfil → `~tab-index-0`, `~tab-notes-1`, `~tab-purchases-2`,
  `~tab-recommendations-3` (de `name`, captura 19) — **não capturadas no page object hoje**.

## Equivalência entre plataformas

- `base.page.ts` `submitSearch()`: no ramo iOS, clica
  `-ios predicate string:type == "XCUIElementTypeButton" AND (name == "Search" OR name == "Buscar" OR name == "Pesquisar")`
  → **confirma** (`name == "Search"` bateu na captura 16; as variantes em português não
  foram exercitadas porque o teclado desta sessão estava em inglês/qwerty americano — sem
  contradição, apenas não testado hoje).
- `home.page.ts` `searchResultsInput`: `ios: '~input-customer-search-input'` → **confirma**.
- `home.page.ts` `searchResultCard`: `ios: '-ios predicate string:name BEGINSWITH "customer-card-search"'`
  → **confirma**.
- `home.page.ts` `clientProfileTitle`: `ios: '~Perfil do cliente'` → **não totalmente
  confirmado**: o `StaticText` não tem `name`, só `value`. Funciona na prática porque o WDA
  resolve accessibility id por `label` quando presente e por `value` como último recurso em
  alguns drivers — mas esta sessão não isolou esse comportamento (a navegação para o perfil
  foi confirmada por outro caminho, não pela espera nesse título). Marcar como
  "funciona empiricamente nos specs existentes, origem exata do match não confirmada nesta
  captura".
- `home.page.ts` `backButton`: `ios: '~navigation-back-button'` → **confirma**, e confirma
  também que o **mesmo id se repete** na tela de resultados e na de perfil (ver Armadilhas —
  duplicação de id entre telas).
- **Não cobre**: as quatro abas do perfil (`tab-index-0`, `tab-notes-1`, `tab-purchases-2`,
  `tab-recommendations-3`) não têm getter em nenhum page object hoje — a navegação por abas
  do perfil não é exercitada por nenhum spec atual.
- **Android**: `home.page.ts` usa o mesmo `searchField` para a busca (não abre tela dedicada
  no Android — resultado inline). No iOS a busca sempre abre uma tela nova
  (`screen-customer-search-results`), por isso o getter `searchResultsInput` existe só para
  iOS; nenhuma mudança necessária, comportamento já coberto pelo código atual.

## Timing e gestos

- Sem medição de tempo de navegação entre busca → resultados → perfil nesta sessão (as
  capturas foram feitas após a UI já estabilizada em cada etapa).
- `clearValue()` no campo de busca da home devolveu o placeholder sem resíduo (mencionado nas
  notas do inspetor; não há captura isolada desse estado nesta lista, mas é citado como
  medição direta da sessão, não inferência).

## Armadilhas

- **`navigation-back-button` é o mesmo id em pelo menos duas telas** (resultados de busca e
  perfil do cliente) — um `$('~navigation-back-button')` sem esperar a tela certa primeiro
  pode clicar o back da tela errada se a transição ainda não tiver terminado. Sempre esperar
  o título/âncora da tela atual antes de tocar o back.
- **Cards de cliente têm id dinâmico** (`customer-card-search-<hash>`) — nunca comparar por
  igualdade; usar `BEGINSWITH`/`CONTAINS` e, quando precisar de um cliente específico,
  compor o predicate com o texto do `label` (nome), não com o id.
- **Título "Perfil do cliente" sem `name` próprio** — o getter que existe hoje (`~Perfil do
  cliente`) não foi isolado nesta sessão; se um teste falhar exatamente nesse
  `waitForDisplayed`, o próximo passo é comparar contra `-ios predicate string:value == "Perfil do cliente"`
  em vez de assumir que o `~` já cobre `value`.
- Nenhuma anomalia de "1º toque perdido" foi observada nesta seção — os toques em busca,
  card de resultado e back funcionaram todos de primeira nesta sessão.
