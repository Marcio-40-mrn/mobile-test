# Estado do projeto

## Referência

Ver: `.planning/PROJECT.md` (atualizado 2026-09-15)
**Valor central:** uma suíte E2E só, Android + iOS, rodando no Device Farm em todo PR com
Allure publicado.
**Foco atual:** Fase 5 — Jornada E2E única e independente (Android).

## Posição atual

Fase: 5 de 9 (Jornada E2E única e independente)
Plano: 1 de 2 (passo 1 — suítes independentes — implementado, aguardando run no AVD)
Status: em andamento — falta fundir as 3 suítes na jornada única (JRN-01). **Intercalado
(2026-09-16): Fase 7 passo 0 — CI iOS no modelo MobileWDIO — implementado, aguardando run
de validação** (ver "Working tree").
Última atividade: 2026-09-22 — **UPD-03: popup OTA conferido em cada passo do login**
(ver Working tree). Antes: 2026-09-17 — **run #30: infra iOS validada** (macos_tahoe + Appium 3 do
host + `appium` fora do package.json); Android e iOS publicados no Pages. iOS vermelho por
senha errada (secret `TEST_USER_PASSWORD_IOS` ausente), `clearApp` e `ffmpeg` — ver Working tree
Progress: [████░░░░░] 4/9 fases

## Sequência combinada (2026-09-15)

1. **Fase 5** — reescrever a suíte como **um único fluxo E2E** (login → home → clientes),
   sem dependência entre testes; os 4 specs atuais saem.
2. **Fase 6** — o usuário abre uma **sessão Remote Access no AWS Device Farm** (iPhone +
   app); `mobile-ui-inspector` captura árvore + print de cada tela e `mobile-draft-writer`
   escreve os drafts em `.planning/drafts/ios/`.
3. **Fase 7** — portar a jornada para o iOS com **`if (IS_IOS)` em cada método/step** do
   page object, usando os elementos capturados; a mesma suíte roda nos dois SOs.
4. **Fase 8** — novos cenários para ampliar a cobertura.

## Working tree

**Sessão 2026-09-22** (branch `fix-ci-ios-and-videos-to-report`, não commitado) — **UPD-03**.
Vídeo de um run do usuário mostrou o popup OTA subindo **antes do preenchimento de e-mail/
senha** e derrubando o teste — o mesmo sintoma já anotado nos flakes de 2026-09-18 ("OTA
chegando no meio do `fillAndSubmit`"). O popup era tratado em 3 pontos fixos, na premissa de
que chega no boot. Agora: `dismissUpdatePopupIfPresent(0)` faz consulta única sem espera
(`isExisting`; `waitForDisplayed({timeout:0})` cairia no `waitforTimeout: 10000`), novo
`LoginPage.otaReiniciouOApp()` é o ponto único de detecção, `fillAndSubmit()` tem guarda
após e-mail/senha/submit e refaz o preenchimento, `handlePin()` refaz o login em vez de sair
em silêncio, `doLogin()` virou laço de 2 tentativas sobre o corpo antigo (extraído para
`executarLogin()`) que só repete quando o popup está mesmo na tela — erro que não é OTA
sobe intacto — e `launchAndCheckUpdate()` reespera o e-mail após aplicar a OTA tardia. O
step 3 do `login.spec.ts` passou a chamar `doLogin()` (fecha a OTA tardia já na home; +26 s).
Custo no caminho feliz: ~+2 s por login. **Nenhum selector, nenhum `if (IS_IOS)` novo,
`wdio.conf.ts` intocado.** `tsc --noEmit` só com o erro pré-existente `autoCompileOpts`;
vitest 50/50. Plano: `.planning/plans/2026-09-22-ota-em-qualquer-ponto-do-login.md`.
**Pendente: run com build OTA pendente** — é o único caminho que exercita o código novo.

**Sessão 2026-09-18** (branch `fix-ci-ios-and-videos-to-report`, não commitado) — **BLD-05**.
`npm test` de hoje não rodou nenhum teste: com `BUILD_PROFILE_ANDROID=production` o EAS
entrega `.aab`, `download-build.ts` o gravava como `arys-latest.apk` e o Appium caía no
`apksigner` ("Missing AndroidManifest.xml"); no CI o mesmo arquivo subiria como
`ANDROID_APP`. Novo `scripts/convert-aab.ts` (bundletool 1.18.1 baixado uma vez para
`~/.cache/bundletool/` ou `BUNDLETOOL_JAR`; debug keystore gerada se faltar;
`build-apks --mode=universal` + `jar xf universal.apk`), chamado por `download-build.ts`
quando a URL termina em `.aab` e pelo step "Baixa o build do EAS" (`app.aab` → `app.apk`,
excluído do zip). `downloadFile` extraído para `scripts/download-file.ts`. Validado local:
o `.aab` de hoje virou APK `com.aramis.arys` 1.6.0 (138), 4 ABIs, `apksigner verify` OK,
em 40 s. Pendente: run do CI Android para confirmar o caminho no runner Ubuntu.

**Captura Android do 1.6.0 (138) `production`** (mesma sessão): 20 telas em
`.planning/drafts/android/captures/1.6.0-138/` + `NOTAS-2026-09-18-1.6.0-138.md`, via o novo
`scripts/android-capture.ts` (spec WDIO que percorre login → home → clientes → menu com os
page objects; `SKIP_DOWNLOAD=true npx wdio run wdio.conf.ts --spec scripts/android-capture.ts`).
**Nenhum selector muda.** Achados: Campanhas abre em > 4 s (estoura o `tapUntil`), `handlePin()`
Android flaky (`mobile: type` sem foco), `sort-option-*` por opção no modal de ordenação.
Device Farm Android #29–#32 rodaram o **1.5.0 (133) `.apk`** (secret `BUILD_PROFILE_ANDROID`
sem `production`) — nunca receberam `.aab`.

