<div align="center">
	<h1>Arys Mobile Automation</h1>
	<p>WebdriverIO + Appium end-to-end test suite para o app Arys (Android em CI; iOS gated)</p>
</div>

## Cenários de execução

| Cenário | Comando | Requisitos |
|---|---|---|
| Android local (sem reinstalar) | `SKIP_DOWNLOAD=true npm test` | Emulador `S25Ultra_API35` rodando |
| Android local (com install) | `npm test` | Emulador `S25Ultra_API35` + `EXPO_TOKEN` |
| iOS local | `npm run test:ios` | Sessão aberta no Device Farm + `REMOTE_*` no `.env` (ver abaixo) |
| Device Farm — Android (CI) | GitHub Actions, todo `pull_request` | Secrets AWS + EXPO configurados |
| Device Farm — iOS (gated) | `workflow_dispatch` com `run_ios=true` | Build iOS finalizada no EAS (não-simulador) |
| Coleta de page source | `npm run dump:ios` / `npm run dump:android` | Idem ao alvo local correspondente |

### iOS local — sessão remota no Device Farm

O XCUITest exige um host macOS, e a máquina de desenvolvimento deste projeto é Windows.
Para rodar ou depurar iOS localmente, o fluxo é o mesmo já usado com o **Appium Inspector**:

1. Abra uma sessão no AWS Device Farm com o app iOS instalado.
2. Copie o host, a porta e o caminho do app da sessão para `REMOTE_HOST`, `REMOTE_PORT`
   e `REMOTE_PATH_IOS` no `.env`.
3. Rode `npm run test:ios` (ou `npm run dump:ios`).

> A sessão é **efêmera**: os três valores mudam a cada nova sessão e precisam ser
> atualizados antes de cada execução. Se algum estiver vazio, o WDIO falha logo no início
> dizendo exatamente quais faltam.

O `wdio.conf.ts` conecta direto no Appium da sessão (sem subir servidor local) e usa
`REMOTE_PATH_IOS` como capability `appium:app`. O protocolo é derivado da porta —
`443` vira `https`, qualquer outra vira `http`.

## Pré-requisitos locais

- Node.js 18+
- Java JDK 11+ (exigido pelo Appium / UiAutomator2)
- Appium: `npm install -g appium`
- Driver Android: `appium driver install uiautomator2`
- Android Studio com AVD nomeado `S25Ultra_API35`
- Arquivo `.env` na raiz do projeto (ver abaixo)

## Variáveis de ambiente (.env)

Crie o arquivo `.env` na raiz com o conteúdo abaixo (não há `.env.example` versionado — o `.env` é ignorado pelo git):

```env
# Credenciais da conta de teste do app
TEST_USER_EMAIL=<email de login>
TEST_USER_PASSWORD=<senha>
TEST_USER_PIN=<PIN de 4 dígitos>

# EAS / Expo (para download de builds)
EXPO_TOKEN=<token em expo.dev → Account Settings → Access Tokens>
EXPO_PROJECT_ID=<id do projeto no EAS — lido por app.config.js>

# iOS local — preencher a partir da sessão aberta no Device Farm, a cada sessão
REMOTE_HOST=<host do Appium da sessão>
REMOTE_PORT=<porta do Appium da sessão>
REMOTE_PATH_IOS=<caminho do app na sessão — vira a capability appium:app>
```

> O `app.config.js` lê `EXPO_PROJECT_ID` do `.env` e o expõe como
> `expo.extra.eas.projectId`; o `eas build:list` resolve o projeto a partir daí.
> Sem essa variável o `app.config.js` lança erro. Atenção: o `projectId` precisa
> pertencer ao projeto de slug `arys` — um id de outro projeto faz o `eas build:list`
> recusar com erro de slug, e o download local do APK falha.

Não há variável de bundle identifier: nos dois alvos iOS o app é identificado por
**caminho** — `$DEVICEFARM_APP_PATH` no Device Farm, `REMOTE_PATH_IOS` na sessão local.
Quando um bundle id é necessário (remover/reinstalar o app), ele vem das capabilities
que a própria sessão XCUITest reporta.

Variáveis opcionais: `SKIP_DOWNLOAD=true` pula o download/install do APK;
`PLATFORM=ios` seleciona o alvo iOS; `DUMP_SOURCE=true` troca a suíte pelo spec de coleta
de page source (os scripts `dump:*` já fazem isso).

