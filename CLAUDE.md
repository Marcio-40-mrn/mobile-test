# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Regras Aramis (antes de qualquer mudança)

**Sempre** consulte o coding standards do Aramis via MCP do Backstage antes de editar
arquivos neste repositório:

- Ferramenta: `backstage_get_coding_standards` (servidor MCP `backstage`)
- Configuração: crie `.mcp.json` na raiz apontando para o servidor `backstage` com seu PAT
  pessoal (`bkpat_*`). `.mcp.json` está no `.gitignore` — **nunca commite o PAT.**

O coding standards é a fonte de verdade para convenções de código, estrutura de pastas,
nomenclatura e padrões de qualidade do ecossistema Aramis.

### Convenções de repositório

- Commits: [Conventional Commits](https://www.conventionalcommits.org/) com escopo quando
  o domínio for claro
- Branches: `feat/`, `fix/`, `chore/`, `refactor/`, `docs/` a partir de `main`
- PRs obrigatórios para `main`. Nunca commite direto.
- CI (`mobile_test.yml`): os testes rodam nos **dois pools de dispositivos do AWS Device
  Farm** — pool Android (`DEVICE_FARM_DEVICE_POOL_ARN`) e pool iOS
  (`DEVICE_FARM_IOS_DEVICE_POOL_ARN`) — em todo PR e dispatch, via matrix literal
  `platform: [android, ios]`. **Nunca** input, job de gate, `if` ou matrix condicional que
  deixe um pool de fora — pré-requisito faltando se avisa, não se desliga o pool.
- `appium` **nunca** entra no `package.json` (regra 12 do `REQUIREMENTS.md`): o Appium do
  Device Farm passaria a usar o pacote de teste como `APPIUM_HOME` e perderia os drivers do
  host. Android e iOS usam o Appium/driver do **seu** host, sem depender um do outro.
- Código: Clean Code + princípios de [refactoring.guru](https://refactoring.guru/) — sem
  over-engineering.

### Catalog

Componente registrado em
[Backstage](https://backstage.aramis.com.br/catalog/default/component/arys-mobile-e2e-test-automations).

## Commands

```bash
# Run all E2E tests (starts Appium automatically, downloads latest APK from EAS first)
npm test

# Run the same suite on iOS (against a Device Farm Remote Access session)
npm run wdio:ios

# Run a single spec file
npx wdio run wdio.conf.ts --spec test/specs/login.spec.ts

# Run unit tests (vitest, no device required) — scoped to scripts/ and test/utils, since a
# bare `npx vitest run` also tries to collect the WDIO specs under test/specs and fails
npx vitest run scripts test/utils

# Resolve/download a build from EAS without running the suite
npx ts-node scripts/download-build.ts --platform android
```

## Architecture

This is a **WebdriverIO + Appium** test automation suite for the **Arys** app (React Native / Expo). The **same specs run on Android and iOS** — there is no per-platform spec file. Android runs locally against `S25Ultra_API35` (UiAutomator2) and on AWS Device Farm; iOS runs on Device Farm and against a Device Farm Remote Access session (XCUITest).

### Platform selection

The platform comes from the `PLATFORM` env var — never from duplicated config files. `PLATFORM=ios` is set by `npm run wdio:ios` (via `cross-env`) and by `testspec-ios.yml`; absent, the suite runs Android.

`wdio.conf.ts` derives three flags from it and feeds pure builder functions (`buildCapabilities()`, `buildConnectionSettings()`, `buildServices()`) — do **not** scatter `if/else` through the config:

```ts
const isDeviceFarm = Boolean(process.env.DEVICEFARM_DEVICE_UDID);
const isIOS = process.env.PLATFORM === 'ios';
const isRemote = isIOS && Boolean(process.env.REMOTE_HOST); // sessão interativa
```

`buildCapabilities()` evaluates four blocks, most specific first: iOS Device Farm → Android Device Farm → iOS Remote Access → Android local. iOS on Device Farm **requires** `usePrebuiltWDA` + `derivedDataPath` (without them xcodebuild fails with "code 70"); the Remote Access endpoint **rejects** `usePrebuiltWDA` as a reserved capability, so that block must not set it.

Page objects read the same variable through `test/utils/platform.ts` (`IS_IOS`, `APP_ID`, `byPlatform`). Do not use `driver.isIOS`: the flags are read at import time, before a session exists, because `wdio.conf.ts` consumes them too.

### Test flow

1. **`onPrepare`** (in `wdio.conf.ts`) runs `scripts/download-build.ts` before any test, which uses the EAS CLI (`eas build:list`) to pick a build from Expo and download it to `C:\dev\apk_arys\arys-latest.apk`. Which build is picked comes from `BUILD_PROFILE_ANDROID` / `BUILD_PROFILE_IOS` and `BUILD_SELECTION` (see Environment; in CI they are GitHub **Secrets**, read as `secrets.BUILD_*` — never `vars.`); with none of them set Android falls back to the latest `INTERNAL` build and iOS to the latest `production` build (every iOS build on EAS is `store`, so the `internal` filter finds nothing). When the Android artifact is an `.aab` (the `production` profile), `scripts/convert-aab.ts` turns it into a universal APK with bundletool (downloaded once to `~/.cache/bundletool/`, or `BUNDLETOOL_JAR`) signed with the debug keystore, **before** anything reaches the AVD or Device Farm — a renamed `.aab` fails `apksigner` on both ("Missing AndroidManifest.xml", 2026-09-18). The CI's "Baixa o build do EAS" step runs the same script.
2. Appium is launched as a service by WDIO with `relaxedSecurity: true`.
3. Each spec (`login`, `home`, `clientes`) is **self-contained**: one `describe`, one `it`, and every former test case is an `allureReporter.step()` inside it. The **first step of the `it` is the preparation** (`preparo: …`): `loginPage.launchAndCheckUpdate()` (relaunch → OTA popup → login screen), then `ensureLoggedIn()` + navigation on `home`/`clientes`. It is a step, **not a `beforeEach`**, on purpose: a Mocha hook failure skips the `it`, `beforeTest`/`afterTest` never run and Allure gets a result with no status, no device label and no screenshot (run #31 on iOS: Home/Clientes purple, "Unknown"); as a step the same failure is red, per device, with a screenshot. Only `afterEach` remains a hook — `resetAppState()` (`adb shell pm clear`), which never throws. Any spec is green on its own with `--spec`; order in `specs:` no longer matters.
4. Video: Android on Device Farm records per test (`mobile: startMediaProjectionRecording`, attached in `afterTest`); **iOS on Device Farm does not record** (XCUITest needs `ffmpeg`, absent on `macos_tahoe`) — the CI's "Coleta artefatos" step downloads the Device Farm `VIDEO` artifact of each job and attaches it to every result of that iPhone. On test failure, `afterTest` auto-captures a screenshot to `test/screenshots/` (it runs inside the `it`, so before the `afterEach` cleanup). Hook failures (`beforeEach`) leave no screenshot — the Allure status is *broken* and the message names the wait that timed out.
5. `mochaOpts.timeout` is 1200 s in every environment (raised from 600 s on 2026-09-18): the `clientes` `it` alone runs 4 tabs × 7 sort filters and measured 529 s on the AVD with build 1.6.0 (138) — Device Farm devices are slower, so timeouts get ≥2× headroom over the AVD measurement, never a tight fit. Every XPath query costs 0.5–0.8 s on this build (90 KB tree), so prefer one union XPath (`@text="A" or @text="B"`) over two sequential waits. The Device Farm Android video `maxDurationSec` follows the same 1200 s.

### Key conventions

- **Selectors**: every locator that differs between platforms goes through `byPlatform({ android, ios })`. Locators identical on both (the customer tabs — `~Favoritos`, `~Aniversariantes`, `~Cashback Exp.`, `~Pós Vendas`) stay plain.
  - **Android**: XPath only — `@text`, `@content-desc`, `@resource-id`, `@hint`, as found in the UiAutomator2 dump.
  - **iOS**: accessibility id (`~`) first; `-ios predicate string:` when the element is only reachable by text. **Do not use XPath on iOS** — it is slow and brittle under XCUITest. The React Native `testID` becomes `resource-id` on Android and `name` on iOS, so most ids are the same value with a different prefix.
  - Never invent an iOS locator by analogy to an Android `resource-id`. Either it was captured from a real device dump, or it derives from the same visible text literal via predicate. The captured map lives in `Locators-iOS-Arys.docx`.
- **Auth state**: every spec starts with `loginPage.launchAndCheckUpdate()` (`relaunchApp()` → `dismissUpdatePopupIfPresent()` → e-mail field visible), then `doLogin()` / `ensureLoggedIn()` from `test/pages/login.page.ts`. The flow handles the splash pause, the ATT prompt (iOS only), the optional OTA popup, the login form, PIN entry, the notification popup, the onboarding sheet (both platforms) and a late OTA popup. Every "…IfPresent" step returns after a short wait when its popup doesn't show, so the flow passes with or without them.
  - The notification popup ("Permita notificações") **ignores the first CANCELAR click** on Android (build 1.5.0/133, measured 2026-09-15). `handleNotificationPopup()` clicks and waits for the popup to disappear, retrying up to 3 times, and throws a clear error if it persists — never assume a click closed a popup.
- **`noReset: true`**: The Appium capability keeps the app installed between sessions; state is reset per test via `resetAppState()` — at the start inside `relaunchApp()` and at the end in `afterEach` — which picks the right mechanism per environment — `bundleId` on iOS, `appId` on Android (= `adb shell pm clear`), and plain `terminateApp` on Remote Access, whose endpoint refuses `clearApp` entirely (there, the app reopens logged in and `launchAndCheckUpdate()` fails on the e-mail wait — known gap for Phase 7).
- **Unit tests** live in `scripts/__tests__/` and `test/utils/__tests__/` and use **Vitest** — they test pure logic (e.g., `parseLatestBuildUrl`, `pickEmail`) without a device.
- **Test account**: `resolveAccount()` in `test/utils/credentials.ts` is **lazy** (it reads `browser.capabilities.deviceModel` on Android), never import-time. One account today (`TEST_USER_EMAIL`); the per-device mode switches on when the CI secret CSV exists — see README "Conta por device". Never hardcode a device model or name anywhere: the pool is read from Device Farm on every run.
- **Allure per device**: `beforeTest` in `wdio.conf.ts` sets `historyId`/`testCaseId`/`parentSuite` from `deviceLabel()` (`test/utils/device-name.ts`) so the N devices of a pool don't collapse into one test with retries.

### Environment

Read from `.env` (local) or injected as environment variables by the CI / Device Farm run:

| Variable | Purpose | Consumed by |
|---|---|---|
| `EXPO_TOKEN` | EAS CLI authentication token — required to list/download builds | `scripts/download-build.ts`, `mobile_test.yml` |
| `EXPO_PROJECT_ID` | EAS project ID — exposed as `expo.extra.eas.projectId`; `app.config.js` throws if missing | `app.config.js` (read by `eas build:list`) |
| `TEST_USER_EMAIL` | Login email of the app test account (all devices, when no CSV) | `test/utils/credentials.ts` (`resolveAccount` — throws if no email source) |
| `TEST_USER_PASSWORD` | Password of the app test account — **valid only on the Android development build** | `test/utils/credentials.ts` (`requireEnv`) |
| `TEST_USER_PASSWORD_IOS` | Password of the same account on **iOS (every environment)** and on **Android production**; used when `PLATFORM=ios` or `BUILD_PROFILE_ANDROID=production`, falls back to `TEST_USER_PASSWORD` only locally. **Required secret for the iOS CI job**: it injects it into the host as `TEST_USER_PASSWORD` and fails with a named `::error` when missing (run #30: the silent fallback sent the Android password and all 5 iPhones failed login); the Android job passes both | `test/utils/credentials.ts` (`resolvePassword`, `isProductionTrack`), `mobile_test.yml` |
| `TEST_USER_PIN` | Access PIN of the app test account | `test/utils/credentials.ts` (`requireEnv`) |
| `TEST_USER_EMAILS` / `TEST_USER_DEVICE_MODELS` | Android DF only, optional — CSV of e-mails and of pool `modelId`s in the same order, built by the CI from `TEST_USER_ANDROID_EMAILS` | `test/utils/credentials.ts` (`pickEmail`) |
| `DEVICE_LABEL` | iOS DF only — device name injected by the CI into the generated testspec (`DEVICEFARM_DEVICE_NAME` is the UDID on iOS) | `test/utils/device-name.ts` |
| `APP_VERSION` / `APP_BUILD_VERSION` / `APP_BUILD_PROFILE` | CI only — `appVersion`, `appBuildVersion`, `buildProfile` of the EAS build selected by "Baixa o build do EAS", sent to the host (Android `environmentVariables`, iOS `export` line) so `onPrepare` writes `allure-results/environment.properties` (Allure "Environment" widget). Locally they come from `downloadLatestBuild()` or, with `SKIP_DOWNLOAD`, from `adb dumpsys` of the installed APK | `test/utils/build-info.ts`, `wdio.conf.ts` (`onPrepare`) |

How credentials reach the Device Farm host differs per platform (`mobile_test.yml`): **Android** gets them as `environmentVariables` of the run (one run for the whole pool); **iOS** gets them through a testspec generated per run — the CI replaces the `__CREDENCIAIS_DO_RUN__` line of `testspec-ios.yml` with an `export` and schedules **one run per iPhone** (`--device-selection-configuration`), because the iOS host does not receive `environmentVariables`. Lessons and rationale: `.planning/codebase/LICOES-CI-MOBILEWDIO.md`.

Optional flags: `SKIP_DOWNLOAD=true` skips the APK download/install; `CI=true` changes report/screenshot behavior in `wdio.conf.ts`; `ACTION_DELAY_MS` (default 4000, `0` disables) is the fixed pause `BasePage.beforeAction()` takes before every screen action — see Conditional Waits.

On AWS Device Farm the host injects `DEVICEFARM_*` variables automatically (`DEVICEFARM_DEVICE_UDID`, `DEVICEFARM_LOG_DIR`, …); `wdio.conf.ts` uses `DEVICEFARM_DEVICE_UDID` to detect that environment.

**EAS project config:** the project ID is **not** hardcoded — `app.config.js` reads it from `EXPO_PROJECT_ID` and exposes it as `expo.extra.eas.projectId`. `eas build:list` resolves the project from that config (owner `aramis-engenharia` + slug `arys`). There is no `app.json`.

The `.env` file is loaded via `dotenv/config` in both `wdio.conf.ts` and `scripts/download-build.ts`.

CI adds AWS Device Farm secrets — see the README's "GitHub Secrets" table (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `DEVICE_FARM_PROJECT_ARN`, `DEVICE_FARM_DEVICE_POOL_ARN`, `DEVICE_FARM_IOS_DEVICE_POOL_ARN`).

## Test Design Conventions

### Page Object Model

Every screen gets a class in `test/pages/` with locators as `get` properties and interactions as `async` methods. Specs import a page instance and call only its methods — `$()` and `$$()` are forbidden inside spec files.

```ts
// test/pages/login.page.ts
class LoginPage {
  get emailField() { return $('//android.widget.EditText[@hint="Digite seu e-email"]'); }
  get passwordField() { return $('//android.widget.EditText[@hint="Digite sua senha"]'); }
  get submitButton() { return $('//*[@resource-id="btn-sign-in-submit"]'); }

  async fillAndSubmit(email: string, password: string) {
    await (await this.emailField).setValue(email);
    await (await this.passwordField).setValue(password);
    await driver.hideKeyboard();
    await (await this.submitButton).click();
  }
}
export const loginPage = new LoginPage();
```

`test/utils/` holds platform utilities (`platform.ts`). `test/helpers/` is reserved for cross-page flows; it does not exist yet — `doLogin()` currently lives in `test/pages/login.page.ts`.

### Behaviour that differs beyond the selector

Equivalent locators are not enough — these interactions diverge, and each one is encapsulated in `BasePage` so the specs stay identical:

| Divergence | Method |
|---|---|
| `setValue` doesn't trigger the search on iOS — needs the keyboard's submit key | `submitSearch()` |
| `mobile: type` doesn't exist on XCUITest and `driver.keys()` is rejected by WDA | `LoginPage.handlePin()` clicks `~0`..`~9` |
| ATT prompt (iOS only) — system alert, outside the app hierarchy | `dismissTrackingPromptIfPresent()` |
| Notification alert appears **twice** in the iOS tree (one copy invisible); clicking by selector hits the wrong one | `handleNotificationPopup()` uses `mobile: alert` |
| `mobile: scrollGesture` is UiAutomator2-only, and the iOS swipe direction is inverted | `scrollDown/scrollUp/scrollIntoView` |
| `clearValue()` leaves residue on iOS | `clearField()` retries |
| `.click()` misses small targets on iOS (the 20×21 pt info button) | `tapCenter()` |
| The "Pós Vendas" tab starts off-screen on iOS | `dragHorizontally()` |
| Onboarding bottom sheet after the first login: on Android its close button is in the tree (`btn-onboarding-welcome-close`); on iOS the sheet exposes no children, so the close is a coordinate tap (temporary exception) | `dismissOnboardingSheetIfPresent()` |
| WDA types through the keyboard and the RN controlled TextInput drops characters while the keyboard slides in (measured 2026-09-16) | `typeInto()` — iOS: focus, wait keyboard, `maxTypingFrequency: 20` during `addValue`; Android: `setValue` |
| The first tap on some targets is lost on iOS (`btn-campaign-section-view-all`, `btn-customer-section-info`, `~Pós Vendas`); the second identical tap works | `tapUntil()` — tap, wait for the expected state, retry once (Android: single click + wait) |
| After the PIN the ATT alert, the notifications alert and the onboarding sheet arrive together on iOS | `handleNotificationPopup()` iOS handles the three in order; `handlePin()` iOS waits for `Bottom sheet handle`/`greeting-header` instead of a fixed pause |
| Remote Access refuses `clearApp`, so the app reopens logged in | `relaunchApp()` iOS → `signOutIfLoggedInIOS()` (`btn-menu-sign-out` / `btn-pin-back`) |
| `screen-sign-in` is `visible=false` while the keyboard is closed | `loginTitle` iOS = `~scroll-sign-in` |
| Customer tabs can be `visible=true` with a negative `x` ("Cashback Exp.") or absent until dragged ("Pós Vendas") | `navigateToTab()` iOS checks the position, drags, and confirms the selection by the tab's segment |

**Known app bug — the `clientes` suite fails on iOS by design.** Bottom sheets (the "Ordenar por" modal), the empty-tab state card and — since build 1.6.0 (2026-09-16) — the "Nenhum cliente encontrado!" search card render on screen but expose no children to the XCUITest accessibility tree, by any strategy. This breaks the sort-filter steps in `clientes.spec.ts` (the first one stops the single `it`). The fix belongs in the app (`accessible={false}` on the `@gorhom/bottom-sheet` container plus a `testID` per option), not here — do not paper over it with coordinates.

### DRY

If the same selector or interaction sequence appears in more than one file, it belongs in the page class or a shared helper. No exceptions.

### YAGNI

Add methods to a page only when a test requires them. Pages grow with tests, not ahead of them.

### Conditional Waits

Never use `browser.pause()` as a substitute for waiting on UI state. Always wait on observable element transitions:

- Element appearing: `waitForDisplayed({ timeout: N })`
- Element disappearing: `waitForDisplayed({ reverse: true, timeout: N })`

`browser.pause()` is only allowed for delays caused by animations or infrastructure that produce no observable element change. Require an inline comment explaining the constraint. **One deliberate exception (2026-09-18, user decision):** `BasePage.beforeAction()` pauses `ACTION_DELAY_MS` (4 s) before every click, type, scroll or gesture in the page objects — build 1.6.0 (138) drops inputs fired while it is still busy (PIN typed into nothing, sheet close tap lost, search not applied). It lives in the page objects, never in `wdio.conf.ts`, and every new action method must call it on the line before the input.

```ts
await browser.pause(500); // <reason: animation or infra constraint that produces no observable UI change>
```

## Planejamento (GSD)

O estado, as decisões e o trabalho pendente vivem em `.planning/` (estrutura get-shit-done):

- `.planning/STATE.md` — onde o projeto está, bloqueios e próximo passo (lido pelo hook de sessão)
- `.planning/ROADMAP.md` — fases; a marcada "em andamento" é a atual
- `.planning/REQUIREMENTS.md` — REQ-IDs por tela/área e as **regras invioláveis**
- `.planning/PROJECT.md` — o que é, valor central, decisões-chave
- `.planning/codebase/` — stack, arquitetura, estrutura, convenções, testes, integrações, dívidas
- `.planning/phases/NN-*/` — resumos por fase (1–4 retroativos)

Antes de uma mudança, leia `STATE.md` e cite o REQ atendido. Ao terminar, atualize `STATE.md`
(working tree + pendências) e marque o passo no `ROADMAP.md`.

Próximos passos (2026-09-16): Fase 6 (captura iOS via Remote Access → `.planning/drafts/ios/`,
sessão 1 feita) → 7 (os 3 specs do Android rodando no iOS — **mesma convenção de selectors
acima**: `byPlatform` nos getters, `if (IS_IOS)` só onde a interação diverge; código pronto,
validação no device/Device Farm pendente) → 5 passo 2 (jornada única) → 8 (novos cenários).
Detalhe em `.planning/ROADMAP.md`.
