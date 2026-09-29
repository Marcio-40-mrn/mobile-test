# Roadmap: Arys Mobile Automation

**Granularidade:** uma fase = uma capacidade entregue de ponta a ponta (spec verde no
ambiente-alvo + doc atualizada). Fases 1–4 são retroativas, reconstruídas do `git log` e dos
PRs; 5–7 são o trabalho pendente.

## Visão geral

O projeto saiu de "suíte Android local" para "suíte única Android + iOS rodando no Device
Farm com relatório publicado". A próxima etapa (definida em 2026-09-15) muda a forma da
suíte: **uma jornada E2E única e independente** no Android, **captura fresca dos elementos
iOS** em sessão Remote Access com os agentes, **port da jornada para iOS com `if (IS_IOS)`
em cada método** do page object, e só então **novos cenários**. O desbloqueio iOS que
depende do app (bottom sheet) vira subitem da Fase 7.

## Fases

- [x] **Fase 1: Fundação Android + Page Object Model** — specs de login, home, clientes e
  OTA sobre `BasePage`/`LoginPage`/`HomePage`/`ClientesPage` (concluída 2026-06-18)
- [x] **Fase 2: Device Farm CI + Allure + publicação** — Android em todo PR, vídeo por
  teste, branch `reports` com retenção (concluída 2026-08-11)
- [x] **Fase 3: Seleção de build EAS** — profile/data por plataforma, local e CI, com unit
  tests (concluída 2026-08-26)
- [x] **Fase 4: Suíte iOS** — capabilities por ambiente, locators de dump real, divergências
  em `BasePage`, job gated (concluída 2026-08-26, com bloqueador conhecido)
- [ ] **Fase 5: Jornada E2E única e independente (Android)** — **em andamento / fase atual**
  — um único fluxo login → home → clientes substitui os 4 specs; nenhum step depende de
  estado deixado por outro teste
- [ ] **Fase 6: Captura iOS via Remote Access + drafts** — sessão AWS com iPhone; os agentes
  capturam a árvore de cada tela e escrevem `.planning/drafts/ios/` — **1ª sessão feita em
  2026-09-16 (42 capturas, 11 drafts + índice + anomalias); faltam decisão sobre versionar
  `captures/` e 3 pendências**
- [ ] **Fase 7: Port da jornada para iOS com `if (IS_IOS)` por método** — a mesma suíte roda
  nos dois SOs; absorve o desbloqueio iOS (bottom sheet, `clearApp`, OTA, gate)
- [ ] **Fase 8: Novos cenários (cobertura)** — Campanhas, Menu, perfil do cliente, busca com
  resultado, favoritos…
- [ ] **Fase 9: Higiene** — dívidas listadas em `codebase/CONCERNS.md`

## Detalhe das fases

### Fase 1: Fundação Android + Page Object Model

**Objetivo**: toda interação passa por page objects; specs sem `$()`; fluxo de login
robusto a popups.
**Depende de**: —
**Requisitos**: PLAT-03, PLAT-04, AUTH-01..05, UPD-01, HOME-01..07, CLI-01..07
**Critérios de sucesso** (o que precisa ser verdade):
  1. `login.spec.ts`, `home.spec.ts`, `clientes.spec.ts` e `00-update-check.spec.ts` verdes
     no AVD `S25Ultra_API35`
  2. Nenhum `$()` em `test/specs/`
  3. Credenciais fora do `wdio.conf.ts` (`.env`)
**Entregue em**: PR #2 (`feat/page-object-design-model`), commits `6e0192c`..`c383486`;
design em `docs/superpowers/specs/2026-06-17-login-page-object-design.md`

### Fase 2: Device Farm CI + Allure + publicação

**Objetivo**: cada PR roda a suíte Android no AWS Device Farm e publica um relatório Allure
com vídeo, sem crescer o repositório.
**Depende de**: Fase 1
**Requisitos**: CI-01, CI-03, CI-04, CI-05, REP-01..05
**Critérios de sucesso**:
  1. `mobile_test.yml` sobe app + pacote + testspec, agenda o run e coleta `allure-results`
  2. Vídeo íntegro (MediaProjection 720p) e screenshot em falha no relatório
  3. Branch `reports` mantém só os `KEEP=3` runs mais recentes; artifacts podados
  4. Publicação nunca pendura (`timeout-minutes`, ffmpeg `-nostdin`)
