# Requisitos: Arys Mobile Automation

**Definidos em:** 2026-09-15 (retroativo, a partir do código e dos specs existentes)
**Valor central:** uma suíte E2E só, que roda em Android e iOS sem duplicação e publica
Allure em todo PR.

Cada requisito aponta para o spec ou arquivo que o cobre. Checkbox marcado = coberto e verde
no ambiente indicado.

## Requisitos v1

### PLAT — Plataforma e configuração

- [x] **PLAT-01**: A plataforma vem exclusivamente da env `PLATFORM` (`ios` → XCUITest;
  ausente → UiAutomator2). Sem arquivos de config duplicados.
  → `test/utils/platform.ts`, `package.json` (`wdio:ios`), `testspec-ios.yml`
- [x] **PLAT-02**: `buildCapabilities()` resolve os 4 ambientes do mais específico ao menos:
  iOS Device Farm (exige `usePrebuiltWDA` + `derivedDataPath`) → Android Device Farm →
  iOS Remote Access (**não** pode enviar `usePrebuiltWDA`) → Android local.
  → `wdio.conf.ts:76-95`
- [x] **PLAT-03**: Todo locator que difere entre plataformas passa por `byPlatform()`;
  locators idênticos (abas de clientes) ficam diretos.
  → `test/utils/platform.ts`, `test/pages/*.page.ts`
- [x] **PLAT-04**: Reset de estado por teste via `resetAppState()` (= `adb shell pm clear`
  no Android, `bundleId` no iOS; tolera a recusa do Remote Access) — no início, dentro de
  `relaunchApp()`, e no fim, no `afterEach` de cada spec (desde 2026-09-15).
  → `test/pages/base.page.ts:222-234`, `test/specs/*.spec.ts`

### AUTH — Autenticação

- [x] **AUTH-01**: Submeter o login com campos vazios exibe "Campos obrigatórios" e
  "Por favor, preencha seu email e senha.". → `login.spec.ts`
- [x] **AUTH-02**: Login com credenciais válidas + PIN leva à home (saudação "Olá,").
  → `login.spec.ts`, `LoginPage.doLogin()`
- [x] **AUTH-03**: `ensureLoggedIn()` é idempotente: home → nada; PIN → digita; login →
  faz login; qualquer outra tela → relança o app e loga. → `login.page.ts:151-170`
- [x] **AUTH-04**: O fluxo trata os popups na ordem: splash, ATT (iOS), OTA, form, PIN,
  notificações (Android: clica e valida até 3×), onboarding (Android e iOS), OTA tardio —
  cada popup opcional é tratado se aparecer e ignorado se não. → `LoginPage.doLogin()`, `BasePage`
- [x] **AUTH-05**: Credenciais (`TEST_USER_EMAIL`, `TEST_USER_PASSWORD`, `TEST_USER_PIN`)
  vêm da env; ausência lança erro claro no import. → `login.page.ts:4-16`

### UPD — Atualização OTA

- [x] **UPD-01**: Toda suíte começa por `LoginPage.launchAndCheckUpdate()` (relaunch →
  clica REINICIAR se o popup existir → espera o campo de e-mail). → `login.page.ts`, `before`
  de cada spec (o `00-update-check.spec.ts` foi removido em 2026-09-15)
- [x] **UPD-02** *(2026-09-16)*: Popup OTA capturado nas duas plataformas no build 1.6.0 —
  Android AlertDialog nativo (`android:id/button1` "REINICIAR"), iOS alerta nativo
  (`Reiniciar`, via `mobile: alert`). `BasePage.updateRestartButton` /
  `dismissUpdatePopupIfPresent()` atualizados; `login.spec.ts` verde no AVD.
  → `drafts/android/captures/01-ota.*`, `drafts/ios/01-splash-e-ota.md`
