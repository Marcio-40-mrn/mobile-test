---
phase: 6
name: Captura iOS via Remote Access + drafts
status: not-started
decided: 2026-09-15
requirements: [CAP-01, CAP-02, CAP-03, CAP-04]
depends-on: [5, "sessão Remote Access aberta pelo usuário"]
---

# Fase 6 — Contexto

## Intenção do usuário

"Criar uma sessão no AWS com iPhone com o app instalado para que o sub-agent capture os
elementos no iOS e crie um draft/rascunho com estes."

## Pré-requisito manual (usuário)

1. Console AWS → Device Farm → projeto → **Remote Access** → iPhone com o `.ipa` do Arys
   instalado (build EAS iOS; `npx ts-node scripts/download-build.ts --platform ios` baixa o
   mais recente para `C:\dev\apk_arys\arys-latest.ipa`).
2. Copiar host, porta e path assinado do endpoint Appium para `REMOTE_HOST`, `REMOTE_PORT`,
   `REMOTE_PATH_IOS` no `.env`.
3. Lembrar: a URL **expira em ~20 min** (`403 AccessDeniedException`); o endpoint recusa
   `mobile: clearApp` e `usePrebuiltWDA`; não grava vídeo; o host injeta app/udid/
   deviceName/platformVersion (não passar). Capabilities aceitas = bloco Remote Access de
   `wdio.conf.ts:89-93`.

## Papéis dos agentes

| Agente | Faz | Não faz |
|---|---|---|
| `mobile-ui-inspector` | Abre sessão Appium contra o endpoint; navega até a tela; ciclo de nó âncora (captura → procura âncora → espera → recaptura); salva `getPageSource()` (`.xml`) + screenshot (`.png`) por tela; mede tempos e gestos | Não escreve draft; não altera page object |
| `mobile-draft-writer` | Lê as capturas (com um `parse.py` — o XML do iOS passa de 150 k caracteres, **não dar `cat`**); abre o `.png`; escreve `NN-<tela>.md`; mantém `00-INDICE.md` e `RELATORIO-ANOMALIAS-IOS.md` | Não controla o device; não roda a suíte; não toca fora de `.planning/drafts/` |

Os dois rodam em paralelo: inspeção no aparelho e redação não se bloqueiam.

## Onde fica

```
.planning/drafts/ios/
├── 00-INDICE.md                 ordem das telas, pendências, descobertas que mudam a estratégia
├── RELATORIO-ANOMALIAS-IOS.md   bottom sheet, empty state, alerta duplicado, x negativo, 20×21 pt, clearApp
├── 01-login.md … NN-<tela>.md   um por tela (formato do mobile-draft-writer)
└── captures/                    NN-<tela>.xml + .png (+ parse.py) — versionar ou ignorar: decidir
```

## Telas (ordem da jornada da Fase 5)

login → PIN → popups (ATT, "Permita notificações", onboarding "Veja como usar o Arys";
OTA "REINICIAR" **se** aparecer) → home (tab bar, saudação, busca, campanhas, Meus clientes,
atalhos, Contatos feitos) → busca com resultado → perfil do cliente (abas) → clientes
(Favoritos, Aniversariantes, Cashback Exp., Pós Vendas; "Ordenar por"; busca sem resultado)
→ campanhas → menu (os dois últimos alimentam a Fase 8).

## Baseline — o que já se sabe (`Locators-iOS-Arys.docx`, 2026-08-26, 42 dumps, iOS 18.3)

- `testID` do RN vira `name` no iOS → mesmos ids que o `resource-id` Android
  (`btn-sign-in-submit`, `otp-input-container`, `navigation-back-button`,
  `filterable-top-tab-bar-sort-button`, abas de clientes idênticas).
- O que **não** atravessa: XPath por texto; tab bar inferior (`~tab-home-1`, `~tab-customers-2`,
  `~tab-campaigns-3`, `~tab-menu-5`); atalhos (`~btn-customer-tag-1-aniversariantes` …).
- Anomalias: bottom sheet e empty state de aba vazia sem filhos; alerta duplicado; "Pós
  Vendas" nasce em x = −243; botão de info 20×21 pt não reage ao `click()`; `mobile: type`
  inexistente e `keys()` rejeitado (PIN por `~0`..`~9`); busca só dispara com a tecla
  `Search` do teclado.
- Não capturado: popup OTA.

Regra: os drafts **reconfirmam** cada item na sessão nova; o que divergir do docx é listado
em CAP-04; o que não aparecer fica "não capturado", nunca copiado.

## Perguntas em aberto para o plan-phase

1. `captures/` entra no git (evidência versionada, mas `.xml` de 150 k+ por tela) ou vai
   para o `.gitignore` com só os `.md`?
2. Como o inspetor mantém a sessão viva por lote (20 min): uma sessão por grupo de telas
   (login+PIN+popups / home+busca+perfil / clientes / campanhas+menu)?
3. Login na sessão: como o Remote Access recusa `clearApp`, o app pode já estar logado —
   o inspetor precisa de um caminho para chegar à tela de login (logout pelo menu?).
4. O `parse.py` de referência do `mobile-ui-inspector` vai para `captures/` ou `scripts/`?
