# Lovable Integration - Aura Template Engine

Este documento orienta o Lovable a construir um frontend para a plataforma Aura Template Engine usando o backend existente. O frontend deve consumir APIs prontas; nao deve recriar regras de negocio, validacoes Meta, scoring de risco, prompts de IA, auditoria ou compilacao localmente.

## Visao geral do produto

Aura Template Engine e uma plataforma operacional para criar templates WhatsApp/Meta com apoio de agentes IA, revisao humana, auditoria e submissao controlada.

O usuario informa:

- objetivo da campanha/template;
- contexto do negocio;
- categoria Meta desejada;
- idioma.

O backend retorna:

- estrategia recomendada;
- componentes do template;
- riscos e warnings;
- audit report;
- review session;
- decision trace;
- artifacts;
- payload Meta compilado;
- status de dry-run/submissao.

## Base URL da API

Desenvolvimento local:

```text
http://localhost:3001
```

Frontend:

```env
VITE_API_BASE_URL=http://localhost:3001
```

Em producao, usar a URL publica do backend:

```env
VITE_API_BASE_URL=https://api.seu-dominio.com
```

## APIs que o frontend deve consumir

Use somente estes endpoints:

- `GET /health`
- `GET /health/db`
- `POST /pipeline/template/draft`
- `POST /pipeline/review/:sessionId/approve`
- `POST /pipeline/review/:sessionId/reject`
- `POST /pipeline/review/:sessionId/request-changes`
- `POST /pipeline/compiler/meta`
- `POST /pipeline/meta/submit`

## APIs que NAO devem ser usadas

Nao usar no frontend principal:

- `POST /api/templates/generate`
- `GET /api/templates`
- `GET /api/templates/:id`
- `PATCH /api/templates/:id`
- `POST /api/templates/:id/submit`
- `POST /api/business-contexts`
- `GET /api/business-contexts`
- `GET /api/business-contexts/:id`
- `PUT /api/business-contexts/:id`
- `POST /api/agents/:type/run`

Essas rotas sao legadas ou de desenvolvimento. Elas nao representam o fluxo persistente oficial, podem usar memoria local e podem confundir a experiencia.

## Fluxos principais da interface

### 1. Health/ambiente

Ao abrir o app:

1. Chamar `GET /health`.
2. Chamar `GET /health/db`.
3. Exibir status discreto no dashboard:
   - API online;
   - DB conectado;
   - schema `template_engine`;
   - modo ambiente vindo da configuracao frontend, se existir.

Estados:

- Loading: "Verificando API..."
- Success: indicador verde "API online".
- Error: banner "Backend indisponivel".

### 2. Business Context

O Business Context nao deve ser salvo por rotas `/api/business-contexts` neste frontend. No fluxo atual, ele e enviado junto com o draft.

Campos recomendados:

- `companyName` obrigatorio;
- `industry` obrigatorio;
- `brandVoice` obrigatorio;
- `description` opcional;
- `audience` opcional;
- `complianceNotes` opcional.

Payload:

```json
{
  "companyName": "Aura Store",
  "industry": "E-commerce de moda",
  "brandVoice": "Empatico, claro e sem pressao comercial",
  "description": "Loja online de roupas femininas",
  "audience": "Clientes que navegaram ou compraram nos ultimos meses",
  "complianceNotes": "Evitar promessas de desconto garantido"
}
```

UI:

- formulario compacto;
- presets de tom;
- campo longo para compliance notes;
- opcao "Salvar localmente neste navegador" usando localStorage, se desejado.

### 3. Template Pipeline

Endpoint:

```http
POST /pipeline/template/draft
```

Request:

```json
{
  "userPrompt": "Crie uma mensagem para reengajar clientes que abandonaram o carrinho, com tom acolhedor e CTA para falar com atendimento.",
  "businessContext": {
    "companyName": "Aura Store",
    "industry": "E-commerce de moda",
    "brandVoice": "Empatico, claro e sem pressao comercial",
    "description": "Loja online de roupas femininas",
    "audience": "Clientes que navegaram ou compraram nos ultimos meses",
    "complianceNotes": "Evitar promessas de desconto garantido"
  },
  "defaults": {
    "category": "MARKETING",
    "language": "pt_BR"
  }
}
```

Response esperado:

```json
{
  "success": true,
  "executionId": "uuid",
  "nextStep": "review_template",
  "warnings": [],
  "campaignIntent": {},
  "communicationStrategy": {},
  "templateComponents": [],
  "policyReview": {},
  "auditReport": {},
  "humanReview": {
    "reviewSessionId": "uuid",
    "snapshotHash": "sha256",
    "snapshotVersion": 1,
    "approvalGate": {
      "status": "LOCKED",
      "canCompile": false,
      "canSubmit": false
    }
  },
  "reviewSession": {},
  "reviewSnapshot": {},
  "decisionTrace": [],
  "persistence": {
    "saved": true,
    "templateId": "uuid",
    "templateVersionId": "uuid",
    "versionNumber": 1,
    "reviewSessionId": "uuid"
  }
}
```

