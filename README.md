<div align="center">
	<h1>Arys Mobile Automation</h1>
	<p>WebdriverIO + Appium end-to-end test suite para o app Android Arys</p>
</div>

## Cenários de execução

| Cenário | Comando | Requisitos |
|---|---|---|
| Android local (sem reinstalar) | `npm test` com `SKIP_DOWNLOAD=true` | Emulador `S25Ultra_API35` rodando |
| Android local (com install) | `npm test` | Emulador `S25Ultra_API35` + `EXPO_TOKEN` |
| Device Farm (CI) | GitHub Actions | Secrets AWS + EXPO configurados |

## Pré-requisitos locais

- Node.js 18+
- Java JDK 11+ (exigido pelo Appium / UiAutomator2)
- Appium: `npm install -g appium`
- Driver Android: `appium driver install uiautomator2`
- Android Studio com AVD nomeado `S25Ultra_API35`
- Arquivo `.env` na raiz do projeto (ver abaixo)

## Variáveis de ambiente (.env)

```env
# Credenciais da conta de teste do app
TEST_USER_EMAIL=<email de login>
TEST_USER_PASSWORD=<senha>
TEST_USER_PIN=<PIN de 4 dígitos>

# EAS / Expo (para download de builds)
EXPO_TOKEN=<token em expo.dev → Account Settings → Access Tokens>
EXPO_PROJECT_ID=<id do projeto no EAS — lido por app.config.js>
```

> O `app.config.js` lê `EXPO_PROJECT_ID` do `.env` e o expõe como
> `expo.extra.eas.projectId`; o `eas build:list` resolve o projeto a partir daí.
> Sem essa variável o `app.config.js` lança erro.

## Executando localmente

```bash
# Instale as dependências
npm install

# Crie o .env a partir do exemplo e preencha as variáveis
cp .env.example .env

# Baixa o APK mais recente do EAS, instala no emulador e roda os testes
npm test

# Roda sem baixar/instalar o APK novamente
SKIP_DOWNLOAD=true npm test

# Roda um único spec
npx wdio run wdio.conf.ts --spec test/specs/login.spec.ts

# Roda testes filtrando por nome
npx wdio run wdio.conf.ts --spec test/specs/clientes.spec.ts --mochaOpts.grep "Pós Vendas"

# Roda testes unitários (sem device)
npx vitest run
```

O relatório Allure é gerado automaticamente em `reports/allure-report/` ao final da execução.

## Relatórios

```bash
# Abre o último relatório gerado no browser
npm run allure:open

# Regenera o relatório a partir dos resultados brutos e abre
npm run allure:report
```

Para relatórios vindos do Device Farm: baixe o zip de **Customer Artifacts** no console AWS, extraia e aponte `npm run allure:report` para a pasta `allure-results/` extraída.

## CI/CD — GitHub Actions

Workflow `.github/workflows/mobile_test.yml` (chama o reutilizável `_devicefarm-run.yml`).
Roda no AWS Device Farm (região `us-west-2`):

1. Baixa o build mais recente do EAS (`app.apk` / `app.ipa`)
2. Empacota os testes num zip (sem `node_modules` — o Device Farm roda `npm install`)
3. Sobe app, pacote e testspec ao Device Farm (create → transfer → wait)
4. `schedule-run` injetando as credenciais como `environmentVariables`; o testspec grava um `.env`
   e o `wdio.conf.ts` detecta o ambiente via `DEVICEFARM_DEVICE_UDID`
5. Faz polling do run e coleta os `allure-results`; `publish-report` consolida o relatório

**Android** roda em todo `pull_request`. **iOS** é *gated*: só roda via `workflow_dispatch` com
`run_ios=true` (ainda não pronto — ver cabeçalho de `testspec-ios.yml`), por isso não bloqueia PRs.

**GitHub Secrets necessários**

| Secret | Propósito |
|---|---|
| `AWS_ACCESS_KEY_ID` | IAM key com permissão `devicefarm:*` |
| `AWS_SECRET_ACCESS_KEY` | IAM secret |
| `DEVICE_FARM_PROJECT_ARN` | ARN do projeto no Device Farm |
| `DEVICE_FARM_DEVICE_POOL_ARN` | Pool de devices Android |
| `DEVICE_FARM_IOS_DEVICE_POOL_ARN` | Pool de devices iOS (job gated) |
| `TEST_USER_EMAIL` | Email de login do app |
| `TEST_USER_PASSWORD` | Senha de login do app |
| `TEST_USER_PIN` | PIN de acesso do app |
| `EXPO_TOKEN` | Token EAS para download de builds |
| `EXPO_PROJECT_ID` | ID do projeto no EAS — lido por `app.config.js` |

## Arquitetura

```
wdio.conf.ts               — config único: local (Appium service + download/install APK) e
                             AWS Device Farm (detectado por DEVICEFARM_DEVICE_UDID; sem Appium,
                             logs em DEVICEFARM_LOG_DIR). Ramifica por ambiente.
testspec.yml               — testspec do Device Farm (Android)
testspec-ios.yml           — testspec do Device Farm (iOS — gated, ver cabeçalho)
.github/workflows/
  mobile_test.yml          — pipeline: jobs Android + iOS (gated) + publish-report
  _devicefarm-run.yml      — fluxo reutilizável parametrizado por plataforma
test/
  pages/                   — Page Objects — um arquivo por tela
  specs/                   — Specs — um arquivo por funcionalidade
  helpers/                 — Fluxos cross-page (ex: doLogin)
  screenshots/             — Capturas automáticas em falhas
scripts/
  download-build.ts        — Baixa o APK mais recente do EAS
  package-tests.ps1        — Empacota os testes para o Device Farm
```

### Page Object Model

Cada tela tem uma classe em `test/pages/` com locators como `get` e interações como métodos `async`. Specs importam apenas a instância da página — `$()` e `$$()` são proibidos dentro de specs.

### Seletores

Apenas XPath com atributos `@text`, `@content-desc`, `@resource-id` e `@hint`, conforme o dump de UI do app.

### Esperas

`browser.pause()` é proibido como substituto de espera em estado de UI. Use sempre `waitForDisplayed()`. O `pause` só é permitido para delays de animação sem elemento observável, com comentário explicando o motivo.

## Catalog / Backstage

Este componente integra a plataforma Aramis (template Backstage empty-repo):

- **Catalog**: `catalog-info.yml` registrado em [Backstage](https://backstage.aramis.com.br/catalog/default/component/arys-mobile-e2e-test-automations)
- **TechDocs**: `mkdocs.yml` + `docs/` publicados automaticamente via `.github/workflows/techdocs.yml`
- **MCP**: copie `.mcp.json.example` para `.mcp.json` e troque `bkpat_CHANGE_ME` pelo seu PAT pessoal do Backstage. **Nunca commite o PAT** (`.mcp.json` está no `.gitignore`)
- **Claude**: `.claude/CLAUDE.md` instrui o assistente a consultar o coding standards via MCP antes de qualquer mudança

## Git Flow

- `main` — produção. PRs obrigatórios; nunca commite direto.
- Branches a partir de `main` com prefixos `feat/`, `fix/`, `chore/`, `refactor/`, `docs/`
- Commits no padrão [Conventional Commits](https://www.conventionalcommits.org/)
