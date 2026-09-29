---
phase: 5
step: 1
name: Suítes independentes (update-check em cada describe + um `it` por suíte)
status: implemented — awaiting AVD run
date: 2026-09-15
requirements: [UPD-01, JRN-02, JRN-03, JRN-04]
---

# Passo 1 — Suítes independentes

## Problema

Os 4 specs só passavam rodando todos, em ordem. `00-update-check.spec.ts` existia só para ser o
primeiro; em `home` e `clientes` cada `it` assumia tela, scroll e ordenação deixados pelo
anterior. Rodar `--spec` de um arquivo sozinho não era confiável.

## Evidência

- `reports/allure-results` local (run anterior do usuário): `"before all" hook for Home` →
  **broken aos 97 s** — `ensureLoggedIn()` partindo de estado desconhecido do AVD.
- `mochaOpts.timeout` local era 120 s por `it`/hook; `clientes` consolidado executa
  4 abas × 7 filtros = 28 `applySortFilter` (cada um com ~2 s de pausas + waits de até 5 s).

## Solução

| Arquivo | Mudança |
|---|---|
| `test/pages/login.page.ts` | novo `launchAndCheckUpdate()`: `relaunchApp()` → `dismissUpdatePopupIfPresent()` → `emailField.waitForDisplayed(15 s)` |
| `test/specs/*.spec.ts` | `before` começa por `launchAndCheckUpdate()` (home/clientes mantêm `ensureLoggedIn()` + navegação); N `it` → 1 `it`, cada antigo `it` vira `allureReporter.step('<título antigo>', …)` com o corpo intacto |
| `test/specs/00-update-check.spec.ts` | removido |
| `wdio.conf.ts` | linha removida de `specs:`; `mochaOpts.timeout: 600000` em todos os ambientes |

Decisões com o usuário: update-check no `before` (não dentro do `it`); steps Allure sim.

## O que não mudou

`home.page.ts`, `clientes.page.ts`, `base.page.ts`, selectors, ramo iOS, `ensureLoggedIn` /
`doLogin`, CI, `package.json`. 25 linhas de `expect(` (3 + 16 + 6), iguais ao HEAD.

## Efeitos aceitos

- Setup de ~60–80 s por suíte (`doLogin()` ainda espera 20 s pelo OTA já tratado — otimizar
  é outro passo).
- Remote Access iOS: `clearApp` recusado → app reabre logado → `launchAndCheckUpdate()` falha
  em todas as suítes. Registrado em `STATE.md` para a Fase 7.

## Ajuste 2 — hooks por teste + limpeza ao final (mesmo dia)

- `before` → `beforeEach` nos 3 specs: init + OTA (+ login em home/clientes) garantidos **a
  cada `it`**, não só por `describe`. Na suíte Login o login é o próprio teste (decisão com o
  usuário).
- `afterEach(() => loginPage.resetAppState())` nos 3 specs. `mobile: clearApp` é literalmente
  `adb shell pm clear com.aramis.arys` (`appium-android-driver/.../app-management.js:290`);
  via Appium funciona no Device Farm (udid já resolvido) e no iOS.
- Ordem verificada em `@wdio/mocha-framework/build/index.js:120-137`: o `afterTest` do
  `wdio.conf.ts` (vídeo + screenshot) é embrulhado dentro do `it`, então roda **antes** do
  `afterEach` — a limpeza não apaga a evidência da falha.
- Zero linhas em page objects, `wdio.conf.ts` ou CI.

## Run 1 e 2 — broken no `beforeEach` (resolvido)

`homeGreeting` não aparecia em 30 s após `doLogin()`. Medido no AVD (build 1.5.0/133): o
popup "Permita notificações" precisa de **dois** cliques em CANCELAR (o 1º é ignorado; via
Appium: clique #1 → visível após 4 s; clique #2 → some em 1 s), e a home abre com o bottom
sheet de onboarding **também no Android** (com `btn-onboarding-welcome-close` na árvore).
Correção em `BasePage`: `handleNotificationPopup()` clica e valida o sumiço (até 3×);
`dismissOnboardingSheetIfPresent()` ganhou ramo Android. iOS intacto.

## O que conferir no run

1. `--spec test/specs/clientes.spec.ts` sozinho, com o app em qualquer estado → verde;
   spec reporter mostra **1 teste**; Allure mostra 10 steps nomeados.
2. Idem `home` (8 steps) e `login` (2 steps).
3. `npm test`: 3 testes, 3 vídeos, nenhum `before all hook` quebrado.
4. Duração do `it` de clientes (deve ficar bem abaixo de 600 s).
5. Em falha: o step vermelho no Allure aponta a etapa; screenshot em `test/screenshots/`
   mostra a tela do erro (não o app fechado).
6. Ao terminar qualquer spec, abrir o app manualmente no AVD cai na tela de login (dados
   limpos pelo `afterEach`).
