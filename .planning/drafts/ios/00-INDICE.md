# Índice — Drafts iOS (sessão de captura 2026-09-16)

Sessão Remote Access do Device Farm, iPhone 402×874 pt (1206×2622 px), app Arys **1.6.0**.
Detalhe da sessão, padrões de interação e anomalias por captura:
`captures/NOTAS-SESSAO-2026-09-16.md`. Relatório consolidado de anomalias com evidência,
impacto e encaminhamento: `RELATORIO-ANOMALIAS-IOS.md`.

## Ordem das telas e capturas

| # | Draft | Capturas | Telas cobertas |
|---|---|---|---|
| 01 | `01-splash-e-ota.md` | 00, 01 | Splash; alerta OTA nativo |
| 02 | `02-login.md` | 02, 03, 04, 05, 06, 07, 08, 09 | Login: vazio, preenchido, erro de credencial, paste, olho de revelar senha |
| 03 | `03-pin.md` | 10 | Tela de PIN |
| 04 | `04-popups-pos-pin.md` | 11, 12, 13, 14 | ATT, "Permita notificações", onboarding sheet |
| 05 | `05-home.md` | 15, 21, 24, 25 | Home: topo, com Buscas Recentes, com scroll, info aberto |
| 06 | `06-busca-e-perfil-cliente.md` | 16, 17, 18, 19, 20 | Busca na home, resultados, perfil do cliente, voltar |
| 07 | `07-campanhas.md` | 22, 23 (×2), 40 | "Ver todas" de Campanhas; tela "Campanhas e segmentos" |
| 08 | `08-meus-clientes.md` | 26, 27, 28, 29, 31, 34, 35, 36, 37, 38 | Meus clientes: abas, arrasto, segmentos, Favoritos, Pós Vendas, Cashback |
| 09 | `09-ordenar-por.md` | 30 | Bottom sheet "Ordenar por" |
| 10 | `10-busca-clientes-sem-resultado.md` | 32, 33 | Busca sem resultado na aba de clientes |
| 11 | `11-menu.md` | 39 | Menu (levantamento para Fase 8) |
| — | (sem draft dedicado) | 41 | Home final (volta ao estado do draft 05 — sem elemento novo) |

## Pendências

O que não foi capturado nesta sessão e por quê:

- **Tooltip do `btn-customer-section-info`** ("Nesta área, o Arys…"): o toque no botão (via
  coordenada central, 20×21 pt) não abriu o tooltip nem no print nem na árvore (captura 25).
  Padrão consistente com "1º toque perdido", mas **não foi tentado um 2º toque** para
  confirmar — falta repetir a captura com 2 toques em sequência.
- **`mobile: clearApp` no endpoint Remote Access**: não testado nesta sessão (o pré-requisito
  da Fase 6 já avisa que o endpoint recusa o comando; a sessão não tentou validar isso de
  novo, só herdou a limitação conhecida). Falta uma sessão contra o Device Farm "run" normal
  (não Remote Access) para confirmar se `clearApp` funciona lá.
- **Opções do sheet "Ordenar por" expostas na árvore**: dependem de correção no app
  (`@gorhom/bottom-sheet` sem `accessible={false}` + `testID` por opção). Sem isso, não há
  como capturar esses 7 elementos como nós — só o print mostra o conteúdo.
- **`Estoque`, notificações (`greeting-header-notifications`), itens do menu**: presentes na
  árvore (ver drafts 05 e 11), mas nenhuma interação foi feita com eles nesta sessão — ficam
  para a Fase 8.
- **`mobile: type`/`driver.keys()` no PIN**: não testados nesta sessão (o handler atual já
  evita os dois, usando clique em `~0`..`~9`); a limitação vem do docx de 26/08 e não foi
  reconfirmada nem contestada aqui — marcar como "do docx, não reconfirmado".
- **Variantes em português da tecla de busca** (`Buscar`, `Pesquisar` no predicate de
  `submitSearch()`): o teclado desta sessão usou `name == "Search"` (inglês); as variantes
  em português não foram exercitadas.

## Descobertas que mudam a estratégia de seletores

1. **Locator do popup OTA estava errado e nunca tinha sido validado.** `base.page.ts` usava
   `name == "REINICIAR"` (maiúsculas, copiado do Android); o texto real no iOS é
   `Reiniciar`. Além disso, é um alerta nativo (`XCUIElementTypeAlert`) — o caminho correto
   não é um seletor de árvore, é `mobile: alert`. Fecha `UPD-02`.
