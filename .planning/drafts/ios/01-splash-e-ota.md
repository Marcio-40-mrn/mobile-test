# 01 — Splash e OTA (iOS)

## Como chegar aqui

Início do app (`activateApp` após `terminateApp` + `resetAppState`). A splash mostra só a
imagem central por alguns segundos; se houver build OTA pendente, o app sobrepõe um alerta
nativo **antes** de renderizar a tela de login por baixo (a árvore da tela de login já existe,
mas com `visible="false"` em todos os nós — captura 01).

Sequência observada nesta sessão: splash → alerta OTA (apareceu porque a sessão trocou de
build 1.5.x para 1.6.0) → toque em `Reiniciar` → app reinicia → tela de login (captura 02).

## Capturas

- `00-inicial.xml` / `.png` — splash, só a imagem central.
- `01-pos-splash.xml` / `.png` — alerta OTA sobre a tela de login invisível.

## Elementos

| type | name | label | value | rect | enabled | visible |
|---|---|---|---|---|---|---|
| `XCUIElementTypeAlert` | `Atualização disponível` | — | — | `[41,355 320x192]` | true | true |
| `XCUIElementTypeStaticText` | `Atualização disponível` | — | `Atualização disponível` | `[71,377 260x21]` | true | true |
| `XCUIElementTypeStaticText` | `Uma nova atualização está pronta para ser aplicada. Deseja reiniciar o app agora?` | — | idem | `[71,404 260x59]` | true | true |
| `XCUIElementTypeButton` | `Agora não` | — | — | `[57,483 140x48]` | true | true |
| `XCUIElementTypeButton` | `Reiniciar` | — | — | `[205,483 140x48]` | true | true |

Todo o resto da árvore (`screen-sign-in`, `scroll-sign-in`, campos, `btn-sign-in-submit`, …)
está presente mas com `visible="false"` — não é acionável enquanto o alerta está na tela
(captura 01, `--all`).

## Seletor proposto

- Botão "Reiniciar": alerta nativo, **não** dá para usar `~`/predicate contra a árvore do
  app — é um `XCUIElementTypeAlert` do sistema. Único caminho confiável:
  `driver.execute('mobile: alert', { action: 'accept', buttonLabel: 'Reiniciar' })`
  (de `name="Reiniciar"`, captura 01).
- Se algum dia precisar do seletor direto (não recomendado): `-ios predicate string:name == "Reiniciar"` —
  mas alertas nativos ficam fora da árvore do `AppiumAUT`/`WebDriverAgent` em alguns
  estados; `mobile: alert` é o caminho usado com sucesso nesta sessão.

## Equivalência entre plataformas

- `base.page.ts` (`updateRestartButton`, get atual):
  ```ts
  ios: '-ios predicate string:name == "REINICIAR"',
  ```
  **Corrige**: o texto real capturado é `Reiniciar` (capital apenas na primeira letra), não
  `REINICIAR` (maiúsculas eram só o valor Android). Esse locator nunca tinha sido validado em
  device (comentário do próprio código, `UPD-02` em aberto) — a captura de hoje fecha essa
  lacuna. Além do texto errado, a abordagem por seletor de árvore não é a mais robusta: o
  alerta é nativo (`XCUIElementTypeAlert`), então o padrão já usado em `acceptSystemAlert()`
  (`mobile: alert`) é preferível a um `$(...)`.
  - Android: `'//*[@text="REINICIAR"]'` — mantém-se; não afetado por esta captura.

## Timing e gestos

- Sem medição de tempo de splash nesta sessão (o dump foi tirado após a splash já ter
  passado). `login.page.ts`/`base.page.ts` usam `browser.pause(5000-6000)` — não confirmado
  nem contestado por esta captura.
- Alerta fechou com um único `mobile: alert accept buttonLabel:'Reiniciar'` — sem retry
  necessário (diferente do padrão de "1º toque perdido" que aparece em botões do app).

## Armadilhas

- **Nunca clicar o alerta por seletor de árvore do app** — é `XCUIElementTypeAlert`, fora do
  padrão de `testID`; usar sempre `mobile: alert`.
- A tela de login por baixo do alerta está inteira na árvore com `visible="false"`: um
  `waitForDisplayed` ingênuo em `screen-sign-in`/`scroll-sign-in` teria um resultado
  ambíguo — o elemento "existe" mas não está pronto para interação. Esperar o alerta
  desaparecer antes de qualquer ação na tela de login.
- Este popup só aparece **quando há build pendente** (medido nesta sessão porque a troca de
  build coincidiu com o teste) — não dá para depender dele existir toda vez; o método
  correspondente (`dismissUpdatePopupIfPresent`) já trata isso como opcional.
