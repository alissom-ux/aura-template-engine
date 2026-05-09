# Prompt para Lovable - Frontend Aura Template Engine

Construa um frontend React + TypeScript para a plataforma Aura Template Engine usando exclusivamente o backend existente.

## Contexto do produto

Aura Template Engine e uma ferramenta operacional para criar templates WhatsApp/Meta com agentes IA, policy review, auditoria, review humana, compilacao de payload Meta e submissao dry-run/producao.

O frontend deve ser um cockpit operacional, nao uma landing page.

## Backend

Base URL via env:

```env
VITE_API_BASE_URL=http://localhost:3001
VITE_AURA_RUNTIME_MODE=DEV
```

Use `VITE_API_BASE_URL` em todas as chamadas.

## Endpoints permitidos

Use somente:

- `GET /health`
- `GET /health/db`
- `POST /pipeline/template/draft`
- `POST /pipeline/review/:sessionId/approve`
- `POST /pipeline/review/:sessionId/reject`
- `POST /pipeline/review/:sessionId/request-changes`
- `POST /pipeline/compiler/meta`
- `POST /pipeline/meta/submit`

Nao use:

- qualquer rota `/api/templates/*`
- qualquer rota `/api/business-contexts/*`
- `/api/agents/:type/run`
- Supabase client direto
- Meta Graph API direta
- backend novo

## Fluxo principal

1. Usuario preenche prompt e Business Context.
2. Frontend chama `POST /pipeline/template/draft`.
3. Renderiza estrategia, preview WhatsApp, audit report, policy review, warnings, blocking issues, decisionTrace e artifacts.
4. Usuario aprova/rejeita/solicita ajustes via `/pipeline/review/:sessionId/*`.
5. Se aprovado, guardar `approvalToken`.
6. Usuario compila payload Meta via `POST /pipeline/compiler/meta`.
7. Guardar `compileChecksum` e renderizar `metaPayload`.
8. Usuario faz dry-run via `POST /pipeline/meta/submit` com `dryRun=true`.
9. Em PROD, permitir `dryRun=false` apenas com confirmacao explicita.

## Request de draft

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

## Campos importantes do response

Use:

- `success`
- `executionId`
- `nextStep`
- `warnings`
- `errors`
- `campaignIntent`
- `communicationStrategy`
- `templateComponents`
- `policyReview`
- `auditReport`
- `humanReview.reviewSessionId`
- `humanReview.snapshotHash`
- `humanReview.snapshotVersion`
- `reviewSession`
- `reviewSnapshot`
- `decisionTrace`
- `artifacts`
- `persistence`

## Review request

```json
{
  "reviewer": "Nome do revisor",
  "comment": "Comentario opcional",
  "snapshotHash": "valor de humanReview.snapshotHash",
  "snapshotVersion": 1
}
```

## Compile request

```json
{
  "reviewSessionId": "uuid",
  "approvalToken": "token"
}
```

## Submit request

```json
{
  "reviewSessionId": "uuid",
  "approvalToken": "token",
  "compileChecksum": "sha256",
  "dryRun": true
}
```

## Telas/componentes

Crie:

- AppShell com top bar
- ApiStatusIndicator
- RuntimeModeBadge DEV/PROD
- TemplateWorkspacePage
- BusinessContextForm
- IntentComposer
- AgentTimeline
- StrategySummaryPanel
- WhatsAppPreview
- AuditPanel
- RiskBadge
- PolicyIssuesPanel
- RecommendationsPanel
- HumanReviewPanel
- MetaCompilerPanel
- MetaPayloadViewer
- MetaSubmissionPanel
- DecisionTraceTimeline
- ArtifactDrawer
- JsonBlock
- ErrorState
- LoadingState

## Layout

Primeira tela deve ser o workspace operacional:

- esquerda: prompt + business context;
- centro: estrategia + preview WhatsApp;
- direita: audit + review + compile/submit;
- area inferior ou drawer: decisionTrace e artifacts.

Nao criar hero/landing page.

## Estados

Loading:

- health: "Verificando API..."
- draft: "Gerando estrategia, copy e auditoria..."
- review: "Aplicando decisao..."
- compile: "Compilando payload Meta..."
- submit: "Executando dry-run..." ou "Enviando para Meta..."

Success:

- draft pronto: mostrar preview e review;
- approve: habilitar compile;
- compile: habilitar dry-run;
- dry-run: mostrar `DRY_RUN_READY`;
- submit real: mostrar `metaResponse`.

Error:

- 400: erro de formulario;
- 409: snapshot hash/version divergente;
- 422: resposta operacional com bloqueios/recomendacoes, nao tratar como falha fatal;
- 503: backend/db indisponivel;
- network: retry.

## DEV/PROD

Se `VITE_AURA_RUNTIME_MODE=DEV`:

- esconder/desabilitar envio real Meta;
- permitir apenas dry-run;
- mostrar badge DEV.

Se `VITE_AURA_RUNTIME_MODE=PROD`:

- permitir envio real somente apos compile valido;
- exigir confirmacao explicita;
- mostrar payload antes do envio.

## DecisionTrace e Artifacts

Renderize `decisionTrace` como timeline auditavel:

- agent;
- kind;
- summary;
- confidence;
- rationale;
- inputs/output colapsaveis.

Renderize `artifacts` em drawer/aba tecnica:

- label;
- owner;
- type;
- createdAt;
- value em JSON formatado.

## Regras obrigatorias

- Nao duplicar logica do backend.
- Nao recalcular categoria Meta.
- Nao recalcular risco.
- Nao validar politica Meta no frontend.
- Nao gerar payload Meta no frontend.
- Nao calcular approvalToken ou compileChecksum.
- Nao chamar Supabase diretamente.
- Nao chamar Graph API diretamente.
- Nao usar endpoints `/api/*`.
- Tratar 422 como resposta operacional renderizavel.
- Preservar e exibir IDs/tokens/checksums retornados pelo backend.

## Estilo

Visual enterprise, operacional e denso:

- cards pequenos;
- tabelas/listas claras;
- badges de status;
- preview WhatsApp central;
- paineis de auditoria visiveis;
- JSON técnico em drawer;
- sem landing page decorativa.

Entregue uma aplicação funcional pronta para conectar em `http://localhost:3001`.
