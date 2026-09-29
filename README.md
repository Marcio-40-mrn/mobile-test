<div align="center">
	<h1>Arys Mobile Automation</h1>
	<p>WebdriverIO + Appium end-to-end test suite para o app Arys — Android e iOS com os mesmos specs</p>
</div>

## Cenários de execução

| Cenário | Comando | Requisitos |
|---|---|---|
| Android local (sem reinstalar) | `npm test` com `SKIP_DOWNLOAD=true` | Emulador `S25Ultra_API35` rodando |
| Android local (com install) | `npm test` | Emulador `S25Ultra_API35` + `EXPO_TOKEN` |
| Device Farm (CI) | GitHub Actions | Secrets AWS + EXPO configurados |

A plataforma é escolhida pela variável `PLATFORM`: `PLATFORM=ios` roda a suíte iOS
(XCUITest), e a ausência dela roda Android (UiAutomator2). **Não existem specs
separados por plataforma** — os mesmos arquivos de `test/specs/` rodam nos dois.

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
TEST_USER_PASSWORD=<senha — vale só no Android de development>
TEST_USER_PASSWORD_IOS=<senha da mesma conta no iOS (todos os ambientes) e no Android de production — usada no Android quando BUILD_PROFILE_ANDROID=production>
TEST_USER_PIN=<PIN de 4 dígitos>

# EAS / Expo (para download de builds)
EXPO_TOKEN=<token em expo.dev → Account Settings → Access Tokens>
EXPO_PROJECT_ID=<id do projeto no EAS — lido por app.config.js>
```

> O `app.config.js` lê `EXPO_PROJECT_ID` do `.env` e o expõe como
> `expo.extra.eas.projectId`; o `eas build:list` resolve o projeto a partir daí.
> Sem essa variável o `app.config.js` lança erro.

## Seleção do build

Qual artefato do EAS será baixado é configurável por variável de ambiente. As mesmas
variáveis valem para a execução local (`scripts/download-build.ts`) e para o CI
(step `Baixa o build do EAS` em `mobile_test.yml`).

| Variável | Valores | Efeito |
|---|---|---|
| `BUILD_PROFILE_ANDROID` | nome de um profile do EAS (`preview`, `production`, …) | Profile do `.apk`. Vazio => filtra por `distribution=internal` |
| `BUILD_PROFILE_IOS` | idem | Profile do `.ipa`. Vazio => `production` (no EAS toda build iOS é `store`; `distribution=internal` nunca acharia nada) |
| `BUILD_SELECTION` | `latest` (padrão) \| `date` | `latest` pega o build mais recente; `date` pega o mais recente dentro do intervalo |
| `BUILD_FROM` | `YYYY-MM-DD` | Início do intervalo, inclusivo (00:00:00 no fuso local) |
| `BUILD_TO` | `YYYY-MM-DD` | Fim do intervalo, inclusivo (23:59:59 no fuso local) |

**Por que dois profiles?** Android e iOS costumam ser buildados em profiles diferentes
(tipicamente `preview` e `production`). Cada plataforma lê só a sua variável — um run
Android nunca usa `BUILD_PROFILE_IOS` e vice-versa.

**Regras do `BUILD_SELECTION=date`:**

- exige ao menos `BUILD_FROM` **ou** `BUILD_TO`;
- só `BUILD_FROM` = daquele dia em diante; só `BUILD_TO` = tudo até aquele dia;
- para um dia único, use a mesma data nos dois;
- `BUILD_TO` anterior a `BUILD_FROM`, data inexistente (`2026-02-31`) ou fora do formato
  `YYYY-MM-DD` param a execução com erro.

```bash
# Build mais recente do profile preview (Android)
BUILD_PROFILE_ANDROID=preview npm test

# Build de um intervalo específico - útil para reproduzir uma regressão
BUILD_PROFILE_ANDROID=preview BUILD_SELECTION=date BUILD_FROM=2026-07-01 BUILD_TO=2026-07-10 npm test