## Executando localmente

```bash
# Instale as dependências
npm install

# Baixa o APK mais recente do EAS, instala no emulador e roda os testes
npm test

# Roda sem baixar/instalar o APK novamente
SKIP_DOWNLOAD=true npm test

# Roda um único spec
npx wdio run wdio.conf.ts --spec test/specs/login.spec.ts

# Roda testes filtrando por nome
npx wdio run wdio.conf.ts --spec test/specs/clientes.spec.ts --mochaOpts.grep "Pós Vendas"

# Roda a suíte no iOS, contra a sessão remota (ver "iOS local" acima)
npm run test:ios

# Roda testes unitários (sem device)
npx vitest run
```

O relatório Allure é gerado automaticamente em `reports/allure-report/` ao final da execução.

## Coleta de page source (descoberta de seletores)

Ferramenta sob demanda — **não faz parte da suíte e não roda no CI**. Serve para conferir
os seletores de uma plataforma contra a árvore de elementos real, sem depender do Appium
Inspector aberto na tela.

```bash
# Coleta a árvore de UI no iOS (usa a sessão remota do Device Farm)
npm run dump:ios

# Coleta a árvore de UI no Android (usa o AVD local)
npm run dump:android
```

O spec `test/specs/dump-source.spec.ts` percorre o fluxo principal — splash, login, PIN,
home, aba Clientes, filtro de ordenação — e grava um XML por tela em
`reports/pagesource/`, no formato `pagesource-<plataforma>-<tela>.xml`.

Cada etapa é isolada: se o login falhar por seletor errado, o dump da tela de login — que
é justamente o necessário para corrigi-lo — já foi gravado.

Use quando um seletor quebrar, ou ao portar uma tela para iOS: compare o XML das duas
plataformas e ajuste as entradas `ios:` dos page objects. **Os seletores iOS deste
repositório foram derivados das regras de tradução em `test/support/locator.ts` e ainda
não foram confirmados contra um device.**

## Relatórios

```bash
# Abre o último relatório gerado no browser
npm run allure:open

# Regenera o relatório a partir dos resultados brutos e abre
npm run allure:report
```

Para relatórios vindos do Device Farm: baixe o zip de **Customer Artifacts** no console AWS, extraia e aponte `npm run allure:report` para a pasta `allure-results/` extraída.

## CI/CD — GitHub Actions

Workflow `.github/workflows/mobile_test.yml` — arquivo único, parametrizado por
`strategy.matrix.platform`. Roda no AWS Device Farm (região `us-west-2`):

1. O job `setup` resolve a matrix aplicando o gate do iOS
2. Baixa o build mais recente do EAS (`app.apk` / `app.ipa`). O filtro difere por
   plataforma: no Android exige `distribution: internal`; no iOS aceita qualquer build
   finalizada que **não** seja de simulador — as builds iOS do projeto saem do perfil
   `production`, cuja distribution é `store`, e o Device Farm re-assina o `.ipa`
3. Empacota os testes num zip (sem `node_modules` — o Device Farm roda `npm install`)
4. Sobe app, pacote e testspec ao Device Farm (create → transfer → wait)
5. `schedule-run` injetando as credenciais como `environmentVariables`; o
   testspec grava um `.env` e o `wdio.conf.ts` detecta o ambiente via `DEVICEFARM_DEVICE_UDID`
6. Faz polling do run e coleta os `allure-results`; o job `publish-report` consolida os
   relatórios das duas plataformas

**Android** roda em todo `pull_request`. **iOS** é *gated*: só roda via `workflow_dispatch`
com `run_ios=true`, por isso não bloqueia PRs. O que já existe no código: capabilities
XCUITest no `wdio.conf.ts`, camada de seletores por plataforma e `testspec-ios.yml` alinhado
ao padrão do Android. O que ainda falta para o job passar:

- **validar os seletores iOS num device** — eles foram derivados das regras de tradução em
  `test/support/locator.ts` e nunca rodaram de verdade. Use `npm run dump:ios` contra uma
  sessão remota para coletar a árvore de UI e corrigi-los. Ver também o cabeçalho de
  `testspec-ios.yml`.

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
wdio.conf.ts               — config único para os três alvos: Android local (Appium service
                             + install do APK), Device Farm (detectado por
                             DEVICEFARM_DEVICE_UDID) e iOS local contra sessão remota
                             (REMOTE_HOST/REMOTE_PORT/REMOTE_PATH_IOS)
