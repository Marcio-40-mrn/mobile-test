# 05 — Home (iOS)

## Como chegar aqui

Depois de fechar o sheet de onboarding (draft 04), ou em qualquer retorno à aba Início pela
tab bar (`~tab-home-1`). Esta tela também é revisitada depois da busca (voltar duas vezes,
draft 06) e depois de campanhas/clientes (voltar pela tab bar).

## Capturas

- `15-home.xml` / `.png` — home completa, topo da tela, sem scroll.
- `21-voltar-2.xml` / `.png` — home após voltar da busca, com "Buscas Recentes" visível.
- `24-home-scroll.xml` / `.png` — home após `mobile: swipe up`, seção Meus clientes no topo.
- `25-info-aberta.xml` / `.png` — mesmo scroll, após toque no botão de info.

## Elementos

| type | name | label | value | rect | enabled | visible |
|---|---|---|---|---|---|---|
| `Other` | `greeting-header` | — | — | `[14,142 374x24]` | true | true |
| `StaticText` | (sem name) | — | `Olá, Melissa Arruda!` | `[14,143 312x22]` | true | true |
| `Link` | `greeting-header-notifications` | `2` (badge) | — | `[364,142 24x24]` | true | true |
| `TextField` | `home-search-input-input` | — | placeholder `Buscar por cliente...` / texto digitado | `[15,188 372x38]` | true | true |
| `Other` | `Estoque` | — | — | `[14,248 84x84]` | true | true (some após scroll) |
| `StaticText` | (sem name) | — | `Campanhas` | `[14,353 342x25]` | true | true |
| `Other` | `btn-campaign-section-view-all` | `""` (label vazio) | — | `[356,353 32x25]` | true | true |
| `Other` (sem name próprio) | agregado | — | `Acesso ao CRM não autorizado, Verifique se o seu PIN está correto...` | `[14,394 374x228]` | true | true — card de erro no lugar das campanhas (estado desta conta, ver Armadilhas) |
| `StaticText` | (sem name) | — | `Meus clientes` | `[14,643 116x25]` | true | true |
| `Other` | `btn-customer-section-info` | — | — | `[135,645 20x21]` | true | true — **20×21 pt** |
| `Other` | `btn-customer-section-view-all` | `""` | — | `[356,642 32x26]` | true | true |
| `Other` | `customer-section-tags-list` | — | — | `[14,683 374x43]` | true | true |
| `Other` | `btn-customer-tag-1-aniversariantes` | `Aniversariantes` | — | `[14,683 117x43]` | true | true |
| `Other` | `btn-customer-tag-2-cashback-expirando` | `Cashback expirando` | — | `[144,683 146x43]` | true | true |
| `Other` | `btn-customer-tag-3-pós-venda` | `Pós-venda` | — | `[304,683 90x43]` | true | true |
| `Other` | `customer-dashboard-card` | `Contatos feitos, Diário, Aniversariantes, 0%, Cashback, 0%, Pos-venda, 0%` | — | `[14,741 374x276]` | true | true — **é o card da seção "Contatos feitos"** |
| `Other` | `custom-tab-bar` | — | — | `[0,792 402x82]` | true | true |
| `Button` | `tab-home-1` | `Inicio` | `1` quando selecionada | `[10,802 91x56]` | true | true |
| `Button` | `tab-customers-2` | `Clientes` | — | `[107,802 91x56]` | true | true |
| `Button` | `tab-campaigns-3` | `Campanhas` | — | `[204,802 91x56]` | true | true |
| `Button` | `tab-menu-5` | `Menu` | — | `[301,802 91x56]` | true | true |

Somente após voltar de uma busca (captura 21): `StaticText "Buscas Recentes"` em
`[14,248 374x21]` e um chip `Other name="Fudaba"` em `[14,276 48x21]` — empurra o resto da
home para baixo (Campanhas passa de `y=353` para `y=423`).

Não há `logo-header` visível nesta sessão — só `logo-header-image-wrapper` (a imagem do
logo, sem o container "logo" com esse nome exato marcado como visível).

## Seletor proposto

- `greeting-header` → `~greeting-header` (de `name`, captura 15).
- Saudação (texto "Olá, ...") → não precisa de seletor próprio: `greeting-header` já serve
  de âncora; o texto completo está no `value` do `StaticText` filho, sem `name`.
- `home-search-input-input` → `~home-search-input-input` (de `name`).
- `btn-campaign-section-view-all` → `~btn-campaign-section-view-all` (de `name`) — **label
  vazio**, não usar `label` como parte do seletor.
- `btn-customer-section-info` → `~btn-customer-section-info` (de `name`) — 20×21 pt,
  precisa de `tapCenter()` (ver Armadilhas).
- `btn-customer-section-view-all` → `~btn-customer-section-view-all` (de `name`).
- Atalhos: `~btn-customer-tag-1-aniversariantes`, `~btn-customer-tag-2-cashback-expirando`,
  `~btn-customer-tag-3-pós-venda` (de `name`, captura 15).
- Seção "Contatos feitos" → **não há elemento próprio**; o card `customer-dashboard-card`
  (de `name`) tem o rótulo agregado no `label`. Um predicate por `label BEGINSWITH "Contatos feitos"`
  (como já faz `home.page.ts`) é o único caminho.
- Tab bar → `~tab-home-1`, `~tab-customers-2`, `~tab-campaigns-3`, `~tab-menu-5` (de `name`,
  captura 15).
- "Buscas Recentes" → `~Buscas Recentes` (de `name`, captura 21) — **não capturado no page
  object hoje**.