# Só baixar/resolver o build, sem rodar a suíte
npx ts-node scripts/download-build.ts --platform android
npx ts-node scripts/download-build.ts --platform ios

# Converter um .aab (profile production) em APK universal sem baixar nada
npx ts-node scripts/convert-aab.ts --input app.aab --output app.apk
```

Sem nenhuma dessas variáveis: Android pega o build `INTERNAL` finalizado mais recente
(comportamento histórico); iOS pega o build `production` finalizado mais recente.

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

# Roda um único spec — cada spec é autossuficiente (reinicia o app, verifica OTA,
# faz login e limpa o device ao final), então pode rodar sozinho em qualquer ordem
npx wdio run wdio.conf.ts --spec test/specs/login.spec.ts

# Roda testes unitários (sem device) — restrito a scripts/ e test/utils, porque um
# `npx vitest run` sem argumento também tenta coletar as specs do WDIO em test/specs e falha
npx vitest run scripts test/utils
```

### iOS via Remote Access

Permite validar a suíte iOS em minutos, sem depender de um run do CI:

1. No console AWS, abra uma sessão **Remote Access** no projeto do Device Farm, com o `.ipa` do Arys instalado.
2. Copie host, porta e path assinado do endpoint Appium para `REMOTE_HOST`, `REMOTE_PORT` e `REMOTE_PATH_IOS` no `.env`.
3. Rode a suíte:

```bash
npm run wdio:ios

# Um spec só
npx cross-env PLATFORM=ios wdio run wdio.conf.ts --spec test/specs/home.spec.ts
```

> O path assinado **expira em ~20 minutos**; depois disso toda chamada devolve
> `403 AccessDeniedException` e é preciso abrir uma sessão nova.
>
> Duas limitações do modo Remote Access: o endpoint recusa `mobile: clearApp`, então
> o app reabre logado e o step de preparo de toda suíte (`launchAndCheckUpdate()`, que
> espera a tela de login) falha — pendência da Fase 7; e não há gravação de tela,
> então os vídeos não são anexados ao relatório. Nenhuma das duas vale para o Device
> Farm via `testspec`.

O relatório Allure é gerado automaticamente em `reports/allure-report/` ao final da execução.

## Relatórios

```bash
# Abre o último relatório gerado no browser
npm run allure:open

# Regenera o relatório a partir dos resultados brutos e abre
npm run allure:report
```

Para relatórios vindos do Device Farm: baixe o zip de **Customer Artifacts** no console AWS, extraia e aponte `npm run allure:report` para a pasta `allure-results/` extraída.

