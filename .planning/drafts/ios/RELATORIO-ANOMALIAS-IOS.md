# Relatório de anomalias — iOS (sessão de captura 2026-09-16)

Cada item: evidência (arquivo de captura), o que foi medido, impacto no page object, e
encaminhamento (app × automação). Fonte primária: `captures/NOTAS-SESSAO-2026-09-16.md` e a
reinspeção desta sessão de escrita (parsing direto dos `.xml`, leitura dos `.png`).

## 1. Bottom sheets sem filhos na árvore XCUITest

**Evidência**: `14-onboarding-sheet.xml` (onboarding) e `30-ordenar-por.xml` ("Ordenar por").
Em ambos, a árvore (`--all` incluído) só tem `Bottom sheet backdrop` (Button),
`Bottom sheet handle` (Other) e `Bottom Sheet` (Other, sempre `visible="false"`) — nenhum
filho, nenhum texto, nenhum botão. O conteúdo completo (título, texto, botões, as 7 opções
de ordenação) só existe no print correspondente.

**Medido**: zero nós com `name`/`label` do conteúdo esperado, confirmado por grep no XML
bruto pelos textos exatos ("Ordenar por", "Nome do cliente A-Z", "Começar", etc.) — zero
ocorrências em ambos os arquivos.

**Impacto no page object**: `base.page.ts` `dismissOnboardingSheetIfPresent()` (ramo iOS) já
usa toque por coordenada (fração da janela) em vez de seletor — **confirmado necessário**.
`clientesPage.sortOption()`, `openSortFilter()`, `selectSortOption()`, `applySortFilter()`
dependem de um predicate por texto que não encontra nada — **confirmado que falham** em
execução real contra este build; é a causa raiz de CLI-06 estar marcado "iOS ✗".

**Encaminhamento**: app. `accessible={false}` no container do `@gorhom/bottom-sheet` +
`testID` por opção/botão, como já registrado em `CLAUDE.md`/`CONCERNS.md`. Nenhuma
mudança de automação resolve isso sem introduzir toque por coordenada (frágil entre
tamanhos de tela) — não recomendado para "Ordenar por" sem uma decisão explícita do time,
diferente do onboarding, onde a exceção já foi aceita.

## 2. Empty state da busca de clientes sem nó na árvore

**Evidência**: `32-busca-sem-resultado.xml`, `33-busca-sem-resultado-2.xml`. Nenhum nó em
`y` entre 380 e 600 (a faixa onde o card "Nenhum cliente encontrado!" aparece no print) —
confirmado em duas capturas independentes, não um problema de timing pontual.

**Medido**: grep pelo texto exato "Nenhum cliente encontrado!" no XML bruto de ambos os
arquivos — zero ocorrências.

**Impacto no page object**: `clientesPage.noResultsMessage`
(`predicate name CONTAINS "Nenhum cliente encontrado!"`) e `waitForNoResults()` **vão
falhar por timeout** contra este build. CLI-07 (marcado `[x]` em `REQUIREMENTS.md`) não tem
evidência de passar no iOS nesta sessão.

**Encaminhamento**: app, provavelmente — diferente do bottom sheet (categoria de anomalia
já conhecida e documentada), este é um card comum sem overlay, então a causa mais provável
é o componente do card não expor `accessible`/`testID` nesta versão, não uma limitação de
plataforma. Recomenda-se **reconfirmar em uma sessão futura** (build diferente ou sessão
mais longa) antes de assumir que é permanente — mas, enquanto não houver contradição, CLI-07
deve ser tratado como bloqueado no iOS igual a CLI-06.

## 3. Alerta de notificações — duplicação não reconfirmada

**Evidência**: `13-apos-att.xml`. Uma única `XCUIElementTypeAlert name="Permita notificações"`
na árvore (confirmado contando nós `<XCUIElementTypeAlert`, não só ocorrências de string —
a string "Permita notificações" aparece 2×, mas são os atributos `name` e `label` do
**mesmo** nó, não dois nós).

**Medido**: 1 nó `Alert`, `index="2"`, único na árvore inteira do documento.

**Impacto no page object**: o comentário em `base.page.ts` `handleNotificationPopup()` diz
"a árvore traz DUAS cópias (uma visível e uma não)". Esta sessão **não reconfirma** essa
descrição. Sem impacto funcional — o handler usa `mobile: alert` (alerta de sistema, não
seletor de árvore), que funciona independente de haver 1 ou 2 cópias — mas o comentário
pode estar desatualizado ou descrever um build/momento diferente.

**Encaminhamento**: automação (documentação). Ajustar o comentário do código na Fase 7 para
refletir que a duplicação não foi observada em 2026-09-16, ou investigar se ela é
intermitente (ex.: depende de o ATT ainda estar sendo processado). Não é bloqueante — o
handler já é robusto ao cenário de 1 ou 2 cópias.

## 4. "Pós Vendas"/"Cashback Exp." fora da tela

**Evidência**: `26-meus-clientes.xml` (`Cashback Exp.` em `x=-109`, `visible="true"`);
`29-aba-favoritos.xml`/`31-aba-aniversariantes.xml` (`Pós Vendas` em `x=-271`,
`visible="false"`, mas **presente** na árvore); antes do arrasto em outras capturas,
`Pós Vendas` está **ausente** por completo (não aparece nem com `--all`).

