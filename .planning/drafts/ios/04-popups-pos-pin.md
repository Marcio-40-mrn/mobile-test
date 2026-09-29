# 04 — Popups pós-PIN: ATT, notificações, onboarding (iOS)

## Como chegar aqui

Imediatamente após o 4º dígito do PIN (draft 03). A ordem real observada nesta sessão foi:
PIN → **ATT e o sheet de onboarding aparecem simultaneamente** (captura 11/12 mostram só
`Bottom sheet backdrop`/`handle`/`Bottom Sheet` na árvore do app — o ATT é alerta de sistema,
fora dessa árvore) → aceitar o ATT (`mobile: alert 'Ask App Not to Track'`) revela o alerta de
notificações **por cima** do sheet de onboarding (captura 13) → aceitar notificações com
`Cancelar` revela o sheet de onboarding puro (captura 14) → fechar o sheet pelo X.

## Capturas

- `11-pin-digitado.xml` / `.png` — logo após o PIN; só backdrop/handle do sheet na árvore
  (`--all`), home inteira `visible="false"` por baixo.
- `12-apos-pin.xml` / `.png` — mesmo estado, segunda captura.
- `13-apos-att.xml` / `.png` — após aceitar o ATT: alerta "Permita notificações" visível.
- `14-onboarding-sheet.xml` / `.png` — após fechar o alerta de notificações: sheet de
  onboarding "Veja como usar o Arys no seu dia a dia", sem filhos na árvore.

## Elementos

| type | name | label | value | rect | enabled | visible |
|---|---|---|---|---|---|---|
| `Button` | `Bottom sheet backdrop` | — | — | `[0,0 402x874]` | true | true (11-12, 14); `false` na 13 (ATT por cima) |
| `Other` | `Bottom sheet handle` | — | — | `[0,262 402x25]` (11/12/14) | true | true (11-12, 14); `false` na 13 |
| `Other` | `Bottom Sheet` | — | — | `[0,262 402x697]` | true | **`false`** em todas as capturas — sem filhos, sem conteúdo acessível |
| `XCUIElementTypeAlert` | `Permita notificações` | — | idem | `[41,327 320x248]` | true | true (só na 13) |
| `Button` | `Abrir configurações` | — | — | `[57,455 288x48]` | true | true (só na 13) |
| `Button` | `Cancelar` | — | — | `[57,511 288x48]` | true | true (só na 13) |

Toda a home (`greeting-header`, `home-search-input-input`, `campaign-section`,
`customer-section`, `custom-tab-bar` etc.) está presente com `visible="false"` nas três
capturas (11, 12, 13, 14) — confirma que ela já renderizou por baixo dos popups.

O conteúdo do sheet de onboarding (título "Veja como usar o Arys no seu dia a dia", texto,
botão "Começar", botão X) **não existe na árvore em nenhuma captura** — só aparece no print
(captura 14).

## Seletor proposto

- ATT: alerta de sistema, fora da árvore do app — `driver.execute('mobile: alert', { action: 'accept', buttonLabel: 'Ask App Not to Track' })`.
  Não observado no XML desta sessão (alertas de sistema não entram no `getPageSource()` do
  app) — o handler existente já assume isso (`acceptSystemAlert`), comportamento **não
  contestado, não reconfirmado por árvore** hoje; a evidência é indireta (a captura 13, que
  só existe porque o ATT já tinha sido aceito, mostra o próximo popup).
- Alerta de notificações: `XCUIElementTypeAlert name="Permita notificações"` (captura 13) →
  `driver.execute('mobile: alert', { action: 'accept', buttonLabel: 'Cancelar' })` (de
  `name`/`label` do botão, captura 13).
- Sheet de onboarding: **sem seletor de árvore possível.** O único nó estável é
  `~Bottom sheet handle` (`name`, capturas 11/12/14) — serve como detector de "algum sheet
  está aberto", não como container com filhos clicáveis. O fechamento continua sendo por
  coordenada relativa à janela (fração `0.88 w × 0.335 h`), confirmada visualmente na
  captura 14 (X no print em aproximadamente essa posição — ver Timing e gestos).

