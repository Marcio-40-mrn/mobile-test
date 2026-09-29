---
phase: 2
name: Device Farm CI + Allure + publicação
status: complete
retroativo: true
period: 2026-06-17 → 2026-08-11
prs: ["#4", "#5", "#6", "#8", "#9", "#10"]
key-files:
  - .github/workflows/mobile_test.yml
  - testspec.yml
  - wdio.conf.ts
  - scripts/generate-report-index.mjs
  - scripts/package-tests.ps1
  - docs/ci/retencao-de-relatorios-allure.md
requirements: [CI-01, CI-03, CI-04, CI-05, REP-01, REP-02, REP-03, REP-04, REP-05]
---

# Fase 2 — Device Farm CI + Allure + publicação

> Resumo **retroativo**, reconstruído do `git log` e de `docs/ci/retencao-de-relatorios-allure.md`.

## Resumo

Seis PRs levaram a suíte do emulador local para o AWS Device Farm com relatório Allure
publicado no GitHub Pages. A primeira estrutura para o Device Farm (`dd77144`, 2026-06-17)
tinha um `wdio.devicefarm.conf.ts` separado e um workflow reutilizável
`_devicefarm-run.yml`; ambos foram absorvidos por um único `wdio.conf.ts` com detecção por
`DEVICEFARM_DEVICE_UDID` e um único `mobile_test.yml` (`7d74ef6`, `6a84128`, `44042f0`).

## O que entregou

- **PR #4** (`7d74ef6`): consolidação em `wdio.conf.ts` + `mobile_test.yml`; remoção de
  `wdio.devicefarm.conf.ts`, `.mcp.json.example` e dos dumps `docs/testids/`.
- **PR #5** (`6a84128`): correção da execução no Device Farm; remoção do `app.json`
  (config passa a ser `app.config.js` + env).
- **PR #6** (`3415871`) e **#8** (`44042f0`): Allure — vídeo por teste, screenshot em
  falha, `allure generate` no `onComplete`, remoção do `_devicefarm-run.yml`.
- **PR #9** (`0626760`, `1e5c353`): scroll em devices pequenos (`scrollableArea()` a 60 % ×
  30 % da tela, abaixo do meio, longe da barra de gestos).
- **PR #10** (`d62d10f`): retenção da branch `reports` — commit órfão + `--force-with-lease`
  com SHA explícito, `KEEP=3`, poda dos artifacts do Actions por nome exato, `sort -V`,
  `timeout-minutes`, ffmpeg `-nostdin` + FD 3 + `timeout 300`; `generate-report-index.mjs`
  híbrido (build-time + `HEAD` same-origin). Doc portátil de 463 linhas.
- Também nesta janela: `81b70e1` (múltiplos devices Android), `4839731` (assert Pós Vendas,
  README), `81c91a2` (README no padrão do time).

## Decisões

- MediaProjection a 720p no Device Farm Android: `startRecordingScreen` truncava em ~37 s
  na troca de surface; resolução nativa passava de 100 MB e o vídeo era apagado no publish
  (`wdio.conf.ts:210-219`).
- Resultado do Device Farm **não** quebra a esteira — vai para o relatório e o step summary.
- Credenciais como `environmentVariables` do `schedule-run`, materializadas em `.env` pelo
  testspec com `printf` (só nomes no log).
- Retenção por commit órfão em vez de `git rm`: apagar pasta em commit normal não devolve
  espaço; Pages mede a árvore (1 GB), o repositório mede o histórico.

## Evidência

`git log d40dd41..d62d10f`; `mobile_test.yml` (comentários inline documentam cada armadilha:
`>&2` no `upload()`, `-nostdin`, `sort -V`, `--force-with-lease=<ref>:<sha>`).

## Pendências deixadas

- README e `CLAUDE.md` continuam citando `_devicefarm-run.yml` (→ Fase 9).
- `.mcp.json.example` removido mas citado (→ Fase 9).
