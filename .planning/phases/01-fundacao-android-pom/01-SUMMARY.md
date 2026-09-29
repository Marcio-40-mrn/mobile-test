---
phase: 1
name: Fundação Android + Page Object Model
status: complete
retroativo: true
period: 2026-06-02 → 2026-06-18
prs: ["#2"]
key-files:
  - test/pages/base.page.ts
  - test/pages/login.page.ts
  - test/pages/home.page.ts
  - test/pages/clientes.page.ts
  - test/specs/00-update-check.spec.ts
  - test/specs/login.spec.ts
  - test/specs/home.spec.ts
  - test/specs/clientes.spec.ts
  - wdio.conf.ts
requirements: [PLAT-03, PLAT-04, AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, UPD-01, HOME-01..07, CLI-01..07]
---

# Fase 1 — Fundação Android + Page Object Model

> Resumo **retroativo**, reconstruído do `git log`, de `docs/superpowers/*` e do código
> atual. Não houve `PLAN.md` na época.

## Resumo

Do `initial commit` (`2de8258`, 2026-06-02) até o merge do PR #2 (`5802f77`, 2026-06-18)
nasceu a suíte Android: setup WDIO + Appium (`f167bc8`), seletores e PIN corrigidos com
instalação automática do APK no `onPrepare` (`43084db`), e a refatoração para Page Object
Model desenhada em `docs/superpowers/specs/2026-06-17-login-page-object-design.md` e
executada pelo plano `docs/superpowers/plans/2026-06-17-login-page-object.md`.

## O que entregou

- `BasePage` (`6e0192c`): `isDisplayed`, `dismissUpdatePopupIfPresent`,
  `handleNotificationPopup`.
- `LoginPage` (`ba26110`, `184d0c4`, `98120f3`): locators por `@hint`/`@resource-id`,
  `fillAndSubmit`, `handlePin` via `mobile: type`, `doLogin`, `ensureLoggedIn`; substituiu
  `test/helpers/auth.helper.ts` (`7c1ca03`, `ac35aae`).
- `HomePage` (`c006052`) e `ClientesPage` (`8a0bb29`) com os specs `home` (8 casos) e
  `clientes` (10 casos, `FILTROS_ORDENACAO` com as 7 opções).
- `00-update-check.spec.ts` numerado para rodar primeiro.
- Credenciais movidas de `wdio.conf.ts` para `.env` (`c383486`); `.env.example` removido
  em `4f349dc`.
- Dumps `docs/testids/*.xml` (login, pin, home, clientes, campanhas, menu) como fonte dos
  locators — removidos depois em `7d74ef6`.

## Decisões

- POM com singleton por página e `$()` proibido em spec — motivo: `login.spec.ts` duplicava
  seletores do `auth.helper.ts` com strings diferentes para o mesmo elemento (design spec,
  seção "Contexto").
- Specs de Campanhas e Menu **removidos** (`e670f4e`) e colocados no `.gitignore` — não
  estavam estáveis; ficaram como escopo futuro (hoje Fase 8).
- `pinScreen` por XPath de `content-desc` em vez de id (`184d0c4`).

## Evidência

`git log 2de8258..5802f77`; `git show 5802f77 --stat`.

## Pendências deixadas

- Campanhas/Menu sem cobertura (→ Fase 8).
- `.env.example` removido mas ainda citado no README e no `requireEnv()` (→ Fase 9).
- Sem CI ainda (→ Fase 2).