**Entregue em**: PRs #4, #5, #6, #8, #9 (scroll em devices pequenos), #10 (retenção);
doc portátil em `docs/ci/retencao-de-relatorios-allure.md`

### Fase 3: Seleção de build EAS

**Objetivo**: escolher qual build do EAS baixar (profile, mais recente ou por intervalo de
datas) com o mesmo contrato local e no CI.
**Depende de**: Fase 2
**Requisitos**: BLD-01..04
**Critérios de sucesso**:
  1. `BUILD_PROFILE_ANDROID/IOS`, `BUILD_SELECTION`, `BUILD_FROM/TO` funcionam em
     `scripts/download-build.ts` e no step do workflow
  2. Sem variáveis, comportamento histórico (`internal` mais recente)
  3. `npx vitest run scripts` verde (24 casos)
**Entregue em**: PR #11 (`feat-download-build`, `b5d85de`)

### Fase 4: Suíte iOS

**Objetivo**: os mesmos specs rodam no iOS (Device Farm e Remote Access) sem arquivo por
plataforma.
**Depende de**: Fase 3
**Requisitos**: PLAT-01, PLAT-02, CI-02; revalidação de AUTH, HOME, CLI no iOS
**Critérios de sucesso**:
  1. `buildCapabilities()` cobre os 4 ambientes; iOS DF com `usePrebuiltWDA`; Remote Access
     sem ela
  2. Locators iOS só de dump real (`Locators-iOS-Arys.docx`, 42 dumps, iOS 18.3)
  3. Divergências (busca, PIN, ATT, alerta duplicado, scroll, tap pequeno, drag da tab bar,
     onboarding) encapsuladas em `BasePage`
  4. Job iOS no workflow, gated por `run_ios`
**Resultado**: 16 de 21 casos verdes no iOS. Os 5 de "filtros de ordenação" falham por bug de
acessibilidade do app (bottom sheet e empty state sem filhos na árvore XCUITest) —
documentado no cabeçalho de `testspec-ios.yml`, em `CLAUDE.md` e em `codebase/CONCERNS.md`.
**Entregue em**: PR #12 (`feat-test-for-ios`, `2e81681`)

### Fase 5: Jornada E2E única e independente (Android) — em andamento (fase atual)

**Objetivo**: substituir os 4 specs por **um único fluxo E2E** (login → home → clientes)
em que cada step valida o estado seguinte e **nenhum teste depende do estado deixado por
outro**. Hoje `clientes.spec` herda a aba/ordenação do `it` anterior, `home.spec` deixa
busca e scroll para o próximo, e `login.spec`/`00-update-check` só funcionam depois de
`relaunchApp()` — rodar um `it` isolado com `--mochaOpts.grep` não é confiável.
**Depende de**: —
**Requisitos**: JRN-01..05, HELP-01
**Critérios de sucesso** (o que precisa ser verdade):
  1. Um único arquivo em `specs:` do `wdio.conf.ts` cobre os 21 asserts atuais (OTA, login
     com campos vazios, login + PIN, home, clientes) na ordem do uso real
  2. Verde no AVD `S25Ultra_API35` e no Device Farm Android (PR)
  3. Roda sozinho a partir de "app fechado": reset (`relaunchApp`) **só no início**; nada
     de `relaunchApp` ou `ensureLoggedIn` no meio do fluxo
  4. Steps nomeados no Allure (`allureReporter.addStep`/`startStep`) — o relatório mostra
     em qual etapa a jornada parou
  5. Sem `$()` no spec; cada ação continua num page object; fluxos cross-page (login) vão
     para `test/helpers/` (HELP-01) se mais de uma jornada precisar deles
  6. Os 4 specs antigos removidos (não ficam em paralelo — decisão em `PROJECT.md`)
