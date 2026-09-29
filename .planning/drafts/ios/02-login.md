# 02 — Login (iOS)

## Como chegar aqui

Após o `Reiniciar` do popup OTA (ou direto, se não houver OTA pendente), o app recarrega e
mostra a tela de login (`Entrar`). Esta sessão passou por: campos vazios + submit (erro de
validação) → campos preenchidos + submit (senha errada do `.env` padrão) → repetição do erro
→ tentativa de colar via `mobile: setPasteboard` (falhou) → preenchimento manual com o olho de
revelar senha ativo → submit com `TEST_USER_PASSWORD_IOS` (sucesso, segue para o PIN, draft 03).

## Capturas

- `02-apos-ota.xml` / `.png` — tela de login limpa, sem teclado.
- `03-login-campos-vazios.xml` / `.png` — submit com e-mail e senha vazios.
- `04-login-preenchido.xml` / `.png` — e-mail e senha digitados, teclado aberto.
- `05-apos-submit.xml`, `06-apos-submit-2.xml`, `07-apos-login.xml` / `.png` — erro de
  credencial repetido (mesma senha errada).
- `08-apos-login-paste.xml` / `.png` — tentativa de colar a senha certa via pasteboard.
- `09-apos-submit-manual.xml` / `.png` — senha preenchida manualmente, olho de revelar ativo.

## Elementos

| type | name | label | value | rect | enabled | visible |
|---|---|---|---|---|---|---|
| `Other` | `scroll-sign-in` | — | — | `[0,0 402x874]` (varia com o teclado) | true | true |
| `StaticText` | `Entrar` (título) | — | `Entrar` | `[170,88..211 62x28]` | true | true |
| `TextField` | `input-sign-in-email-input` | — | placeholder `Digite seu e-email` / e-mail digitado | `[18,247..431 366x39]` | true | true |
| `SecureTextField`/`TextField` | `input-sign-in-password-input` | — | `••••` (mascarado) ou texto plano quando o olho está ativo | `[18,340..523 366x39]` | true | true |
| `Other` | `btn-sign-in-submit` | `Fazer login` | — | `[17,407..590 368x43]` | **true mesmo com campos vazios** | true |
| `Other` | `btn-sign-in-forgot-password` | `Esqueci minha senha` | — | `[17,477..660 368x43]` | true | true |
| `Other` | `btn-sign-in-go-to-sign-up` | `Cadastre-se` | — | `[225,547..730 75x18]` | true | true |
| `StaticText` | `Campos obrigatórios` | — | idem | `[67,280 124x19]` | true | true (só na 03) |
| `StaticText` | `Por favor, preencha seu email e senha.` | — | idem | `[39,308 317x19]` | true | true (só na 03) |
| `StaticText` | `Erro ao fazer login!` | — | idem | `[67,218 112x18]` | true | true (só na 05-07/09) |
| `StaticText` | `O e-mail e/ou senha estão inválidos. Verifique os dados e tente novamente.` | — | idem | `[39,246 317x35]` | true | true (só na 05-07/09) |
| `Other` (sem `name`) | — | — | — | `[343,485 25x25]` | true, `accessible="true"` | true (só quando o teclado está aberto, captura 09) |
| `Other` | `screen-sign-in` | — | — | `[0,0 402x874]` | true | **`false` sem teclado (captura 02); `true` com teclado (04-09)** |

## Seletor proposto

- `input-sign-in-email-input` → `~input-sign-in-email-input` (de `name`, capturas 02-09).
- `input-sign-in-password-input` → `~input-sign-in-password-input` (de `name`, capturas
  02-09). Tipo alterna `SecureTextField` ↔ `TextField` quando o olho é tocado — o `name` não
  muda, o `~` continua válido nos dois estados.
- `btn-sign-in-submit` → `~btn-sign-in-submit` (de `name`, todas as capturas). Fica
  `enabled="true"` mesmo com os campos vazios (captura 03) — a validação é feita no submit,
  não no botão.
- `Campos obrigatórios` → `~Campos obrigatórios` (de `name`, captura 03).
- `Por favor, preencha seu email e senha.` → `~Por favor, preencha seu email e senha.` (de
  `name`, captura 03).
- `Erro ao fazer login!` → `-ios predicate string:name == "Erro ao fazer login!"` (de `name`,
  capturas 05-07/09) — **não capturado hoje no page object**, ver Equivalência.
- `O e-mail e/ou senha estão inválidos...` → `-ios predicate string:name == "O e-mail e/ou senha estão inválidos. Verifique os dados e tente novamente."`
  (de `name`, capturas 05-07/09) — idem, não capturado no page object.
- Olho de revelar senha → **sem `name`/`label`**; só dá para localizar por posição
  relativa ao campo de senha (`accessible="true"`, `[343,485 25x25]` na captura 09, com
  teclado aberto). Não há accessibility id nem predicate estável — precisaria de
  `-ios class chain` por índice dentro do container do campo, ou de o app ganhar um
  `testID`. **Não proponho seletor fixo**: a posição desloca com o teclado (compare
  `y=485` aqui com o valor de "347 sem teclado" citado nas notas do inspetor — a
  diferença é justamente o deslocamento do campo, não uma medição divergente).
