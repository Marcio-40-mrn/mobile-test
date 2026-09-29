# Lições do MobileWDIO aplicadas ao CI do Arys

Fonte: documento "Execução dos testes no CI — iOS e Android, como está construído e por
quê" do projeto **MobileWDIO** (outro app da Aramis; fotografia de 2026-09-15, estado de
referência `CI Run #14` — Android 18/18, iOS 5/5 no Device Farm). Este arquivo registra, para
cada lição de lá, **o que foi feito aqui e onde** (aplicado em 2026-09-16), ou por que não se
aplica. Nada de credencial, ARN ou nome de aparelho — só nomes de variáveis e arquivos.

Regra deste repositório que a referência **não** tinha e vale acima de tudo: **nada amarrado
a aparelho** — nem mapa modelo→índice no código, nem lista de iPhones. O pool é lido a cada
run; mudar o pool só redistribui.

## 1. O que derruba todos os devices de uma vez

| # | Lição (referência) | Aqui |
|---|---|---|
| 1 | `appium` declarado no `package.json` faz o Appium do host autodetectar o pacote de teste como `APPIUM_HOME` e perder os drivers (run-22: 6/6 + 5/5 `Failed to create a session`) | **Aplicado em 2026-09-17 — o iOS quebrou exatamente assim** (run #29, `macos_tahoe`: `appium driver list --installed` vazio, "Could not find a driver for automationName 'XCUITest'" nos 5 iPhones). A "compensação" só valia para o Android, porque o `uiautomator2` está no `package.json` e era carregado do projeto; o XCUITest não estava em lugar nenhum. `appium` saiu das devDependencies (fica como peer transitiva do `uiautomator2`, igual ao "3.7.0 aninhado" da referência); o host volta ao próprio `APPIUM_HOME`; `testspec.yml` troca o v6 pré-instalado pelo 7.6.2 de sempre (`uninstall` + `install@7.6.2`, padrão da doc). **Regra inviolável 12.** |
| 2 | `usePrebuiltWDA` + `derivedDataPath` (`_V9` ?? sem sufixo) no iOS DF, senão `xcodebuild code 70` | Já existia: `wdio.conf.ts`, bloco iOS Device Farm |
| 3 | Node 18 via nvm em **cada fase** do testspec iOS (host vem com Node 14; fases não compartilham shell) | **Descartada em 2026-09-17.** Isso descrevia o host iOS *legado*, que o DF usa como fallback quando o testspec não tem `ios_test_host`. Nos hosts atuais (`macos_tahoe`/`macos_sequoia`) o `nvm` foi removido e Node/Appium vêm do `devicefarm-cli`; o Appium 3 já traz o driver XCUITest. Run #28: sem `ios_test_host`, cada iPhone caiu num host diferente (Ventura/Sonoma/novo), `nvm: command not found` no 17 Pro Max e nenhum driver instalado em nenhum. Fonte: docs AWS `ios-host-migration`, `custom-test-environments-hosts` |
| 4 | Ambiente customizado não sobe Appium: o testspec sobe em background e espera; `buildConnectionSettings()` no DF = `127.0.0.1:4723` (`{}` dá `Invalid URL`) | Já existia (espera por `curl /status`, equivalente ao "listener started") |
| 5 | `devicefarm-cli use appium 2` no Android (1.x não tem MediaProjection nem `releaseActions`) | Já existia, com `appium 3` |
| 6 | `npm install` com retry 3× (`ECONNRESET` faz o device sumir do relatório sem erro óbvio) | **Aplicado**: `testspec.yml` e `testspec-ios.yml`, fase `install` |
| 7 | Nunca empacotar `node_modules` (symlinks não sobrevivem ao unzip do DF) | Já existia |
| 8 | Pré-verificar deps no runner antes de ocupar devices | Já existia (incidente próprio de 2026-08-26) |

## 2. O host iOS não recebe `environmentVariables`

| # | Lição | Aqui |
|---|---|---|
| 9 | Medido no `CI iOS Run #6`: o script que a AWS gera para o host iOS só exporta `DEVICEFARM_*`. O **único** canal com valor por run é o testspec | **Aplicado**: `testspec-ios.yml` tem a linha `__CREDENCIAIS_DO_RUN__` na fase `test`; o step "Agenda os runs (iOS)" de `mobile_test.yml` a substitui por um bloco `- \|-` com `export TEST_USER_EMAIL=… TEST_USER_PASSWORD=… TEST_USER_PIN=… DEVICE_LABEL=…`. Sem `--configuration` no `schedule-run` iOS |
| 10 | Substituir com `head`/`tail` + `printf '%q'`, nunca `sed`/`awk` (reinterpretam os escapes) | **Aplicado**, com uma correção sobre a referência: a linha entra como **bloco literal YAML** (`- \|-`). Num escalar simples, um ` #` dentro da senha viraria comentário e truncaria a linha (medido na simulação local) |
| 11 | Guarda `[ -n "$VAR" ]` no testspec com erro apontando o step; `[diag]` só com comprimentos | **Aplicado** nos dois testspecs |
| 12 | `.env` nunca no ZIP; guarda `unzip -l \| grep ' [.]env$'` | **Aplicado**: step "Empacota os testes" |
| 13 | Limite de **256 chars** por variável do DF → CSV, nunca JSON em base64 | **Aplicado**: `TEST_USER_EMAILS` / `TEST_USER_DEVICE_MODELS` são CSV e o step Android confere o tamanho |
| 14 | Variável vazia em `environmentVariables` dá `ParamValidation` opaco → guarda `${!v}` | **Aplicado**: step "Agenda o run (Android)"; `TEST_USER_EMAIL` e os CSV só entram quando não vazios |
| 15 | `tr -d '[:space:]'` no CSV (quebra de linha colada = control char ilegal no JSON) | **Aplicado**: step "Resolve devices e contas do pool" |
| — | Custo aceito: e-mail no artefato `Test spec file`/`Test spec output` | Idem aqui — e também senha e PIN (a referência também os exportava). Visível só para a conta AWS |
| — | (não havia na referência) **Senha por ambiente**: `TEST_USER_PASSWORD` só vale no Android de development; iOS e Android production usam `TEST_USER_PASSWORD_IOS` (medido 2026-09-16 — 5 submits recusados com a senha certa no campo) | `credentials.ts` (`resolvePassword`), step "Agenda os runs (iOS)", README "Senha por ambiente" |

## 3. Um run por iPhone

| # | Lição | Aqui |
|---|---|---|
| 16 | iOS = N runs de 1 job via `--device-selection-configuration {ARN IN [x], maxDevices:1}`; Android = 1 run com `--device-pool-arn` | **Aplicado**. Plano B em comentário se a conta recusar o parâmetro: `create-device-pool` de 1 ARN |
| 17 | Pool PRIVATE com regra por ARN; `get-device-pool` → `get-device` → `LC_ALL=C sort` por nome; i-ésimo device = i-ésimo e-mail; `DEVICES > CONTAS` é erro | **Aplicado para as duas plataformas** (step "Resolve devices e contas do pool"). Diferenças: (a) sem CSV, todos recebem `TEST_USER_EMAIL` — modo de hoje; (b) a API devolve nomes com espaço final → `sed 's/[[:space:]]*$//'`; (c) `modelId` composto (`{A,B}`) vira `A\|B` |
| 18 | `DEVICE_LABEL` injetado pelo CI: `DEVICEFARM_DEVICE_NAME` é o UDID no iOS e o serial no Android | **Aplicado** no iOS. No Android o rótulo é `deviceManufacturer + deviceModel` das capabilities — `test/utils/device-name.ts` |
| 19 | Poll sobre todos os ARNs; summary uma linha por aparelho; **só timeout quebra a esteira** | **Aplicado**: `runs.tsv` (1 linha Android, N iOS), step "Aguarda os runs terminarem" |
| 20 | Um pacote de testes para os N runs; N testspecs | **Aplicado** (`spec-<run>-<i>.yml`, gerados em `$RUNNER_TEMP`) |
| 32 | Índice Android por prefixo de `deviceModel` num mapa fixo (`device-index.ts`) | **Substituído**: o CI manda a lista de `modelId` do pool (`TEST_USER_DEVICE_MODELS`) na mesma ordem dos e-mails e o aparelho faz `indexOf(deviceModel)` — `test/utils/credentials.ts`. Zero modelos no repositório |

## 4. Relatório

| # | Lição | Aqui |
|---|---|---|
| 21 | `disableWebdriverStepsReporting: true` — senão o vídeo entra 2× (base64) e estoura o heap do `allure generate` | Já existia |
| 22 | Vídeo iOS: `startRecordingScreen({ videoType: 'libx264', videoQuality: 'low', videoFps: 8, videoScale: '720:-2' })` em `try/catch` — mjpeg default = ~230 MB/device | **Aplicado**: `wdio.conf.ts` `beforeTest`, só `isDeviceFarm && isIOS`, `timeLimit 600` |
| 23 | Android DF: MediaProjection 1280x720 (screenrecord trunca em ~37 s) | Já existia |
| 24 | `historyId`/`testCaseId` por device (**named imports** de `@wdio/allure-reporter`), `addParentSuite("<device> — <conta>")`, `addLabel('host')` — senão N devices colapsam como retries | **Aplicado** no `beforeTest` do `wdio.conf.ts` (a referência fazia no spec). Conta aparece só como prefixo (`nome@…`) |
| 25 | Extração por `find -name allure-results` (zip sem extensão, aninhado), `cp -rn` | Já existia; `-n` adicionado |
| 26 | Publish: `*-result.json` > 0; `exit 1` sem relatório; commit órfão; `KEEP=3`; prune `>95M` excluindo `.git`; `fetch-depth: 1`; history por plataforma; `timeout-minutes`; `concurrency` | Já existia integralmente (`publish-report`). Diferença: aqui o re-encode ffmpeg **existe e funciona** (`-nostdin` + `timeout` por arquivo) — a referência o removeu por histórico próprio |
| — | `timeout-minutes` no job de devices | **Aplicado**: `device-farm` com 150 min |
| 30b | `environment.properties` no `onPrepare` (Platform, App, AppVersion, AppBuildVersion, …) com a versão vinda do `.build-info.json` do download | **Aplicado (2026-09-16)** sem arquivo intermediário: o `jq` do step do EAS extrai `appVersion`/`appBuildVersion`/`buildProfile` → `APP_*` no host → `test/utils/build-info.ts` + `onPrepare` gravam o arquivo nos 4 ambientes; local com `SKIP_DOWNLOAD` lê o APK instalado via `adb dumpsys` |

## 5. Runtime iOS (XCUITest) — checklist para a Fase 7

Não aplicado agora (é código de page object, não CI). Cada item foi **medido** na
referência e deve ser reconfirmado na captura da Fase 6 / port da Fase 7:

- `autoAcceptAlerts: true` **não** fecha alerta do SpringBoard; usar `mobile: alert` com
  `buttonLabel` e **confirmar que sumiu**. Nunca coordenada em alerta de sistema (altura
  fixa, não escala com a tela — quebrou nos Pro Max). Aqui `handleNotificationPopup()` e
  `dismissTrackingPromptIfPresent()` já usam `mobile: alert`; falta a confirmação.
- `mobile: scroll` com `toVisible` **proibido** em `XCUIElementTypeOther`: não converge,
  queima `maxScrollCount` (~85 s) e o WDIO reenvia 3× (`connectionRetryCount`) — ~5m45s por
  tela. Laço de swipe + `isDisplayed()` converge. Aqui `scroll()` já é por swipe.
- Predicate não aceita geometria (`x`, `y`, `accessible`): filtrar largura/posição em código
  com `getSize()`/`getLocation()`.
- **Validar pelo estado seguinte, nunca pelo retorno**: `acceptAlert()`, `mobile: hideKeyboard`
  e `clearValue()` reportam sucesso sem agir. Login valida pelo botão sumir ou pelo modal de
  erro; voltar pela tab bar; desfavoritar pela ausência.
- Digitação: TextInput controlado do RN engole letras com o teclado subindo →
  `updateSettings({ maxTypingFrequency: 20 })` só durante o `addValue`, depois de
  `isKeyboardShown()`.
- O 1º tap no botão de submit pode não registrar: até 2 taps, distinguindo "navegou" de
  "recusou" (modal de credenciais = erro do passo de login, não 20 s depois).
- Banner/overlay (WebView): o WDA não o vê como obstrução — o elemento por baixo responde
  `displayed=true`. Presença pelo marcador da WebView, não pelo botão `Close`.
- `aguardarTelaEstavel()` (duas leituras iguais de `getPageSource()`) antes de tocar em telas
  que recarregam; o WDA levou 6,7 s para entregar um tap com a lista animando.
- Coordenada só como **fração** da janela (`getWindowRect()`), e só onde não há nó na árvore
  — aqui a única exceção continua sendo `dismissOnboardingSheetIfPresent()`.
- `noReset: false` no DF (onboarding tem que ser exercitado) × `true` local/remoto. Aqui é
  `true` nos dois; o reset é `clearApp` em `relaunchApp()`/`afterEach` — validar no iOS DF
  (IOS-03).

## 6. Sessões Remote Access (Fase 6)

- A URL pré-assinada expira em ~20 min e não renova → **uma sessão por lote de telas**.
- Um `getPageSource()` + um `takeScreenshot()` por tela; rects parseados do XML. Dezenas de
  `getLocation/getSize` (~300 ms cada) deixam as referências obsoletas e matam a sessão.
- O usuário navega até a tela e avisa; o agente só conecta e captura. `deleteSession` sempre.
- Abrir a sessão com `bundleId` reativa o app resetado; como o endpoint recusa `clearApp`, o
  app pode reabrir logado.
- O endpoint recusa `usePrebuiltWDA` (capability reservada) — o bloco Remote Access de
  `wdio.conf.ts` não a envia.

## 7. Como depurar um run (referência, vale aqui)

```bash
set -a; . ./.env; set +a; export AWS_DEFAULT_REGION=us-west-2
aws devicefarm list-runs --arn "$DEVICE_FARM_PROJECT_ARN" \
  --query 'runs[0:10].[name,arn,result,counters.total]' --output text
```

Sem `jq` no Git Bash local: usar `--query` (JMESPath). Artefatos por device
(run → job → `Tests Suite` → test → `list-artifacts --type FILE`): `Test spec output`
(stdout do testspec, com o `[diag]`), `Test spec shell script` (o script gerado pela AWS —
prova de quais variáveis chegam ao host), `Test spec file` (o testspec como foi enviado; no
iOS, com as credenciais do run), `Customer Artifacts` (zip com `appium.log`,
`allure-results/`). O `appium.log` grava o corpo do `setValue` em texto puro.

Marcadores no log: `[diag] TEST_USER_EMAIL len=N …` (credencial chegou),
`🔑 Device model "…" -> conta[N]` (Android em modo por device), `⚠ Device model … não está
em TEST_USER_DEVICE_MODELS` (caiu na conta[0]).
