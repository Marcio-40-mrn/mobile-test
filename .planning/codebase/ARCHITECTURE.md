# Arquitetura

## Padrão

**Page Object Model sobre um único `wdio.conf.ts` multi-ambiente.** Três camadas:

```
test/specs/*.spec.ts          ← só chama métodos de página; expect() no fim
        │
test/pages/*.page.ts          ← locators (getters) + interações (async); estende BasePage
        │
test/pages/base.page.ts       ← tudo que diverge entre Android/iOS além do seletor
        │
test/utils/platform.ts        ← IS_IOS, APP_ID, byPlatform()  (lido em import-time)
```

`wdio.conf.ts` importa `APP_ID` do mesmo `platform.ts` — por isso a plataforma **tem** que
ser decidida por env antes de existir sessão (`driver.isIOS` não serve).

## Seleção de ambiente

```
PLATFORM=ios ─────────────┐
DEVICEFARM_DEVICE_UDID ───┼─→ isDeviceFarm = Boolean(DEVICEFARM_DEVICE_UDID)
REMOTE_HOST ──────────────┘   isIOS        = PLATFORM === 'ios'
                              isRemote     = isIOS && Boolean(REMOTE_HOST)
                                      │
      ┌───────────────────────────────┼─────────────────────────────┐
      ▼                               ▼                             ▼
buildCapabilities()        buildConnectionSettings()         buildServices()
 DF+iOS  → XCUITest +       isRemote → https REMOTE_HOST:      DF ou Remote → []
           usePrebuiltWDA +            REMOTE_PORT REMOTE_PATH  senão → appium
           derivedDataPath  isDF     → localhost:4723 '/'                 service
 DF      → UiAutomator2     senão    → {} (appium service)     (relaxedSecurity)
 iOS     → XCUITest + newCommandTimeout 1200  (Remote Access)
 senão   → UiAutomator2 + deviceName S25Ultra_API35 + app APK_PATH
```

Fonte: `wdio.conf.ts:19-21` (flags), `:76-95`, `:100-113`, `:116-119`.

Regras que não podem ser quebradas nos blocos:
- iOS no Device Farm **precisa** de `usePrebuiltWDA` + `derivedDataPath`
  (`DEVICEFARM_APPIUM_WDA_DERIVED_DATA_PATH`, exportado pelo `pre_test` do testspec a partir
  de `DEVICEFARM_APPIUM_WDA_DERIVED_DATA_PATH_V<major do driver>`; os nomes
  `DEVICEFARM_WDA_DERIVED_DATA_PATH*` são do host legado, fallback); sem isso o
  xcodebuild falha com "code 70".
- Remote Access **rejeita** `usePrebuiltWDA` (capability reservada) — o bloco iOS genérico
  não pode setá-la.
- No Device Farm, `deviceName/app/udid/platformVersion` vêm do `--default-capabilities` do
  testspec; o conf não os declara.

## Ciclo de vida de uma execução

| Hook | O que faz | Condições |
|---|---|---|
| `onPrepare` | limpa `allure-results`; baixa o build do EAS (`downloadLatestBuild`) e `adb install -r` | só Android local; `SKIP_DOWNLOAD=true` pula download/install |
| `beforeTest` | inicia gravação: `mobile: startMediaProjectionRecording` (DF Android, 720p, 600 s) ou `startRecordingScreen` (180 s) | nunca em Remote Access; erro só gera `warn` |
| `afterTest` | para a gravação e anexa `.mp4` ao Allure (sempre); em falha, screenshot `.png` anexado | nome do arquivo = `testFileBaseName()` (nome + timestamp) |
| `onComplete` | `allure generate` (30 s de timeout) e `allure open` local | pulado em CI puro (`CI=true` sem DF) |

Diretórios: no DF tudo vai para `$DEVICEFARM_LOG_DIR` (vira Customer Artifacts); local em
`reports/`, `test/screenshots/`, `test/videos/` (`wdio.conf.ts:25-37`).

## Suítes independentes (desde 2026-09-15)

`specs:` em `wdio.conf.ts` lista `login` → `home` → `clientes`, mas a ordem não importa:
cada spec é um `describe` com **um único `it`** cujos cenários antigos viraram
`allureReporter.step()`. `maxInstances: 1`, `bail: 0`, `mochaOpts.timeout: 600000` em todos
os ambientes (o `it` de clientes roda 4 abas × 7 filtros).

Ciclo de cada teste:

