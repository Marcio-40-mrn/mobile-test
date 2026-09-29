# Estrutura

## Árvore anotada

```
.
├── .github/workflows/
│   ├── mobile_test.yml          pipeline Device Farm (jobs setup → device-farm → publish-report)
│   └── techdocs.yml             publica docs/ no Backstage (workflow reutilizável da org)
├── .claude/                     (inteira gitignored; regras Aramis vivem no CLAUDE.md da raiz)
│   ├── agents/ hooks/ skills/   tooling local
│   └── settings*.json           (untracked) hooks SessionStart + bloqueio de GitHub
├── .planning/                   ← esta pasta (GSD)
├── docs/
│   ├── index.md                 placeholder do TechDocs
│   ├── ci/retencao-de-relatorios-allure.md   doc portátil do publish-report
│   └── superpowers/{specs,plans}/2026-06-17-login-page-object*.md   design/plano da Fase 1
├── scripts/
│   ├── download-build.ts        eas build:list → filtra → baixa para C:\dev\apk_arys
│   ├── __tests__/download-build.test.ts   vitest (24 casos)
│   ├── generate-report-index.mjs          index.html da branch reports
│   ├── package-tests.ps1 + _zip_helper.py zip manual para o Device Farm
├── test/
│   ├── pages/
│   │   ├── base.page.ts         popups, texto, gestos, ciclo de vida do app
│   │   ├── login.page.ts        + requireEnv(), EMAIL/SENHA/PIN, doLogin(), ensureLoggedIn(), launchAndCheckUpdate()
│   │   ├── home.page.ts         tab bar, busca, campanhas, Meus clientes, atalhos
│   │   └── clientes.page.ts     abas, ordenação, busca; FILTROS_ORDENACAO
│   ├── specs/
│   │   ├── login.spec.ts             1 it, 2 steps  — cada spec é autossuficiente
│   │   ├── home.spec.ts              1 it, 8 steps
│   │   └── clientes.spec.ts          1 it, 10 steps
│   ├── utils/platform.ts        IS_IOS, APP_ID, byPlatform()
│   ├── screenshots/ videos/     (gitignored) saída local
│   └── helpers/                 previsto em CLAUDE.md — ainda não existe
├── wdio.conf.ts                 config única dos 4 ambientes
├── testspec.yml                 Device Farm Android (Node 22, Appium 3, uiautomator2)
├── testspec-ios.yml             Device Farm iOS (host macos_tahoe, Node 22, Appium 3 + XCUITest, PLATFORM=ios)
├── app.config.js                expo.extra.eas.projectId ← EXPO_PROJECT_ID
├── eas.json                     { "build": {} }
├── catalog-info.yml mkdocs.yml  Backstage / TechDocs
├── CLAUDE.md                    guia do repositório (comandos, arquitetura, convenções)
├── README.md                    guia humano (cenários, .env, seleção de build, CI, Pages)
├── Locators-iOS-Arys.docx       (fora do git) mapa Android→iOS por tela
└── .env / .mcp.json             (gitignored) credenciais locais / PAT do Backstage
```

## Convenções de nome

| Coisa | Padrão | Exemplo |
|---|---|---|
| Page object | `<tela>.page.ts`, classe `<Tela>Page`, singleton `export const <tela>Page` | `clientes.page.ts` → `ClientesPage` → `clientesPage` |
| Spec | `<funcionalidade>.spec.ts`; sem prefixo de ordem (specs são independentes) | `clientes.spec.ts` |
| Locator | getter em camelCase descrevendo o elemento | `sortFilterBtn`, `noResultsMessage` |
| Método de espera | `waitFor<Coisa>()` | `waitForTitle()`, `waitForGreeting()` |
| Método condicional | `<ação>IfPresent()` | `dismissUpdatePopupIfPresent()` |
| Env de credencial | `TEST_USER_*` | `TEST_USER_PIN` |
| Env de build | `BUILD_*` | `BUILD_PROFILE_ANDROID` |
| Artifacts do CI | `allure-{results,report}-<plat>-<run_number>` | `allure-report-android-42` |
| Pasta no Pages | `run-<run_number>-<YYYY-MM-DD>/<plat>/` | `run-42-2026-08-26/android/` |

## Onde adicionar

| Quero… | Faço… |
|---|---|
| Testar uma tela nova | `test/pages/<tela>.page.ts` (estende `BasePage`) + `test/specs/<tela>.spec.ts` + entrada em `specs:` de `wdio.conf.ts:156` (a lista é explícita, não glob) |
| Um locator que difere por plataforma | getter com `$(byPlatform({ android: '<xpath>', ios: '~<id>' }))` — iOS só de dump real |
| Um locator igual nas duas | getter com `$('~<id>')` direto (ex.: abas de clientes) |
| Uma interação que se comporta diferente no iOS | método em `BasePage` com `if (IS_IOS)` dentro; a página chama o método |
| Um fluxo que atravessa páginas (usado por 2+ specs) | hoje vai em `LoginPage` (`doLogin`); a convenção prevê `test/helpers/` quando o segundo fluxo aparecer |
| Uma variável de ambiente nova | `.env` local + secret/var no GitHub + (se o teste precisa dela no device) `environmentVariables` no `schedule-run` e `printf` no `testspec*.yml` |
| Uma dependência | `devDependencies`; toda mudança exige run real no Device Farm (o host faz `npm install`) |
| Documentação humana | `README.md` (como rodar) / `CLAUDE.md` (regras) / `docs/` (TechDocs) |
| Estado, decisões, próximos passos | `.planning/` |