- [x] **UPD-03** *(2026-09-22)*: O popup OTA pode chegar em **qualquer ponto** entre abrir o
  app e a home — não só no boot (run de 2026-09-18: subiu no meio do `fillAndSubmit()`,
  depois de `launchAndCheckUpdate()` já ter validado o campo de e-mail). Cada passo do
  caminho (e-mail, senha, submit, PIN) confere o popup antes de seguir; detectado, o
  REINICIAR é aplicado e o login é refeito do zero, no máximo 2 tentativas. Erro que **não**
  seja a OTA propaga sem alteração. → `LoginPage.otaReiniciouOApp()`, `fillAndSubmit()`,
  `handlePin()`, `doLogin()`, `launchAndCheckUpdate()`

### HOME — Tela inicial

- [x] **HOME-01**: Exibe saudação com o nome do usuário. → `home.spec.ts`
- [x] **HOME-02**: Busca por "Fudaba" → abre o perfil do cliente → volta para a home e limpa
  o campo. → `home.spec.ts`
- [x] **HOME-03**: Seção Campanhas → "ver todas" → "Campanhas e segmentos" → voltar.
- [x] **HOME-04**: Seção Meus clientes → toggle do botão de info (20×21 pt no iOS, via
  `tapCenter`) → "ver todos" → "Meus clientes" → voltar.
- [x] **HOME-05**: Atalhos Aniversariantes, Cashback expirando e Pós-venda abrem
  "Meus clientes" e voltam para a seção.
- [x] **HOME-06**: Seção "Contatos feitos" aparece após scroll.
- [x] **HOME-07**: Tab bar inferior com Início, Clientes, Campanhas e Menu.

### CLI — Clientes

- [x] **CLI-01**: Título "Meus clientes" ao abrir a aba. → `clientes.spec.ts`
- [x] **CLI-02**: Aba Favoritos exibe "Total de clientes".
- [x] **CLI-03**: Aba Aniversariantes exibe o segmento "Hoje".
- [x] **CLI-04**: Aba Cashback Exp. exibe o segmento "Hoje".
- [x] **CLI-05**: Aba Pós Vendas (nasce fora da tela no iOS — `dragHorizontally`) exibe
  "Contatados".
- [x] **CLI-06**: Em cada aba, as 7 opções de "Ordenar por" (`FILTROS_ORDENACAO`) aplicam
  e resultam em card com botão de ação **ou** mensagem de vazio. **Android ✓ / iOS ✗**
  (bloqueado pelo app — ver Regras invioláveis e `codebase/CONCERNS.md`).
- [x] **CLI-07**: Busca por nome inexistente mostra "Nenhum cliente encontrado!"; limpar a
  busca e resetar a ordenação devolve o estado inicial.

### BLD — Seleção e download do build

- [x] **BLD-01**: `BUILD_PROFILE_ANDROID` / `BUILD_PROFILE_IOS`, `BUILD_SELECTION`
  (`latest` | `date`), `BUILD_FROM` / `BUILD_TO` escolhem o build EAS — o mesmo contrato no
  `scripts/download-build.ts` (local) e no step "Baixa o build do EAS" (CI).
- [x] **BLD-02**: Sem variáveis, cai no build `INTERNAL` finalizado mais recente da
  plataforma. → `resolveBuildSelection()`
- [x] **BLD-03**: Datas inválidas, `BUILD_TO < BUILD_FROM`, `date` sem bordas e
  `BUILD_SELECTION` desconhecido param com erro — cobertos por 24 testes unitários.
  → `scripts/__tests__/download-build.test.ts`
- [x] **BLD-04**: Localmente o APK vai para `C:\dev\apk_arys\arys-latest.apk` e é instalado
  com `adb install -r` no `onPrepare`; `SKIP_DOWNLOAD=true` pula tudo. → `wdio.conf.ts:187-201`
- [x] **BLD-05** *(2026-09-18)*: Artefato Android `.aab` (profile `production`) vira APK
  universal via bundletool **antes** de chegar ao AVD ou ao Device Farm — `.aab` renomeado
  falha no `apksigner` nos dois ("Missing AndroidManifest.xml"). Mesmo script local e no CI.
  → `scripts/convert-aab.ts` (`isAab`, `convertAabToApk`), `download-build.ts`,
  step "Baixa o build do EAS" em `mobile_test.yml`; 9 testes unitários.

### CI — Pipeline

