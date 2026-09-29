# 11 — Menu (iOS)

Escopo desta captura é só levantamento — os cenários de menu são da **Fase 8** (ainda não
planejada em detalhe); este draft documenta o que a árvore mostra para adiantar o trabalho
futuro, sem propor fluxo de teste.

## Como chegar aqui

Pela tab bar, `~tab-menu-5`, a partir de qualquer tela com a tab bar visível.

## Capturas

- `39-menu.xml` / `.png` — tela de menu completa.

## Elementos

| type | name | label | value | rect | enabled | visible |
|---|---|---|---|---|---|---|
| `Other` | `screen-menu` | — | — | `[0,121 402x671]` | true | true |
| `StaticText` | (sem name) | — | nome do usuário | `[14,121 374x25]` | true | true |
| `Other` | `seller-details` | — | — | `[14,121 374x96]` | true | true |
| `Other` | `btn-seller-details-copy-code` | `Cód de vendedor: 4987` | — | `[14,156 374x19]` | true | true |
| `StaticText` | (sem name) | — | nome da loja (ex.: `DEPOSITO PIRACICABA`) | `[22,185 141x19]` | true | true |
| `Other` | `btn-menu-my-data` | — | — | `[14,227 374x47]` | true | true |
| `Other` | `btn-menu-faq` | — | — | `[14,273 374x47]` | true | true |
| `Other` | `btn-menu-app-guide` | — | — | `[14,319 374x47]` | true | true |
| `Other` | `btn-menu-support` | — | — | `[14,365 374x47]` | true | true |
| `StaticText` | (sem name) | — | `Ajustes e conta` (separador de seção) | `[14,433 374x22]` | true | true |
| `Other` | `btn-menu-settings` | — | — | `[14,454 374x47]` | true | true |
| `Other` | `btn-menu-sign-out` | — | — | `[14,500 374x46]` | true | true |
| `Other` | `btn-menu-terms` | `Termos e condições` | — | `[28,596 116x18]` | true | true |
| `Other` | `btn-menu-privacy-policy` | `Políticas de privacidade` | — | `[28,627 137x19]` | true | true |
| `StaticText` | (sem name) | — | `Versão 1.6.0` | `[28,659 79x18]` | true | true |
| `Button` | `tab-menu-5` | `Menu` | `1` (selecionada) | `[301,802 91x56]` | true | true |

O código de vendedor (`4987`) e a loja (`DEPOSITO PIRACICABA`) são dados da conta de teste —
não são segredo (diferente de e-mail/senha/PIN), mas variam por conta; não assumir esse
valor fixo em asserções futuras sem reconfirmar.

## Seletor proposto

- `screen-menu` → `~screen-menu` (de `name`).
- `seller-details` → `~seller-details` (de `name`).
- `btn-seller-details-copy-code` → `~btn-seller-details-copy-code` (de `name`) — o `label`
  contém o código formatado (`Cód de vendedor: <n>`), dinâmico por conta.
- Itens do menu → `~btn-menu-my-data`, `~btn-menu-faq`, `~btn-menu-app-guide`,
  `~btn-menu-support`, `~btn-menu-settings`, `~btn-menu-sign-out`, `~btn-menu-terms`,
  `~btn-menu-privacy-policy` (todos de `name`, captura 39).
- Versão do app → `-ios predicate string:name BEGINSWITH "Versão"` (de `name`) — dinâmico
  (muda por build); não comparar por igualdade.

## Equivalência entre plataformas

- Nenhum destes ids tem getter em `test/pages/*.page.ts` hoje — o menu não é exercitado por
  nenhum spec atual (`login`, `home`, `clientes`). Todos os itens acima são **não cobertos**.
- Sem captura Android equivalente disponível para comparação nesta sessão (fora do escopo).
  Presumível, por convenção do projeto (`testID` do RN = `resource-id` no Android = `name`
  no iOS), que os mesmos ids funcionem em ambas — **inferido, não verificado**.

## Timing e gestos

- Sem medição — captura única, sem interação além de abrir a tela pela tab bar.

## Armadilhas

- Nenhuma anomalia observada nesta tela: todos os elementos relevantes têm `name` próprio,
  `enabled="true"`, `visible="true"`, sem sheets nem overlays.
- Reservar para a Fase 8: nenhum destes botões foi tocado nesta sessão (sair da conta,
  configurações, etc.) — não há evidência do que cada um abre, só da existência e do
  seletor de cada item.
