# Frontend Roadmap - Aura Template Engine

## Fase 1 - MVP operacional

Objetivo: permitir criar draft, revisar, compilar e fazer dry-run usando apenas APIs existentes.

Entregas:

- AppShell com top bar e status DEV/PROD.
- Healthcheck API/DB.
- TemplateWorkspacePage.
- BusinessContextForm.
- IntentComposer.
- Chamada `POST /pipeline/template/draft`.
- WhatsAppPreview.
- StrategySummary.
- RiskBadge.
- AuditChecklist.
- HumanReviewPanel.
- DecisionTraceTimeline basica.
- ArtifactDrawer basico.
- CompileMetaPanel.
- SubmitMetaPanel com dry-run.

Critérios de aceite:

- Usuario gera draft.
- Usuario aprova review.
- Usuario compila payload Meta.
- Usuario faz dry-run.
- UI exibe bloqueios/warnings sem recalcular nada.

## Fase 2 - Experiencia de auditoria enterprise

Objetivo: tornar a revisao confiavel para uso interno.

Entregas:

- Timeline completa dos agentes.
- Comparacao entre template components e metaPayload.
- Painel de policyReview detalhado.
- Painel de auditReport detalhado.
- JSON viewer com busca.
- Copiar IDs/tokens/checksums.
- Persistencia local do ultimo workspace.
- Estados robustos para 400/409/422/503.

Critérios de aceite:

- Revisor entende por que o template foi aprovado/bloqueado.
- DecisionTrace e artifacts sao navegaveis.
- Nenhuma regra de policy e duplicada no frontend.

## Fase 3 - PROD mode e submissao real

Objetivo: habilitar envio real com guardrails.

Entregas:

- `VITE_AURA_RUNTIME_MODE=PROD`.
- Confirmacao explicita antes de `dryRun=false`.
- Tela de resumo final antes do envio.
- Bloqueio visual se compile falhou.
- Bloqueio visual se review nao aprovada.
- Exibicao de `metaResponse`.
- Log visual de tentativa de submissao.

Critérios de aceite:

- Em DEV, envio real nao aparece.
- Em PROD, envio real exige confirmacao.
- Erros Meta sao exibidos com code/message/details.

## Fase 4 - Biblioteca persistente de templates

Dependencia: backend precisa expor endpoints persistentes de listagem.

Entregas futuras:

- Lista de templates.
- Filtros por status, categoria e tenant.
- Historico de versions.
- Historico de review.
- Historico de submissao Meta.

Nao implementar com `/api/templates`, porque essas rotas sao legadas e em memoria.

## Fase 5 - Autenticacao

Dependencia: backend/auth provider oficial.

Entregas futuras:

- Login.
- Sessao de usuario.
- Reviewer name vindo do usuario autenticado.
- Roles: viewer, reviewer, admin.
- Token bearer no ApiClient.
- Rotas protegidas.

## Fase 6 - Multi-tenant

Dependencia: contrato backend para tenant.

Entregas futuras:

- Tenant switcher.
- Permissoes por tenant.
- Branding por tenant.
- Business Context persistente por tenant.
- Dashboard por tenant.

## Fase 7 - Colaboracao e governanca

Entregas futuras:

- Comentarios por review.
- Atribuicao de revisores.
- SLA de aprovacoes.
- Export de audit trail.
- Webhooks/n8n.
- Notificacoes.

## Backlog de componentes

Alta prioridade:

- `AuraApiClient`
- `TemplateWorkspacePage`
- `BusinessContextForm`
- `IntentComposer`
- `WhatsAppPreview`
- `HumanReviewPanel`
- `MetaCompilerPanel`
- `MetaSubmissionPanel`
- `AuditPanel`
- `DecisionTraceTimeline`

Media prioridade:

- `ArtifactDrawer`
- `PipelineTimeline`
- `PolicySuggestionCard`
- `PayloadDiffViewer`
- `CopyToClipboardButton`
- `RuntimeModeBadge`

Baixa prioridade:

- `TemplateLibraryPage`
- `TenantSwitcher`
- `UserMenu`
- `NotificationCenter`

## Sequencia de implementacao recomendada para Lovable

1. Criar AppShell e API client.
2. Implementar Health status.
3. Implementar workspace unico com form + draft.
4. Renderizar preview e audit.
5. Implementar review approve/reject/request changes.
6. Implementar compile Meta.
7. Implementar submit dry-run.
8. Adicionar decisionTrace/artifacts.
9. Refinar estados de erro/loading.
10. Preparar PROD mode visual.

## Definicao de pronto

O frontend esta pronto quando:

- usa apenas `/pipeline/*` e healthchecks;
- nao usa `/api/*`;
- nao chama Supabase diretamente;
- nao chama Graph API diretamente;
- nao recalcula risco/categoria/payload;
- mostra todos os estados operacionais;
- exibe decisionTrace e artifacts;
- funciona com `VITE_API_BASE_URL`;
- dry-run Meta funciona ponta a ponta.

## Riscos de produto

- Sem endpoints persistentes de listagem ainda: nao construir biblioteca fake.
- Sem auth oficial ainda: nao criar auth acoplada.
- Sem tenant oficial ainda: nao enviar tenantId.
- Submit real depende de backend PROD e variaveis Meta.
- 422 pode ser resposta util, nao erro fatal.

## UX desejada

O produto deve parecer uma ferramenta operacional de revisao e compliance, nao uma landing page.

Principios:

- densidade moderada;
- paineis escaneaveis;
- poucas animacoes;
- foco em decisao;
- preview sempre visivel;
- risco e bloqueios sempre proeminentes;
- payloads tecnicos em abas/drawers.