- [x] **CI-01**: Android roda no Device Farm (`us-west-2`) em todo `pull_request`.
  → `.github/workflows/mobile_test.yml`
- [x] **CI-02** *(reescrito 2026-09-17)*: iOS roda no Device Farm em todo `pull_request` e
  no `workflow_dispatch`, na mesma matrix fixa do Android. **Regra inviolável**: nenhum
  input, `if` ou matrix condicional por plataforma em `mobile_test.yml`.
- [x] **CI-03**: Credenciais chegam ao host por canal próprio de cada plataforma e o testspec
  as materializa em `.env`; o log só mostra comprimentos. **Android**: `environmentVariables`
  do `schedule-run` (1 run para o pool). **iOS**: o host não recebe `environmentVariables`
  (medido no MobileWDIO) → o CI gera um `testspec-ios` por run substituindo a linha
  `__CREDENCIAIS_DO_RUN__` e agenda **um run por iPhone** (`--device-selection-configuration`).
  → `mobile_test.yml` (steps "Agenda…"), `testspec*.yml` (reescrito 2026-09-16)
- [x] **CI-06**: Conta por device **opcional**, sem nada amarrado a aparelho: o CI lê o pool
  a cada run (`get-device-pool` → `get-device`, `LC_ALL=C sort`); sem o secret CSV da
  plataforma todos usam `TEST_USER_EMAIL`; com `TEST_USER_ANDROID_EMAILS` /
  `TEST_USER_IOS_EMAILS` o i-ésimo device recebe o i-ésimo e-mail (Android: via
  `TEST_USER_EMAILS` + `TEST_USER_DEVICE_MODELS` e `indexOf(deviceModel)` em runtime; iOS:
  e-mail no testspec do run). Estrutura ✓ (2026-09-16); ativação pendente até um cenário
  escrever no backend (Fase 8). → `test/utils/credentials.ts`, README "Conta por device"
- [x] **CI-04**: O pacote de testes sobe sem `node_modules`, `.git`, `.github`, `.claude`,
  `docs`, `reports` — o Device Farm roda `npm install`.
- [x] **CI-05**: O resultado do Device Farm **não** quebra a esteira; reflete no relatório e
  no `GITHUB_STEP_SUMMARY`.

### REP — Relatórios

- [x] **REP-01**: Vídeo por teste (MediaProjection 720p no DF Android; `startRecordingScreen`
  nos demais; nenhum no Remote Access) e screenshot em falha, ambos anexados ao Allure.
  → `wdio.conf.ts:203-268`
- [x] **REP-02**: `publish-report` gera Allure por plataforma, single-file baixável e publica
  em `run-<n>-<data>/<plat>/` na branch `reports` com `index.html` gerado por
  `scripts/generate-report-index.mjs`.
- [x] **REP-03**: Retenção `KEEP=3` (commit órfão + `--force-with-lease`) e poda dos
  artifacts do Actions das runs removidas. → `docs/ci/retencao-de-relatorios-allure.md`
- [x] **REP-04**: Vídeos re-encodados para H.264 ≤ 720p / 2 Mbps (< 95 MB) com `-nostdin`
  e `timeout` por arquivo; job com `timeout-minutes: 30`.
- [x] **REP-05**: Histórico (aba Trend) preservado por plataforma entre runs, e **por
  aparelho**: `beforeTest` seta `historyId`/`testCaseId`/`parentSuite` com
  `deviceLabel()` (rótulo vindo do host ou do CI — `DEVICE_LABEL` no iOS), para os N devices
  do pool não colapsarem num teste com retries. → `wdio.conf.ts`, `test/utils/device-name.ts`

## Regras invioláveis

Citáveis por qualquer plano. Violação = PR rejeitado.

1. **Uma suíte só.** Nunca spec, page object ou config por plataforma. A divergência entre
   Android e iOS mora **dentro do page object**: locator por `byPlatform({ android, ios })`
   nos getters e `if (IS_IOS) { … } else { … }` só nos métodos cuja interação diverge —
   nunca em spec nem em arquivo por SO. (Decisão de 2026-09-16: a ideia de 2026-09-15 de
   pôr `if` em todo método foi descartada — "igual ao Android".)