Estados:

- Loading: mostrar timeline dos agentes: Strategist, Copywriter, Policy Reviewer, Auditor, Review Gate.
- Success: mostrar preview, estrategia, risco e painel de review.
- Partial success com `success=false` e status 422: mostrar bloqueios, recomendações e permitir editar prompt/contexto.
- Error 400: destacar campos invalidos.
- Network error: permitir retry.

### 4. Review

Endpoints:

```http
POST /pipeline/review/:sessionId/approve
POST /pipeline/review/:sessionId/reject
POST /pipeline/review/:sessionId/request-changes
```

Request:

```json
{
  "reviewer": "Alissom",
  "comment": "Aprovado para dry-run.",
  "snapshotHash": "hash-retornado-no-draft",
  "snapshotVersion": 1
}
```

Response approve:

```json
{
  "success": true,
  "reviewStatus": "APPROVED",
  "gateStatus": "OPEN",
  "canCompile": true,
  "approvalToken": "token",
  "reviewEvents": [],
  "decisionTrace": [],
  "artifacts": [],
  "reviewSession": {},
  "decision": {}
}
```

UI:

- painel lateral "Revisao humana";
- botao Aprovar;
- botao Rejeitar;
- botao Solicitar ajustes;
- campo comentario;
- mostrar snapshot hash/version para rastreabilidade;
- apos approve, habilitar "Compilar Meta".

Estados:

- Loading: "Aplicando decisao..."
- Success approve: gate aberto, token recebido.
- Conflict 409: snapshot divergente; pedir gerar novo draft.
- 404: sessao nao encontrada; explicar possivel expiracao/redeploy ou ID incorreto.

### 5. Audit

Audit vem no response de draft:

```json
{
  "auditReport": {
    "status": "READY_FOR_REVIEW",
    "riskLevel": "LOW",
    "summary": "string",
    "blockingIssues": [],
    "warnings": [],
    "recommendedActions": [],
    "reviewNotes": [],
    "checklist": [],
    "submissionGate": {
      "allowed": false,
      "reason": "Submission disabled until human review is completed.",
      "requiresExplicitConfirmation": true
    }
  }
}
```

UI:

- risk badge: LOW, MEDIUM, HIGH, CRITICAL;
- status badge: READY_FOR_REVIEW, NEEDS_FIXES, BLOCKED;
- checklist com PASS/WARNING/FAIL;
- lista de bloqueios;
- lista de warnings;
- lista de recommendedActions;
- resumo textual.

Nao recalcular risco no frontend. Apenas renderizar o que o backend retorna.

### 6. Meta Compile

Endpoint:

```http
POST /pipeline/compiler/meta
```

Request:

```json
{
  "reviewSessionId": "uuid-da-review",
  "approvalToken": "token-retornado-na-aprovacao"
}
```

Response:

```json
{
  "success": true,
  "compiled": true,
  "compileChecksum": "sha256",
  "metaPayload": {
    "name": "template_name",
    "category": "MARKETING",
    "language": "pt_BR",
    "components": []
  },
  "validation": {
    "valid": true,
    "warnings": [],
    "errors": []
  },
  "decisionTrace": [],
  "artifacts": []
}
```

UI:

- botao "Compilar payload Meta";
- JSON viewer para `metaPayload`;
- copiar `compileChecksum`;
- validacao visual: valid/warnings/errors;
- habilitar dry-run submit se `success=true`.

### 7. Meta Submit

Endpoint:

```http
POST /pipeline/meta/submit
```

Request dry-run:

```json
{
  "reviewSessionId": "uuid-da-review",
  "approvalToken": "token",
  "compileChecksum": "sha256",
  "dryRun": true
}
```

Request producao:

```json
{
  "reviewSessionId": "uuid-da-review",
  "approvalToken": "token",
  "compileChecksum": "sha256",
  "dryRun": false
}
```

Response dry-run:

```json
{
  "success": true,
  "state": "DRY_RUN_READY",
  "dryRun": true,
  "metaPayload": {},
  "validation": {
    "valid": true,
    "errors": []
  },
  "decisionTrace": [],
  "artifacts": []
}
```

UI:

- em DEV, mostrar somente "Dry-run Meta";
- em PROD, mostrar "Enviar para Meta" com confirmacao explicita;
- sempre exibir payload antes da submissao real;
- se `state=FAILED`, mostrar `error.code` e `error.message`.