vitest.config.ts           — escopa os testes unitários (sem ele o Vitest coleta os specs do WDIO)
testspec.yml               — testspec do Device Farm (Android)
testspec-ios.yml           — testspec do Device Farm (iOS — gated, ver cabeçalho)
.github/workflows/
  mobile_test.yml          — pipeline completo: matrix Android + iOS (gated) + publish-report
test/
  pages/                   — Page Objects — um arquivo por tela; base.page.ts é a superclasse
                             que abstrai as APIs que diferem entre UiAutomator2 e XCUITest
  specs/                   — Specs — um arquivo por funcionalidade
    dump-source.spec.ts    — coleta de page source sob demanda (npm run dump:*), fora da suíte
  support/                 — Infra de teste: platform.ts (plataforma e app id) e
                             locator.ts (camada de seletores por plataforma)
    __tests__/             — Unitários da camada de seletores
  screenshots/             — Capturas automáticas em falhas (criado em runtime)
  videos/                  — Gravações da execução (criado em runtime)
scripts/
  download-build.ts        — Baixa o build mais recente do EAS (android | ios)
  __tests__/               — Unitários de parseLatestBuildUrl
  package-tests.ps1        — Empacota os testes para o Device Farm (execução local)
  generate-report-index.mjs— Gera o índice HTML dos relatórios publicados
```

### Page Object Model

Cada tela tem uma classe em `test/pages/` que estende `BasePage`, com os seletores num objeto `SEL` no topo do arquivo, locators como `get` e interações como métodos `async`. Specs importam apenas a instância da página — `$()` e `$$()` são proibidos dentro de specs.

### Seletores

Todo seletor é um par `{ android, ios }` resolvido em runtime por `L()`, de `test/support/locator.ts`. Prefira `byTestId()` — um `testID` do React Native vira `resource-id` no Android e `accessibilityIdentifier` no iOS, então uma chamada cobre as duas plataformas. Seletores por texto visível (`byText`, `byTextContains`) são frágeis e só devem ser usados quando não há testID.

A tabela completa de tradução Android→iOS está no cabeçalho de `test/support/locator.ts`, junto do código que ela governa.

### APIs específicas de plataforma

Nada de `mobile: *`, `browser.pressKeyCode()` ou `driver.hideKeyboard()` direto em páginas ou specs — use os wrappers da `BasePage` (`resetApp`, `submitSearch`, `typeIntoFocused`, `hideKeyboard`, `scrollDown/Up`, `scrollIntoViewByRetry`), que ramificam em `driver.isIOS`.

### Esperas

`browser.pause()` é proibido como substituto de espera em estado de UI. Use sempre `waitForDisplayed()`. O `pause` só é permitido para delays de animação sem elemento observável, com comentário explicando o motivo.

## Catalog / Backstage

O componente upstream (`Aramis-Menswear/arys-mobile-e2e-test-automations`) integra a plataforma Aramis via template Backstage empty-repo:

- **Catalog**: `catalog-info.yml` registrado em [Backstage](https://backstage.aramis.com.br/catalog/default/component/arys-mobile-e2e-test-automations)
- **TechDocs**: `mkdocs.yml` + `docs/` publicados automaticamente via `.github/workflows/techdocs.yml`
- **MCP**: copie `.mcp.json.example` para `.mcp.json` e troque `bkpat_CHANGE_ME` pelo seu PAT pessoal do Backstage. **Nunca commite o PAT** (`.mcp.json` está no `.gitignore`)
- **Claude**: `.claude/CLAUDE.md` instrui o assistente a consultar o coding standards via MCP antes de qualquer mudança

> Este fork não carrega `docs/`, `.mcp.json.example` nem `.claude/` — eles existem apenas no
> repositório upstream. O `mkdocs.yml` aqui aponta para um `docs/` ausente, então o
> `techdocs.yml` não tem o que publicar.

## Git Flow

- `main` — produção. PRs obrigatórios; nunca commite direto.
- Branches a partir de `main` com prefixos `feat/`, `fix/`, `chore/`, `refactor/`, `docs/`
- Commits no padrão [Conventional Commits](https://www.conventionalcommits.org/)
