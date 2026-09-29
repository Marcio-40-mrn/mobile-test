---
phase: 8
name: Novos cenários (cobertura)
status: not-started
decided: 2026-09-15
requirements: [COV-01, COV-02, COV-03, COV-04, COV-05, COV-06, COV-07, COV-08]
depends-on: [7]
---

# Fase 8 — Contexto

## Intenção do usuário

"Criar novos cenários de teste aumentando a cobertura de teste que existe hoje."

## Regras que todo cenário novo já nasce obedecendo

1. **Independente** (regra 10): parte de "app fechado" ou de um estado que ele mesmo
   constrói; roda sozinho com `--spec`; não depende da jornada da Fase 5 nem de outro cenário.
2. **Dois ramos de plataforma** em cada método de página (`if (IS_IOS)`, convenção da
   Fase 7); locators iOS só dos drafts (Fase 6) — Menu ainda **não foi mapeado**, precisa de
   captura.
3. Steps no Allure; sem `$()` em spec; `pause` só comentado.
4. Se mais de um cenário precisar de "logar e chegar à home", o fluxo vai para
   `test/helpers/` (HELP-01).

## Candidatos (o que já se sabe sobre cada um)

| REQ | Cenário | Elementos conhecidos | Fonte |
|---|---|---|---|
| COV-01 | Campanhas: lista, abas Campanhas/Segmentos, explorar | `~campaigns-header`, `~segmented-control-tab-campanhas`, `~segmented-control-tab-segmentos`, `~btn-campaign-dashboard-explore`, `~btn-campaign-section-view-all` | `.docx`; Android em `git show 7d74ef6^:docs/testids/campanhas.xml` |
| COV-02 | Menu: itens e navegação | `~tab-menu-5` (iOS); `~Menu` (Android) — conteúdo da tela não mapeado | Android em `git show 7d74ef6^:docs/testids/menu.xml`; iOS: capturar na Fase 6 |
| COV-03 | Perfil do cliente: abas Dados / Notas / Histórico / Sugestões | `~tab-index-0`, `~tab-notes-1`, `~tab-purchases-2`, `~tab-recommendations-3`; cards `~customer-detail-header`, `~customer-data-card`, `~customer-data-registration-card`, `~customer-data-purchase-card`, `~customer-contact-card`, `~customer-contact-optin-card` | `.docx` |
| COV-04 | Busca com resultado e "Buscas Recentes" | `~screen-customer-search-results`, `~input-customer-search-input`, `~list-customer-search-results`, `customer-card-search-<id>`; "Buscas Recentes" na home | `.docx`; hoje só "Fudaba" é exercitado |
| COV-05 | Favoritar / desfavoritar e reflexo na aba Favoritos | `btn-customer-card-star-<id>`; "Total de clientes: N" na aba Favoritos | `.docx` — estado visual (coração) só pelo print |
| COV-06 | Home: "Visualizados recentemente", "Estoque", notificações | `~customer-section-recent-customers-list`, `customer-card-recent-<id>`, `~Estoque`, `~greeting-header-notifications`, `~greeting-header-network-status` | `.docx` |
| COV-07 | Contatar cliente | `btn-customer-card-action-<id>` (label "Contatar"/"Parabenizar") — o que abre (WhatsApp? tela interna?) não é conhecido | Descobrir na Fase 6 |
| COV-08 | Negativos: credencial inválida, PIN errado | Mensagens de erro não capturadas | Capturar na Fase 6; cuidado com bloqueio de conta por tentativas |

## Riscos

- Dados da conta de teste: favoritar/contatar **alteram estado** no backend — o cenário
  precisa desfazer (desfavoritar) ou usar um cliente dedicado.
- COV-08 pode bloquear a conta de teste; verificar a política do app antes.
- Cenários que abrem app externo (WhatsApp/telefone) saem da árvore do Arys — validar só
  até o ponto controlável.

## Perguntas em aberto para o plan-phase

1. Prioridade entre os 8 (sugestão: COV-03 e COV-04 primeiro — só leitura, elementos já
   conhecidos; COV-05/07/08 por último — mudam estado).
2. Um spec por cenário ou jornadas temáticas (ex.: "cliente": busca → perfil → favoritar)?
3. Precisa de segunda conta/cliente de teste dedicado para os cenários que alteram estado?
