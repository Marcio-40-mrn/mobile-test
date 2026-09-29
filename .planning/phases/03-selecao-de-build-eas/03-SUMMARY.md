---
phase: 3
name: Seleção de build EAS
status: complete
retroativo: true
period: 2026-08-26
prs: ["#11"]
key-files:
  - scripts/download-build.ts
  - scripts/__tests__/download-build.test.ts
  - .github/workflows/mobile_test.yml
  - app.config.js
  - README.md
requirements: [BLD-01, BLD-02, BLD-03, BLD-04]
---

# Fase 3 — Seleção de build EAS

> Resumo **retroativo**, reconstruído do PR #11 (`b5d85de`, merge `d77cffc`).

## Resumo

Antes, local e CI baixavam sempre o build `INTERNAL` mais recente. Esta fase tornou a
escolha configurável — por profile do EAS e por intervalo de datas — com **um contrato de
variáveis** válido nos dois lugares, e cobriu a lógica pura com testes unitários.

## O que entregou

- `scripts/download-build.ts`: `resolveBuildSelection(platform, env)` lê
  `BUILD_PROFILE_ANDROID`/`BUILD_PROFILE_IOS`, `BUILD_SELECTION`, `BUILD_FROM`/`BUILD_TO`;
  `parseLocalDate` rejeita formato errado e datas que transbordam (`2026-02-31`);
  `parseLatestBuildUrl(builds, { platform, selection })` filtra por status, artefato
  (`.apk/.aab` vs `.ipa`), profile e intervalo, e escolhe o mais recente; `buildDestPath`
  por plataforma; `downloadLatestBuild` orquestra `eas build:list --json` + download com
  redirects.
- `scripts/__tests__/download-build.test.ts`: 24 casos (de 70 para 253 linhas).
- `mobile_test.yml`, step "Baixa o build do EAS": mesma semântica em bash + `jq`
  (`FROM_ISO`/`TO_ISO` para comparação lexicográfica, `LIMIT=100` em `date`).
- README: seção "Seleção do build" com tabela, regras e exemplos; GitHub Variables opcionais.
- `package.json`: script `download`.

## Decisões

- Uma variável de profile **por plataforma**: Android e iOS costumam ser buildados em
  profiles diferentes; um run nunca lê o profile do outro.
- Sem variável → comportamento histórico (`--distribution internal`) para não quebrar quem
  já usava.
- Intervalo inclusivo no fuso local (`00:00:00`–`23:59:59.999`); no CI, bordas convertidas
  para ISO UTC.

## Evidência

`git show d77cffc --stat`; `npx vitest run scripts` (24 passed).

## Pendências deixadas

- `DEST_DIR` continua `C:\dev\apk_arys` fixo (→ Fase 9).
