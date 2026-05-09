# Aura Template Engine - Architecture

## 1. Visao geral

O Aura Template Engine e um modulo para gerar, revisar, compilar e submeter templates WhatsApp/Meta com trilha auditavel. A aplicacao atual possui:

- Backend Fastify + TypeScript.
- Pipeline deterministico em `backend/src/core` e `backend/src/pipeline`.
- Persistencia Prisma/PostgreSQL em Supabase Cloud.
- Frontend React/Vite para operacao conversacional e revisao.
- Compilador local de payload Meta.
- Cliente real para Graph API da Meta, usado apenas quando `dryRun=false`.

O sistema atual tem duas familias de APIs:

- APIs legadas em `/api/*`: usam stores em memoria; os agentes ja executam logica operacional basica, mas sem persistencia Prisma.
- APIs operacionais em `/pipeline/*`: usam engines deterministicas, criam draft, persistem no Prisma, permitem review humana, compilacao Meta e submissao.

Para operacao real, use prioritariamente `/pipeline/*`.

## 2. Componentes principais

### Backend

- `backend/src/app.ts`: cria o Fastify, registra CORS, healthchecks e rotas.
- `backend/src/server.ts`: sobe HTTP server em `HOST`/`PORT`.
- `backend/src/pipeline/template-pipeline.orchestrator.ts`: orquestra a criacao do draft.
- `backend/src/core/*`: modelos, validadores e engines deterministicas.
- `backend/src/review/review.service.ts`: aplica decisao humana e controla approval gate.
- `backend/src/compiler/*`: transforma snapshot aprovado em payload Meta.
- `backend/src/submission/*`: faz dry-run ou chamada real para Meta Graph API.
- `backend/src/repositories/*`: acesso Prisma.
- `backend/prisma/schema.prisma`: schema multi-schema `template_engine`.

### Frontend

- `frontend/src/components/workspace/OperationalCopilotWorkspace.tsx`: experiencia principal.
- `frontend/src/services/pipeline.service.ts`: chama `POST /pipeline/template/draft`.
- `frontend/src/services/review.service.ts`: chama endpoints de review humana.
- `VITE_API_BASE_URL`: base URL do backend; default `http://localhost:3001`.

### Banco

Supabase Cloud PostgreSQL:

- `DATABASE_URL`: runtime pelo Transaction/Shared Pooler, porta `6543`, com PgBouncer.
- `DIRECT_URL`: migrations pelo Session Pooler, porta `5432`.
- Schema de aplicacao: `template_engine`.
- Historico Prisma: normalmente `public._prisma_migrations`.

## 3. Pipeline operacional

Fluxo feliz:

1. Usuario envia prompt e contexto de negocio em `POST /pipeline/template/draft`.
2. `TemplatePipelineOrchestrator` resolve `BusinessContext` temporario.
3. `StrategistEngine` cria `campaignIntent`, `communicationStrategy` e `semanticTemplate`.
4. `RealizationEngine` gera `messageStructure`, `copyBlocks` e `templateComponents`.
5. `validateSemanticTemplate` valida estrutura dos componentes.
6. `PolicyReviewEngine` calcula risco, categoria prevista, warnings, violacoes e sugestoes.
7. `AuditEngine` consolida checklist, status e gate de submissao.
8. `ApprovalGateEngine` cria `ReviewSnapshot` imutavel e `ReviewSession`.
9. `TemplatePersistenceService` grava Template, TemplateVersion, PolicyReview, AuditReport e ReviewSession no Supabase.
10. Revisor aprova, rejeita ou pede ajustes em `/pipeline/review/:sessionId/*`.
11. Aprovado: approval gate abre e gera `approvalToken`.
12. `POST /pipeline/compiler/meta` compila payload Meta e gera `compileChecksum`.
13. `POST /pipeline/meta/submit` faz dry-run ou chamada real a Meta.

## 4. Fluxo dos agentes IA

Os arquivos em `backend/src/agents` agora sao agentes operacionais:

