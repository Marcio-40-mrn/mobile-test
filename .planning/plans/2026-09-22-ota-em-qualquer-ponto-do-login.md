# 2026-09-22 — Popup OTA em qualquer ponto do caminho abrir → Home

## Problema

O popup "Atualização disponível" era tratado em **3 pontos fixos** do fluxo, na premissa de
que ele chega no boot. Ele não chega só no boot: o usuário viu em vídeo do run o popup subir
**depois** de `launchAndCheckUpdate()` já ter validado o campo de e-mail, com o
`fillAndSubmit()` no meio do preenchimento. Como é um alerta nativo (AlertDialog no Android,
`XCUIElementTypeAlert` no iOS), ele engole os toques seguintes e o teste só morre ~30 s
adiante, na espera pela saudação da home — com mensagem que não cita a OTA.

## Evidência

- Vídeo do run do usuário (2026-09-22): popup na tela antes do preenchimento de e-mail/senha,
  teste vermelho.
- `.planning/STATE.md`, sessão 2026-09-18, já registrava o mesmo sintoma entre os flakes dos
  runs 19:00–20:26: *"OTA chegando no meio do `fillAndSubmit`"*.
- Janela exposta: com `ACTION_DELAY_MS = 4000` antes de cada ação, o trecho
  `clearField` → `typeInto` (e-mail) → `clearField` → `typeInto` (senha) → `click` dura ~20 s
  no Android sem nenhuma checagem de popup.
- `handlePin()` saía em silêncio (`if (!onPin) return`) quando a OTA cobria a tela do PIN: a
  falha aparecia só na espera da saudação, sem apontar a causa.
- `test/specs/login.spec.ts` chamava `fillAndSubmit` → `handlePin` → `handleNotificationPopup`
  direto, sem passar por `doLogin()` — a recuperação de OTA tardia nunca o cobria.

## Requisitos

- **UPD-03** (escrito nesta sessão), **UPD-01**, **AUTH-04**.
- Regras invioláveis: **1** (a divergência Android/iOS fica dentro de
  `dismissUpdatePopupIfPresent()` — nenhum `if (IS_IOS)` novo), **3** (nenhum `pause()`
  novo), **5** (a detecção mora num método só, não repetida em 6 `if`), **7**
  (`wdio.conf.ts` intocado), **10** (cada passo valida o estado seguinte).
- Coding standards do Aramis (Backstage): sem magic numbers (`MAX_TENTATIVAS_LOGIN`,
  `TIMEOUT_TELA_LOGIN_MS`), nunca engolir erro silenciosamente (o `catch` do `doLogin()` só
  absorve quando o popup está comprovadamente na tela; caso contrário relança o original).

## Solução

Duas camadas. A barata previne; a outra é rede de segurança.

1. **`BasePage.dismissUpdatePopupIfPresent(0)`** = consulta única, sem espera
   (`isExisting()`, ~0,5–0,8 s no Android). Era impossível antes: `waitForDisplayed({ timeout: 0 })`
   cai no `waitforTimeout: 10000` do `wdio.conf.ts:225`. Os 3 call sites existentes
   (20 s / 20 s / 8 s) não mudam de comportamento.
2. **`LoginPage.otaReiniciouOApp()`** (novo, `private`) — ponto único de detecção. Quando
   retorna `true`, o REINICIAR já foi aplicado e o app **já está de volta na tela de login**
   (o `waitForRestartToFinish()` garante isso); quem chamou refaz o que perdeu.
3. **`fillAndSubmit()`** — laço de até `MAX_TENTATIVAS_LOGIN`, com guarda depois do e-mail,
   depois da senha e depois do submit (nos dois ramos). Cobre o caso do vídeo, inclusive
   quando o spec chama o método direto. Esgotadas as tentativas, lança erro nomeando a OTA.
4. **`handlePin(pin, jaRefezLogin)`** — quando o PIN não vem em 8 s, confere a OTA antes de
   retornar; se era ela, refaz `fillAndSubmit()` e volta a esperar o PIN (uma vez só). O
   `return` silencioso continua valendo para o caminho legítimo do `ensureLoggedIn()`.
5. **`doLogin()`** — vira laço de tentativas; o corpo antigo saiu **sem alteração** para
   `private executarLogin()`. Qualquer erro passa por `otaReiniciouOApp()`: se o popup estava
   na tela, aplica e refaz; senão `throw erro`. Fecha as esperas longas (PIN reverse 45 s,
   saudação 30 s) sem transformá-las em polling.
6. **`launchAndCheckUpdate()`** — se o campo de e-mail não vier em 15 s, confere a OTA uma
   vez e reespera (caso: o popup chega depois dos 20 s do primeiro check).
7. **`login.spec.ts`** — o step "deve acessar a home após inserir o PIN correto" passa a
   chamar `doLogin()` em vez da sequência manual, fechando a última lacuna (OTA tardia, já na
   home). Custo: +26 s no spec (6 s de splash + 20 s do primeiro check do `doLogin`).

### Descartado

Pôr a checagem em `BasePage.beforeAction()` pegaria todos os call sites de graça, mas ela roda
em **29 pontos**, inclusive nos laços do `clientes` (4 abas × 7 filtros, 529 s medidos no AVD
contra o teto de 1200 s): +0,6 s por ação estouraria o orçamento.

## Custo

3 consultas extras por login no caminho feliz (as outras 3 guardas só disparam em caminho de
falha, que hoje já queima timeout). Sem `beforeAction()`, logo sem os 4 s de pausa.

| | Antes (AVD) | Depois |
|---|---|---|
| `login` | 55 s | ~83 s (+26 s do `doLogin()` no step 3) |
| `home` | 188 s | ~190 s |
| `clientes` | 529 s | ~531 s |

## Arquivos

| Arquivo | Alteração |
|---|---|
| `test/pages/base.page.ts` | `dismissUpdatePopupIfPresent()` aceita `timeout = 0` (consulta única) |
| `test/pages/login.page.ts` | `MAX_TENTATIVAS_LOGIN`, `TIMEOUT_TELA_LOGIN_MS`; novo `otaReiniciouOApp()`; `fillAndSubmit()`, `handlePin()`, `doLogin()` (+`executarLogin()`), `launchAndCheckUpdate()` |
| `test/specs/login.spec.ts` | step 3 chama `doLogin()` |
| `.planning/REQUIREMENTS.md` | UPD-03 |

**Não mudou**: nenhum selector, nenhum `if (IS_IOS)` novo, `wdio.conf.ts`, `testspec-ios.yml`,
workflow, `package.json`, `home.spec.ts`, `clientes.spec.ts`, `home.page.ts`,
`clientes.page.ts`.

## O que conferir no run

- `npx tsc --noEmit` — só o erro pré-existente `wdio.conf.ts(202,3) autoCompileOpts`.
- `npx vitest run scripts test/utils` — 50 testes verdes (não tocam estes métodos; servem de
  não-regressão).
- **Sem OTA pendente** (caso normal): log do `login` igual ao de hoje, +2 s nos specs de
  `home`/`clientes` e +26 s no `login`.
- **Com OTA pendente**: o step `preparo: …` fica verde com o reinício embutido, em vez do
  timeout de 30 s em `greeting-header`/`Olá,`. Vale gravar um run com build OTA pendente para
  capturar a evidência — é o único caminho que exercita o código novo.
- Se a OTA reaparecer duas vezes seguidas, a mensagem é
  `Login não concluído: o popup OTA reiniciou o app em 2 tentativas seguidas de preenchimento.`