2. **Selectors:** Android só XPath por `@text`/`@content-desc`/`@resource-id`/`@hint`; iOS
   só `~` ou `-ios predicate string:`. **XPath no iOS é proibido.** Locator iOS novo só com
   dump real (ou derivado do mesmo literal de texto por predicate) — nunca por analogia.
3. **`browser.pause()` só com comentário** explicando a animação/infra sem elemento
   observável. Fora disso, `waitForDisplayed({ timeout })` / `{ reverse: true }`.
4. **`$()`/`$$()` proibidos em `test/specs/`.** Spec importa a instância da página e chama
   métodos.
5. **DRY / YAGNI:** seletor ou sequência repetida em dois arquivos → vai para a página ou
   `BasePage`; método só nasce com o teste que o usa.
6. **Não mascarar bug de acessibilidade do app** (bottom sheet / empty state iOS) com toque
   por coordenada. A única exceção já existente é `dismissOnboardingSheetIfPresent()`,
   documentada como temporária.
7. **`wdio.conf.ts` só com necessidade comprovada** — uma linha ali afeta os 4 ambientes.
   Problema em uma plataforma = zero linhas no ramo da outra.
8. **Segredos nunca no repositório:** `.env`, `.mcp.json` (PAT do Backstage) e o zip do
   Device Farm não carregam credenciais.
9. **Nunca commitar direto em `main`;** Conventional Commits; branches
   `feat/ fix/ chore/ refactor/ docs/`.
10. **Nenhum teste depende do estado deixado por outro teste** (a partir da Fase 5). Um
    spec/jornada parte de "app fechado", faz o próprio reset no início e roda sozinho com
    `--spec`. Dentro da jornada, cada step valida o estado seguinte antes de prosseguir.
11. **Os testes rodam nos dois pools de dispositivos do AWS Device Farm, sempre.** Existem
    dois pools — Android (`DEVICE_FARM_DEVICE_POOL_ARN`) e iOS
    (`DEVICE_FARM_IOS_DEVICE_POOL_ARN`) — e `mobile_test.yml` agenda um run em cada um em
    todo `pull_request` e todo `workflow_dispatch`, via matrix literal
    `platform: [android, ios]`. Nunca input (`run_ios`), job de "resolve plataformas",
    `if` ou matrix condicional que deixe um pool de fora. Bug do app que derruba um step =
    vermelho no relatório, a esteira segue. Pré-requisito faltando (secret, variable, build)
    = avisar o usuário para criar, nunca desligar o pool. (Regra reafirmada pelo usuário
    mais de uma vez; o gate sobreviveu de 2026-07-06 a 2026-09-17.)