1. 1º step do `it` (`preparo: …`) → `loginPage.launchAndCheckUpdate()` (`relaunchApp()` →
   `dismissUpdatePopupIfPresent()` → espera o campo de e-mail); `home`/`clientes` seguem com
   `ensureLoggedIn()` + `navigateTo…()`. Na suíte `login` o login é o próprio `it`. Não é
   `beforeEach`: falha de hook pula o `it` e sai sem status/device/print no Allure (run #31).
2. `it` — os steps; `afterTest` do `wdio.conf.ts` (vídeo + screenshot em falha) roda
   **dentro** do `it` (`@wdio/mocha-framework` embrulha a função de teste).
3. `afterEach` → `resetAppState()` (`adb shell pm clear` via `mobile: clearApp`): device
   limpo mesmo em falha, depois da evidência.

## Estado de autenticação

- `relaunchApp()` (`base.page.ts`): `terminateApp` → `resetAppState()` → `activateApp` →
  pausa de splash → ATT. Chamado por `launchAndCheckUpdate()` no início de toda suíte.
- `resetAppState()` chama `mobile: clearApp` com `{ appId }` (Android — equivale a
  `adb shell pm clear`) ou `{ bundleId }` (iOS); em Remote Access o comando é recusado e vira
  `warn` — o app reabre logado e `launchAndCheckUpdate()` falha na espera do e-mail (Fase 7).
- `ensureLoggedIn()` (`login.page.ts`): detecta em qual tela está (home / PIN / login /
  outra) e faz só o necessário. Após `launchAndCheckUpdate()` cai sempre no ramo `doLogin()`.
- `doLogin()` (`login.page.ts`): splash → ATT → OTA → form (se na tela de login) → PIN →
  ATT → notificações → onboarding → OTA tardio (repete form+PIN) → espera saudação. Todo
  passo "IfPresent" retorna após espera curta quando o popup não aparece.
- `handleNotificationPopup()` (Android): o 1º clique em CANCELAR é ignorado no build
  1.5.0/133 (medido em 2026-09-15); clica, espera o popup sumir (`reverse`) e repete até 3×,
  lançando erro claro se persistir.

## `BasePage` — o que diverge além do seletor

| Divergência | Método | Mecanismo iOS |
|---|---|---|
| `setValue` não dispara a busca | `submitSearch()` | clica a tecla `Search/Buscar/Pesquisar` do teclado (Android: `pressKeyCode(66)`) |
| `mobile: type` inexistente, `keys()` rejeitado pelo WDA | `LoginPage.handlePin()` | clica `~0`..`~9` |
| ATT (só iOS) | `dismissTrackingPromptIfPresent()` | `mobile: alert` accept `Ask App Not to Track` |
| Alerta de notificações duplicado na árvore (iOS) / 1º CANCELAR ignorado (Android) | `handleNotificationPopup()` | `mobile: alert` accept `Cancelar` (Android: clique + `reverse` wait, até 3×) |
| `scrollGesture` é UiAutomator2-only; swipe iOS invertido | `scrollDown/Up/IntoView` | `mobile: swipe` N vezes |
| `clearValue()` deixa resíduo | `clearField()` | repete até `getText()` vazio |
| `click()` não acerta alvo 20×21 pt | `tapCenter()` | `mobile: tap` no centro |
| "Pós Vendas" nasce com x negativo | `dragHorizontally()` | `mobile: dragFromToForDuration` |
| Onboarding sheet: no Android tem `btn-onboarding-welcome-close` na árvore; no iOS não tem filhos | `dismissOnboardingSheetIfPresent()` | `mobile: tap` por fração da tela (**exceção temporária**; Android clica o botão) |
| `clearApp` recusado | `resetAppState()` | try/catch + `warn` |

## Pipeline (CI)

```
pull_request / workflow_dispatch
  └─ device-farm (matrix fixa: android, ios — os dois sempre)
           eas build:list → curl app.{apk,ipa}
           npm install --prefer-offline + import('webdriverio')  (pré-verifica o lock)
           zip test-package (sem node_modules etc.)
           aws devicefarm create-upload ×3 (app, pacote, testspec) → schedule-run
             (credenciais como environmentVariables → testspec grava .env)
           polling get-run (até 120 min) → list-artifacts "Customer Artifacts" → allure-results
             (0 *-result.json → imprime o fim do "Test spec output" no log)
           upload-artifact allure-results-<plat>-<run>
      └─ publish-report (always, timeout 30 min, concurrency reports-publish)
           valida *-result.json → semeia history/ da branch reports → ffmpeg H.264
           allure generate (html + single-file) → commit órfão em reports (KEEP=3)
             (nenhuma plataforma com resultado → ::error:: + exit 1, job vermelho)
           poda artifacts do Actions → imprime URLs do Pages
```

Dentro do host do Device Farm (`testspec*.yml`): `install` (node, appium, driver,
`npm install`) → `pre_test` (sobe Appium em background com `--default-capabilities` e
espera `/status`) → `test` (`printf` do `.env`, `npm run wdio`) → artifacts
`$DEVICEFARM_LOG_DIR`.

## Pontos de entrada

- `npm test` / `npm run wdio` → `wdio run wdio.conf.ts` (Android)
- `npm run wdio:ios` → `cross-env PLATFORM=ios wdio run wdio.conf.ts` (Remote Access se
  `REMOTE_HOST` estiver no `.env`)
- `npm run download` → `ts-node scripts/download-build.ts [--platform android|ios]`
- `npm run package:devicefarm` → zip manual para upload no console
- `npm run allure:report` → regenera e abre o último relatório local

## Tratamento de erro

- Falha de gravação/anexo de vídeo nunca derruba o teste (`try/catch` + `warn`).
- `clearApp` indisponível → `warn`, o spec segue (e falha adiante se exigir tela de login).
- `requireEnv()` lança no import de `login.page.ts` se faltar credencial — a suíte nem sobe.
- `app.config.js` lança sem `EXPO_PROJECT_ID`.
- No CI, o resultado do Device Farm não falha o job; só o timeout/erro de infraestrutura falha.