**Medido**: duas situações distintas na mesma tab bar — elemento com `x` negativo e
`visible="true"` (`Cashback Exp.`) vs. elemento ausente da árvore até o arrasto
(`Pós Vendas`, nas primeiras capturas) vs. elemento com `x` negativo e `visible="false"`
(`Pós Vendas`, depois que outra aba passa a ocupar essa posição).

**Impacto no page object**: `clientesPage.scrollTabBarRight()`/`dragHorizontally()` já
tratam isso corretamente (arrastam antes de tentar clicar) — **confirmado necessário e
funcional**. Nenhuma mudança requerida.

**Encaminhamento**: nenhum — comportamento de UI esperado (tab bar rolável), já coberto.
Registrado aqui só como referência da diferença estrutural Android×iOS: no Android um nó
fora da tela ainda pode existir na árvore (visível ou não); no iOS a mesma situação pode
significar "existe mas fora", "existe, invisível" ou "não existe", a depender do
componente — três estados observados nesta única tab bar.

## 5. Botão de info 20×21 pt e o 1º toque perdido

**Evidência**: `15-home.xml`/`24-home-scroll.xml` (`btn-customer-section-info`,
`[135,645 20x21]`/`[135,399 20x21]`); `25-info-aberta.xml`/`.png` (após o toque, nenhuma
mudança na árvore nem no print).

**Medido**: 1 toque com `tapCenter()`-equivalente não abriu o tooltip. Não foi tentado um
2º toque nesta sessão.

**Impacto no page object**: `homePage.toggleCustomerSectionInfo()` já usa `tapCenter()`
(confirmado necessário pelo tamanho do alvo) — mas não faz retry. Se o padrão de "1º toque
perdido" (observado em `btn-campaign-section-view-all` e `~Pós Vendas`) também se aplicar
aqui, o método atual não teria como saber: ele só espera 1000 ms depois do toque e segue,
sem validar se o tooltip abriu.

**Encaminhamento**: automação, condicional. Antes de adicionar retry, **reconfirmar com um
2º toque** em sessão futura (pendência já registrada no índice) — não implementar retry
especulativo sem confirmar que o padrão se repete neste elemento específico.

## 6. `screen-sign-in` invisível sem teclado

**Evidência**: `02-apos-ota.xml` (tela de login limpa, sem foco em nenhum campo):
`screen-sign-in` com `visible="false"`. `04-login-preenchido.xml` (teclado aberto):
`screen-sign-in` com `visible="true"`.

**Medido**: alternância `false`→`true` correlacionada com a presença do teclado, em duas
capturas da mesma tela, mesma sessão.

**Impacto no page object**: `loginPage.loginTitle` usa `~screen-sign-in` como âncora
principal de `waitForLoginScreen()` e, indiretamente, de `ensureLoggedIn()`/`doLogin()`. Se
a checagem rodar antes de qualquer campo ganhar foco (cenário plausível logo após o
`Reiniciar` do OTA ou um `relaunchApp()`), o `waitForDisplayed` pode expirar mesmo com a
tela renderizada.

**Encaminhamento**: automação. Trocar a âncora para `~scroll-sign-in` ou
`~input-sign-in-email-input` (ambos `visible="true"` já na captura 02, sem teclado) — mudança
recomendada para a Fase 7, sem depender de correção do app.

## 7. `mobile: setPasteboard` não suportado

**Evidência**: `08-apos-login-paste.xml`. Tentativa de colar a senha certa via pasteboard —
o campo de senha permanece com o placeholder mascarado (`••••`), sem o texto colado.

**Medido**: comando rejeitado pelo endpoint Remote Access (erro na chamada, sem alterar o
campo).

**Impacto no page object**: nenhum — não é usado por nenhum método atual.

**Encaminhamento**: nenhum necessário. Registrado só para não ser retestado à toa em
sessões futuras contra o mesmo endpoint.

## 8. `clearApp` recusado — não testado hoje

**Evidência**: nenhuma captura desta sessão tentou `mobile: clearApp`. O pré-requisito da
Fase 6 (`06-CONTEXT.md`) já documentava a recusa do endpoint Remote Access; esta sessão
**herdou** essa limitação sem reconfirmar.

**Impacto**: `base.page.ts` `resetAppState()` já trata a falha com `try/catch` e log —
comportamento definido independente de confirmação nova.

**Encaminhamento**: pendência aberta — confirmar em uma sessão contra um "run" comum do
Device Farm (não Remote Access), onde `clearApp` pode ser aceito. Sem essa confirmação,
manter como está.

## 9. `mobile: type`/`keys()` no PIN — não testados hoje

**Evidência**: nenhuma captura desta sessão tentou `mobile: type` ou `driver.keys()` no
campo de PIN — o handler já usa clique em `~0`..`~9`, então não havia necessidade de testar
as alternativas rejeitadas.

**Impacto**: nenhum — comportamento do código já evita ambas.

**Encaminhamento**: nenhum. Do docx de 26/08 (não disponível a este agente), citado nas
notas do inspetor como referência — **não reconfirmado nesta sessão**, mantido como estava.
