# 07 — Campanhas (iOS)

## Como chegar aqui

Duas rotas convergem para a mesma tela: (a) na home, tocar `btn-campaign-section-view-all`
— **o 1º toque não navegou** (captura 22, ainda na home); o 2º toque, sim (captura 23); (b)
pela tab bar, `~tab-campaigns-3` (captura 40) — chega direto, sem o problema de 1º toque
(a tab bar é um controle diferente do botão "ver todas").

## Capturas

- `22-campanhas-todas.xml` / `.png` — 1º toque no "ver todas" de Campanhas: **ainda na
  home**, com "Buscas Recentes" visível (busca anterior).
- `23-campanhas-tentativa2.xml` / `.png` — 2º toque: navegou para "Campanhas e segmentos".
- `23-campanhas-todas.xml` / `.png` — mesma tela, segunda captura de confirmação.
- `40-aba-campanhas.xml` / `.png` — mesma tela, chegando pela tab bar (`tab-campaigns-3`).

## Elementos

### Home antes de navegar (captura 22 — ver draft 05 para a lista completa)

Relevante aqui: `btn-campaign-section-view-all` presente e `enabled="true"`,
`visible="true"` mesmo no toque que não navegou — não há indício na árvore de que o toque
tenha sido rejeitado por estado do elemento; o 1º toque simplesmente não produziu a
navegação.

### Tela "Campanhas e segmentos" (capturas 23/40, idênticas)

| type | name | label | value | rect | enabled | visible |
|---|---|---|---|---|---|---|
| `Other` | `campaigns-header` | — | — | `[0,142 402x24]` | true | true |
| `Other` | `navigation-back-button` | — | — | `[14,142 49x24]` | true | true |
| `StaticText` | (sem name) | — | `Campanhas e segmentos` | `[116,143 170x22]` | true | true |
| `Link` | `navigation-notifications` | `2` | — | `[364,142 24x24]` | true | true |
| `Other` | `segmented-control-tab-campanhas` | `Campanhas` | — | `[21,190 181x33]` | true | true |
| `Other` | `segmented-control-tab-segmentos` | `Segmentos` | — | `[201,190 181x33]` | true | true |
| `StaticText` | (sem name) | — | `Não foi possível carregar as campanhas!` | `[67,282 239x18]` | true | true |
| `StaticText` | (sem name) | — | `Você pode tentar novamente agora. Se não der certo, tente mais tarde — pode ser só uma instabilidade momentânea.` | `[39,310 317x53]` | true | true |
| `Button` | `tab-campaigns-3` | `Campanhas` | `1` (selecionada) | `[204,802 91x56]` | true | true |

## Seletor proposto

- `campaigns-header` → `~campaigns-header` (de `name`, captura 23).
- Título "Campanhas e segmentos" → sem `name` próprio; `-ios predicate string:value == "Campanhas e segmentos"`
  (de `value`, captura 23) — o getter atual usa `~Campanhas e segmentos`, ver Equivalência.
- `segmented-control-tab-campanhas` / `-segmentos` → `~segmented-control-tab-campanhas`,
  `~segmented-control-tab-segmentos` (de `name`, captura 23) — **não capturados no page
  object hoje**.
- Erro "Não foi possível carregar as campanhas!" → `-ios predicate string:name == "Não foi possível carregar as campanhas!"`
  (de `name`, captura 23) — **não capturado no page object hoje**; é o estado padrão desta
  conta (CRM não autorizado), não um erro pontual desta sessão.

## Equivalência entre plataformas

- `home.page.ts` `campaignsSectionViewAllBtn`: `ios: '~btn-campaign-section-view-all'` →
  **confirma** o `name`; a captura de hoje também confirma o **padrão de 1º toque perdido**
  já conhecido de outros botões pequenos/recém-renderizados (ver Armadilhas) — nenhum
  método atual (`openAllCampaigns()`) faz retry, então um teste pode falhar de forma
  intermitente dependendo do timing.
- `home.page.ts` `campaignsScreenTitle`: `ios: '~Campanhas e segmentos'` → **não totalmente
  confirmado**: o `StaticText` não tem `name`, só `value` (mesmo padrão do título "Perfil do
  cliente" no draft 06). Funciona empiricamente nos specs atuais; origem exata do match
  (`value` vs. `name`) não isolada nesta sessão.
- `homePage.campaignsTab`: `ios: '~tab-campaigns-3'` → **confirma** (captura 40).
- **Não cobre**: `segmented-control-tab-campanhas`/`-segmentos` e a mensagem de erro do CRM
  não têm getter em nenhum page object — a suíte atual não valida o conteúdo da tela de
  campanhas, só a navegação até o título.
- **Android**: sem equivalente capturado nesta sessão para comparar (fora do escopo desta
  captura iOS); nada a portar aqui além do já existente.

## Timing e gestos

- **1º toque em `btn-campaign-section-view-all` não navegou** (medido: captura 22 ainda
  mostra a home); o **2º toque idêntico navegou** (captura 23). Isso é uma contagem exata
  de 2 tentativas nesta sessão, não um limite superior — não inflar para "sempre precisa de
  2 toques" sem repetir a medição em outra sessão, mas também não assumir que 1 toque basta.
- Chegada pela tab bar (`tab-campaigns-3`) não apresentou o mesmo problema — 1 toque bastou
  (captura 40 já mostra a tela carregada).

## Armadilhas

- **1º toque perdido**: mesmo padrão relatado em `btn-customer-section-info` (draft 05) e em
  `~Pós Vendas` (draft 08). Como o app não sinaliza o toque perdido de forma observável
  (nenhum elemento muda de estado entre a captura 22 e a 23 além da navegação em si), a
  única defesa é repetir o toque validando o resultado esperado antes de desistir — nunca
  assumir que "clicar uma vez" é suficiente para este botão específico.
- **Título da tela sem `name` acessível** — mesmo padrão do draft 06 (perfil do cliente);
  se `waitForDisplayed` no título falhar, o próximo passo é conferir o predicate por
  `value` em vez de `name`.
- A mensagem "Não foi possível carregar as campanhas!" é **esperada nesta conta/build**
  (CRM não autorizado) — não é evidência de bug de automação; qualquer asserção que exija
  ver campanhas de fato carregadas não é alcançável com esta conta.