- `StrategistAgent`: usa OpenAI para enriquecer intent, categoria, CTA, tom, variaveis e guidance; fallback `StrategistEngine`.
- `CopywriterAgent`: usa OpenAI para gerar componentes Meta e alternativas humanizadas; fallback `RealizationEngine`.
- `PolicyReviewerAgent`: revisao deterministica basica para o fluxo legado `/api`.
- `CompilerAgent`: compilacao deterministica basica para o fluxo legado `/api`.
- `AuditorAgent`: usa OpenAI para enriquecer risco/compliance; fallback `AuditEngine`.

O pipeline operacional usa agentes e engines juntos:

- Strategist: `StrategistEngine`.
- Copywriter/realizacao: `RealizationEngine`.
- Policy reviewer: `PolicyReviewEngine`.
- Auditor: `AuditEngine`.
- Compiler: `MetaCompilerService`.

As chamadas OpenAI ficam centralizadas em `backend/src/ai/OpenAiJsonClient` e prompts em `backend/src/ai/prompt-registry.ts`.
`OPENAI_MODEL` default: `gpt-5.5-mini`.
`AURA_AI_MODE=deterministic` desliga IA e usa apenas fallback deterministico.

## 5. Entidades Prisma

Todas as entidades de dominio persistidas ficam no schema `template_engine`.

### Template

Tabela `templates`.

- `id`, `tenantId`, `title`, `sourcePrompt`, `status`.
- `currentVersionId` aponta para `TemplateVersion`.
- Indices por tenant e tenant/status.

### TemplateVersion

Tabela `template_versions`.

- Versiona o template.
- Guarda JSONs de `campaignIntent`, `communicationStrategy`, `templateComponents`, `variants`, `approvalState`.
- Relaciona PolicyReview, AuditReport e ReviewSessions.

### ReviewSession

Tabela `review_sessions`.

- Guarda sessao de revisao humana.
- Campos importantes: `snapshotHash`, `snapshotVersion`, `snapshotPayload`, `approvalState`, `decisionsPayload`, `historyPayload`, `decisionTrace`, `artifacts`, `reviewResult`, `approvalToken`, `decidedAt`.

### ReviewApprovalDecision

Tabela `review_approval_decisions`.

- Historico normalizado das decisoes humanas.
- Relaciona session, template, version e snapshot.

### ReviewHistoryEvent

Tabela `review_history_events`.

- Eventos de historico da review.

### PolicyReview

Tabela `policy_reviews`.

- Resultado do reviewer deterministico de politica.
- Guarda risco, categoria prevista, violacoes, warnings, sugestoes e payload bruto.

### AuditReport

Tabela `audit_reports`.

- Resultado da auditoria final.
- Guarda status, riskLevel, checklist, blockingIssues, warnings, recommendedActions e submissionGate.

## 6. Business Context

Modelo completo em `backend/src/core/business-context.model.ts`:

```json
{
  "id": "uuid",
  "name": "Empresa",
  "segment": "Segmento",
  "description": "Descricao operacional",
  "tone": {
    "primary": "formal | informal | technical | empathetic | urgency",
    "avoid": ["termos a evitar"],
    "guidelines": "guia de voz"
  },
  "audience": {
    "description": "publico",
    "ageRange": "opcional",
    "painPoints": [],
    "expectations": []
  },
  "policies": [
    { "id": "policy.id", "rule": "regra", "reason": "opcional", "severity": "block | warn" }
  ],
  "examples": [
    { "type": "approved_template | communication_sample", "content": "texto", "notes": "opcional" }
  ],
  "complianceNotes": "opcional",
  "metaWabaId": "opcional"
}
```

No endpoint operacional `/pipeline/template/draft`, o input e menor: `companyName`, `industry`, `brandVoice`, `description`, `audience`, `complianceNotes`. O orquestrador infere um BusinessContext interno a partir desses dados.

## 7. Template

Template operacional e composto por:

- `campaignIntent`: interpretacao do objetivo.
- `communicationStrategy`: categoria recomendada, CTA, mensagens-chave e risco.
- `semanticTemplate`: modelo semantico antes do texto final.
- `messageStructure`: estrutura editorial.
- `copyBlocks`: blocos de copy.
- `templateComponents`: componentes Meta-like: `HEADER`, `BODY`, `FOOTER`, `BUTTONS`.
- `reviewSnapshot`: snapshot imutavel para aprovacao humana.
- `approvalGate`: impede compilacao/submissao sem aprovacao.

