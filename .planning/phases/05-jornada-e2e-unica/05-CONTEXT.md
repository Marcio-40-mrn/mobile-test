---
phase: 5
name: Jornada E2E única e independente (Android)
status: not-started
decided: 2026-09-15
requirements: [JRN-01, JRN-02, JRN-03, JRN-04, JRN-05, HELP-01]
---

# Fase 5 — Contexto

## Intenção do usuário

"Atualizar o teste fazendo **um único teste E2E**, tirando a dependência que um teste tem do
outro na suíte que existe hoje." Confirmado: é **um único fluxo (jornada)** — login → home →
clientes — e não "cada `it` independente". Os cenários de hoje viram steps desse fluxo.

## O problema que motiva

| Onde | Dependência hoje |
|---|---|
| `test/specs/clientes.spec.ts` | Cada `it` assume a aba/ordenação deixada pelo anterior ("Favoritos" → filtros → "Aniversariantes" → …); o último `it` faz `clearSearch` + `resetSort` para não sujar o próximo spec |
| `test/specs/home.spec.ts` | "buscar Fudaba" limpa o campo no fim para o próximo; "Meus clientes" faz `scrollUp(3.0)` para devolver a home ao topo; "atalhos" e "Contatos feitos" começam com `scrollDown` relativo ao estado anterior |
| `test/specs/login.spec.ts` | Depende de `relaunchApp()` no `before`; o 2º `it` depende do 1º ter deixado o form na tela de login |
| `test/specs/00-update-check.spec.ts` | Só existe para rodar antes dos outros (prefixo `00-`); a ordem está fixa em `wdio.conf.ts:156-161` |
| `LoginPage.ensureLoggedIn()` (`login.page.ts:151-170`) | Existe para "consertar" o estado herdado do spec anterior — sintoma da dependência |

Rodar um `it` isolado (`--mochaOpts.grep`) não é confiável; `bail: 0` deixa os seguintes
falharem em cascata com mensagens enganosas.

## O que a jornada precisa preservar (21 asserts)

OTA (1) → login com campos vazios (2 asserts) → login + PIN → saudação (1) → home: saudação,
campo de busca, busca "Fudaba" → perfil → voltar, campanhas → ver todas → voltar, Meus
clientes info → ver todos → voltar, 3 atalhos, Contatos feitos, tab bar (8 `it`, 14 asserts)
→ clientes: título, 4 abas (abrir + 7 filtros cada), busca sem resultado (10 `it`).
Mapeamento REQ → step em `REQUIREMENTS.md` (AUTH, UPD, HOME, CLI).

## Decisões já tomadas

- Um único spec em `specs:` do `wdio.conf.ts`; os 4 atuais são **removidos** (não ficam em
  paralelo — `PROJECT.md`, fora de escopo).
- Reset (`relaunchApp`) **só no início**; `ensureLoggedIn` deixa de ser necessário no meio.
- Steps nomeados no Allure (`@wdio/allure-reporter` já é dependência; `allureReporter`
  já é importado em `wdio.conf.ts`).
- Page objects continuam (regra 4 — sem `$()` em spec); nesta fase ainda com `byPlatform()`
  (a convenção muda só na Fase 7).
- Android-first: verde no AVD e no Device Farm Android antes de qualquer iOS.

## Perguntas em aberto para o plan-phase

1. Nome do spec (`arys-journey.spec.ts`? `e2e.spec.ts`?) e se o `00-` some.
2. Um `it` único (vídeo e timeout de 120 s/600 s cobrem tudo?) **ou** `describe` com um
   `it` por etapa + `bail: 1` — no segundo caso, como garantir que um `it` nunca depende do
   anterior além da ordem (cada `it` valida sua pré-condição e falha claro).
3. Mocha `timeout` para uma jornada longa (hoje 120 s local / 600 s DF por teste).
4. Steps de "7 filtros × 4 abas" ficam na jornada ou viram cenário próprio na Fase 8?
5. O que fazer com `ensureLoggedIn()` — remover ou manter para a Fase 8 (jornadas
   adicionais que começam logadas).
6. `test/helpers/` nasce agora (HELP-01) ou só quando a segunda jornada aparecer (YAGNI)?
