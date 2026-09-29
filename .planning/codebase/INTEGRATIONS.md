# Integrações

Só **nomes** de variáveis e secrets aparecem aqui. Valores ficam em `.env` (local, gitignored)
e em GitHub Secrets/Variables.

## Expo / EAS

| Item | Detalhe |
|---|---|
| Projeto | slug `arys`, owner `aramis-engenharia`; id via `EXPO_PROJECT_ID` → `app.config.js` → `expo.extra.eas.projectId` |
| Comando | `eas build:list --platform <android\|ios> [--build-profile X \| --distribution internal] --limit N --status finished --json --non-interactive` |
| Auth | `EXPO_TOKEN` (expo.dev → Account Settings → Access Tokens) |
| Local | `scripts/download-build.ts` → `C:\dev\apk_arys\arys-latest.{apk,ipa}`; `adb install -r` no `onPrepare` |
| CI | step "Baixa o build do EAS" em `mobile_test.yml` — mesmo contrato de env, filtro via `jq` |
| Seleção | `BUILD_PROFILE_ANDROID`, `BUILD_PROFILE_IOS`, `BUILD_SELECTION` (`latest`\|`date`), `BUILD_FROM`, `BUILD_TO` (`YYYY-MM-DD`, inclusivos) |

## AWS Device Farm

| Item | Detalhe |
|---|---|
| Região | `us-west-2` |
| Auth (CI) | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` (IAM com `devicefarm:*`) |
| Projeto / pools | `DEVICE_FARM_PROJECT_ARN`, `DEVICE_FARM_DEVICE_POOL_ARN` (Android), `DEVICE_FARM_IOS_DEVICE_POOL_ARN` |
| Uploads | `ANDROID_APP`/`IOS_APP`, `APPIUM_NODE_TEST_PACKAGE` (zip sem `node_modules`), `APPIUM_NODE_TEST_SPEC` (`testspec.yml` / `testspec-ios.yml`) — create → PUT S3 → poll até `SUCCEEDED` |
| Run | `schedule-run --test {type: APPIUM_NODE} --configuration {environmentVariables: TEST_USER_*}`; nome `CI <plat> #<run_number>` |
| Detecção no host | `DEVICEFARM_DEVICE_UDID` (→ `isDeviceFarm`), `DEVICEFARM_LOG_DIR`, `DEVICEFARM_APP_PATH`, `DEVICEFARM_DEVICE_NAME`, `DEVICEFARM_DEVICE_PLATFORM_NAME`, `DEVICEFARM_DEVICE_OS_VERSION`, `DEVICEFARM_TEST_PACKAGE_PATH`, `DEVICEFARM_APPIUM_WDA_DERIVED_DATA_PATH[_V<N>]` (legado: `DEVICEFARM_WDA_DERIVED_DATA_PATH[_V9]`) |
| Artefatos | `$DEVICEFARM_LOG_DIR` → "Customer Artifacts" zip → `allure-results/` (o CI acha a pasta com `find`) |
| Remote Access (iOS) | sessão interativa no console; endpoint Appium por URL pré-assinada: `REMOTE_HOST` (`devicefarm-interactive-global.us-west-2.api.aws`), `REMOTE_PORT` (443), `REMOTE_PATH_IOS`. Expira em ~20 min (`403 AccessDeniedException`). Recusa `mobile: clearApp` e `usePrebuiltWDA`; sem gravação de tela; o host injeta app/udid/deviceName/platformVersion |

## GitHub Actions

| Workflow | Gatilho | Papel |
|---|---|---|
| `mobile_test.yml` | `pull_request`; `workflow_dispatch` (sem inputs) | Device Farm nas duas plataformas, sempre + publicação |
| `techdocs.yml` | push em `main` tocando `docs/**` ou `mkdocs.yml`; dispatch | chama `Aramis-Menswear/.github/.github/workflows/techdocs-publish.yml@main` com `secrets: inherit` |

Secrets: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `DEVICE_FARM_PROJECT_ARN`,
`DEVICE_FARM_DEVICE_POOL_ARN`, `DEVICE_FARM_IOS_DEVICE_POOL_ARN`, `TEST_USER_EMAIL`,
`TEST_USER_PASSWORD`, `TEST_USER_PIN`, `EXPO_TOKEN`, `EXPO_PROJECT_ID`; `GITHUB_TOKEN`
implícito (poda de artifacts, push em `reports`).
Secrets de seleção de build (opcionais — **também Secrets**, o repositório não usa a aba
Variables; o workflow lê `secrets.BUILD_*`): `BUILD_PROFILE_ANDROID`, `BUILD_PROFILE_IOS`,
`BUILD_SELECTION`, `BUILD_FROM`, `BUILD_TO`.
Permissões do `publish-report`: `contents: write`, `actions: write`.
Concurrency: `mobile-e2e-<ref>` (cancela run antigo) e `reports-publish` (serializa push).

## GitHub Pages (branch `reports`)

- Branch **órfã**, um commit só (commit-tree + `--force-with-lease=refs/heads/reports:<sha>`).
- Layout `run-<n>-<YYYY-MM-DD>/{android,ios}/` + `index.html` gerado por
  `scripts/generate-report-index.mjs` (varre o disco no build; no cliente faz `HEAD`
  same-origin para esconder pastas apagadas — funciona em repo privado).
- Retenção `KEEP=3`; arquivos > 95 MB removidos; histórico Allure copiado do último run por
  plataforma antes de gerar.
- Doc completa: `docs/ci/retencao-de-relatorios-allure.md`.

## Backstage (Aramis)

| Item | Detalhe |
|---|---|
| Catalog | `catalog-info.yml` → `arys-mobile-e2e-test-automations`, owner `group:default/engenharia_qa`, `lifecycle: experimental` |
| TechDocs | `mkdocs.yml` (`techdocs-core`) + `docs/`; publicado por `techdocs.yml` |
| MCP | servidor `backstage` (`.mcp.json`, gitignored; template `.mcp.json.example` ainda citado no README — **não existe no repo**); tool `backstage_get_coding_standards` consultada antes de editar; PAT `bkpat_*` nunca commitado |

## Ambiente local

| Item | Detalhe |
|---|---|
| Emulador | AVD `S25Ultra_API35` (`appium:deviceName`) |
| APK | `C:\dev\apk_arys\arys-latest.apk` (`APK_PATH` em `wdio.conf.ts:38`; `DEST_DIR` em `download-build.ts:8`) — caminhos Windows fixos |
| Appium | subido pelo `@wdio/appium-service` com `relaxedSecurity: true` (necessário para `mobile: startMediaProjectionRecording` / `clearApp`) |
| `.env` | `TEST_USER_EMAIL`, `TEST_USER_PASSWORD`, `TEST_USER_PIN`, `EXPO_TOKEN`, `EXPO_PROJECT_ID`, opcionais `REMOTE_HOST`, `REMOTE_PORT`, `REMOTE_PATH_IOS`, `SKIP_DOWNLOAD`, `BUILD_*`, `CI` |