**Correções para o 1.6.0 (138)** — plano `.planning/plans/2026-09-18-build-1-6-0-pin-campanhas-ordenacao.md`
(medições + de/para). `login.page.ts` `handlePin()` Android: foca `otp-input-container`, prova
pelo teclado, espera o PIN sumir (45 s) — sai `pinScreen`; `base.page.ts` `tapUntil()` Android
30 s; `clientes.page.ts`: `SORT_OPTION_IDS` (opções por `resource-id`), `selectSortOption()`
espera o sheet fechar, `verifyFilterResult()` um XPath `or`; `wdio.conf.ts` Mocha e vídeo DF
1200 s. **AVD: login ✓ 55 s, home ✓ 188 s, clientes ✓ 529 s.** Regra nova do usuário:
timeouts com folga ≥ 2× o medido no AVD (Device Farm é mais lento). Pendente: run no Device
Farm com `BUILD_PROFILE_ANDROID=production` (secret) para validar lá; tamanho do vídeo.

**Runs seguintes do usuário (19:00–20:26) continuaram flaky em pontos diferentes** (sheet de
onboarding > 8 s → 20 s; OTA chegando no meio do `fillAndSubmit`; `mobile: type` sem digitar
o PIN com teclado aberto; UiAutomator2 "waiting for the root AccessibilityNodeInfo" — app
ocupado; busca em Pós Vendas não aplicada). Card "Acesso ao CRM não autorizado" na home em
todos — conferir a conta de teste no backend. **Decisão do usuário:** pausa fixa de 4 s antes
de cada ação, no page object (`BasePage.beforeAction()`, `ACTION_DELAY_MS`), 29 chamadas nos 4
page objects; exceção documentada em `CLAUDE.md`. Impacto no `clientes` ainda não medido —
pode encostar nos 1200 s.

**Sessão 2026-09-17** (branch `feat-app-version-and-ios-spec`, não commitado). Removido o
gate do iOS em `mobile_test.yml`, que sobreviveu a 5 commits apesar da regra do usuário
(**nunca** input/`if`/matrix condicional por plataforma): input `run_ios`, job `setup`
e `fromJSON(needs.setup…)` saem; `matrix.platform: [android, ios]` fixo; comentários do
cabeçalho e do step "Valida allure-results" reescritos. `.planning` alinhado: CI-02
reescrito, IOS-04 ✓, PROJECT (decisão), ARCHITECTURE/INTEGRATIONS/TESTING/CONCERNS.
Commitado pelo usuário em `6dd47d7` junto com: `BUILD_PROFILE_*`/`BUILD_SELECTION`/
`BUILD_FROM`/`BUILD_TO` lidos de `secrets.` (o repositório só usa Secrets; `vars.`
vinha vazio) e fallback iOS sem profile = `production` (no EAS toda build iOS é
`store`; o filtro `distribution=internal` só serve ao Android).

**Run #28 (2026-09-17, primeiro PR com os dois pools)**: Android PASSED; os 5 runs iOS
FAILED sem nenhum `*-result.json` → `publish-report` descartou o iOS (por projeto) e o
Pages só mostrou Android. Diagnóstico pelos artefatos do Device Farm + docs AWS: o
`testspec-ios.yml` **não tinha `ios_test_host`** → fallback no host *legado*, escolhido
pela versão de iOS (Ventura p/ 15 Pro, Sonoma p/ 16 Pro Max, host novo p/ os iOS 26, onde
`nvm` não existe). Em todos, `appium driver install xcuitest || true` falhou (Appium 2
do host × driver que exige Appium 3, ou ERESOLVE contra o `appium ^3` do package.json) e
a sessão morria em "Could not find a driver for automationName 'XCUITest'".

**Não commitado** (esta sessão):

| Arquivo | O que mudou |
|---|---|
| `testspec-ios.yml` | `ios_test_host: macos_tahoe` (iOS 17–27, todo o pool); `devicefarm-cli use node 22` + `use appium 3` (driver XCUITest já vem); sem `nvm`, sem `appium driver install`; `pre_test` com o bloco oficial de seleção do WDA (`DEVICEFARM_APPIUM_WDA_DERIVED_DATA_PATH_V<N>`, exportado) + `derivedDataPath`/`usePrebuiltWDA` nas default caps + UDID sem hífen p/ iOS ≤16; cabeçalho sem `run_ios`/`internal` |
| `wdio.conf.ts` | `derivedDataPath` lê `DEVICEFARM_APPIUM_WDA_DERIVED_DATA_PATH` antes dos nomes legados (`_V9` é *deprecated* na doc) |
| `codebase/{STACK,STRUCTURE,ARCHITECTURE,INTEGRATIONS,LICOES-CI-MOBILEWDIO}.md` | host `macos_tahoe`/`devicefarm-cli`; lição 3 (Node 18 via nvm) marcada como descartada — descrevia o host legado |
| `.claude/skills/mobile-cicd-pipelines/*`, `mobile-wdio-scaffold/*` | idem: ensinavam nvm/Node 18 e `_V9` |

