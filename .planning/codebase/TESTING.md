# Testes

## Dois níveis

| Nível | Ferramenta | O que cobre | Comando |
|---|---|---|---|
| E2E | WebdriverIO 9 + Appium + Mocha | O app Arys em device/emulador | `npm test`, `npm run wdio:ios` |
| Unit | Vitest 2 | Lógica pura de `scripts/` (`parseLatestBuildUrl`, `resolveBuildSelection`) | `npx vitest run scripts` |

`npx vitest run` **sem** `scripts` tenta coletar `test/specs/*.spec.ts` e falha — sempre
passar o path.

## Comandos E2E

```bash
npm test                                   # Android: baixa+instala APK e roda a suíte
SKIP_DOWNLOAD=true npm test                # Android sem download/install
npm run wdio:ios                           # iOS via Remote Access (REMOTE_* no .env)
npx wdio run wdio.conf.ts --spec test/specs/login.spec.ts
npx wdio run wdio.conf.ts --spec test/specs/clientes.spec.ts --mochaOpts.grep "Pós Vendas"
npx cross-env PLATFORM=ios wdio run wdio.conf.ts --spec test/specs/home.spec.ts
npx ts-node scripts/download-build.ts --platform android   # só resolve/baixa o build
```

Pré-requisitos locais (README): Node 18+, JDK 11+, `appium` global + driver `uiautomator2`,
AVD `S25Ultra_API35` ligado, `.env` com `TEST_USER_*`, `EXPO_TOKEN`, `EXPO_PROJECT_ID`.

## Inventário de casos (21)

> Inventário **vigente** (2026-09-15). Cada spec tem **um único `it`**; os cenários antigos
> são `allureReporter.step()` dentro dele. O passo 2 da Fase 5 funde os 3 numa jornada única
> — ver `ROADMAP.md` e JRN-* em `REQUIREMENTS.md`.

| Spec | Steps no `it` | 1º step (`preparo: …`) | `afterEach` |
|---|---|---|---|
| `login.spec.ts` | 1 + 2 — preparo; campos vazios; login + PIN → home | `launchAndCheckUpdate()` | `resetAppState()` |
| `home.spec.ts` | 1 + 8 — preparo; saudação, busca, busca "Fudaba"→perfil, campanhas, Meus clientes info/ver todos, 3 atalhos, Contatos feitos, tab bar | `launchAndCheckUpdate()` + `ensureLoggedIn()` + `navigateToHome()` | `resetAppState()` |
| `clientes.spec.ts` | 1 + 10 — preparo; título, 4 abas × (abrir + 7 filtros), busca vazia | `launchAndCheckUpdate()` + `ensureLoggedIn()` + `navigateToClientes()` | `resetAppState()` |

25 `expect(` no total (3 + 16 + 6). Ordem em `specs:` irrelevante — cada spec roda sozinho
com `--spec`; `maxInstances: 1`; `bail: 0`. **Não há `beforeEach`** (desde 2026-09-17): o
preparo é o 1º step do `it`, porque falha de hook pulava o `it` e chegava ao Allure sem
status/device/screenshot (roxo, "Unknown" — run #31 iOS). Como step, falha vermelha com print.

## Timeouts

| O quê | Valor | Onde |
|---|---|---|
| `waitforTimeout` (default dos `waitFor*`) | 10 s | `wdio.conf.ts:172` |
| Mocha por teste/hook | 1200 s em todos os ambientes (2026-09-18: `clientes` mediu 529 s no AVD) | `wdio.conf.ts` `mochaOpts` |
| `connectionRetryTimeout` / `Count` | 120 s / 3 | `wdio.conf.ts:173-174` |
| Splash (pausa fixa) | 5 s (`relaunchApp`) / 6 s (`doLogin`) | `base.page.ts:241`, `login.page.ts:124` |
| Pós-PIN (init de sessão sem feedback) | 6 s | `login.page.ts:120` |
| Popup OTA | 20 s (`dismissUpdatePopupIfPresent`) / 45 s restart | `base.page.ts:36,47` |
| Saudação pós-login | 30 s | `login.page.ts:148` |
| Vídeo | 1200 s DF Android / 180 s demais | `wdio.conf.ts` `beforeTest` |
| `allure generate` | 30 s | `wdio.conf.ts:285` |

## Artefatos

| Ambiente | Allure results | Vídeo | Screenshot (falha) |
|---|---|---|---|
| Local | `reports/allure-results` → `reports/allure-report` (abre no browser) + `reports/html/report.html` | `test/videos/` | `test/screenshots/` |
| Device Farm | `$DEVICEFARM_LOG_DIR/allure-results` → Customer Artifacts → CI → Pages | anexo Allure | anexo Allure |
| Remote Access | igual ao local | **nenhum** (não suportado) | `test/screenshots/` |

Relatório publicado: `https://<owner>.github.io/<repo>/run-<n>-<data>/<android|ios>/`;
índice na raiz. Single-file baixável nos artifacts `allure-report-<plat>-<n>` (30 dias).

## Resultado esperado por ambiente

| Ambiente | Esperado | Observação |
|---|---|---|
| Android local / DF | 21/21 | referência; qualquer vermelho é regressão |
| iOS Device Farm | 16/21 | os 5 "filtros de ordenação" falham por bug do app (bottom sheet sem filhos) — roda em todo PR mesmo assim; o vermelho é o sinal da dívida |
| iOS Remote Access | 16/21 menos o que depende de reset | `clearApp` recusado → app reabre logado; `login.spec` "campos vazios" não chega à tela de login |

## Unit tests (`scripts/__tests__/download-build.test.ts`, 24 casos)

- `parseLatestBuildUrl`: FINISHED + `buildUrl`, ignora iOS/sem artifact/sem status, mais
  recente primeiro, erro em lista vazia
- `resolveBuildSelection`: default `latest` sem profile; profile por plataforma sem
  vazamento; `date` com from/to/só um; erros para modo desconhecido, sem bordas, `to < from`,
  data inexistente, formato errado
- Com profile e intervalo: filtra `buildProfile`, ignora fora do intervalo, escolhe o mais
  recente dentro dele mesmo fora de ordem, `.ipa` para iOS, mensagem de erro cita
  plataforma/profile/intervalo

## Lacunas

- Não há teste automatizado de `wdio.conf.ts` (`buildCapabilities` etc. não são exportadas)
  — verificação é o run real nos 4 ambientes.
- Campanhas e Menu sem cobertura (Fase 8).
- Locator iOS do popup OTA nunca exercitado (UPD-02).
- `home.spec` depende de dado da conta ("Fudaba").
