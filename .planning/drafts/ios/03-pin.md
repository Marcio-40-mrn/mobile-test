# 03 — PIN (iOS)

## Como chegar aqui

Depois do submit de login bem-sucedido (draft 02, com `TEST_USER_PASSWORD_IOS`), o app troca
para a tela de PIN. O teclado numérico já abre sozinho ao chegar na tela — não foi preciso
tocar em nenhum campo antes de digitar.

## Capturas

- `10-apos-login-ios.xml` / `.png` — tela de PIN, teclado numérico aberto, nenhum dígito
  digitado ainda.

## Elementos

| type | name | label | value | rect | enabled | visible |
|---|---|---|---|---|---|---|
| `Other` | `scroll-pin` | — | — | `[0,0 402x566]` | true | true |
| `Button` | `btn-pin-back` | `Voltar e sair da conta` | — | `[14,64 374x25]` | true | true |
| `StaticText` | `Digite seu Código PIN` | — | idem | `[55,204 292x29]` | true | true |
| `StaticText` | `O seu código PIN ajuda na segurança do aplicativo.` | — | idem | `[55,246 292x18]` | true | true |
| `Other` | `otp-input-container` | — | — | `[65,292 272x71]` | true | true |
| `Other` | `input-pin-code` | — | — | `[65,292 272x71]` | true | true (`accessible="false"`, dentro do container) |
| `Other` | `btn-pin-submit` | `Digite o PIN para continuar` | — | `[14,389 374x43]` | **`false`** (nenhum dígito ainda) | true |
| `Other` | `btn-pin-forgot` | `Esqueci meu código PIN` | — | `[14,459 374x43]` | true | true |
| `Other` | `screen-pin` | — | — | `[0,0 402x874]` | true | true |
| `Key` | `1`..`9`, `0` | — | — | linhas de `[1,590 134x54]` a `[134,752 134x54]` | true | true |
| `Key` | `Delete` | — | — | `[267,752 134x54]` | true | true |
| `Button` | `dictation` | `Dictate` | — | `[325,805 69x70]` | false | true (irrelevante) |

## Seletor proposto

- `otp-input-container` → `~otp-input-container` (de `name`).
- `btn-pin-submit` → `~btn-pin-submit` (de `name`) — **atenção**: `enabled="false"` com o
  campo vazio (captura 10); só serve como âncora de "estou na tela de PIN", não como botão
  clicável (o submit é automático ao completar os dígitos, conforme já assumido pelo
  código — ver Timing).
- `btn-pin-back` → `~btn-pin-back` (de `name`).
- `btn-pin-forgot` → `~btn-pin-forgot` (de `name`).
- Teclas numéricas → `~0` .. `~9` (de `name`, tipo `Key`) — a sintaxe `~` resolve por
  accessibility id, que para `Key` mapeia o `name`, igual às demais capturas de teclado.

## Equivalência entre plataformas

- `login.page.ts` `pinContainer`: `ios: '~otp-input-container'` → **confirma**.
- `login.page.ts` `pinScreen`: `ios: '~btn-pin-submit'` → **confirma o `name`**, mas o
  comentário do getter ("`pinScreen`") sugere um marcador de tela, e de fato o elemento é o
  botão de submit desabilitado — funciona como âncora porque está sempre presente na tela de
  PIN, habilitado ou não. Nenhuma divergência de valor.
- `login.page.ts` `handlePin()`: usa `$(\`~${digit}\`).click()` para cada dígito — **confirma**
  a captura de hoje (teclas `Key name="0"`..`"9"`, todas clicáveis).
- **Android**: PIN usa `mobile: type` no campo focado — não se aplica ao iOS (comentário já
  existente no código: `mobile: type` não existe e `driver.keys()` é rejeitado pelo WDA).
  Nenhuma mudança necessária aqui.

## Timing e gestos

- 4 dígitos digitados em **5,3 s** (medido nesta sessão, clique a clique nas teclas `~0`..`~9`).
- Após o último dígito, `login.page.ts` usa `browser.pause(6000)` — comentário no código diz
  "PIN submission triggers background session init with no UI feedback"; esta sessão não
  mediu o tempo real de transição PIN → home (a próxima captura, 11, já mostra o sheet de
  onboarding sobre a home renderizada), então o valor de 6 s não foi confirmado nem
  contestado — permanece como estava.

## Armadilhas

- `btn-pin-submit` **desabilitado com o campo vazio** — não assumir que ele é clicável antes
  do PIN completo; o app envia sozinho ao 4º dígito (comportamento consistente com o método
  atual, que não clica em `btn-pin-submit` explicitamente).
- `input-pin-code` tem `accessible="false"` — não é alvo de toque; a interação é sempre pelas
  teclas do teclado numérico, nunca pelo campo em si.
- Mesma ressalva de árvore × print da tela de login: não capturado aqui um caso de
  discordância, mas a tela de PIN também tem teclado e campo de texto — mesma cautela se
  algum draft futuro precisar reconfirmar.