- Chip de busca recente → `~Fudaba` (de `name`, captura 21) — nome dinâmico (é o próprio
  texto buscado), não vale como seletor genérico; citado aqui só como exemplo/evidência.

## Equivalência entre plataformas

- `home.page.ts` `greeting`: `ios: '~greeting-header'` → **confirma**.
- `home.page.ts` `searchField`: `ios: '~home-search-input-input'` → **confirma**.
- `home.page.ts` `campaignsSection`: `ios: '~Campanhas'` → **não cobre exatamente**: a
  captura de hoje mostra `StaticText` com `value="Campanhas"` mas **sem `name` próprio**
  (nenhum atributo `name="Campanhas"` no nó — grep confirma ausência). O seletor `~Campanhas`
  depende de o WDA resolver accessibility id por `label`/`value` quando `name` está vazio;
  não foi testado hoje se esse getter resolve (nenhum uso direto de `campaignsSection` nas
  capturas). Risco a validar na Fase 7.
- `home.page.ts` `campaignsSectionViewAllBtn`: `ios: '~btn-campaign-section-view-all'` →
  **confirma**.
- `home.page.ts` `customerSectionInfoBtn`: `ios: '~btn-customer-section-info'` → **confirma**
  o `name` e o tamanho 20×21 pt que justifica `tapCenter()`.
- `home.page.ts` `customerSectionViewAllBtn`: `ios: '~btn-customer-section-view-all'` →
  **confirma**.
- `home.page.ts` `myCustomersSection`/`myCustomersScreenTitle`: `ios: '~Meus clientes'` →
  mesma ressalva do `campaignsSection`: o `StaticText` da home tem `value="Meus clientes"`
  sem `name` próprio (captura 15/24/25); já a tela "Meus clientes" (draft 08) tem um
  `StaticText` com `name` E `value` iguais a `"Meus clientes"` — ali o seletor **confirma**
  sem ressalva. Na home, marcar como **não confirmado diretamente**.
- `home.page.ts` `contactsSection`: `ios: predicate label BEGINSWITH "Contatos feitos"` →
  **confirma** (o `label` de `customer-dashboard-card` começa exatamente com "Contatos
  feitos", captura 15).
- `home.page.ts` `clickShortcutButton()` / `SHORTCUT_IOS_IDS`: os três ids
  (`btn-customer-tag-1-aniversariantes`, `-2-cashback-expirando`, `-3-pós-venda`) →
  **confirma** nome e label, capturas 15/24/25.
- `home.page.ts` `toggleCustomerSectionInfo()` usa `tapCenter()` → **confirma a necessidade**:
  20×21 pt é abaixo do mínimo recomendado de toque; a captura 25 mostra que mesmo com
  `tapCenter()` o tooltip não abriu (ver Armadilhas) — pode ser o padrão de 1º toque
  perdido, não uma falha do `tapCenter()` em si.
- `homePage.homeTab`/`clientsTab`/`campaignsTab`/`menuTab`: `~tab-home-1`, `~tab-customers-2`,
  `~tab-campaigns-3`, `~tab-menu-5` → **confirma** todos (captura 15).
- **Android**: as seções equivalentes usam texto (`@text="Campanhas"`, `@text="Meus clientes"`)
  via XPath — não portável ao iOS por regra do projeto (proibido XPath no iOS); daí a
  necessidade dos ids `btn-*` sempre que existirem.

## Timing e gestos

- 1 `mobile: swipe up` (direção invertida do Android) foi suficiente para levar "Meus
  clientes" ao topo visível (captura 24) — sem necessidade de mais de um swipe nesta
  sessão. Não é uma medição de limite superior: o resultado foi obtido no primeiro swipe.
- Botão de info: 1 toque com `tapCenter()`-equivalente (coordenada central do elemento,
  145,409) não abriu o tooltip (captura 25) — consistente com o padrão de "1º toque
  perdido" relatado para outros botões pequenos/recém-renderizados nesta sessão. **Não foi
  tentado um 2º toque hoje** para confirmar se o padrão se repete aqui; ver Pendências no
  índice.

## Armadilhas

- **Estado da conta**: o card "Acesso ao CRM não autorizado..." aparece no lugar da seção de
  campanhas (todas as capturas desta sessão) — não é um elemento de erro pontual, é o
  estado permanente desta conta neste build. Qualquer asserção sobre a seção de campanhas
  precisa considerar esse estado, não o conteúdo "normal" de campanhas.
- **Botão de info 20×21 pt**: além de exigir `tapCenter()` em vez de `click()`, o primeiro
  toque não abriu o tooltip nesta sessão (nem no print, nem na árvore) — o texto
  "Nesta área, o Arys…" não foi capturado. Ver Pendências no índice.
- **`Campanhas`/`Meus clientes` como `StaticText` sem `name` na home**: os testes que usam
  `~Campanhas`/`~Meus clientes` na home dependem do WDA cair para `label`/`value` quando
  falta `name` — funciona na prática em várias suítes WDA, mas não foi comprovado por esta
  captura (nenhuma dessas duas ações — abrir campanhas por essa seção, abrir "Meus clientes"
  por essa seção — foi exercitada isoladamente; as navegações usadas nesta sessão foram
  pelos botões `view-all`, que têm `name` próprio).
- **`Estoque` sem `name` descritivo além do texto "Estoque" mesmo** — não teve interação
  nesta sessão (fora do escopo da Fase 5/6); listado só como elemento presente.
- A seção "Buscas Recentes" e o chip da última busca só aparecem depois de pelo menos uma
  busca ser feita e voltar para a home — no primeiro acesso à home (captura 15) eles não
  existem na árvore (ausência normal, não anomalia).
