# Preocupações e dívidas

Ordenadas por impacto. Cada item diz onde está, o que custa e qual fase resolve.

## Bloqueadores externos (não são dívida da automação)

### 1. Bottom sheet e empty state iOS sem filhos na árvore XCUITest

- **Onde**: modal "Ordenar por" (`ClientesPage.openSortFilter/selectSortOption`), card
  "Nenhum cliente a contatar" (`verifyFilterResult`), sheet de onboarding pós-login.
- **Evidência**: 2026-08-26, iPhone iOS 18.3, `snapshotMaxDepth: 120`, accessibility id +
  predicate + class chain → zero matches; a árvore só traz `Bottom sheet backdrop`,
  `Bottom sheet handle`, `Bottom Sheet` vazio. O empty state da **busca** ("Nenhum cliente
  encontrado!") é exposto normalmente — só o de aba vazia está mudo.
- **Causa provável**: container do `@gorhom/bottom-sheet` com `accessible={true}` agrupando
  a subárvore.
- **Custo**: 5/21 casos vermelhos no iOS em todo PR (o job roda sempre; o vermelho no
  relatório é o sinal da dívida — o Device Farm não quebra a esteira).
- **Correção**: no app — `accessible={false}` no container + `testID` por opção. **Não**
  contornar com coordenadas (regra 6 de `REQUIREMENTS.md`). Fase 7.

### 2. `mobile: clearApp` recusado pelo endpoint Remote Access

- "This command is not supported by AWS Device Farm: clearApp". `terminateApp`/`activateApp`
  funcionam. Sem reset o app reabre logado e `login.spec.ts` não exercita o login.
- Não se sabe se o mesmo vale via testspec (Appium local sem proxy) — **verificar antes de
  reescrever specs**. Fase 7, critério 3.

## Fragilidades da automação

### 3. `browser.pause()` fixos no caminho crítico

- 21 ocorrências em `test/pages/` (base 4, clientes 6, home 8, login 3), todas comentadas
  conforme a regra. As mais caras: splash 5–6 s (`relaunchApp`, `doLogin`) e 6 s pós-PIN
  (`handlePin`). Cada `ensureLoggedIn()` que cai em `doLogin` paga ~12 s antes de qualquer
  assert.
- Risco: em device lento o `pause` é curto; em device rápido é desperdício. Candidatos a
  virar `waitForDisplayed` quando o app expuser âncora (ex.: `~screen-sign-in` já existe no
  iOS para o pós-splash).

### 4. `dismissOnboardingSheetIfPresent()` usa coordenada (só iOS)

- Ramo iOS: `mobile: tap` em `(0.88 w, 0.335 h)` porque o botão de fechar não está na
  árvore. É a única exceção à regra 6, documentada como temporária. Quebra se o layout do
  sheet mudar. Sai junto com o item 1. No Android (desde o build 1.5.0/133 o sheet aparece
  lá também) o botão `btn-onboarding-welcome-close` existe e é clicado normalmente.

### 5. Locator iOS do popup OTA nunca validado

- `base.page.ts:22-24` (`name == "REINICIAR"`) — o popup não apareceu em nenhuma sessão.
  Se o texto ou o tipo do elemento for outro, `launchAndCheckUpdate()` passa em falso (o
  `isDisplayed` só retorna `false`) e um OTA pendente derruba o `doLogin` seguinte. UPD-02.

### 6. Dependência de dado da conta de teste

- `home.spec.ts` busca "Fudaba" e espera um card. Se o cliente sumir da conta, 1 caso
  quebra sem regressão de código. Alternativa: buscar um prefixo comum ou ler o primeiro
  card de "Visualizados recentemente".

### 7. Job iOS "vermelho de propósito"

- Enquanto 5 falhas são esperadas, uma 6ª falha nova passa despercebida a menos que alguém
  leia o relatório. Mitigação barata até a Fase 7: comparar a contagem (16 passed) no
  `GITHUB_STEP_SUMMARY`. Desde 2026-09-16 cada iPhone é um run e um nó próprio no Allure
  (summary com uma linha por aparelho), o que torna a leitura por device imediata.

### 7b. Credenciais nos artefatos do Device Farm (iOS)

- Como o host iOS não recebe `environmentVariables`, e-mail, senha e PIN viajam no testspec
  gerado por run e aparecem nos artefatos `Test spec file`/`Test spec output` — visíveis só
  para quem tem acesso à conta AWS (o `appium.log` já expunha a senha do `setValue`). Custo
  aceito, igual ao MobileWDIO. Se um dia for inaceitável: trocar a conta de teste por uma
  conta descartável ou mover o transporte para um secret do AWS Secrets Manager lido no host.

## Configuração e higiene (Fase 9)

### 8. Caminhos Windows hardcoded

- `APK_PATH = 'C:\\dev\\apk_arys\\arys-latest.apk'` (`wdio.conf.ts:38`) e `DEST_DIR`
  (`download-build.ts:8`). Só afeta Android local, mas amarra o setup a uma máquina.
  Alternativa: env `ARYS_BUILD_DIR` com esse default.

### 9. `.env.example` ausente

- README (`cp .env.example .env`) e `requireEnv()` (`login.page.ts:7-8`) mandam copiar um
  arquivo removido em `4f349dc`. `.gitignore` já tem `!.env.example`. Recriar só com nomes.

### 10. Dependência acidental `i`

- **Resolvido em 2026-09-15** (removido junto com a regeneração do lock — ver 16b).

### 11. `appium` em duas camadas no Device Farm — resolvido em 2026-09-17

- Era o oposto do que estava escrito aqui: com `appium` no `package.json`, o Appium do host
  tratava o pacote de teste como `APPIUM_HOME` e o `driver install uiautomator2` ia para o
  **projeto** (por isso o Android funcionava) — e o XCUITest, que só existia no host, sumia
  (run #29: 5/5 iPhones sem driver). `appium` saiu das devDependencies (regra 12); o host
  usa o próprio `APPIUM_HOME`; `testspec.yml` fixa o `uiautomator2@7.6.2` de sempre.
  **Validação pendente: run #30 (Android tem que continuar verde com a mesma versão).**

### 12. `.gitignore` contradiz o que está versionado

- Ignora `docs/` e `.claude/`, mas `docs/**` e `.claude/CLAUDE.md` estão no git (foram
  adicionados antes). Novos arquivos em `docs/` **não** entram sem `-f` — e o `techdocs.yml`
  depende de `docs/**`. Decidir: remover as duas linhas ou mover o tooling untracked
  (`agents/ hooks/ skills/`) para um ignore mais específico.

### 13. `docs/index.md` é placeholder

- "_Add documentation here._" é o que o TechDocs publica hoje. O conteúdo real está em
  `README.md`/`CLAUDE.md`. Mínimo: apontar para eles ou copiar o README.

### 14. `Locators-iOS-Arys.docx` fora do git

- É a única fonte dos locators iOS e das pendências de captura, mas não está versionado e
  não é diff-ável. Versionar (binário) ou converter para Markdown em `docs/`.

### 15. `.mcp.json.example` citado, mas inexistente

- `.claude/CLAUDE.md` e README mandam copiá-lo. Foi removido em `7d74ef6`; só existe
  `.mcp.json` (gitignored). Recuperável com `git show 7d74ef6^:.mcp.json.example`.

### 15b. Docs citam `_devicefarm-run.yml`, removido

- README ("chama o reutilizável `_devicefarm-run.yml`") e a tabela de env do `CLAUDE.md`
  apontam para `.github/workflows/_devicefarm-run.yml`, apagado em `44042f0` quando tudo
  foi consolidado em `mobile_test.yml`. Atualizar os dois.

### 15c. Dumps Android de Campanhas e Menu só no histórico

- `docs/testids/{campanhas,clientes,home,login,menu,pin}.xml` (uiautomator) foram removidos
  em `7d74ef6`. Servem de base para a Fase 8 — `git show 7d74ef6^:docs/testids/menu.xml`.

### 16. Versões major recentes

- `typescript ^6.0.2`, `@types/node ^25`, `appium ^3.3.0`, `vitest ^2` — combinam hoje;
  `transpileOnly` esconde erros de tipo em runtime. Rodar `npx tsc --noEmit` antes de PR
  para pegar o que o WDIO não reporta.

### 16b. `package-lock.json` resolvido à mão quebra o Device Farm

- **Ocorrido**: merge `2050647` (2026-08-26) gerou um lock que não batia com nenhum dos
  pais; o `npm install` do Device Farm podou `archiver-utils` e o WDIO morreu no import.
  Três runs (#16–#18) sem relatório, todos verdes no GitHub.
- **Regra**: em conflito no lock, nunca editar — `rm -rf node_modules package-lock.json &&
  npm install` e commitar o resultado.
- **Guarda**: step "Pré-verifica dependências" no `mobile_test.yml` reproduz o `npm install`
  do testspec e faz `import('webdriverio')` no runner antes de empacotar.
- **Limite**: `npm ci` não é opção — o `appium-uiautomator2-driver` traz
  `npm-shrinkwrap.json` gerado em Linux e o npm acusa `Missing @img/sharp-*` das outras
  plataformas.

### 17. Commits fora do padrão no histórico

- `1e5c353 sua mensagem de commit`, `2050647 Merge`, `2e81681 adds test for iOS devices`
  (sem tipo). Não há commitlint configurado neste repo apesar do handbook citar. Considerar
  adicionar.

## Segurança

- Nenhum segredo versionado (verificado: `.env`, `.mcp.json` ignorados; testspec só faz
  `printf` dos valores para `.env` no host; zip exclui `.claude/`).
- O `.env` gerado no host do Device Farm vive no `$DEVICEFARM_TEST_PACKAGE_PATH`, **não**
  em `$DEVICEFARM_LOG_DIR` — não vaza para os Customer Artifacts. Manter assim.
- `relaxedSecurity: true` no Appium local é necessário para `mobile: clearApp` /
  MediaProjection; aceitável em emulador dedicado.