- `screen-sign-in` (usado hoje como `loginTitle`/âncora) → confirma a anomalia das notas:
  `visible="false"` sem teclado (captura 02), `true` só com teclado aberto (04-09). Ver
  Equivalência.

## Equivalência entre plataformas

- `login.page.ts` `emailField`: `ios: '~input-sign-in-email-input'` → **confirma**.
- `login.page.ts` `passwordField`: `ios: '~input-sign-in-password-input'` → **confirma**.
- `login.page.ts` `submitButton`: `ios: '~btn-sign-in-submit'` → **confirma**.
- `login.page.ts` `loginTitle`: `ios: '~screen-sign-in'` → **corrige o risco, não o valor**:
  o `name` está certo, mas o comentário do código ("o container é o âncora estável") é
  otimista à luz de hoje — `screen-sign-in` fica invisível sem teclado (captura 02). Em
  `waitForLoginScreen()`/`ensureLoggedIn()`, se a checagem rodar antes de qualquer campo
  ganhar foco, o `waitForDisplayed` pode falhar por timeout mesmo com a tela renderizada.
  Recomendação para a Fase 7: trocar a âncora por `~scroll-sign-in` ou pelo campo de e-mail
  (`~input-sign-in-email-input`), que estão `visible="true"` já na captura 02 (sem teclado).
- `login.page.ts` `errorTitle`: `ios: '~Campos obrigatórios'` → **confirma** (captura 03).
- `login.page.ts` `errorMessage`: `ios: '~Por favor, preencha seu email e senha.'` →
  **confirma** (captura 03).
- **Não cobre**: não há getters para `Erro ao fazer login!` / mensagem de credencial
  inválida no page object atual — só existem para o erro de campos vazios. AUTH-01 testa só
  o caso de campos vazios; o caso de credencial errada não tem asserção própria.
- **Android**: equivalente ao `//android.widget.EditText[@hint="Digite seu e-email"]` /
  `[@hint="Digite sua senha"]` — no iOS o hint vira `value` (placeholder), não há atributo
  `hint`; por isso o seletor iOS usa `name` (o `testID`), nunca o texto do placeholder.

## Timing e gestos

- Digitação: clicar o campo → esperar teclado → `browser.pause` implícito de 1 s (padrão da
  sessão) → `setValue`/`addValue` com `maxTypingFrequency: 20`. E-mail com 31 caracteres e
  senha com 12 caracteres chegaram completos no campo (capturas 04, 08) — sem perda de
  caracteres medida.
- Sem autocapitalização no campo de senha: digitar `abc` revelou `abc` (minúsculo), conforme
  o print da captura 09 (a árvore mascara o valor do campo de senha nesta sessão — ver
  Armadilhas).
- `mobile: setPasteboard` não é suportado no endpoint usado (Remote Access) — falhou sem
  colar nada (captura 08). Sem alternativa testada hoje para colar texto.
- Sem medição de tempo entre submit e a mensagem de erro aparecer.

## Armadilhas

- **`screen-sign-in` invisível sem teclado** — não usar como primeira âncora de espera
  (ver Equivalência).
- **Árvore × print podem discordar**: nas capturas 04/05/07 a árvore já mostrava o campo de
  senha preenchido e o teclado aberto, enquanto o print (tirado quase no mesmo instante)
  ainda mostrava o campo vazio e sem teclado. O app de fato já tinha o texto — o print
  estava atrasado. Ao escrever asserções, confiar na árvore para estado de campo de texto;
  usar o print só para o que a árvore não expõe (ex.: sheets).
- **O XML mascara o `value` do campo de senha** mesmo com o olho "revelar" ativo — o dump
  desta sessão sempre mostrou `••••`, nunca o texto plano. A prova de que o olho funciona
  vem só do print (captura 09), não da árvore. Qualquer asserção sobre "senha visível" tem
  que ler o print, nunca o `value` do XML.
- **Senha por ambiente**: a senha de `TEST_USER_PASSWORD` (a do `.env`, Android
  development) causou "Erro ao fazer login!" repetidas vezes no iOS (capturas 05-07). O
  login só passou com `TEST_USER_PASSWORD_IOS` (captura 09→10). Isso já está implementado
  em `test/utils/credentials.ts` (`resolvePassword()` prioriza `TEST_USER_PASSWORD_IOS`
  quando `IS_IOS`) — a sessão de hoje **confirma empiricamente** essa necessidade, não é uma
  descoberta nova de código.
- Nunca escrever o e-mail ou a senha reais neste draft — ambos aparecem em texto plano nas
  capturas 04-09 (a senha em claro só no print, não no XML), mas não devem ser copiados.
- O botão "olho" (25×25, sem `name`) desloca de posição conforme o teclado está aberto ou
  não — qualquer automação por coordenada precisa reler a posição do campo antes de tocar,
  nunca usar um valor fixo entre estados.