**Run #29 (2026-09-17, já no `macos_tahoe`)**: host certo (Node 22, Appium 3.1.0, WDA `_V10`,
credenciais e app 1.6.0/79 OK) mas `appium driver list --installed` **vazio** → 5/5 sem
driver. Causa (doc Appium `APPIUM_HOME` + run-22 da referência MobileWDIO): `appium` como
devDependency faz o Appium do host tratar o pacote de teste como `APPIUM_HOME` e carregar só
os drivers do `package.json` — `uiautomator2` sim (Android verde por isso), XCUITest não.
**Opção A escolhida pelo usuário** (Android isolado do iOS, cada um com o Appium/driver do
seu host): `appium` removido do `package.json` (fica peer transitiva 3.7.0); `testspec.yml`
Android mantém Node 22 / Appium 3 / **uiautomator2@7.6.2** via `uninstall` + `install@7.6.2`
(padrão da doc AWS, porque o host traz v6); iOS usa o XCUITest pré-instalado do `macos_tahoe`;
`wdio.conf.ts` ganha `showXcodeLog: true` (referência). Regra inviolável **12** em
`REQUIREMENTS.md` + `CLAUDE.md`; LICOES lição 1 → aplicada; CONCERNS §11 corrigido; STACK.

**Run #30 (2026-09-17) — INFRA iOS VALIDADA. Esta configuração é a referência** (tabela
"Configuração validada" no README): os 5 iPhones abriram sessão XCUITest no `macos_tahoe`
(driver 10 do host, WDA `_V10` casado, Xcode default serviu inclusive ao 15 Pro em iOS
17.3.1 — a dúvida do Xcode está encerrada), rodaram os 3 specs (~13 min cada) e o
`publish-report` publicou **Android e iOS** no Pages com evidência. Android: 7.6.2
instalado nos 5 (`uninstall` do v6 + `install@7.6.2` OK), 14/15 — o A15 falhou em
`clientes` ("Nenhum cliente favorito" não apareceu em 5 s), mesmo padrão do run #20; não
é infra.

**Por que os testes iOS ficaram vermelhos no #30** (artefatos do DF, 5 iPhones — nada
corrigido ainda, por ordem do usuário):

| # | Sintoma | Causa (medida) | Onde |
|---|---|---|---|
| 1 | `Login recusado: "Erro ao fazer login! O e-mail e/ou senha estão inválidos."` em 4/5 (15 Pro, 16 Pro, 17 Pro, 17 Pro Max); no 16 Pro Max o modal não foi detectado e o `it` morreu na asserção da home | O host recebeu `TEST_USER_PASSWORD len=12` = a senha **Android/dev** do `.env`; a `TEST_USER_PASSWORD_IOS` local tem 10 chars e é diferente. O step "Agenda os runs (iOS)" faz `${TEST_USER_PASSWORD_IOS:-$TEST_USER_PASSWORD}` → **o secret `TEST_USER_PASSWORD_IOS` não existe (ou está vazio) no GitHub**. E-mail e senha foram digitados inteiros (`appium.log`) | Secret do repositório (era a pendência (2) da sessão 2026-09-16) |
| 2 | `mobile: clearApp` → "This extension is only supported on simulators" ×4 por spec | `clearApp` do XCUITest não existe em device real — o mesmo bloqueio do Remote Access, agora confirmado no DF (IOS-03). `resetAppState()` vira no-op com warn; `signOutIfLoggedInIOS()` cobre o estado logado | `base.page.ts` `resetAppState`/`relaunchApp` — decisão de desenho pendente (reinstalar via `removeApp`+`installApp` ou aceitar o logout pelo app) |
| 3 | `'ffmpeg' binary is not found in PATH` no `startRecordingScreen` → **iOS sem vídeo** no relatório | O host `macos_tahoe` não tem `ffmpeg` (o legado da referência tinha). O XCUITest precisa dele para qualquer `videoType` | `wdio.conf.ts` `beforeTest` iOS — alternativas: (a) usar o artefato `VIDEO` que o próprio Device Farm grava por job (já existe em `list-artifacts --type FILE`) e anexar no Allure na coleta; (b) instalar ffmpeg no testspec (não verificado se há `brew` no host) |
| 4 | `Failed to find button with label 'Ask App Not to Track' for alert: "Atualização disponível"` ×4 (~3 s) | `dismissTrackingPromptIfPresent()` roda **antes** do OTA e o `mobile: alert` encontra o alerta da OTA (que no iOS é alerta nativo). O OTA é fechado em seguida por "Reiniciar" e a tela de login aparece — só ruído/tempo, não falha | `login.page.ts:145-146` ordem dos handlers |
| 5 | `An attempt was made to operate on a modal dialog when one was not open` ×2 em `home`/`clientes` (35–47 s cada) | `handleNotificationPopup()` iOS chama `mobile: alert` sem alerta presente (o login já tinha falhado, nunca chegou ao PIN) — consequência do #1, mas o custo de tempo por tentativa merece revisão | `base.page.ts` |

