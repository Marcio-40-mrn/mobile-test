# 09 — "Ordenar por" (iOS)

## Como chegar aqui

Na tela "Meus clientes" (draft 08), qualquer aba: tocar `filterable-top-tab-bar-sort-button`
abre o bottom sheet "Ordenar por". Fechado nesta sessão por toque no backdrop (`200,150`),
não pelo X (o X não tem nó na árvore — ver Elementos).

## Capturas

- `30-ordenar-por.xml` / `.png` — sheet aberto sobre a aba Favoritos (`Total de clientes: 0`,
  empty state ao fundo, ambos `visible="false"` sob o sheet).

## Elementos

| type | name | label | value | rect | enabled | visible |
|---|---|---|---|---|---|---|
| `Button` | `Bottom sheet backdrop` | — | — | `[0,0 402x874]` | true | true |
| `Other` | `Bottom sheet handle` | — | — | `[0,437 402x24]` | true | true |
| `Other` | `Bottom Sheet` | — | — | `[0,437 402x528]` | true | **`false`** — sem filhos, sem conteúdo acessível |

Nenhuma das 7 opções, o título "Ordenar por" nem o X existem como nó na árvore, em nenhum
nível (`--all` incluído). Todo o conteúdo abaixo (tela de Favoritos) fica `visible="false"`
enquanto o sheet está aberto.

**Só no print**: título "Ordenar por", X à direita do título, e as 7 opções, na ordem —
"Nome do cliente A-Z", "Nome do cliente Z-A", "Nível do cliente", "Contato mais recente",
"Contato mais antigo", "Ticket médio mais alto", "Ticket médio mais baixo" — igual à lista
`FILTROS_ORDENACAO` de `clientes.page.ts`.

## Seletor proposto

- Detectar que o sheet está aberto → `~Bottom sheet handle` (de `name`, captura 30) — única
  evidência de árvore disponível.
- Fechar → toque no backdrop (`~Bottom sheet backdrop`, de `name`) em uma coordenada fora
  do sheet (usado nesta sessão: `200,150`, dentro da área ainda cobrida pelo backdrop mas
  fora do retângulo do "Bottom Sheet" que ocupa `y ≥ 437`). Não há seletor para o X porque
  ele não existe na árvore.
- As 7 opções → **sem seletor de árvore possível.** O predicate por texto
  (`-ios predicate string:name == "<opção>"`) já usado em `clientesPage.sortOption()` não
  encontra nada, porque não há nó `name`/`label` com esses textos — confirmado por esta
  captura (grep no XML bruto pelos 7 textos não retorna nenhum elemento).

## Equivalência entre plataformas

- `clientesPage.sortModalTitle`: `ios: predicate name == "Ordenar por"` → **não encontra
  nada** nesta captura — confirma que o título não está na árvore (só no print).
- `clientesPage.sortOption(label)`: `ios: predicate name == "${label}"` → **não encontra
  nada** para nenhuma das 7 opções — confirma a limitação já documentada no comentário do
  próprio código ("o bottom sheet do iOS não expõe os filhos na árvore XCUITest").
- `clientesPage.openSortFilter()` / `selectSortOption()` / `applySortFilter()`: dependem de
  `sortOption()` estar visível — **vão falhar por timeout** em qualquer execução iOS real,
  exatamente como CLI-06 já registra ("Android ✓ / iOS ✗", bloqueado pelo app).
- **Android**: o sheet equivalente expõe as opções na árvore (`@text="<opção>"` via XPath) —
  funciona normalmente; esta é a divergência estrutural central entre as duas plataformas
  para este componente, já documentada em `CLAUDE.md` ("Known app bug") e reconfirmada
  nesta sessão sem qualquer melhora.

## Timing e gestos

- Sem medição de tempo de abertura/fechamento do sheet nesta sessão.
- Fechamento por toque no backdrop em coordenada fixa (`200,150`) funcionou de primeira —
  não houve padrão de "1º toque perdido" aqui.

## Armadilhas

- **Bloqueio confirmado, não descoberto agora**: esta captura reconfirma exatamente o que
  `CLAUDE.md`/`CONCERNS.md` já registravam — bottom sheets do `@gorhom/bottom-sheet` não
  expõem filhos na árvore XCUITest, "por qualquer estratégia" (accessibility id, predicate
  por texto, class chain — nenhum alcança um nó que não existe). A correção é no app
  (`accessible={false}` no container + `testID` por opção), não na automação.
- **Nenhum novo caminho encontrado hoje** para contornar isso via árvore. Uma alternativa
  por coordenada (como o onboarding) é tecnicamente possível — os textos das 7 opções têm
  posição previsível no print — mas **não foi implementada nem testada nesta sessão**;
  ficaria sujeita ao mesmo risco de fragilidade entre tamanhos de tela que o onboarding já
  tem, e o padrão do projeto é não papering over com coordenadas sem necessidade
  comprovada.
- Todo o conteúdo da tela por baixo (aba ativa, empty state) fica `visible="false"` durante
  o sheet — comportamento normal de overlay, não uma anomalia adicional.