## Equivalência entre plataformas

- `base.page.ts` `notificationPopupTitle`: `ios: '-ios predicate string:name == "Permita notificações"'`
  → **confirma** o texto (captura 13).
- `base.page.ts` `handleNotificationPopup()`: no ramo iOS, usa `acceptSystemAlert('Cancelar')`
  com o comentário "a árvore traz DUAS cópias (uma visível e uma não)". **Diverge da
  captura de hoje**: a árvore da captura 13 tem **uma única** `XCUIElementTypeAlert` com
  `name="Permita notificações"` (confirmado por contagem de nós, não só de string — grep no
  XML bruto). Não reconfirmado o cenário de duplicação descrito na baseline/comentário; ver
  `RELATORIO-ANOMALIAS-IOS.md` para o encaminhamento (o handler via `mobile: alert` funciona
  independentemente de haver 1 ou 2 cópias, então o comportamento do código não muda — só o
  comentário está desatualizado ou descreve um build antigo).
- `base.page.ts` `dismissTrackingPromptIfPresent()`: usa `acceptSystemAlert('Ask App Not to Track')`
  — não capturado na árvore hoje (alerta de sistema); comportamento assumido, não
  contestado.
- `base.page.ts` `dismissOnboardingSheetIfPresent()`: iOS usa `~Bottom sheet handle` como
  detector e toque em fração `(0.88, 0.335)` da janela para fechar — **confirma** ambos: o
  `name` do handle aparece exatamente assim nas três capturas, e a fração bate com a posição
  do X medida no print da captura 14 (ver Timing e gestos).
- **Android**: onboarding tem `onboarding-welcome-sheet` e `btn-onboarding-welcome-close` na
  árvore (acessível) — o iOS não tem equivalente algum desses dois ids; a estratégia por
  coordenada é exclusiva do iOS e não deve ser copiada para Android (nem o inverso).

## Timing e gestos

- Posição do X do onboarding: print da captura 14 mostra o X em aproximadamente
  `x=352, y=294` pt (medido sobre o print, escala 3× do device 402×874 pt / 1206×2622 px) —
  bate com a fração `0.88 × 402 ≈ 354`, `0.335 × 874 ≈ 293` já usada no código. **Confirma**
  o fator sem precisar mudar.
- Sem medição de tempo entre PIN e o primeiro popup aparecer, nem entre popups.

## Armadilhas

- **Sheet sem filhos na árvore** é a anomalia mais cara aqui: nenhum seletor de
  accessibility id/predicate/class chain alcança o título, o texto, o botão "Começar" ou o
  X do onboarding. Qualquer teste que precise validar o conteúdo do sheet (não só fechá-lo)
  não tem caminho hoje — depende de correção no app.
- **ATT e onboarding sheet simultâneos**: a ordem de popups não é só "um de cada vez"; o
  ATT aparece por cima do sheet já aberto. Fechar primeiro o ATT antes de qualquer tentativa
  de interação com a home ou com o sheet, senão o toque pode ser engolido pelo alerta de
  sistema.
- **Notificações também aparecem por cima do sheet** (captura 13 mostra o sheet com
  `Bottom sheet backdrop`/`handle` ainda na árvore, mas invisíveis, enquanto o alerta de
  notificações está por cima). A ordem correta de fechamento é: ATT → notificações → sheet.
- Toda a home fica com `visible="false"` sob os popups — não é um bug, é o comportamento
  normal de overlay: um `isDisplayed()` na home nesse momento retorna `false`
  corretamente, não precisa de tratamento especial.
- Não reconfirmado hoje: a duplicação do alerta de notificações mencionada no comentário do
  código (`base.page.ts`). Ver `RELATORIO-ANOMALIAS-IOS.md`.