**Vídeo por plataforma no Device Farm:** no Android o `wdio.conf.ts` grava por teste
(`mobile: startMediaProjectionRecording`, 720p) e anexa no `afterTest`. No iOS o XCUITest
precisa de `ffmpeg` no host e o `macos_tahoe` não tem (run #30), então o `wdio.conf.ts`
**não grava**; o step "Coleta artefatos" baixa o artefato **VIDEO** que o próprio Device
Farm grava por job (h264, ~3 MB por iPhone) e o anexa a cada resultado daquele aparelho
("Vídeo da execução (Device Farm — sessão do aparelho)"). O step "Re-encoda vídeos"
normaliza os dois para H.264 ≤ 720p antes da publicação.

## CI/CD — GitHub Actions

Workflow `.github/workflows/mobile_test.yml` — um job `device-farm` por plataforma (matrix)
mais o `publish-report`. Roda no AWS Device Farm (região `us-west-2`):

1. Baixa o build do EAS (`app.apk` / `app.ipa`) conforme as variáveis de [Seleção do build](#seleção-do-build)
2. Pré-verifica as dependências no runner: o mesmo `npm install --prefer-offline` do testspec
   seguido de `import('webdriverio')`. Um `package-lock.json` inconsistente quebra aqui, em
   ~1 min, em vez de ocupar os devices sem produzir resultado
3. Empacota os testes num zip (sem `node_modules` — o Device Farm roda `npm install`; sem
   `.env` — o step falha se um entrar) e sobe app + pacote (`.github/scripts/devicefarm-upload.sh`)
4. Lê o pool da plataforma (`get-device-pool` → `get-device`, ordenado por nome) e decide a
   conta de cada aparelho — ver [Conta por device](#conta-por-device)
5. Agenda de forma diferente por plataforma — é a única divergência estrutural:
   - **Android**: um `schedule-run` para o pool inteiro, credenciais como
     `environmentVariables`; o `testspec.yml` as grava num `.env` no host
   - **iOS**: **um run por iPhone** (`--device-selection-configuration` mirando o ARN).
     O host iOS **não recebe** `environmentVariables` (medido no projeto MobileWDIO), então
     o CI gera um `testspec-ios` por run substituindo a linha `__CREDENCIAIS_DO_RUN__` por
     um `export` com e-mail, senha, PIN e `DEVICE_LABEL` (o nome do aparelho — no iOS o
     `DEVICEFARM_DEVICE_NAME` é o UDID)
6. Faz polling de todos os runs (`runs.tsv`: 1 linha no Android, N no iOS) e coleta os
   `allure-results` de cada job. Só timeout quebra a esteira; o resultado do teste vai para o
   summary, uma linha por run. Se nenhum `*-result.json` vier, imprime as últimas linhas do
   "Test spec output" do Device Farm no log do job (é onde aparece o motivo)
7. `publish-report` consolida o relatório e publica na branch `reports`. **Run sem nenhum
   resultado falha o job** — não existe mais "nada a publicar" verde

Cada aparelho é um nó próprio na aba *Suites* do Allure (`<device> — <conta>`), com
`historyId` por device para o Trend não misturar aparelhos (`beforeTest` do `wdio.conf.ts`).
O widget **Environment** do relatório mostra `AppVersion`, `AppBuildVersion` e `BuildProfile`
do build testado: o step "Baixa o build do EAS" extrai os três do `eas build:list --json` e
os manda ao host (`APP_VERSION`, `APP_BUILD_VERSION`, `APP_BUILD_PROFILE`); o `onPrepare`
grava `allure-results/environment.properties`. Localmente o valor vem do download ou, com
`SKIP_DOWNLOAD=true`, do APK instalado no emulador (`adb dumpsys`).
O desenho e as lições vêm do projeto MobileWDIO: `.planning/codebase/LICOES-CI-MOBILEWDIO.md`.

> `npm ci` não funciona neste repositório: o `appium-uiautomator2-driver` traz um
> `npm-shrinkwrap.json` gerado em Linux e o npm acusa `Missing @img/sharp-*` das outras
> plataformas. Em conflito no `package-lock.json`, não resolva à mão — apague
> `node_modules` e o lock e rode `npm install`.

**Android e iOS** rodam em todo `pull_request` e em todo `workflow_dispatch`, na mesma matrix
fixa (`platform: [android, ios]`) — sem input, sem gate. Os 5 steps de clientes que falham no
iOS por bug de acessibilidade do app (ver cabeçalho de `testspec-ios.yml`) ficam vermelhos no
relatório; o resultado do Device Farm não quebra a esteira.

### Configuração validada — esta é a referência (run #30, 2026-09-17)

Foi a primeira execução em que **os dois pools rodaram no mesmo PR e os dois relatórios
Allure foram publicados no GitHub Pages** (iOS com evidência: screenshots e resultado por
iPhone). A combinação abaixo é o estado que deve ser mantido; cada plataforma usa o
Appium/driver do **seu** host, sem depender da outra (regras 11 e 12 de
`.planning/REQUIREMENTS.md`):

| | Android | iOS |
|---|---|---|
| Host (`*_test_host`) | `amazon_linux_2` | `macos_tahoe` (obrigatório — sem ele o DF cai no host legado, sem driver) |
| Node | `devicefarm-cli use node 22` | `devicefarm-cli use node 22` (sem `nvm`, que não existe nos hosts atuais) |
| Appium | `devicefarm-cli use appium 3` | `devicefarm-cli use appium 3` |
| Driver | `uiautomator2@7.6.2` (`uninstall` do v6 do host + `install@7.6.2`) | XCUITest **pré-instalado no host** (vem com o Appium 3); nada instalado à mão |
| WDA | — | pré-assinado da AWS, escolhido pela versão major do driver (`DEVICEFARM_APPIUM_WDA_DERIVED_DATA_PATH_V<N>`, bloco oficial no `pre_test`) |
| `appium` no `package.json` | **não** (só peer transitiva do `uiautomator2`) — se estiver lá, o Appium do host trata o pacote de teste como `APPIUM_HOME` e perde os drivers | idem |
| Run no Device Farm | 1 run para o pool (`--device-pool-arn`), credenciais por `environmentVariables` | 1 run por iPhone (`--device-selection-configuration`), credenciais injetadas no testspec gerado |
| Build EAS | `BUILD_PROFILE_ANDROID` (secret) ou `distribution=internal` | `BUILD_PROFILE_IOS` (secret) ou profile `production` |

Histórico do que quebrava antes disso (runs #28 e #29): `.planning/STATE.md` e
`.planning/codebase/LICOES-CI-MOBILEWDIO.md` (lições 1 e 3).

**GitHub Secrets necessários**

| Secret | Propósito |
|---|---|
| `AWS_ACCESS_KEY_ID` | IAM key com permissão `devicefarm:*` |
| `AWS_SECRET_ACCESS_KEY` | IAM secret |
| `DEVICE_FARM_PROJECT_ARN` | ARN do projeto no Device Farm |
| `DEVICE_FARM_DEVICE_POOL_ARN` | Pool de devices Android |
| `DEVICE_FARM_IOS_DEVICE_POOL_ARN` | Pool de devices iOS |
| `TEST_USER_EMAIL` | Email de login do app (usado em todos os aparelhos quando não há CSV) |
| `TEST_USER_PASSWORD` | Senha de login do app no **Android de development** (comum a todas as contas) |
| `TEST_USER_PASSWORD_IOS` | **Obrigatório para o job iOS** — senha da mesma conta no **iOS (todos os ambientes)** e no **Android de production**. O job iOS a injeta no host como `TEST_USER_PASSWORD` e **falha com erro nomeado se o secret não existir** (não há fallback: no run #30 a ausência dele mandou a senha Android e os 5 iPhones falharam no login) |
| `TEST_USER_PIN` | PIN de acesso do app (comum a todas as contas) |
| `ACTION_DELAY_MS` | Opcional — pausa fixa (ms) antes de cada ação na tela, `BasePage.beforeAction()`; padrão 4000, `0` desliga |
| `TEST_USER_ANDROID_EMAILS` | *Opcional* — CSV de e-mails, um por device do pool Android (ver [Conta por device](#conta-por-device)) |
| `TEST_USER_IOS_EMAILS` | *Opcional* — CSV de e-mails, um por iPhone do pool iOS |
| `EXPO_TOKEN` | Token EAS para download de builds |
| `EXPO_PROJECT_ID` | ID do projeto no EAS — lido por `app.config.js` |

### Conta por device

Hoje todos os aparelhos logam com `TEST_USER_EMAIL`: os cenários só leem (busca, filtros,
navegação), então não disputam estado. Quando um cenário passar a **escrever** no backend
(favoritar cliente, por exemplo), dois aparelhos na mesma conta vão brigar pelo mesmo
registro — aí basta criar o secret CSV da plataforma e o CI passa a distribuir uma conta por
aparelho, sem mudar código:

- `TEST_USER_ANDROID_EMAILS` / `TEST_USER_IOS_EMAILS`: e-mails separados por vírgula, **na
  ordem alfabética byte a byte dos nomes dos devices do pool** (`LC_ALL=C sort`). O step
  "Resolve devices e contas do pool" imprime `nome (modelo) -> prefixo@…` para conferir.
  Menos e-mails do que devices é erro; e-mails a mais são ignorados. Mudar o pool só
  redistribui — nenhum modelo de aparelho fica no repositório.
- A senha e o PIN continuam sendo `TEST_USER_PASSWORD` (+ `TEST_USER_PASSWORD_IOS` no iOS) /
  `TEST_USER_PIN` (comuns).

### Senha por ambiente

Medido em 2026-09-16 numa sessão Remote Access: a senha do `.env` (`TEST_USER_PASSWORD`) é
aceita **só pelo Android de development**; no **iOS (todos os ambientes)** e no **Android de
production** a mesma conta usa outra senha — `TEST_USER_PASSWORD_IOS`. O `resolveAccount()`
usa `TEST_USER_PASSWORD_IOS` quando `PLATFORM=ios` **ou** quando `BUILD_PROFILE_ANDROID=production`
(a mesma variável que escolhe o build no EAS — local no `.env`, no CI como *Secret*); fora
disso, `TEST_USER_PASSWORD`. No CI o step "Agenda os runs (iOS)" injeta o secret
`TEST_USER_PASSWORD_IOS` no testspec como `TEST_USER_PASSWORD` — **sem fallback**: secret
ausente derruba o step com `::error` nomeado; no Android o `.env` do host recebe as duas e o
runtime escolhe.
- Limite do Device Farm: 256 caracteres por variável de ambiente (por isso CSV, e não JSON).
- Como o aparelho acha a própria conta: no Android o CI manda, além do CSV, a lista de
  `modelId` do pool na mesma ordem (`TEST_USER_DEVICE_MODELS`) e o runtime faz
  `indexOf(capabilities.deviceModel)` (`test/utils/credentials.ts`); no iOS o CI já injeta
  o e-mail escolhido no testspec daquele run.
- Com o CSV presente, `TEST_USER_EMAIL` deixa de ser necessário.

**GitHub Secrets de seleção de build (opcionais)** — *Settings → Secrets and variables →
Actions → **Secrets*** (o workflow lê `secrets.BUILD_*`; um valor criado na aba *Variables*
não é lido). Controlam qual build o pipeline baixa. Ausentes, o CI usa
`distribution=internal` no Android e o profile `production` no iOS (mais recente).

| Secret | Propósito |
|---|---|
| `BUILD_PROFILE_ANDROID` | Profile do EAS usado pelo job Android |
| `BUILD_PROFILE_IOS` | Profile do EAS usado pelo job iOS |
| `BUILD_SELECTION` | `latest` (padrão) ou `date` |
| `BUILD_FROM` / `BUILD_TO` | Intervalo `YYYY-MM-DD` quando `BUILD_SELECTION=date` |

## Arquitetura

```
wdio.conf.ts               — config único para os 4 cenários. Três flags (isDeviceFarm,
                             isIOS, isRemote) alimentam funções puras:
                             buildCapabilities(), buildConnectionSettings(), buildServices()
testspec.yml               — testspec do Device Farm (Android)
testspec-ios.yml           — testspec do Device Farm (iOS)
.github/workflows/
  mobile_test.yml          — pipeline: matrix Android + iOS (sempre os dois) + publish-report
test/
  pages/                   — Page Objects — um arquivo por tela
  specs/                   — Specs — um arquivo por funcionalidade, um `it` por arquivo (rodam nas 2 plataformas)
  utils/
    platform.ts            — IS_IOS, APP_ID e byPlatform()
  screenshots/             — Capturas automáticas em falhas
scripts/
  download-build.ts        — Baixa o build do EAS; .aab vira APK universal via convert-aab
  convert-aab.ts           — .aab → .apk universal (bundletool + debug keystore); local e CI
  download-file.ts         — Download HTTP com redirects, usado pelos dois acima
  package-tests.ps1        — Empacota os testes para o Device Farm
```

### Estrutura das suítes

Cada spec (`login`, `home`, `clientes`) é **independente**: um `describe`, um `it`, e
cada cenário antigo virou um `allureReporter.step()` dentro dele — o Allure mostra em
qual etapa parou. Nenhum teste depende do estado deixado por outro:

```ts
afterEach(async () => {
  await loginPage.resetAppState();        // adb shell pm clear — device limpo mesmo em falha
});

it('deve percorrer a home: …', async () => {
  await allureReporter.step('preparo: abrir o app, fazer login e chegar à home', async () => {
    await loginPage.launchAndCheckUpdate(); // fecha o app, limpa dados, reabre, trata OTA, espera o login
    await loginPage.ensureLoggedIn();       // home e clientes — a suíte login faz o login no próprio it
    await homePage.navigateToHome();
  });
  // …demais steps
});
```

O preparo é o **primeiro step do `it`**, e não um `beforeEach`, de propósito: falha de hook
não é falha de teste para o Mocha — o `it` é pulado, `beforeTest`/`afterTest` não rodam e
o Allure recebe um resultado **sem status, sem device e sem screenshot** (roxo, "Unknown";
foi o run #31 no iOS, com Home/Clientes recusadas no login). Como step, a mesma falha sai
vermelha, por aparelho, com o print.

Os popups da cadeia de login (OTA, notificações, onboarding, OTA tardio) são todos
"se aparecer, trata; se não, segue" — a suíte passa com ou sem eles. O popup de
notificações **ignora o primeiro CANCELAR** no Android, por isso
`handleNotificationPopup()` clica e confere que ele sumiu antes de continuar.

### Page Object Model

Cada tela tem uma classe em `test/pages/` com locators como `get` e interações como métodos `async`. Specs importam apenas a instância da página — `$()` e `$$()` são proibidos dentro de specs.

### Seletores

Locators que diferem entre plataformas passam por `byPlatform({ android, ios })`;
os idênticos nas duas (as abas de clientes, por exemplo) ficam diretos.

```ts
get emailField() {
  return $(byPlatform({
    android: '//android.widget.EditText[@hint="Digite seu e-email"]',
    ios: '~input-sign-in-email-input',
  }));
}
```

- **Android** — apenas XPath com `@text`, `@content-desc`, `@resource-id` e `@hint`.
- **iOS** — accessibility id (`~`) primeiro; `-ios predicate string:` quando o
  elemento só é alcançável por texto. XPath é lento e frágil no XCUITest.

O `testID` do React Native vira `resource-id` no Android e `name` no iOS, então
boa parte dos ids é o mesmo valor com outro prefixo. O mapa capturado em device
real está em `Locators-iOS-Arys.docx`.

### Diferenças de comportamento entre plataformas

Seletor equivalente não basta: busca, digitação de PIN, alertas de sistema,
scroll e toque em alvos pequenos divergem no XCUITest. Todas as diferenças estão
encapsuladas em `BasePage` (`submitSearch`, `tapCenter`, `scrollIntoView`,
`dismissTrackingPromptIfPresent`, `relaunchApp`…), de modo que os specs não
sabem em que plataforma estão rodando. Ver a tabela no `CLAUDE.md`.

> **A suíte `clientes` falha no iOS por bug do app.** Os bottom sheets (modal
> "Ordenar por") e o card de aba vazia aparecem na tela mas não expõem filhos à
> árvore de acessibilidade do XCUITest, por nenhuma estratégia. Isso quebra os steps
> de filtro de ordenação em `clientes.spec.ts`. A correção é no app
> (`accessible={false}` no container do `@gorhom/bottom-sheet` + `testID` por
> opção) — não mascarar com coordenadas.

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