2. **Títulos de tela frequentemente não têm `name` próprio no iOS** — só `value`
   (`Perfil do cliente`, `Campanhas e segmentos`) ou nem isso, apenas `value` num
   `StaticText` sem `name` nem `label` (`Campanhas`/`Meus clientes` na home). Os getters
   atuais (`~Perfil do cliente` etc.) funcionam empiricamente porque o WDA cai para
   `label`/`value` quando falta `name`, mas isso não foi comprovado isoladamente nesta
   sessão para todos os casos — ao escrever um novo getter por texto de título, preferir
   `-ios predicate string:value == "..."` de forma explícita em vez de confiar no fallback
   implícito do `~`.
3. **Padrão de "1º toque perdido" é recorrente e específico de certos elementos**, não
   geral: `btn-campaign-section-view-all`, `btn-customer-section-info` e `~Pós Vendas`
   mostraram esse padrão; busca, cards de resultado, back button e o botão "Reiniciar" do
   OTA não mostraram. Não generalizar "todo toque precisa de retry" — mas qualquer novo
   método de navegação por um botão pequeno ou recém-renderizado deveria validar o
   resultado e, se necessário, repetir o toque uma vez antes de falhar.
4. **O empty state da busca de clientes ("Nenhum cliente encontrado!") não está na árvore
   nesta sessão** — diverge do que o page object assume (`clientesPage.noResultsMessage`,
   predicate por texto). Diferente do bottom sheet (categoria de anomalia já conhecida),
   esta é uma tela comum sem overlay — a ausência do nó é mais grave porque não tem
   explicação estrutural conhecida. Bloqueia CLI-07 no iOS até reconfirmação/correção.
5. **Um elemento pode estar `visible="true"` com `x` negativo** (`Cashback Exp.` em
   `x=-109`) — diferente de um elemento simplesmente ausente (`Pós Vendas` antes do
   arrasto). No iOS as duas coisas acontecem na mesma tab bar; `isDisplayed()`/`visible`
   não é suficiente para decidir se o usuário realmente vê o elemento — é preciso conferir
   a posição relativa à largura da tela.
6. **Senha por ambiente já implementada em código** (`TEST_USER_PASSWORD_IOS` em
   `credentials.ts`) — esta sessão **confirma empiricamente** a necessidade (a senha padrão
   causou "Erro ao fazer login!" repetido no iOS), não é uma lacuna a fechar.
7. **`screen-sign-in` fica invisível sem teclado** — não é uma âncora segura para
   "waitForLoginScreen()"/"loginTitle" antes de qualquer campo ganhar foco. Recomenda-se
   trocar a âncora para `~scroll-sign-in` ou o campo de e-mail na Fase 7.
8. **A árvore e o print podem discordar por atraso de renderização** (login, capturas 04-07)
   — a árvore reflete o estado real mais rápido que o print nesta sessão. Para estado de
   campo de texto, confiar na árvore; para o que a árvore não expõe (sheets, algum empty
   state), usar o print, sabendo que ele pode estar atrasado em relação ao estado real do
   app.

## Divergências da baseline (CAP-04)

Comparação com o que os page objects atuais (`test/pages/*.page.ts`) assumem como locator
`ios:` — a "baseline" aqui é o código, não o `Locators-iOS-Arys.docx` (não disponível para
este agente):

| Locator no código | Assunção do código | Esta sessão | Divergência |
|---|---|---|---|
| `base.page.ts` `updateRestartButton` | `name == "REINICIAR"` | `name == "Reiniciar"` | **Corrige** o texto; nunca tinha sido validado (`UPD-02`) |
| `clientesPage.noResultsMessage` | `name CONTAINS "Nenhum cliente encontrado!"` encontra o card | Card não existe na árvore nesta sessão | **Diverge** — bloqueia CLI-07 no iOS |
| `base.page.ts` `handleNotificationPopup()` (comentário) | árvore traz duas cópias do alerta | 1 única `XCUIElementTypeAlert` na captura 13 | **Não reconfirmado** — o handler (`mobile: alert`) continua funcionando de qualquer forma, só o comentário descreve um cenário não observado hoje |
| `loginPage.loginTitle` | `~screen-sign-in` é âncora estável | invisível sem teclado (captura 02) | **Risco não corrigido no código ainda** — recomendação registrada, mudança fica para a Fase 7 |
| `homePage.campaignsSection`/`myCustomersSection` | `~Campanhas`/`~Meus clientes` resolvem na home | `StaticText` sem `name` próprio na home (capturas 15/24/25) | **Não confirmado diretamente** — nenhum teste isolado exercitou esses dois getters especificamente na home nesta sessão |

Todo o restante dos locators citados nos drafts 01-11 **confirma** o que já está em
`test/pages/*.page.ts`, sem divergência.
