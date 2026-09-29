# Arys Mobile Automation

## O que é

Suíte de testes E2E em **WebdriverIO 9 + Appium 3 + TypeScript** para o app mobile **Arys**
(React Native / Expo, `com.aramis.arys`, projeto EAS do owner `aramis-engenharia`). Os
**mesmos specs rodam em Android e iOS** — não existe arquivo por plataforma — em quatro
ambientes: Android local (AVD `S25Ultra_API35`), Android no AWS Device Farm, iOS no AWS
Device Farm e iOS numa sessão Remote Access do Device Farm.

## Valor central

**Uma suíte só, sem duplicação por plataforma, que roda em todo PR no Device Farm e publica
o relatório Allure com vídeo.** Tudo o que difere entre Android e iOS fica encapsulado em
`byPlatform()` (locators) e em `BasePage` (interações) — os specs não sabem em que
plataforma estão.

## Requisitos

### Validados

- ✓ Login (campos vazios, login + PIN → home) e tratamento dos popups (OTA, ATT, notificações,
  onboarding iOS) — Fase 1, revalidado no iOS na Fase 4
- ✓ Home: saudação, busca → perfil → voltar, campanhas, Meus clientes (info, ver todos,
  atalhos), Contatos feitos, tab bar — Fase 1
- ✓ Clientes: título, 4 abas, 7 filtros de ordenação por aba, busca sem resultado — Fase 1
- ✓ Verificação de atualização OTA antes de qualquer spec — Fase 1
- ✓ CI no AWS Device Farm (Android em todo PR) com credenciais injetadas fora do pacote — Fase 2
- ✓ Allure com vídeo por teste, screenshot em falha, publicação na branch `reports` (GitHub
  Pages) com retenção de 3 runs e poda de artifacts — Fase 2
- ✓ Seleção do build EAS por profile / data, local e no CI, com testes unitários — Fase 3
- ✓ Suíte iOS: capabilities por ambiente, locators capturados em device real, divergências de
  interação encapsuladas — Fase 4 (parcial: ver "Ativos")

### Ativos (sequência definida em 2026-09-15)

- [ ] **Fase 5** — reescrever a suíte como **uma única jornada E2E** (login → home →
  clientes) sem dependência entre testes; os 4 specs atuais saem (JRN-*)
- [ ] **Fase 6** — sessão Remote Access no AWS Device Farm (iPhone + app) para os agentes
  capturarem os elementos iOS e escreverem os drafts em `.planning/drafts/ios/` (CAP-*)
- [ ] **Fase 7** — portar a jornada para o iOS com **`if (IS_IOS)` em cada método/step** do
  page object, usando os elementos capturados — a mesma suíte nos dois SOs (IOS-*).
  Inclui o desbloqueio que depende do **app** (bottom sheet). O gate `run_ios` já foi
  removido (2026-09-17): iOS roda em todo PR
- [ ] **Fase 8** — novos cenários ampliando a cobertura: Campanhas, Menu, perfil do cliente,
  busca com resultado, favoritos… (COV-*)

### Fora de escopo

- Specs, classes ou configs separados por plataforma — a arquitetura proíbe (`wdio.conf.ts`
  + `PLATFORM`)
- Contornar o bug de acessibilidade do bottom sheet iOS com toques por coordenada — regra
  explícita em `CLAUDE.md`; a correção é no app
- Testes unitários / de componente do app Arys — este repositório só cobre E2E
- Manter os 4 specs por tela em paralelo à jornada única — duplicaria asserts e manteria a
  dependência entre testes que a Fase 5 elimina

## Contexto

O repositório nasceu do template Backstage `empty-repo` (catalog
`arys-mobile-e2e-test-automations`, owner `engenharia_qa`). Cresceu em quatro ondas visíveis
no git: POM Android (jun/2026), Device Farm + Allure (jun–ago/2026), seleção de build
(ago/2026) e iOS (ago/2026). Os locators iOS foram capturados em 42 dumps de árvore XCUITest
numa sessão Remote Access (iPhone, iOS 18.3) e consolidados em `Locators-iOS-Arys.docx`
(**não versionado** — está fora do git).

O tooling em `.claude/` (skills, agents, hooks — untracked) veio de um projeto irmão e já
espera esta pasta `.planning/`: o hook `session-start.sh` lê `STATE.md` e o `ROADMAP.md`
em toda sessão.