## 8. Fluxo de compilacao Meta

Endpoint: `POST /pipeline/compiler/meta`.

Requisitos:

- `reviewSessionId` existente na memoria do processo.
- Sessao com status `APPROVED`.
- `approvalGate.status = OPEN`.
- `approvalToken` correto.

Saida:

- `metaPayload`: `{ name, category, language, components }`.
- `compileChecksum`: SHA-256 sobre payload, snapshot hash e approval token.
- `validation`: validacao local de regras basicas Meta.
- artefatos anexados a `ReviewService`.

O compiler tenta memoria primeiro e, se necessario, hidrata a sessao persistida pelo Prisma. Artefatos de compilacao sao persistidos em `review_sessions.artifacts` e `review_sessions.decision_trace`.

## 9. Fluxo de submissao Meta

Endpoint: `POST /pipeline/meta/submit`.

Requisitos:

- Review aprovada.
- Approval token valido.
- `compileChecksum` de um payload previamente compilado.
- Para envio real: `dryRun=false`, `META_ACCESS_TOKEN` e `META_WABA_ID`.

Com `dryRun=true`, nao chama a Meta e retorna o payload que seria enviado.

Com `dryRun=false`, chama:

```text
POST https://graph.facebook.com/{META_GRAPH_VERSION}/{META_WABA_ID}/message_templates
```

O submit tambem hidrata a sessao persistida e procura o artefato compilado em `review_sessions.artifacts`. Em DEV, envio real fica bloqueado; em PROD, `dryRun=false` chama Meta Graph API.

## 10. Implementado vs placeholder

Implementado:

- Fastify API.
- Healthchecks.
- Prisma multi-schema para Supabase Cloud.
- Pipeline deterministico de draft.
- Persistencia do draft e review inicial.
- Review humana com validacao de snapshot hash/version.
- Persistencia de decisao de review.
- Compilador local de payload Meta.
- Dry-run de submissao.
- Cliente Meta Graph API para envio real.
- Frontend operacional para draft/review.

Placeholder/mock/incompleto:

- Rotas `/api/templates/*` e `/api/business-contexts/*` usam store em memoria.
- `POST /api/templates/:id/submit` fica desabilitado porque o submit operacional exige reviewSession, approvalToken e compileChecksum em `/pipeline/*`.
- Integracao Anthropic ainda nao existe.
- `TemplateService.generate` usa `AgentOrchestrator` legado, sem persistencia Prisma.
- Nao ha autenticacao/autorizacao/tenant real por usuario.
- Nao ha endpoints de listagem persistente de templates do Prisma.

## 11. Pontos quebrados e riscos

- APIs `/api/*` parecem publicas, mas sao legadas e sem persistencia; podem confundir consumidores.
- `MetaCompilerService` e `MetaSubmissionService` hidratam do banco, mas compilacoes concorrentes em multiplas replicas ainda merecem teste de carga/idempotencia.
- `readMetaEnv` define `META_WABA_ID` default fixo; em producao deveria exigir env explicita.
- `@fastify/env` esta instalado, mas nao usado.
- Scripts de lint usam `eslint`, mas o pacote `eslint` nao aparece em `devDependencies`.
- Nao ha testes automatizados.
- CORS esta com `origin: true`, permissivo para producao.
- Erros em handlers como `PATCH /api/templates/:id` nao sao normalizados; excecoes podem virar 500.

## 12. Roadmap sugerido

1. Desativar ou marcar claramente `/api/*` como legacy.
2. Hidratar compiler/submission pelo banco, incluindo artifacts de compilacao.
3. Persistir resultado de compilacao Meta em tabela/campo dedicado.
4. Criar endpoints persistentes para listar templates, versions, reviews e audit reports.
5. Remover default hardcoded de `META_WABA_ID`.
6. Adicionar autenticacao, tenant resolution e RBAC.
7. Implementar LLM adapters com fallback deterministico.
8. Implementar testes unitarios dos engines e testes de contrato dos endpoints.
9. Adicionar observabilidade: request id, structured logs, metricas, traces.
10. Fechar CORS para dominios conhecidos.
11. Criar fila/job para submissao Meta e polling de status.
12. Adicionar versionamento/revisao de templates apos request changes.