**Planos**:
  - [x] **Passo 1 (2026-09-15)** — suítes independentes: `00-update-check` vira
    `LoginPage.launchAndCheckUpdate()` no preparo de cada spec; cada spec tem **um único
    `it`** com os antigos `it` como `allureReporter.step()`; `mochaOpts.timeout` = 600 s.
    Cobre os critérios 2–5 **por suíte**. Ver
    `phases/05-jornada-e2e-unica/2026-09-15-suites-independentes.md`.
    **Ajuste 2026-09-17**: o preparo saiu do `beforeEach` e virou o **1º step do `it`**
    (`preparo: …`) — hook quebrado pulava o `it` e chegava ao Allure sem status/device/print
    (run #31 iOS). Só `afterEach` (`resetAppState`) continua hook.
    **Ajuste 2026-09-22 (UPD-03)**: o popup OTA passou a ser conferido em **cada passo**
    do caminho abrir → login → PIN → home, não só nos 3 pontos fixos; detectado, o
    REINICIAR é aplicado e o login é refeito (máx. 2 tentativas). O step 3 do
    `login.spec.ts` chama `doLogin()`. Ver
    `plans/2026-09-22-ota-em-qualquer-ponto-do-login.md`.
  - [ ] **Passo 2** — fundir as 3 suítes em uma jornada única (critérios 1 e 6; JRN-01).
    Perguntas em aberto em `phases/05-jornada-e2e-unica/05-CONTEXT.md`.

### Fase 6: Captura iOS via Remote Access + drafts

**Objetivo**: ter, versionado e legível, um draft por tela da jornada com a árvore XCUITest
real do app — a base para a Fase 7. A baseline é o `Locators-iOS-Arys.docx` (42 dumps,
2026-08-26); os drafts **confirmam ou contradizem** o docx, não o copiam.
**Depende de**: Fase 5 (a jornada define quais telas capturar) e de um **pré-requisito
manual do usuário**: sessão Remote Access no console AWS Device Farm com iPhone e o `.ipa`
do Arys instalado; `REMOTE_HOST`, `REMOTE_PORT`, `REMOTE_PATH_IOS` no `.env`. A URL
pré-assinada expira em ~20 min → capturar por lotes de tela e reabrir a sessão.
**Requisitos**: CAP-01..04
**Como**: `mobile-ui-inspector` abre sessão Appium contra o endpoint (mesmas capabilities
do bloco Remote Access de `wdio.conf.ts`), navega até a tela, aplica o ciclo de nó âncora,
salva `getPageSource()` + screenshot em `.planning/drafts/ios/captures/<NN-tela>.{xml,png}`;
em paralelo o `mobile-draft-writer` lê as capturas e escreve
`.planning/drafts/ios/NN-<tela>.md` (seções: como chegar, capturas, elementos, seletor
proposto com origem do atributo, equivalência com o page object, timing/gestos, armadilhas),
mantendo `00-INDICE.md` (ordem, pendências, descobertas) e `RELATORIO-ANOMALIAS-IOS.md`.
**Telas** (ordem da jornada): login → PIN → popups (ATT, notificações, onboarding; OTA se
aparecer) → home → busca/perfil do cliente → clientes (4 abas, "Ordenar por", busca) →
campanhas → menu (as duas últimas para a Fase 8).
**Critérios de sucesso**:
  1. Um draft por tela acima, cada seletor com o atributo de origem (`name`/`label`/
     `value`/predicate) e marcado "inferido, não verificado" quando for o caso
  2. Anomalias já conhecidas reconfirmadas ou refutadas: bottom sheet e empty state sem
     filhos, alerta de notificações duplicado, "Pós Vendas" com x negativo, botão de info
     20×21 pt, `clearApp` recusado
  3. `00-INDICE.md` lista pendências (o que não apareceu — ex.: popup OTA) e as descobertas
     que mudam a estratégia de seletores
  4. Decidido e aplicado se `captures/` (xml/png) entra no git ou no `.gitignore`
**Planos**:
  - [x] **Sessão 1 (2026-09-16)** — jornada inteira capturada numa sessão Remote Access de
    50 min (`scripts/ios-capture.mjs`: um `getPageSource()` + um print por tela):
    splash → OTA (nativo, **`Reiniciar`**, nunca antes visto) → login (ids, erros) → PIN →
    ATT + notificações + onboarding → home → busca/perfil → campanhas → meus clientes
    (4 abas, arrasto) → "Ordenar por" → busca vazia → menu. Drafts `01`–`11`, `00-INDICE.md`
    e `RELATORIO-ANOMALIAS-IOS.md` escritos pelo `mobile-draft-writer`; notas do inspetor em
    `captures/NOTAS-SESSAO-2026-09-16.md`. Descoberta paralela: senha por ambiente
    (`TEST_USER_PASSWORD_IOS`).
  - [ ] Pendências: 2º toque no `btn-customer-section-info` (tooltip), `clearApp` fora do
    Remote Access, opções do sheet (depende do app); **decidir se `captures/` (13 MB, xml+png)
    entra no git** (critério 4).

### Fase 7: Port da jornada para iOS com `if (IS_IOS)` por método

**Objetivo**: a mesma jornada da Fase 5 roda no iOS. **Convenção nova (decisão do usuário,
2026-09-15)**: cada método/step do page object tem os dois ramos explícitos —
`if (IS_IOS) { … } else { … }` — cobrindo locator e interação, com os elementos dos drafts
da Fase 6. `byPlatform()` deixa de ser o mecanismo principal (fica, no máximo, como helper
interno); `BasePage` mantém os helpers que já encapsulam o XCUITest.
**Depende de**: Fases 5 e 6. **Dependências externas** herdadas do antigo "Desbloqueio
iOS": (a) correção no app — `accessible={false}` no container do `@gorhom/bottom-sheet` +
`testID` por opção, e o mesmo para o card de empty state; (b) ~~confirmar se `mobile: clearApp`
funciona no iOS via testspec~~ **confirmado que NÃO (run #30, 2026-09-17: "This extension is
only supported on simulators" nos 5 iPhones)** — reset iOS tem que ser por logout no app ou
reinstalação (`removeApp` + `installApp`); (c) ~~popup OTA iOS nunca capturado~~ capturado na
Fase 6 (alerta nativo `Reiniciar`) e tratado no run #30.
**Requisitos**: IOS-01..05, CLI-06 (iOS), UPD-02
**Critérios de sucesso**:
  1. Todo método dos page objects da jornada tem os dois ramos; nenhum spec ou arquivo por
     SO; `IS_IOS` continua vindo de `test/utils/platform.ts`
  2. Jornada verde no iOS Device Farm (em todo PR), **exceto** os steps que
     dependem da correção do app — esses ficam marcados no spec e no relatório
  3. ~~Reset no início da jornada funciona no iOS via testspec (`clearApp`)~~ — `clearApp`
     não existe em device real (run #30); hoje `signOutIfLoggedInIOS()` cobre o app reaberto
     logado. **Decisão pendente**: reinstalação (`removeApp`+`installApp`) ou aceitar o logout
  4. ~~Locator iOS do popup OTA validado~~ validado no run #30 (alerta nativo, botão
     `Reiniciar`, fechado por `mobile: alert`)
  5. ~~Quando o app corrigir o sheet: `run_ios` removido de `mobile_test.yml` e iOS em todo PR~~
     feito em 2026-09-17, antecipado (CI-02/IOS-04)
  6. `CLAUDE.md` (seção de selectors) e `codebase/CONVENTIONS.md` atualizados para a
     convenção nova **junto com o código**
**Planos**:
  - [x] **Passo 0 (2026-09-16) — CI iOS no modelo MobileWDIO**, feito antes da Fase 6 por
    decisão do usuário: um run por iPhone com credenciais injetadas no testspec (o host
    iOS não recebe `environmentVariables`), pool lido a cada run (nada amarrado a
    aparelho), conta por device opcional via CSV (CI-06), rótulo por aparelho no Allure,
    retry no `npm install`, guardas de credencial vazia, vídeo iOS em `libx264`. Cobre os
    pré-requisitos de IOS-02/IOS-03. Lições e mapeamento em
    `codebase/LICOES-CI-MOBILEWDIO.md`. **Validado no run #30 (2026-09-17)** — depois de
    3 correções de infra medidas nos artefatos do DF: gate `run_ios` removido (#28 foi o 1º
    PR com os dois pools); `ios_test_host: macos_tahoe` + `devicefarm-cli` (sem `nvm`; o
    legado não existe para iOS 26); `appium` fora do `package.json` (com ele o host perdia os
    drivers — regra 12). Vídeo iOS = artefato VIDEO do próprio DF (host sem ffmpeg).
  - [x] **Passo 1 (2026-09-16) — ramo iOS corrigido pelas capturas**, "igual ao Android":
    estrutura mantida (`byPlatform` + `if` pontual; a convenção "if em todo método" de
    2026-09-15 foi descartada), specs intactos, sem skip. `BasePage`: `typeInto`, `tapUntil`,
    `signOutIfLoggedInIOS`, popups pós-PIN em sequência; `LoginPage`: âncora
    `scroll-sign-in`, erro de credencial nomeado, espera pós-PIN; `HomePage`: busca no
    campo da home + tecla Search, toques validados; `ClientesPage`: abas por posição +
    seleção confirmada, busca com digitação lenta. "Ordenar por" e "busca sem resultado"
    continuam falhando no iOS pelo app.
  - [~] **Passo 2 — validação** (em andamento): run de PR com os dois pools ✓ (#30/#31:
    sessão XCUITest nos 5 iPhones, 3 suítes executadas, relatório iOS publicado). **Bloqueio
    atual**: secret `TEST_USER_PASSWORD_IOS` ausente no GitHub → login recusado nos 5; o
    workflow agora exige o secret (para no agendamento). Depois do login passar: Remote
    Access (usuário abre a sessão), regressão Android no AVD, ordem dos handlers de popup
    (ATT antes do OTA nativo — ruído de ~3 s), custo do `mobile: alert` sem alerta (35–47 s).

### Fase 8: Novos cenários (cobertura)

**Objetivo**: ampliar a cobertura além da jornada básica, cada cenário nascendo já
independente (regra da Fase 5) e com os dois ramos de plataforma (regra da Fase 7).
**Depende de**: Fase 7 (ou Android-first, se o app atrasar a correção)
**Requisitos**: COV-01..08 (placeholders — detalhar ao planejar)
**Candidatos** (ids iOS já conhecidos do `.docx`; dumps Android de Campanhas/Menu em
`git show 7d74ef6^:docs/testids/{campanhas,menu}.xml`):
  - Campanhas: lista, abas `~segmented-control-tab-campanhas` / `-segmentos`,
    `~btn-campaign-dashboard-explore`
  - Menu: itens da aba `~tab-menu-5` (não mapeado — capturar na Fase 6)
  - Perfil do cliente: abas `~tab-index-0` (Dados), `~tab-notes-1`, `~tab-purchases-2`,
    `~tab-recommendations-3`; cards `~customer-data-*`, `~customer-contact-*`
  - Busca com resultado: `~list-customer-search-results`, "Buscas Recentes"
  - Favoritar/desfavoritar: `btn-customer-card-star-<id>` e reflexo na aba Favoritos
  - Home: "Visualizados recentemente", "Estoque", notificações (`~greeting-header-notifications`)
  - Contatar cliente: `btn-customer-card-action-<id>` (o que abre?)
**Critérios de sucesso**: cada cenário novo é um spec/jornada que roda isolado, verde nos
dois SOs (exceto bloqueios documentados), com REQ próprio em `REQUIREMENTS.md`.
**Planos**: não planejada — `/gsd:plan-phase 8`.

### Fase 9: Higiene

**Objetivo**: fechar as dívidas pequenas que não justificam fase própria.
**Depende de**: —
**Itens** (detalhe em `codebase/CONCERNS.md`): `.env.example` ausente; ~~dependência `i`
acidental~~ (removida em 2026-09-15); `docs/index.md` placeholder do TechDocs; `.gitignore` ignorando `docs/` e
`.claude/` já versionados; `Locators-iOS-Arys.docx` fora do git (parcialmente resolvido pela
Fase 6); caminhos Windows hardcoded em `wdio.conf.ts`/`download-build.ts`; ~~`appium`
duplicado (devDependency + `devicefarm-cli use appium 3`)~~ (resolvido em 2026-09-17 —
regra 12); README/CLAUDE.md citando
`_devicefarm-run.yml` e `.mcp.json.example` removidos.

## Progresso

| Fase | Planos concluídos | Status | Concluída em |
|---|---|---|---|
| 1. Fundação Android + POM | retroativo | ✓ | 2026-06-18 |
| 2. Device Farm CI + Allure | retroativo | ✓ | 2026-08-11 |
| 3. Seleção de build EAS | retroativo | ✓ | 2026-08-26 |
| 4. Suíte iOS | retroativo | ✓ (bloqueador conhecido) | 2026-08-26 |
| 5. Jornada E2E única (Android) | 1/2 | em andamento — suítes independentes prontas; falta fundir | — |
| 6. Captura iOS + drafts | 1/2 | drafts da jornada prontos; pendências + decisão sobre `captures/` | — |
| 7. Specs do Android no iOS | passos 0–1 ✓, passo 2 em andamento | infra iOS validada no DF (run #30); bloqueio = secret `TEST_USER_PASSWORD_IOS`; depois: Remote Access, AVD, popups; "Ordenar por" e busca vazia dependem do app | — |
| 8. Novos cenários | 0/? | não iniciada | — |
| 9. Higiene | 0/? | não iniciada | — |
