# Marcos

## v1.1 — Build selecionável + suíte iOS (2026-08-26)

**Fases concluídas:** 3–4
**Entregas principais:**
- Seleção de build EAS por profile e intervalo de datas, com o mesmo contrato local e no CI
  (`scripts/download-build.ts`, step "Baixa o build do EAS")
- `test/utils/platform.ts` (`IS_IOS`, `APP_ID`, `byPlatform`) e `wdio.conf.ts` com os 4
  ambientes (Android local / Android DF / iOS DF / iOS Remote Access)
- Locators iOS de 42 dumps XCUITest em iPhone iOS 18.3 (`Locators-iOS-Arys.docx`)
- Divergências de interação encapsuladas em `BasePage`: `submitSearch`, `handlePin` por
  cliques, `mobile: alert` para ATT e notificações, `tapCenter`, `scroll*` por swipe,
  `dragHorizontally`, `dismissOnboardingSheetIfPresent`, `resetAppState` tolerante
- `testspec-ios.yml` (Node 18 via nvm em cada fase, driver XCUITest) e job iOS gated
**Números:** 24 unit tests vitest; 16/21 casos verdes no iOS (5 bloqueados pelo app)
**Referências:** PR #11 (`b5d85de`), PR #12 (`2e81681`)

## v1.0 — Suíte Android no Device Farm (2026-08-11)

**Fases concluídas:** 1–2
**Entregas principais:**
- Page Object Model: `BasePage`, `LoginPage`, `HomePage`, `ClientesPage`; specs sem `$()`
- 4 specs / 21 casos: OTA check, login (2), home (8), clientes (10)
- `mobile_test.yml`: upload app + pacote + testspec, `schedule-run` com credenciais como
  `environmentVariables`, polling, coleta dos `allure-results`
- Allure com vídeo por teste (MediaProjection 720p) e screenshot em falha
- Publicação na branch `reports` (GitHub Pages) com índice gerado, retenção `KEEP=3`
  (commit órfão + `--force-with-lease`) e poda dos artifacts do Actions
- Guardas contra travamento: `timeout-minutes`, ffmpeg `-nostdin` + `timeout` por arquivo
**Números:** `wdio.conf.ts` 307 linhas; `mobile_test.yml` 726 linhas
**Referências:** PR #2 (POM), #4, #5, #6, #8 (Allure/Device Farm), #9 (scroll em devices
pequenos), #10 (retenção); doc portátil `docs/ci/retencao-de-relatorios-allure.md`