**Corrigido nesta sessão (não commitado)** — #1 e #3 da tabela:
| Arquivo | O que mudou |
|---|---|
| `.github/workflows/mobile_test.yml` "Agenda os runs (iOS)" | **sem fallback de senha**: `TEST_USER_PASSWORD_IOS` e `TEST_USER_PIN` obrigatórios (`::error` nomeado se ausentes); o host recebe a iOS como `TEST_USER_PASSWORD` |
| `.github/workflows/mobile_test.yml` "Coleta artefatos" | iOS: baixa o artefato `VIDEO` do Device Farm por job (h264, 2,7 MB/272 s medido no 15 Pro) para `allure-results/devicefarm-video-<i>.mp4` e anexa (`jq`) a cada `*-result.json` daquele aparelho; sem VIDEO → `::warning` |
| `wdio.conf.ts` | `beforeTest`/`afterTest`: Device Farm iOS não chama `startRecordingScreen`/`stopRecordingScreen` (sem ffmpeg no host = 12 s de retries por spec para nada) |
| `README.md`, `CLAUDE.md` | secret obrigatório; origem do vídeo por plataforma |
Simulado com os artefatos reais do run #30: os 3 resultados do 15 Pro ganham o anexo.
Sobre o print "senha vazia" da tela de erro: o `appium.log` mostra a senha (a Android,
12 chars) enviada e aceita pelo WDA 15 s antes do print — o app limpa o campo ao recusar.

**Run #31 (2026-09-17, ainda com o workflow antigo — secret iOS ausente, `len=12`)**: as 3
suítes rodaram nos 5 iPhones e as 3 foram recusadas no login; Home e Clientes apareceram
**roxas/"Unknown", sem nome do aparelho e sem print** porque o login delas estava no
`beforeEach` — o Mocha pula o `it`, `beforeTest`/`afterTest` não rodam, o resultado sai sem
`status`/`host`/`parentSuite`. **Corrigido**: preparo virou o 1º step do `it` nas 3 suítes
(`test/specs/*.spec.ts`, `preparo: …`); só `afterEach` (`resetAppState`, nunca lança)
continua hook. Docs: CLAUDE.md fluxo 3, README "Estrutura das suítes", TESTING, ARCHITECTURE.

**Próxima ação**: (1) criar o secret `TEST_USER_PASSWORD_IOS` no GitHub (valor = o do
`.env`) — sem ele o job iOS agora para no agendamento, com o nome; (2) próximo run valida
senha + vídeo + preparo como step; (3) #2 (`clearApp` → reinstalação) e #4/#5 (ordem dos handlers de popup) depois
do login passar. Os 5 steps do bottom sheet em `clientes` continuam vermelhos por bug do
app (regra 6).