## Restrições

- **Plataforma**: só a env `PLATFORM` decide Android/iOS; `test/utils/platform.ts` lê em
  import-time (nunca `driver.isIOS`), porque `wdio.conf.ts` consome as mesmas flags
- **Selectors**: Android = XPath (`@text`, `@content-desc`, `@resource-id`, `@hint`);
  iOS = accessibility id (`~`) ou `-ios predicate string:` — **nunca XPath no iOS**; locator
  iOS só de dump real, nunca por analogia
- **Esperas**: `browser.pause()` proibido como substituto de `waitForDisplayed`; só para
  animação/infra sem elemento observável, sempre com comentário inline
- **POM**: `$()`/`$$()` proibidos em specs; DRY (repetiu → vai para a página ou `BasePage`);
  YAGNI (métodos nascem com o teste que os usa)
- **Processo**: PR obrigatório para `main`; Conventional Commits; branches `feat/ fix/
  chore/ refactor/ docs/`; consultar o coding standards do Backstage via MCP antes de editar
- **Segredos**: `.env` e `.mcp.json` nunca commitados; credenciais chegam ao Device Farm como
  `environmentVariables` e viram `.env` só dentro do host

## Decisões-chave

| Decisão | Motivo | Resultado |
|---|---|---|
| Três flags puras (`isDeviceFarm`, `isIOS`, `isRemote`) + builders em `wdio.conf.ts` em vez de configs duplicadas | Um único arquivo decide os 4 ambientes; `if/else` espalhado já custou regressões | Estável desde a Fase 4 |
| `byPlatform({ android, ios })` para locators e `BasePage` para interações divergentes | O `testID` do RN vira `resource-id` no Android e `name` no iOS — a maioria dos ids é igual, o comportamento não | Specs idênticos nas duas plataformas |
| `noReset: true` + `resetAppState()` no início e no fim de cada teste | Reinstalar a cada sessão é lento; o reset via `mobile: clearApp` é suficiente (exceto Remote Access, que o recusa) | Login exercitado de verdade no Device Farm |
| MediaProjection a 720p no Device Farm Android | `startRecordingScreen` truncava em ~37 s na troca de surface; resolução nativa passava de 100 MB e o vídeo sumia do Pages | Vídeo íntegro no relatório |
| Branch `reports` órfã, commit-tree + `--force-with-lease`, `KEEP=3` | Apagar pasta em commit normal não devolve espaço; Pages tem teto de 1 GB | Repositório não cresce (PR #10) |
| `EXPO_PROJECT_ID` lido por `app.config.js` | Sem hardcode do id do projeto no repositório | `eas build:list` resolve o projeto no CI e local |
| **Sem gate por plataforma** no CI (2026-09-17): Android e iOS na matrix fixa, sempre | Decisão do usuário, reafirmada mais de uma vez; o iOS só ganha valor rodando em todo PR, e o Device Farm já não quebra a esteira — o vermelho no relatório é o sinal da dívida | Nunca input/`if`/matrix condicional por plataforma em `mobile_test.yml` |
| Locators iOS só de captura real, documentados no `.docx` | Presumir pelo Android já gerou ciclos "troca o seletor e torce" | Mapa por tela com pendências explícitas |
| **Jornada E2E única** em vez de specs por tela (2026-09-15) | Os `it` de hoje dependem do estado deixado pelo anterior; um fluxo só reflete o uso real, roda isolado e falha na etapa certa | Fase 5 — pendente |
| **`if (IS_IOS)` em cada método** do page object, em vez de `byPlatform()` + `if` pontual (2026-09-15) | Cada plataforma fica legível de cima a baixo dentro do método; decisão do usuário. Substitui a decisão `byPlatform` acima a partir da Fase 7 | Fase 7 — pendente |
| Drafts iOS versionados em `.planning/drafts/ios/` gerados por sessão nova (2026-09-15) | O `.docx` está fora do git e não é diff-ável; os agentes `mobile-ui-inspector` + `mobile-draft-writer` já esperam esse caminho | Fase 6 — pendente |

---
*Atualizado em 2026-09-15 — estrutura GSD criada e próximos passos (Fases 5–9) definidos com
o usuário.*
