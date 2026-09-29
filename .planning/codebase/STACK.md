# Stack

Fonte: `package.json`, `tsconfig.json`, `testspec.yml`, `testspec-ios.yml`,
`.github/workflows/mobile_test.yml`. Versões são as declaradas (ranges `^`).

## Linguagem e runtime

| Item | Versão | Onde |
|---|---|---|
| TypeScript | `^6.0.2`, `strict`, `commonjs`, `ES2020` | `tsconfig.json` |
| Compilação em runtime | `ts-node` `^10.9.2` com `transpileOnly: true` | `wdio.conf.ts:148-154` |
| Node (CI / Device Farm Android) | 22 | `mobile_test.yml` (`setup-node`), `testspec.yml` (`devicefarm-cli use node 22`) |
| Node (Device Farm iOS) | 22 via `devicefarm-cli use node 22` no host `macos_tahoe` (`ios_test_host`); Appium 3 via `devicefarm-cli use appium 3` já traz o driver XCUITest. Sem `ios_test_host` o DF cai no host legado (`nvm`, Appium 2, driver ausente) — run #28, 2026-09-17 | `testspec-ios.yml` |
| Node (local) | 18+ | README |

## Test runner e drivers

| Item | Versão | Papel |
|---|---|---|
| `@wdio/cli`, `local-runner`, `mocha-framework`, `spec-reporter`, `types` | `^9.27.0` | WebdriverIO 9, framework Mocha (`ui: bdd`) |
| `@wdio/appium-service` | `^9.27.0` | Sobe o Appium local com `relaxedSecurity` (só quando não é DF nem Remote) |
| `appium` | **não é devDependency** (3.7.0 só como peer transitiva do `uiautomator2`) — regra 12; local = `npm i -g appium` (README) | Se declarado, o Appium do host trata o pacote de teste como `APPIUM_HOME` e perde os drivers pré-instalados (run #29) |
| `appium-uiautomator2-driver` | `^7.1.2` (lock 7.6.2) | Android. No DF: `appium driver uninstall uiautomator2; appium driver install uiautomator2@7.6.2` (troca o v6 do host pela versão de sempre) |
| XCUITest driver | o pré-instalado no `APPIUM_HOME` do host `macos_tahoe` (vem com `devicefarm-cli use appium 3`); nada no `package.json`, nada instalado à mão | iOS |
| `expect-webdriverio`, `@wdio/globals/types` | via types do tsconfig | `expect(...).toBe(true)` nos specs |

## Relatórios

| Item | Versão | Uso |
|---|---|---|
| `@wdio/allure-reporter` | `^9.29.1` | `allure-results` (+ anexos de vídeo/screenshot) |
| `allure-commandline` | `^2.43.0` | `generate`/`open` no `onComplete`; `--single-file` no CI |
| `wdio-html-nice-reporter` | `^8.1.7` | Só local (`reports/html/report.html`) |
| ffmpeg / ffprobe | apt no runner | Re-encode H.264 no `publish-report` |

## Unit tests

| Item | Versão | Uso |
|---|---|---|
| `vitest` | `^2.0.0` | `scripts/__tests__/`; rodar **sempre** `npx vitest run scripts` (sem o path ele coleta os specs WDIO e falha) |

## Utilitários

| Item | Versão | Uso |
|---|---|---|
| `dotenv` | `^16.4.5` | `import 'dotenv/config'` em `wdio.conf.ts`, `download-build.ts`; opcional em `app.config.js` |
| `cross-env` | `^7.0.3` | `npm run wdio:ios` seta `PLATFORM=ios` no Windows |
| EAS CLI | global (`npm i -g eas-cli`) | `eas build:list --json` |
| AWS CLI v2 | runner | `aws devicefarm create-upload / schedule-run / get-run / list-artifacts` |
| `jq`, `zip`, `curl` | runner | Filtragem do JSON do EAS, pacote, uploads |
| PowerShell + Python 3 | local | `scripts/package-tests.ps1` chama `scripts/_zip_helper.py` |
| `gh` | runner | Poda de artifacts via API |

## Lockfile

Só `devDependencies`; a dependência acidental `i` foi removida em 2026-09-15. O
`package-lock.json` foi regenerado do zero na mesma data (o do merge `2050647` estava
inconsistente e derrubava o WDIO no Device Farm — ver `CONCERNS.md` 16b). `npm ci` não
funciona aqui por causa do `npm-shrinkwrap.json` aninhado do `appium-uiautomator2-driver`;
o CI e o Device Farm usam `npm install --prefer-offline`.

## Configuração

- `tsconfig.json` inclui `test/**`, `scripts/**`, `wdio.conf.ts`; `outDir: ./dist` (gitignored)
- `eas.json` é `{ "build": {} }` — só existe para o EAS CLI aceitar o diretório
- `app.config.js` expõe `expo.extra.eas.projectId` a partir de `EXPO_PROJECT_ID`; **lança**
  se ausente. Não existe `app.json`
- `mkdocs.yml` + `catalog-info.yml` — TechDocs/Backstage (`techdocs-ref: dir:.`)