12. **`appium` nunca é dependência do `package.json`** (herdada da referência MobileWDIO,
    run-22; confirmada aqui no run #29). Se estiver lá, o Appium do Device Farm trata o
    pacote de teste como `APPIUM_HOME` e perde os drivers pré-instalados do host. Cada
    plataforma usa o Appium/driver do **seu** host, independente da outra: Android =
    `amazon_linux_2`, Node 22, Appium 3, `uiautomator2@7.6.2` (uninstall + install);
    iOS = `macos_tahoe`, Node 22, Appium 3 com o XCUITest pré-instalado. Nada instalado
    à mão no iOS. Local: `npm i -g appium` (README).

## Requisitos v2 — próximos passos (definidos em 2026-09-15)

Checkbox vazio = ainda não implementado. Cada bloco corresponde a uma fase do `ROADMAP.md`.

### JRN — Jornada E2E única e independente (Fase 5)

- [ ] **JRN-01**: Existe **um único spec** em `specs:` do `wdio.conf.ts` que percorre
  login → home → clientes de ponta a ponta, na ordem do uso real; os 4 specs atuais são
  removidos.
- [ ] **JRN-02**: A jornada cobre os 21 asserts de hoje (OTA, login com campos vazios,
  login + PIN, HOME-01..07, CLI-01..07) — nenhuma verificação se perde na migração.
- [x] **JRN-03**: A jornada roda **sozinha** a partir de "app fechado": reset
  (`relaunchApp`) só no início; nenhum step depende de estado deixado por outro teste ou
  por outra execução (`--spec` só ela é verde). *Por suíte desde 2026-09-15* (`before` =
  `launchAndCheckUpdate()` + `ensureLoggedIn()`); vale para a jornada única quando JRN-01 fechar.
- [x] **JRN-04**: Cada etapa aparece como step nomeado no Allure; em falha, o relatório
  mostra em qual etapa parou, com vídeo e screenshot. *Por suíte desde 2026-09-15*
  (`allureReporter.step()` em cada antigo `it`).
- [ ] **JRN-05**: Verde no AVD `S25Ultra_API35` e no Device Farm Android em PR.
- [ ] **HELP-01**: Fluxos cross-page reutilizáveis (login completo) vivem em
  `test/helpers/` quando mais de uma jornada precisar deles (Fase 5 ou 8).

### CAP — Captura iOS via Remote Access + drafts (Fase 6)

- [x] **CAP-01** *(2026-09-16, campanhas/menu inclusos)*: Um draft por tela da jornada em `.planning/drafts/ios/NN-<tela>.md`
  (login, PIN, popups, home, busca/perfil, clientes com 4 abas + "Ordenar por" + busca,
  campanhas, menu), cada um com "como chegar", capturas, elementos, seletor proposto **com o
  atributo de origem** (`name`/`label`/`value`/predicate), equivalência com o page object,
  timing/gestos e armadilhas.
- [ ] **CAP-02** *(capturas ✓ — 42 pares em 2026-09-16; falta a decisão de versionamento)*:
  Capturas brutas (`getPageSource()` `.xml` + screenshot `.png`) por tela,
  com o ciclo de nó âncora aplicado; decisão explícita sobre versionar ou ignorar
  `.planning/drafts/ios/captures/`.
- [x] **CAP-03** *(2026-09-16)*: `00-INDICE.md` (ordem das telas, pendências, descobertas que mudam a
  estratégia de seletores) e `RELATORIO-ANOMALIAS-IOS.md` (bottom sheet, empty state,
  alerta duplicado, "Pós Vendas" fora da tela, botão 20×21 pt, `clearApp`) atualizados.
- [x] **CAP-04** *(2026-09-16 — seção "Divergências da baseline" do índice; OTA `Reiniciar`, `screen-sign-in` invisível, empty state da busca de clientes mudo, alerta de notificações não duplicado)*: Divergências em relação ao `Locators-iOS-Arys.docx` (baseline de
  2026-08-26) listadas explicitamente — nada é copiado do docx sem reconfirmação; o que não
  apareceu na sessão fica marcado "não capturado".

### IOS — Os 3 specs do Android rodando no iOS (Fase 7)

- [x] **IOS-01** *(2026-09-16, código; validação no device pendente)*: O ramo iOS de cada
  método/locator dos page objects foi corrigido com as capturas da Fase 6 (`drafts/ios/`),
  mantendo a estrutura: `byPlatform` nos getters, `if (IS_IOS)` só onde a interação
  diverge, specs intactos. Divergências novas encapsuladas em `BasePage`: `typeInto()`
  (digitação lenta), `tapUntil()` (1º toque perdido), `signOutIfLoggedInIOS()` (reset sem
  `clearApp`), `handleNotificationPopup()` iOS tratando ATT + notificações + sheet.
- [ ] **IOS-02**: Os mesmos 3 specs rodam no iOS Device Farm (em todo PR);
  `login` e `home` verdes; em `clientes` os steps de "Ordenar por" e "busca sem resultado"
  falham **como hoje** pelo app (sem skip, sem coordenada — regra 6), e isso fica registrado
  no `STATE.md` com o step exato.
- [ ] **IOS-03**: O reset no início de cada spec funciona no iOS via testspec (`clearApp`
  validado no dispatch); no Remote Access, `relaunchApp()` desloga pelo app
  (`btn-menu-sign-out` / `btn-pin-back`) para o spec partir do login.
- [x] **IOS-04** *(2026-09-17)*: `run_ios` removido de `mobile_test.yml` e iOS na matrix
  de todo PR — antecipado, sem esperar a correção do app (CI-02).
- [x] **IOS-05** *(2026-09-16)*: `CLAUDE.md` e `codebase/CONVENTIONS.md` **mantêm** a
  convenção de 2026-08-26 (`byPlatform` + `if` pontual); só a tabela de divergências ganhou
  `typeInto`/`tapUntil`/logout iOS.
- [x] **UPD-02** ✓ (2026-09-16); **CLI-06 (iOS)** e **CLI-07 (iOS)** continuam bloqueados
  pelo app.

### COV — Novos cenários (Fase 8)

Placeholders — cada um vira REQ detalhado ao planejar a fase. Todo cenário novo obedece às
regras 1 e 10 (dois ramos de plataforma; roda isolado).

- [ ] **COV-01**: Campanhas — lista, abas Campanhas/Segmentos, "explorar" (antigo CAMP-*)
- [ ] **COV-02**: Menu — itens da aba Menu e navegação de cada um (antigo MENU-*)
- [ ] **COV-03**: Perfil do cliente — abas Dados / Notas / Histórico / Sugestões e cards
- [ ] **COV-04**: Busca com resultado — lista de resultados e "Buscas Recentes"
- [ ] **COV-05**: Favoritar / desfavoritar cliente e reflexo na aba Favoritos
- [ ] **COV-06**: Home — "Visualizados recentemente", "Estoque", notificações
- [ ] **COV-07**: Contatar cliente (`btn-customer-card-action-*`) — o que abre e como volta
- [ ] **COV-08**: Cenários negativos além de "campos vazios" (credencial inválida, PIN errado)

## Fora de escopo

| Item | Motivo |
|---|---|
| Specs por plataforma | Contraria o valor central; `PLATFORM` + `byPlatform()` resolvem |
| Coordenadas para abrir as opções de "Ordenar por" no iOS | Esconde bug do app; regra 6 |
| Testes unitários/componentes do app Arys | Repositório é só E2E; unit tests aqui cobrem apenas `scripts/` |
| Emuladores iOS locais | Não há host macOS no fluxo; iOS é Device Farm (CI) ou Remote Access |
| Declarar credenciais em `wdio.conf.ts` | Removido em `c383486`; só `.env`/env vars |
| Manter os 4 specs por tela em paralelo à jornada única | Duplicaria asserts e manteria a dependência entre testes que a Fase 5 elimina |

## Rastreabilidade

| Requisito | Fase | Status |
|---|---|---|
| PLAT-01, PLAT-02 | 4 | ✓ |
| PLAT-03, PLAT-04 | 1 (Android) / 4 (iOS) | ✓ |
| AUTH-01..05 | 1 / 4 | ✓ |
| UPD-01 | 1 | ✓ |
| UPD-02 | 6/7 | ✓ (2026-09-16) |
| HOME-01..07 | 1 / 4 | ✓ |
| CLI-01..05, CLI-07 | 1 / 4 | ✓ |
| CLI-06 | 1 (Android ✓) / 7 (iOS) | bloqueado pelo app |
| BLD-01..04 | 3 | ✓ |
| CI-01, CI-03..05 | 2 | ✓ (CI-03 reescrito em 2026-09-16) |
| CI-06 | 7 (passo 0) | estrutura ✓ — ativação quando houver cenário que escreve no backend |
| CI-02 | 4 | ✓ (gate removido em 2026-09-17, IOS-04) |
| REP-01..05 | 2 | ✓ |
| JRN-01..05, HELP-01 | 5 | em andamento — JRN-03/04 por suíte; JRN-01/02/05 pendentes |
| CAP-01..04 | 6 | CAP-01/03/04 ✓; CAP-02 falta decidir versionamento de `captures/` |
| IOS-01..05 | 7 | IOS-01/05 ✓ (código); IOS-02/03 aguardam run no Remote Access + Device Farm; IOS-04 depende do app |
| COV-01..08 | 8 | não iniciado |
| Higiene (`CONCERNS.md` §8–17) | 9 | não iniciado |
