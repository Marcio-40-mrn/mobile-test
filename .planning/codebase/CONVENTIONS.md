# Convenções

Fonte de verdade: `CLAUDE.md` (raiz) e o coding standards do Aramis via MCP
`backstage_get_coding_standards` (consultar antes de editar). Este arquivo consolida o que
vale neste repositório com exemplos reais.

## Selectors (convenção vigente até a Fase 7)

| Plataforma | Permitido | Proibido |
|---|---|---|
| Android | XPath com `@text`, `@content-desc`, `@resource-id`, `@hint`; accessibility id `~` quando o `content-desc` é o rótulo | UiSelector, ids de classe soltos |
| iOS | accessibility id `~<testID>`; `-ios predicate string:` (`name ==`, `BEGINSWITH`, `CONTAINS`, `label BEGINSWITH`) | **XPath**; locator inventado por analogia com o Android |

- O `testID` do RN vira `resource-id` no Android e `name` no iOS → mesmos ids com prefixo
  diferente (`//*[@resource-id="btn-sign-in-submit"]` ↔ `~btn-sign-in-submit`).
- Texto visível diverge de verdade: tab bar inferior é `~Inicio` no Android e
  `~tab-home-1` no iOS; atalhos são `~Aniversariantes` vs `~btn-customer-tag-1-aniversariantes`
  (`home.page.ts:5-9`).
- Locator iOS **não validado** em device recebe comentário dizendo isso (`base.page.ts:22-24`).
- Quando o iOS concatena valor no `name` (`"Total de clientes: 6"`,
  `segmented-control-tab-hoje-(0)`), usar `BEGINSWITH`/`CONTAINS`, nunca igualdade.

```ts
get searchField() {
  return $(byPlatform({
    android: '//android.widget.EditText[@text="Buscar..."]',
    ios: '~filterable-top-tab-bar-search-input-input',
  }));
}
```

## Convenção mantida na Fase 7 (decisão de 2026-09-16)

A ideia de 2026-09-15 — `if (IS_IOS) { … } else { … }` em **todo** método, com o locator
dentro do ramo — foi **descartada** pelo usuário ("igual ao Android"). A convenção acima
continua valendo: `byPlatform()` nos getters de locator e `if (IS_IOS)` **só** onde a
interação diverge, encapsulada em `BasePage` sempre que servir a mais de uma página. As
divergências descobertas na captura de 2026-09-16 entraram assim:

| Divergência (medida) | Onde |
|---|---|
| Digitação pelo teclado perde caracteres no TextInput controlado | `BasePage.typeInto()` — iOS: foco, teclado, `maxTypingFrequency: 20`; Android: `setValue` |
| 1º toque perdido em certos alvos | `BasePage.tapUntil()` — toque + estado esperado + 1 repetição (Android: 1 tentativa) |
| Popups pós-PIN chegam juntos (ATT, notificações, sheet) | `BasePage.handleNotificationPopup()` ramo iOS |
| Remote Access recusa `clearApp` | `BasePage.signOutIfLoggedInIOS()` chamado por `relaunchApp()` |
| `screen-sign-in` invisível sem teclado | `LoginPage.loginTitle` iOS = `~scroll-sign-in` |
| Abas com `x` negativo / ausentes até arrastar | `ClientesPage.navigateToTab()` — posição + `tapUntil` até o segmento da aba |

Regras que **não** mudam: selectors por plataforma (tabela acima), `pause` só comentado,
`$()` proibido em spec, cada ação valida o estado seguinte.

## Esperas

- `waitForDisplayed({ timeout })` para aparecer; `{ reverse: true }` para sumir.
- `isDisplayed(element, timeout)` de `BasePage` para checagem opcional (retorna boolean).
- `browser.pause(N)` **só** com comentário inline no formato
  `// <motivo: animação ou infra sem elemento observável>`:

```ts
await browser.pause(500); // scroll animation — no element signals completion
await browser.pause(6000); // PIN submission triggers background session init with no UI feedback
```

## Page objects

- Locators são `get`; interações são `async`; a classe estende `BasePage`; o arquivo exporta
  um singleton `export const xPage = new XPage()`.
- Métodos recebem o **elemento já resolvido pelo getter**, nunca a string do seletor
  (`isDisplayed(this.pinContainer, 8000)`).
- Métodos privados para partes de fluxo (`scrollTabBarRight`, `scrollSortModalDown`).
- Constantes de domínio exportadas junto da página (`FILTROS_ORDENACAO` em `clientes.page.ts`).
- Specs: `describe` por tela com **um único `it`**; `beforeEach` começa por
  `launchAndCheckUpdate()` (+ `ensureLoggedIn()` + navegação em home/clientes) e `afterEach`
  chama `resetAppState()`. Cada cenário é um `allureReporter.step('deve <ação> [e
  <verificação>]', …)` com `expect(...).toBe(true)` no fim. **Sem `$()`.**
- Popup/alerta: método `…IfPresent`/`handle…` clica **e valida** que o elemento sumiu
  (`waitForDisplayed({ reverse: true })`), repetindo se preciso — nunca assume que o clique
  fechou (o CANCELAR de notificações ignora o 1º clique no Android).

## Comentários

Em **português**, explicando o *porquê* (o que a plataforma faz de errado, o que já falhou),
não o *quê*. Exemplos-modelo: `base.page.ts:50-56` (alerta duplicado), `wdio.conf.ts:210-219`
(MediaProjection), `mobile_test.yml:447-453` (ffmpeg `-nostdin`). Comentários de `pause` em
inglês curto são tolerados (padrão herdado).

## TypeScript

- `strict`; tipos do WDIO via `types` no tsconfig (`$`, `driver`, `browser`, `expect` globais).
- `type Element = ReturnType<typeof $>` para assinaturas em `BasePage`.
- Funções puras testáveis exportadas de `scripts/` (`resolveBuildSelection`,
  `parseLatestBuildUrl`); efeitos colaterais (`execSync`, download) em `downloadLatestBuild`.
- `require()` só onde não há tipos (`allure-commandline`, com comentário).

## Git

- Branches `feat/ fix/ chore/ refactor/ docs/` a partir de `main`; PR obrigatório.
- Conventional Commits: `<tipo>(<escopo>): <imperativo, minúsculo, sem ponto>`
  (`fix: route pin param through doLogin and remove redundant greeting checks`). Histórico
  recente tem mensagens fora do padrão (`sua mensagem de commit`, `Merge`) — não repetir.
- Nunca `npm audit fix --force`; mudança de dependência → run real no Device Farm.
- Nada de commit automático por assistente: quem versiona é o mantenedor.

## Config e CI

- `wdio.conf.ts`: flags no topo, builders puros, sem `if/else` espalhado no objeto `config`.
- Workflow: cada `run:` com `set -euo pipefail` (ou `set +e` + `exit 0` explícito quando o
  step não pode reprovar); logs de função para `>&2` quando o stdout é capturado; `sort -V`
  para `run-N`; tudo que roda dentro de `while read` usa `-nostdin` / `< /dev/null`.
- Testspec: credenciais só via `printf` para `.env`; nunca `echo` do valor.
