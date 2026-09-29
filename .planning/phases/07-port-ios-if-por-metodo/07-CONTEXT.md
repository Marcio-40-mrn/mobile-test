---
phase: 7
name: Port da jornada para iOS com if (IS_IOS) por método
status: not-started
decided: 2026-09-15
requirements: [IOS-01, IOS-02, IOS-03, IOS-04, IOS-05, UPD-02, CLI-06]
depends-on: [5, 6, "correção de acessibilidade no app (bottom sheet)"]
---

# Fase 7 — Contexto

## Intenção do usuário

"Replicar o teste que existe hoje para o Android para também rodar no iOS, colocando um
`if` em cada método/step no page object com os elementos já capturados para iOS e
executando de acordo com o sistema operacional — a mesma suíte roda em iOS e Android."

~~Confirmado: `if (IS_IOS)` em todo método do page object~~ — **revertido em 2026-09-16**
pelo usuário: "exatamente como está o Android hoje". Vale a convenção atual (`byPlatform()`
nos locators + `if (IS_IOS)` só onde a interação diverge), specs intactos, sem fundir
suítes, sem skip nos steps bloqueados pelo app (ficam vermelhos como hoje). Respostas às
perguntas em aberto: (1) `byPlatform` fica; (2) sem marcação — vermelho como no Android;
(3) página a página contra Remote Access, depois AVD e Device Farm; (4) helpers de
`BasePage` mantidos e ampliados (`typeInto`, `tapUntil`, `signOutIfLoggedInIOS`).

## O que mudaria na convenção (proposta de 2026-09-15 — descartada)

| Antes (Fases 1–6) | Depois (Fase 7+) |
|---|---|
| `get x() { return $(byPlatform({ android, ios })); }` | O locator vive dentro do ramo do método |
| `if (IS_IOS)` só em `BasePage` (`submitSearch`, `scroll`, `tapCenter`, …) e em 3 pontos das páginas | Todo método/step de página tem `if (IS_IOS) { … } else { … }` |
| `CLAUDE.md`: "every locator that differs goes through `byPlatform`" | `CLAUDE.md` e `CONVENTIONS.md` reescritos **no mesmo PR** (IOS-05) |

O que **não** muda: `IS_IOS`/`APP_ID` em `test/utils/platform.ts` (lidos em import-time
porque `wdio.conf.ts` usa `APP_ID`); regra de selectors (XPath só Android; `~`/predicate no
iOS); `pause` só comentado; spec sem `$()` e sem saber a plataforma; um único spec para os
dois SOs.

Exemplo-alvo em `codebase/CONVENTIONS.md`, seção "Convenção alvo".

## Fonte dos elementos iOS

Os drafts da Fase 6 (`.planning/drafts/ios/NN-<tela>.md`), não o `.docx`. Cada seletor iOS
usado no ramo `if (IS_IOS)` cita o draft/atributo de origem em comentário quando não for
óbvio; "inferido, não verificado" nunca entra no código sem marcação.

## Dependências externas herdadas (antigo "Desbloqueio iOS")

| Item | Estado | O que fazer nesta fase |
|---|---|---|
| Bottom sheet "Ordenar por" e empty state sem filhos na árvore XCUITest | Bug do app; correção `accessible={false}` + `testID` por opção | Steps ficam **marcados** (skip/known-failure explícito no relatório), nunca coordenada (regra 6). Quando o app corrigir: destravar e remover o gate (IOS-04) |
| `mobile: clearApp` recusado | Confirmado só no Remote Access | Validar via testspec (dispatch `run_ios=true`, ler `appium.log` nos Customer Artifacts). Se recusar também: documentar e adaptar o step de reset (IOS-03) |
| Popup OTA iOS | Nunca apareceu | Validar se aparecer na Fase 6; senão manter "não validado" com a razão (UPD-02) |
| `dismissOnboardingSheetIfPresent()` por coordenada | Exceção temporária | Sai junto com a correção do sheet |
| Gate `run_ios` em `mobile_test.yml` | Ativo | Remover quando IOS-02 for 100 % (IOS-04) |

## Onde rodar

- Remote Access (`npm run wdio:ios`) para iterar rápido (sem `clearApp`, sem vídeo, 20 min).
- Device Farm iOS (`workflow_dispatch` + `run_ios=true`) para a prova final — usa
  `usePrebuiltWDA` + `derivedDataPath` (`wdio.conf.ts:77-87`).

## Perguntas em aberto para o plan-phase

1. `byPlatform()` some de vez ou fica como helper interno para os casos em que só o
   locator muda e a interação é idêntica?
2. Como marcar os steps bloqueados pelo app: `this.skip()` condicional por `IS_IOS`,
   `allure` "known issue", ou deixar vermelho de propósito como hoje?
3. Ordem de port: página a página (login → home → clientes) com run iOS a cada página, ou
   tudo de uma vez?
4. `BasePage`: os helpers atuais (`tapCenter`, `scroll*`, `submitSearch`) já são "if por
   método" — mantêm-se como estão ou são inlinados nos métodos das páginas?
