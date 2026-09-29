# 2026-09-18 — Build 1.6.0 (138) `production`: PIN, Campanhas e "Ordenar por" (Android)

## Problema

Com o build `production` 1.6.0 (138) no AVD, `login`/`home` falham de forma intermitente e
o `clientes` só passa por sorte de tempo. Captura completa do build em
`.planning/drafts/android/captures/1.6.0-138/` + `NOTAS-2026-09-18-1.6.0-138.md`: **nenhum
selector mudou**; o que mudou foi o **tempo** que o app leva entre as telas.

## Evidência (medida no AVD em 2026-09-18, spec descartável no scratchpad)

| Medição | Valores | O que o código assume hoje |
|---|---|---|
| `otp-input-container` some após o `mobile: type` do PIN | 5,5 s · 7,5 s · **12,0 s** | `browser.pause(6000)` |
| Popup "Permita notificações" aparece após o PIN sumir | +0,44 s | `isDisplayed(…, 4000)` contado a partir do fim do pause — com PIN em 12 s o popup chega **depois** da janela e fica por cima do sheet (print `test/screenshots/verify_…18-09-20`), a saudação nunca fica visível e o `doLogin()` estoura em 30 s |
| Clique em `otp-input-container`/`input-pin-code` (mesmo rect `[184,1135][896,1318]`) → `isKeyboardShown()` | true em 0,73 s · 1,23 s (2/2) | clica `btn-pin-submit` (desabilitado) + `pause(500)`, sem conferir foco; 1 de 3 rodadas da captura digitou no vazio |
| "Campanhas e segmentos" visível após 1 toque em `btn-campaign-section-view-all` | **4,48 s** (e 6–9 s na captura) | `tapUntil` timeout 4 000 ms, 1 tentativa no Android → `Error: Toque em … não levou ao estado esperado` |
| Toque em `sort-option-name-desc`, `-customer-level`, `-avg-ticket-asc`, `-name-asc` por `resource-id` | 4/4: sheet "Ordenar por" fecha (4,7–6,8 s), "Total de clientes" visível | opção localizada por `//*[@text="…"]`; `pause(1500)` sem validar que o sheet fechou |

Device Farm Android #29–#32 rodaram o 1.5.0 (133) `.apk` (`preview`): o secret
`BUILD_PROFILE_ANDROID` não aponta para `production`, por isso o CI nunca viu isso.

## Requisitos

