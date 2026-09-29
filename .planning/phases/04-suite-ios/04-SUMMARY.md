---
phase: 4
name: Suíte iOS
status: complete-with-known-blocker
retroativo: true
period: 2026-08-26
prs: ["#12"]
key-files:
  - test/utils/platform.ts
  - test/pages/base.page.ts
  - test/pages/login.page.ts
  - test/pages/home.page.ts
  - test/pages/clientes.page.ts
  - wdio.conf.ts
  - testspec-ios.yml
  - Locators-iOS-Arys.docx (fora do git)
requirements: [PLAT-01, PLAT-02, CI-02]
---

# Fase 4 — Suíte iOS

> Resumo **retroativo**, reconstruído do PR #12 (`2e81681`, merge `0009c40`), do
> `Locators-iOS-Arys.docx` e das notas de sessão de 2026-08-26.

## Resumo

Os mesmos quatro specs passaram a rodar no iOS sem nenhum arquivo por plataforma. O
trabalho teve três partes: (1) `wdio.conf.ts` decidindo os 4 ambientes por flags puras;
(2) captura dos locators iOS em device real (42 dumps XCUITest, iPhone iOS 18.3, duas
sessões Remote Access no Device Farm); (3) encapsulamento em `BasePage` de tudo que se
comporta diferente no XCUITest. Resultado: 16/21 casos verdes no iOS; os 5 restantes
esbarram num bug de acessibilidade do app.

## O que entregou

- `test/utils/platform.ts`: `IS_IOS`, `APP_ID`, `byPlatform()` — lidos em import-time.
- `wdio.conf.ts`: `isIOS`/`isRemote`, `iosCapability`, `buildCapabilities()` com o bloco
  iOS Device Farm (`usePrebuiltWDA` + `derivedDataPath`) e o bloco Remote Access (sem
  `usePrebuiltWDA`, `newCommandTimeout: 1200`); `buildConnectionSettings()` com
  `REMOTE_*`; sem gravação e sem download no iOS.
- `BasePage` (27 → 244 linhas): `submitSearch`, `clearField`, `tapCenter`, `scroll*` por
  swipe, `dragHorizontally`, `dismissTrackingPromptIfPresent`, `handleNotificationPopup`
  via `mobile: alert`, `dismissOnboardingSheetIfPresent`, `resetAppState`, `relaunchApp`.
- `LoginPage.handlePin` clicando `~0`..`~9`; locators iOS em todas as páginas
  (`~screen-sign-in`, `~tab-home-1`, `~btn-customer-tag-*`, `~filterable-top-tab-bar-*`,
  predicates `BEGINSWITH`/`CONTAINS` onde o `name` carrega valor).
- `testspec-ios.yml`: Node 18 via nvm (repetido por fase), driver XCUITest,
  `export PLATFORM=ios`; job iOS em `mobile_test.yml` gated por `run_ios`.
- `package.json`: `wdio:ios` com `cross-env`; `tsconfig` ajustado.
- README/CLAUDE.md: seções de iOS, Remote Access e a tabela de divergências.

## Decisões

- **Locator iOS só de dump real** — presumir pelo Android já custou ciclos. O mapa
  Android→iOS por tela e a lista de pendências vivem no `.docx`.
- `mobile: alert` para ATT e notificações: o alerta aparece **duplicado** na árvore e o
  clique por seletor acerta a cópia invisível.
- Onboarding sheet fechado por **coordenada relativa** — exceção explícita e temporária,
  porque o conteúdo do sheet não existe na árvore.
- Job iOS **gated e vermelho de propósito**: a falha é o sinal de que a dívida existe; não
  se mascara com coordenadas (regra registrada em `CLAUDE.md`).
- `resetAppState()` tolera a recusa de `clearApp` no Remote Access com `warn`, em vez de
  esconder a limitação.

## Bloqueador registrado

Bottom sheets (`Ordenar por`, onboarding) e o card de empty state de aba vazia não expõem
filhos à árvore XCUITest por nenhuma estratégia (`snapshotMaxDepth: 120` testado). Afeta os
5 casos "deve testar todos os filtros de ordenação" de `clientes.spec.ts`. Correção no app:
`accessible={false}` no container do `@gorhom/bottom-sheet` + `testID` por opção.
Detalhe em `codebase/CONCERNS.md` §1.

## Evidência

`git show 0009c40 --stat`; cabeçalho de `testspec-ios.yml`; `Locators-iOS-Arys.docx`
("Origem: sessões interativas AWS Device Farm · 26/08/2026 · 42 dumps").

## Pendências deixadas (→ Fase 7, port iOS)

- Popup OTA iOS nunca apareceu — locator `name == "REINICIAR"` não validado.
- Confirmar `clearApp` via testspec (só o Remote Access recusou).
- Remover o gate quando o app corrigir o sheet; tirar a coordenada do onboarding.
- Versionar ou converter o `.docx` (→ Fases 6 e 9).