## Modo DEV/PROD

O frontend deve ter uma flag visual:

```env
VITE_AURA_RUNTIME_MODE=DEV
```

Comportamento recomendado:

- DEV:
  - esconder ou desabilitar submissao real;
  - permitir apenas `dryRun=true`;
  - mostrar banner "Modo DEV: envio real Meta desabilitado".
- PROD:
  - permitir `dryRun=false`;
  - exigir confirmacao textual antes de enviar;
  - mostrar risco e payload final.

O backend tambem bloqueia envio real se `AURA_RUNTIME_MODE` nao for `PROD`.

## Como exibir artifacts e decisionTrace

`decisionTrace` deve virar uma timeline auditavel:

- agente;
- kind;
- summary;
- rationale;
- inputs;
- output;
- confidence;
- createdAt.

`artifacts` deve virar uma aba tecnica:

- label;
- owner;
- type;
- createdAt;
- value em JSON viewer.

Nao esconder artifacts; eles sao parte da proposta enterprise/auditavel.

## Como exibir riscos, bloqueios e recomendacoes

Prioridade visual:

1. `auditReport.blockingIssues`
2. `policyReview.violations`
3. `auditReport.warnings`
4. `policyReview.warnings`
5. `auditReport.recommendedActions`
6. `policyReview.suggestions`

Use cores:

- LOW/READY: verde;
- MEDIUM/WARNING: amarelo;
- HIGH/NEEDS_FIXES: laranja;
- CRITICAL/BLOCKED: vermelho.

## Telas necessarias

1. Dashboard operacional
2. Criador de template
3. Workspace do draft
4. Preview WhatsApp
5. Compliance/Audit
6. Review humana
7. Meta Compile
8. Meta Submit
9. Artifacts & Decision Trace
10. Configuracoes de ambiente/API

## Componentes visuais sugeridos

- `ApiStatusIndicator`
- `BusinessContextForm`
- `TemplateIntentComposer`
- `PipelineRunButton`
- `AgentTimeline`
- `StrategySummaryPanel`
- `WhatsAppTemplatePreview`
- `RiskBadge`
- `AuditChecklist`
- `PolicyIssuesPanel`
- `HumanReviewPanel`
- `MetaPayloadViewer`
- `MetaSubmissionPanel`
- `DecisionTraceTimeline`
- `ArtifactJsonDrawer`
- `OperationalEventLog`

## Modelo de dashboard

Primeira tela deve ser uma ferramenta operacional, nao landing page.

Layout recomendado:

- Top bar: Aura Template Engine, status API, modo DEV/PROD.
- Coluna esquerda: prompt + Business Context.
- Centro: estrategia + preview WhatsApp + payload.
- Coluna direita: audit, review, compile/submit.
- Rodape/aba inferior: decisionTrace e artifacts.

## Estrategia futura de autenticacao

Preparar o frontend para:

- `AuthProvider` abstrato;
- token bearer em `ApiClient`;
- estados `unauthenticated`, `loadingSession`, `authenticated`;
- rotas protegidas;
- usuario/reviewer name vindo da sessao.

Nao implementar auth fake fixa. Se precisar mockar, isole em `MockAuthProvider`.

## Estrategia multi-tenant futura

Preparar:

- `TenantProvider`;
- seletor de workspace/tenant;
- `tenantId` como contexto visual;
- evitar hardcode no frontend.

Hoje o backend usa `TEMPLATE_ENGINE_DEFAULT_TENANT_ID`. O frontend nao deve tentar enviar tenantId ate existir contrato oficial.

## Nao duplicar logica do backend

O frontend nao deve:

- decidir categoria Meta;
- recalcular risco;
- validar politica Meta por conta propria;
- gerar payload Meta;
- montar approval token;
- calcular compileChecksum;
- criar decisionTrace;
- manipular artifacts;
- submeter diretamente para Graph API.

O frontend deve:

- coletar input;
- chamar backend;
- renderizar respostas;
- preservar IDs/tokens/checksums retornados;
- exibir confirmacoes;
- permitir retry.

## Instrucoes para Lovable

Construa o frontend com React + TypeScript.

Use somente `VITE_API_BASE_URL` para falar com o backend.

Crie um cliente API centralizado:

- `createTemplateDraft`
- `approveReview`
- `rejectReview`
- `requestChanges`
- `compileMeta`
- `submitMeta`
- `getHealth`
- `getDbHealth`

Nao criar backend, banco, Supabase client, Graph API client nem regras de negocio no frontend.

Persistir localmente apenas estado de UI e ultimo draft, se necessario.