- `REQUIREMENTS.md` fluxo de login (PIN → popups → home) e **HOME-03** ("Seção Campanhas →
  'ver todas' → 'Campanhas e segmentos' → voltar"), **CLI-06** ("as 7 opções de 'Ordenar
  por' aplicam…").
- Regras invioláveis: **1** (uma suíte; `if (IS_IOS)` dentro do método), **2** (Android só
  XPath por `resource-id`/`text`/`content-desc`/`hint`, capturado de dump real), **3**
  (`pause()` só com comentário), **6** (nada de coordenadas).

## Como funciona hoje

1. `LoginPage.handlePin()` (Android): `pinScreen.click()` (= `btn-pin-submit`, botão
   desabilitado "Digite o PIN para continuar") → `pause(500)` → `mobile: type` → `pause(6000)`.
   Não valida foco nem que o PIN foi aceito.
2. `LoginPage.doLogin()`: `handlePin()` → `dismissTrackingPromptIfPresent()` (no-op Android)
   → `BasePage.handleNotificationPopup()` (espera o popup 4 s; não veio → retorna) →
   `dismissOnboardingSheetIfPresent()` → `dismissUpdatePopupIfPresent(8000)` → saudação 30 s.
3. `HomePage.openAllCampaigns()`: `tapUntil(btn, título)` com o default
   `timeout = 4000` de `BasePage.tapUntil()`.
4. `ClientesPage.sortOption(label)` Android: `//*[@text="${label}"]`;
   `selectSortOption()`: scroll até a opção → `click()` → `pause(1500)`.

## Como vai funcionar

1. **Alterado** `handlePin()` Android: clica `pinContainer` (`otp-input-container`, mesmo
   rect do `input-pin-code` medido) → **novo** `waitUntil(isKeyboardShown, 10 s)` (prova que o
   campo focou; falha nomeando o PIN se não abrir) → `mobile: type` → **novo**
   `pinContainer.waitForDisplayed({ reverse: true, timeout: 45000 })` no lugar do `pause(6000)`
   (medido 5,5–12 s; falha nomeando "PIN não aceito" se continuar). Sai o `pause(500)`.
   Getter `pinScreen` fica sem uso → **removido**.
2. `doLogin()` **não muda**: com o PIN esperando o próprio sumiço, o popup chega 0,4 s
   depois — dentro dos 4 s que `handleNotificationPopup()` já espera.
3. **Alterado** `BasePage.tapUntil()`: default `timeout = 4000` → `IS_IOS ? 4000 : 30000`.
   Sucesso continua imediato (o `isDisplayed` retorna assim que o alvo aparece); só a
   tolerância de falha no Android cresce. Cobre Campanhas (4,5 s) e as outras telas de rede
   (`openAllCustomers`, atalhos) sem tocar cada chamada. iOS mantém 4 s × 2 tentativas.
4. **Novo** `SORT_OPTION_IDS` em `clientes.page.ts` (label → `testID` capturado em
   `18-ordenar-por.xml`); `FILTROS_ORDENACAO` passa a ser `Object.keys(SORT_OPTION_IDS)`
   (mesma ordem, mesmos 7 literais — o spec não muda). **Alterado** `sortOption(label)`
   Android → `//*[@resource-id="${SORT_OPTION_IDS[label]}"]`; iOS igual.
   **Alterado** `selectSortOption()`: Android troca o `pause(1500)` por
   `sortModalTitle.waitForDisplayed({ reverse: true, timeout: 20000 })` (o sheet fecha em
   < 1 s; cada consulta XPath custa ~0,7 s); iOS mantém o `pause` (o sheet lá não expõe
   nada — bloqueio conhecido).
5. **Alterado** `verifyFilterResult()` Android: em vez de esperar 5 s pelo botão do card e
   só então 5 s pela mensagem de vazio (3 das 4 abas estão vazias → ~2 min por `it`), uma
   consulta só: `//*[@text="${botaoTexto}" or @text="${mensagemVazio}"]`, 20 s. iOS igual.
6. **Alterado** `wdio.conf.ts` `mochaOpts.timeout` 600 s → **1200 s** e
   `maxDurationSec` do vídeo DF Android 600 → 1200 (o vídeo não pode acabar antes do
   teste). Necessidade comprovada: `clientes` estourou 600 s às 14:19 e às 18:31; com os
   itens 4–5 passou em **529 s** (12 % de folga — insuficiente para o Device Farm).

**Folga (regra do Marcio, 2026-09-18):** timeouts nunca justos ao medido no AVD — o Device
Farm é mais lento. Todos os valores acima têm ≥ 2× a pior medição; esperas condicionais
retornam assim que o elemento aparece, então a folga só custa na falha.

## Arquivos e alterações

| Arquivo | Método | De → para |
|---|---|---|
| `test/pages/login.page.ts` | `get pinScreen()` | removido (único uso era o `handlePin` Android) |
| `test/pages/login.page.ts` | `handlePin()` bloco Android | `pinScreen.click(); pause(500); mobile:type; pause(6000)` → `pinContainer.click(); waitUntil(isKeyboardShown); mobile:type; pinContainer reverse 20 s` |
| `test/pages/base.page.ts` | `tapUntil()` assinatura | `timeout = 4000` → `timeout = IS_IOS ? 4000 : 30000` |
| `test/pages/clientes.page.ts` | topo | `FILTROS_ORDENACAO` array → `SORT_OPTION_IDS` + `FILTROS_ORDENACAO = Object.keys(...)` |
| `test/pages/clientes.page.ts` | `sortOption()` | android `//*[@text="${label}"]` → `//*[@resource-id="${SORT_OPTION_IDS[label]}"]` |
| `test/pages/clientes.page.ts` | `selectSortOption()` | `pause(1500)` → Android: `sortModalTitle` reverse 20 s; iOS: pause mantido |
| `test/pages/clientes.page.ts` | `verifyFilterResult()` | Android: 2 esperas (5 s + 5 s) → 1 XPath `or` 20 s; iOS: inalterado |
| `wdio.conf.ts` | `mochaOpts.timeout`, `maxDurationSec` | 600 s → 1200 s (os dois) |
| `CLAUDE.md`, `.planning/codebase/TESTING.md` | — | documentam os 1200 s e o custo de ~0,7 s por XPath |

## O que NÃO muda

- iOS: nenhum locator, nenhum tempo (`tapUntil` 4 s × 2, `handlePin` por teclas `~0..~9`,
  `sortOption` predicate, `selectSortOption` pause).
- `testspec*.yml`, `mobile_test.yml`, `package.json`; em `wdio.conf.ts` só os dois números acima.
- Os três specs (`FILTROS_ORDENACAO` mantém os mesmos 7 literais e ordem).
- `handleNotificationPopup()`, `dismissOnboardingSheetIfPresent()`, `doLogin()`, `ensureLoggedIn()`.
- Selectors Android já existentes (`otp-input-container`, `btn-campaign-section-view-all`,
  `Campanhas e segmentos`, `Ordenar por`).

## Resultado (AVD, 2026-09-18, após a mudança)

| Spec | Antes | Depois |
|---|---|---|
| `login` | 5 ms sem teste / flaky | ✓ 55 s |
| `home` | ✖ Campanhas (`tapUntil` 4 s) | ✓ 188 s (Campanhas 11 s) |
| `clientes` | ✖ timeout 600 s (parava em Pós Vendas) | ✓ **529 s** — Favoritos 46 s, Aniversariantes 75 s, Cashback 123 s, Pós Vendas 120 s |

Residual: Cashback e Pós Vendas gastam ~17 s por filtro contra ~7 s em Favoritos; a causa
não foi medida (o spec não tem step por filtro). Não bloqueia.

## Verificação

- `npx tsc --noEmit` (só o `autoCompileOpts` pré-existente em `wdio.conf.ts`).
- `git diff test/pages/` restrito aos 3 arquivos.
- Run local `login` + `home` + `clientes` (`SKIP_DOWNLOAD=true`, 1.6.0/138): feito, os três
  verdes (tabela acima). Se o PIN não focar: erro `PIN: teclado não abriu após focar
  otp-input-container`; se não for aceito: `PIN não aceito: otp-input-container continua na
  tela após 45 s`.
- Próximo run no Device Farm Android: conferir o tamanho do vídeo de `clientes` (720p, agora
  até 1200 s) — o publish apaga arquivos > 100 MB.
- Device Farm: só quando `BUILD_PROFILE_ANDROID=production` for setado nos Secrets — até lá o
  CI segue no 1.5.0 (133), onde estes tempos não apareciam.