**Sessão 2026-09-16** (PR #15 já mergeado em `main` = `3f995f5`). O hook bloqueia
`git checkout -b`: o usuário cria `feat/ci-ios-um-run-por-device` a partir de `main` e
versiona. Alterado, não commitado:

| Arquivo | O que mudou |
|---|---|
| `.github/workflows/mobile_test.yml` | job `device-farm`: `timeout-minutes: 150`; zip exclui `.env`/`test/videos` e falha se um `.env` entrar; step único de agendamento virou 4 — "Sobe app e pacote" (`id: uploads`), "Resolve devices e contas do pool" (as duas plataformas: `get-device-pool` → regra `ARN IN` → `get-device` name+modelId, `LC_ALL=C sort`, e-mails do CSV ou `TEST_USER_EMAIL` repetido, `devices.tsv`), "Agenda o run (Android)" (`--device-pool-arn`, `environmentVariables` só com valores não vazios, + `TEST_USER_EMAILS`/`TEST_USER_DEVICE_MODELS` em modo por device), "Agenda os runs (iOS)" (um `schedule-run` por iPhone via `--device-selection-configuration`, testspec gerado com `head`/`tail` + `printf %q` num bloco `- \|-`); "Aguarda" e "Coleta" iteram `runs.tsv` |
| `.github/scripts/devicefarm-upload.sh` | novo — `df_upload()` (create → PUT → poll), `source`ado pelos três steps que sobem artefatos |
| `testspec.yml` | retry 3× no `npm install`; guarda de credencial vazia + `[diag]` com comprimentos; `.env` ganha `TEST_USER_EMAILS` e `TEST_USER_DEVICE_MODELS` (vazias sem CSV) |
| `testspec-ios.yml` | idem retry; linha marcadora `__CREDENCIAIS_DO_RUN__` na fase `test` + guarda + `[diag]`; `.env` com `DEVICE_LABEL`; cabeçalho explica o canal |
| `test/utils/credentials.ts` | novo — `resolveAccount()` lazy/memoizado, `pickEmail()` puro (`indexOf(deviceModel)` na lista do CI, `A\|B` para modelId composto), `requireEnv` movido de `login.page.ts` |
| `test/utils/device-name.ts` | novo — `deviceLabel()`: `DEVICE_LABEL` → Android `manufacturer + deviceModel` das capabilities → `DEVICEFARM_DEVICE_NAME` → local |
| `test/utils/__tests__/credentials.test.ts` | novo — 12 casos Vitest (`npx vitest run scripts test/utils` = 36 verdes) |
| `test/pages/login.page.ts`, `test/specs/login.spec.ts` | `EMAIL/SENHA/PIN` de import-time saem; `fillAndSubmit()`/`handlePin()`/`doLogin()` usam `resolveAccount()` por default |
| `wdio.conf.ts` | `beforeTest`: `labelTestWithDevice()` (`addHistoryId`/`addTestCaseId`/`addParentSuite`/`addArgument`/`addLabel` — named imports); vídeo iOS DF em `libx264`/fps 8/`720:-2`/600 s |
| `README.md`, `CLAUDE.md` | seção CI reescrita, secrets `TEST_USER_ANDROID_EMAILS`/`TEST_USER_IOS_EMAILS`, "Conta por device", comando vitest com `test/utils`, `_devicefarm-run.yml` removido |
| `.planning/codebase/LICOES-CI-MOBILEWDIO.md` | novo — as lições da referência e onde cada uma foi aplicada aqui (ou por que não) |
| `.planning/{REQUIREMENTS,ROADMAP}.md`, `codebase/CONCERNS.md` | CI-03 reescrito, CI-06 novo, REP-05 por device; Fase 7 passo 0; CONCERNS §7/§7b |

Verificado localmente: `npx tsc --noEmit` (só o erro pré-existente de `autoCompileOpts`),
36 testes Vitest, `bash -n` nos 22 blocos `run` do workflow, e a simulação dos steps de
pool/injeção contra os pools reais (5 Android + 5 iOS, PRIVATE com regra ARN; senha com
`' $ " \ #` recuperada byte a byte no host; modelId composto do A51 tratado).
**Não verificado ainda (precisa de run real)**: PR → Android (deve continuar verde, agora com
um nó por aparelho no Allure) e iOS no mesmo PR desde 2026-09-17 (5 runs; `[diag]` no
`Test spec output`; se a conta AWS recusar `--device-selection-configuration`, plano B no
comentário do step). Regra desta mudança: **nada amarrado a aparelho** — pool lido a cada run.

**Sessão 2026-09-15** (já mergeada — PR #15):

| Arquivo | O que mudou |
|---|---|
| `test/pages/base.page.ts` | `handleNotificationPopup()` Android: clica CANCELAR e **confere** que sumiu, até 3×, senão lança erro claro (o 1º clique é ignorado neste build); `dismissOnboardingSheetIfPresent()` ganhou ramo Android (`btn-onboarding-welcome-close`) — ramo iOS intacto |
| `test/pages/login.page.ts` | novo `launchAndCheckUpdate()` = `relaunchApp()` → `dismissUpdatePopupIfPresent()` → espera `emailField` (15 s) |
| `test/specs/login.spec.ts` | `beforeEach` = `launchAndCheckUpdate()`; `afterEach` = `resetAppState()` (= `pm clear`); 2 `it` → 1 `it` com 2 `allureReporter.step()` |
| `test/specs/home.spec.ts` | `beforeEach` = `launchAndCheckUpdate()` + `ensureLoggedIn()` + `navigateToHome()`; `afterEach` = `resetAppState()`; 8 `it` → 1 `it` com 8 steps |
| `test/specs/clientes.spec.ts` | idem (`navigateToClientes()`); 10 `it` → 1 `it` com 10 steps |
| `test/specs/00-update-check.spec.ts` | **removido** (toda suíte faz a verificação) |
| `wdio.conf.ts` | linha do `00-update-check` removida de `specs:`; `mochaOpts.timeout` = `600000` em todos os ambientes (clientes = 28 `applySortFilter` num `it` só) |
| `.planning/{ROADMAP,REQUIREMENTS,STATE}.md`, `phases/05-.../2026-09-15-suites-independentes.md` | registro do passo |

Corpos dos antigos `it` intactos: 25 linhas de `expect(` (3 + 16 + 6), iguais ao HEAD.
`npx tsc --noEmit` só acusa o erro pré-existente de `autoCompileOpts` (`wdio.conf.ts:148`).
Já havia na working tree antes desta sessão (docs pós-incidente): `README.md`,
`docs/ci/retencao-de-relatorios-allure.md`, `codebase/{ARCHITECTURE,STACK}.md`. Branches remotas além de `main`:
`feat-download-build`, `feat-test-for-ios` (mergeadas), `reports` (órfã, GitHub Pages).

Fora do git, mas necessários localmente: `.env`, `.mcp.json`, `Locators-iOS-Arys.docx`,
`.claude/{agents,hooks,skills,settings*.json}`.

## Métricas

| Fase | Período | PRs | Entregas |
|---|---|---|---|
| 1 | 2026-06-02 → 06-18 | #2 | 4 specs (21 `it`), 3 pages + `BasePage` |
| 2 | 2026-06-17 → 08-11 | #4 #5 #6 #8 #9 #10 | `mobile_test.yml` (726 linhas), testspec, retenção |
| 3 | 2026-08-26 | #11 | `download-build.ts` + 24 unit tests |
| 4 | 2026-08-26 | #12 | `platform.ts`, `byPlatform`, `testspec-ios.yml`, 42 dumps iOS |

## Contexto acumulado

### Decisões

- **Jornada E2E única** em vez de specs por tela (2026-09-15) — os `it` de hoje dependem do
  estado deixado pelo anterior; um fluxo só reflete o uso real e roda isolado
- **`if (IS_IOS)` em todo método do page object** a partir da Fase 7 (2026-09-15) —
  substitui `byPlatform()` + `if` pontual; cada plataforma fica legível de cima a baixo
- Locators iOS só de dump real; a Fase 6 gera drafts versionados a partir de sessão nova, com
  o `Locators-iOS-Arys.docx` como baseline
- Flags puras + builders em `wdio.conf.ts`; `IS_IOS` lido em import-time (`platform.ts`)
- **Sem gate por plataforma** (2026-09-17): iOS roda em todo PR na mesma matrix fixa do
  Android; a falha dos 5 steps de clientes é o sinal da dívida do app
- MediaProjection 720p no DF Android; commit órfão + `KEEP=3` na branch `reports`

### Incidente 2026-08-26 → 09-15: relatório Allure não publicado (resolvido nesta sessão)

- **Sintoma**: `pages build and deployment` parado desde o run-15 (26/08 16:46 UTC); runs
  #16, #17 e #18 verdes no GitHub, mas sem pasta nova na branch `reports`.
- **Causa**: `package-lock.json` do commit de merge `2050647` (PR #12) não batia com nenhum
  dos pais — `archiver` 7.0.1 com a lista de deps do 8.0.0, sem `archiver-utils` declarado.
  No Device Farm o `npm install` podava o `archiver-utils` e o `wdio run` morria no import
  (`Cannot find module 'archiver-utils'`): ~1 min de device por aparelho, zero
  `*-result.json`, e o `publish-report` saía com `::warning:: + exit 0`.
- **Correção**: lock regenerado do zero (`rm -rf node_modules package-lock.json && npm
  install`), `"i"` removido; no workflow, pré-verificação de dependências no runner
  (`npm install` + `import('webdriverio')`), "Test spec output" impresso quando não há
  resultado, e a guarda de "nenhum resultado" virou `::error:: + exit 1`.
- **Regra**: conflito em `package-lock.json` nunca se resolve à mão — regenerar com
  `npm install`. `npm ci` não funciona neste repo (shrinkwrap aninhado do
  `appium-uiautomator2-driver` só lista `@img/sharp-*` linux-x64).
- **Não incluído (decisão pendente)**: o workflow só roda em `pull_request` e
  `workflow_dispatch` — mergear em `main` não dispara teste nem relatório. Adicionar
  `push: branches: [main]` se essa for a expectativa.

### Bloqueios / preocupações (afetam a Fase 7, não a 5)

- **Bottom sheet e empty state iOS sem filhos na árvore XCUITest** → steps de "Ordenar por"
  não rodam no iOS. Correção no app (`accessible={false}` + `testID`). Verificado em
  2026-08-26 com `snapshotMaxDepth: 120`, accessibility id, predicate e class chain.
- **`mobile: clearApp` recusado pelo endpoint Remote Access** → o app reabre logado; o reset
  no início da jornada precisa ser validado via testspec no iOS.
- **URL pré-assinada do Remote Access expira em ~20 min** → na Fase 6, capturar por lotes.
- **Popup OTA iOS nunca apareceu** → locator em `base.page.ts:22-24` "não validado".
- **`launchAndCheckUpdate()` no Remote Access** → como `clearApp` é recusado, o app reabre
  logado e a espera pelo campo de e-mail falha em **todas** as suítes (antes só `00-` e
  `login`). Fase 7 decide: tolerar (pular a espera se já está na home) ou exigir logout.
- `home.spec.ts` (e a futura jornada) depende do cliente "Fudaba" existir na conta de teste.

### Pendências (todos)

- `.env.example` citado no README e no `requireEnv()` mas removido em `4f349dc`
- `docs/index.md` é o placeholder do template TechDocs
- `.gitignore` ignora `docs/`, mas `docs/**` está versionado
- README cita `_devicefarm-run.yml` e `.mcp.json.example` (removidos); `CLAUDE.md` ainda cita `_devicefarm-run.yml`
- O skill `planejar-mudanca` (untracked) cita `.planning/plans/` (não existe; usar `phases/`)
  e `.planning/drafts/ios/` (passa a existir na Fase 6)

## Continuidade de sessão

Última sessão: 2026-09-15 — definição dos próximos passos com o usuário; `ROADMAP.md`
reescrito (Fases 5–9), `REQUIREMENTS.md` com JRN/CAP/IOS/COV, contextos
`phases/05..08/NN-CONTEXT.md` criados.
### Incidente 2026-09-15 (noite): `home.spec` roxo no `beforeEach` — resolvido

- **Sintoma**: 3 runs seguidos broken aos 97–118 s em `doLogin()` → `homeGreeting` não
  aparece em 30 s. Sem screenshot (hook não passa pelo `afterTest`).
- **Evidência (AVD, build 1.5.0/133, via adb e sessão Appium avulsa)**: após o PIN o popup
  "Permita notificações" aparece; **o 1º clique em CANCELAR não fecha, o 2º fecha** e ele não
  volta. Enquanto está na tela a árvore só contém o popup — daí "Olá," inexistente. Depois
  dele a home abre com o **bottom sheet de onboarding também no Android**
  (`onboarding-welcome-sheet` + `btn-onboarding-welcome-close`, ambos na árvore), cujo
  backdrop engole toques; a saudação continua `displayed=true` com o sheet aberto. Nenhum
  popup OTA (`REINICIAR`) apareceu em 4 logins.
- **Correção**: `BasePage.handleNotificationPopup()` (loop com validação) e
  `dismissOnboardingSheetIfPresent()` (ramo Android). Zero linhas no ramo iOS.
- **Resolvido em 2026-09-17 de outro jeito**: o preparo saiu do `beforeEach` e virou o 1º
  step do `it` nas 3 suítes (`preparo: …`) — hook quebrado nunca mais deixa o teste roxo,
  sem device e sem print (run #31 iOS: Home/Clientes "Unknown").

### Sessão 2026-09-16: CI iOS no modelo MobileWDIO (Fase 7, passo 0)

- O usuário trouxe o documento de referência do MobileWDIO (Android 18/18 + iOS 5/5 no DF).
  Decisões: credenciais iOS **exatamente como lá** (testspec gerado por run); uma conta hoje
  com a estrutura pronta para CSV por device; rótulo por aparelho no `beforeTest`;
  **nada amarrado a modelo/nome de aparelho** (os pools não são os mesmos da referência e
  podem mudar).
- Achado da simulação que corrige a referência: a linha `export` gerada com `printf %q`
  precisa entrar no YAML como bloco literal (`- |-`) — num escalar simples, ` #` na senha
  vira comentário e trunca a linha.
- Próximo: o usuário cria a branch, revisa, abre PR (valida Android e iOS juntos). Depois, Fase 6: sessão Remote Access — o usuário atualiza
  `REMOTE_PATH_IOS` no `.env` e avisa; captura por lotes de tela.

### Sessão 2026-09-16 (tarde): Fase 6 — captura iOS via Remote Access

- Uma sessão Appium de 50 min (a URL não expirou) com `scripts/ios-capture.mjs` (novo; um
  `getPageSource()` + um print por tela, sessão reaproveitada por `attach`). 42 capturas em
  `.planning/drafts/ios/captures/` (13 MB — **versionar ou ignorar: decisão pendente**) +
  `NOTAS-SESSAO-2026-09-16.md` + `parse.py`. O `mobile-draft-writer` escreveu `01`–`11`,
  `00-INDICE.md` e `RELATORIO-ANOMALIAS-IOS.md`. Os XML tiveram o `value` da senha mascarado.
- **Descobertas que mudam a Fase 7**: OTA é alerta nativo `Reiniciar` (locator `REINICIAR`
  errado); `screen-sign-in` invisível sem teclado; empty state "Nenhum cliente encontrado!"
  da lista de clientes **não está na árvore** (CLI-07 iOS bloqueado até reconfirmar);
  1º toque perdido em `btn-campaign-section-view-all`, `btn-customer-section-info` e
  `~Pós Vendas`; sheets sem filhos reconfirmados; alerta de notificações **não** duplicado;
  árvore e print podem discordar.
- **Senha por ambiente**: `TEST_USER_PASSWORD` só vale no Android development; iOS e Android
  production usam `TEST_USER_PASSWORD_IOS` (5 submits recusados com a senha "certa" antes
  de descobrir). Aplicado em `credentials.ts` (`resolvePassword`), no step iOS do workflow
  (secret `TEST_USER_PASSWORD_IOS` → `TEST_USER_PASSWORD` no host, com fallback), README,
  CLAUDE.md, `LICOES-CI-MOBILEWDIO.md`. **Secret novo a criar no GitHub: `TEST_USER_PASSWORD_IOS`.**
- Estado da conta neste build (1.6.0): CRM "não autorizado" (campanhas não carregam),
  todas as abas de clientes com 0; "Fudaba" tem 2 resultados.
- Working tree adicional: `scripts/ios-capture.mjs`, `.planning/drafts/ios/**`,
  `test/utils/credentials.ts` (`resolvePassword`), workflow/README/CLAUDE.md/LICOES (senha iOS),
  `ROADMAP.md` (Fase 6 sessão 1), `REQUIREMENTS.md` (CAP-01/03/04 ✓).

### Sessão 2026-09-16 (fim de tarde): Android build 1.6.0 no AVD

- Popup OTA do build novo capturado no AVD (`.planning/drafts/android/captures/01-ota.*` +
  `NOTAS-2026-09-16-ota.md`): AlertDialog **nativo** — `android:id/button1` "REINICIAR" /
  `android:id/button2` "AGORA NÃO", título `com.aramis.arys:id/alert_title`. Com ele aberto
  a árvore só tem o diálogo.
- `BasePage.updateRestartButton` atualizado nas duas plataformas (Android por
  `resource-id` + texto; iOS `Reiniciar` via `mobile: alert`); `dismissUpdatePopupIfPresent()`
  ganhou `timeout` e retorno booleano, reaproveitado no "OTA tardio" do `doLogin()` (UPD-02 ✓).
- Senha: o build 1.6.0 do Android é **production** → `resolvePassword()` usa
  `TEST_USER_PASSWORD_IOS` quando `IS_IOS` **ou** `BUILD_PROFILE_ANDROID=production`
  (`isProductionTrack()`); o job Android do CI passa `TEST_USER_PASSWORD_IOS` e
  `BUILD_PROFILE_ANDROID` ao host (só quando não vazios) e o `testspec.yml` os grava no `.env`.
  **Se o `.env` local/`vars` do CI ficarem em `preview`, a senha usada é a antiga.**
- `wdio.conf.ts`: `ARYS_APK_PATH` (CONCERNS §8) para apontar outro APK sem sobrescrever o
  download — usado para rodar contra o 1.6.0 já instalado (md5 diferente do
  `arys-latest.apk` de 15/09).
- **Validado**: `login.spec.ts` verde no AVD com o 1.6.0 e a senha de produção (45 s),
  rótulo por device no Allure. `home`/`clientes` não rodados (conta com CRM "não autorizado"
  neste build — ver sessão iOS). Nota: `onComplete` local abre `allure open`, que fica
  servindo o relatório em background.

### Sessão 2026-09-16 (noite): versão/build/profile no Allure

- Por que não aparecia: o step do EAS só extraía `buildUrl`, o `onPrepare` retornava cedo no
  DF/iOS e ninguém gravava `environment.properties`.
- Agora: `jq` do step "Baixa o build do EAS" extrai `appVersion`/`appBuildVersion`/
  `buildProfile` (confirmados no JSON real: 1.6.0 / 138 / production) → `$GITHUB_ENV` +
  summary → host como `APP_VERSION`/`APP_BUILD_VERSION`/`APP_BUILD_PROFILE` (Android:
  `environmentVariables`; iOS: linha `export`) → testspecs gravam no `.env` (+ `[diag]`) →
  `onPrepare` grava `allure-results/environment.properties` nos 4 ambientes
  (`test/utils/build-info.ts`: `environmentProperties()`, `buildInfoFromEnv()`,
  `installedAndroidBuildInfo()` via `adb dumpsys` para `SKIP_DOWNLOAD`). `download-build.ts`
  ganhou `selectLatestBuild()` → `BuildInfo` (`parseLatestBuildUrl` mantido). 40 testes Vitest.
- Verificado local: `environment.properties` sai com `AppVersion=1.6.0`,
  `AppBuildVersion=138` lidos do emulador. iOS Remote Access fica `n/d` (sem fonte).

### Sessão 2026-09-16 (noite): Fase 7 passo 1 — ramo iOS corrigido ("igual ao Android")

- Decisão do usuário: **estrutura mantida** (`byPlatform` nos getters, `if (IS_IOS)` só onde
  a interação diverge), specs intactos, sem fundir suítes, sem skip/known-issue — o que o
  app bloqueia fica vermelho como hoje. A convenção "if em todo método" (2026-09-15) foi
  descartada; `REQUIREMENTS` (regra 1, IOS-01..05), `ROADMAP`, `07-CONTEXT`, `CONVENTIONS`
  e `CLAUDE.md` atualizados.
- `base.page.ts`: `typeInto()` (iOS: foco → teclado → 1 s → `maxTypingFrequency 20` →
  `addValue`; Android: `setValue`), `tapUntil()` (toque + estado esperado, 2 tentativas no
  iOS), `signOutIfLoggedInIOS()` em `relaunchApp()` (Remote Access sem `clearApp`:
  `btn-pin-back` / `tab-menu-5` → `btn-menu-sign-out`), `handleNotificationPopup()` iOS =
  ATT → Cancelar (confirma que sumiu) → sheet.
- `login.page.ts`: `loginTitle` iOS `~scroll-sign-in`; `credentialsErrorTitle`;
  `fillAndSubmit()` iOS valida PIN ou erro nomeado; `handlePin()` iOS espera
  `Bottom sheet handle`/`greeting-header` em vez de `pause(6000)`.
- `home.page.ts`: `searchClient()` digita no campo da home + tecla Search e espera
  `input-customer-search-input`; `openAllCampaigns`/`openAllCustomers`/`clickShortcutButton`
  via `tapUntil`; `toggleCustomerSectionInfo()` iOS como toggle validado (texto do tooltip
  **não capturado** — pode precisar de ajuste na sessão).
- `clientes.page.ts`: `navigateToTab()` iOS por posição (x negativo / ausente → arrasto) +
  `tapUntil` até o segmento da aba; `searchClient()` com `typeInto`; comentários apontando
  os drafts nos métodos bloqueados pelo app (`openSortFilter`, `waitForNoResults`).
- Android: `openAllCampaigns`/`openAllCustomers`/`clickShortcutButton` trocaram
  `click + pause(2000)` por `click + espera do título` (mesma semântica).
- **Regressão Android no AVD (1.6.0, senha de produção): 3/3 verdes** — `login` (45 s),
  `home` e `clientes` (10 min 25 s). Dois ajustes saíram dela: `typeInto()` clica o campo
  antes de digitar (sem foco o Enter da busca não dispara no Android) e o literal do estado
  vazio de Favoritos no `clientes.spec.ts` virou "Nenhum cliente favorito" (texto novo do
  build 1.6.0; Aniversariantes/Cashback/Pós Vendas não mudaram — coletado com um spec de
  exploração descartável no scratchpad).

Parou em: código da Fase 7 passo 1 na working tree (sobre `feat-run-device-farm-ios`),
**aguardando validação no iOS** (Remote Access → Device Farm) e commit do usuário.
Próxima ação: usuário abre sessão Remote Access (1.6.0) e passa `REMOTE_PATH_IOS`; rodar
`npm run wdio:ios -- --spec test/specs/login.spec.ts`, depois `home`, depois `clientes`;
ajustar o que a sessão mostrar; PR no Device Farm (os dois pools).
Próxima ação: (1) branch + PR → Android verde com um nó por device; (2) criar o secret
`TEST_USER_PASSWORD_IOS` (o PR já roda o iOS); (3) decidir `captures/` no git;
(4) Fase 5 passo 2 (fundir suítes) e depois Fase 7 (port) com os drafts.
