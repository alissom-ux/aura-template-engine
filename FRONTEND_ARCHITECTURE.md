# Frontend Architecture - Aura Template Engine

## Objetivo

Construir uma interface operacional para criar, revisar, auditar, compilar e submeter templates WhatsApp/Meta usando o backend Aura Template Engine existente.

O frontend e um cockpit de operacao. O backend e a fonte da verdade.

## Stack recomendada

- React
- TypeScript
- Vite
- Fetch API ou TanStack Query
- CSS Modules/Tailwind/shadcn se o projeto Lovable usar
- JSON viewer simples para artifacts/payloads

Nao adicionar Supabase client no frontend para este escopo. O backend ja gerencia Prisma/Supabase.

## Estrutura de paginas

```text
src/
  app/
    App.tsx
    routes.tsx
  api/
    auraApi.ts
    types.ts
  pages/
    DashboardPage.tsx
    TemplateWorkspacePage.tsx
    SettingsPage.tsx
  components/
    layout/
      AppShell.tsx
      TopBar.tsx
      StatusRail.tsx
    business-context/
      BusinessContextForm.tsx
      BrandVoicePresets.tsx
    pipeline/
      IntentComposer.tsx
      PipelineStatus.tsx
      AgentTimeline.tsx
      StrategySummary.tsx
    preview/
      WhatsAppPreview.tsx
      TemplateComponentList.tsx
    audit/
      RiskBadge.tsx
      AuditChecklist.tsx
      PolicyIssuesPanel.tsx
      RecommendationsPanel.tsx
    review/
      HumanReviewPanel.tsx
      ReviewDecisionCard.tsx
    meta/
      MetaCompilerPanel.tsx
      MetaPayloadViewer.tsx
      MetaSubmissionPanel.tsx
    trace/
      DecisionTraceTimeline.tsx
      ArtifactDrawer.tsx
      JsonBlock.tsx
    shared/
      Button.tsx
      Field.tsx
      EmptyState.tsx
      ErrorState.tsx
      LoadingState.tsx
  state/
    workspaceStore.ts
    runtimeMode.ts
```

## Roteamento sugerido

### `/`

Dashboard/workspace principal.

Conteudo:

- composer de prompt;
- formulario Business Context;
- preview WhatsApp;
- audit/review/meta panels;
- timeline de agentes.

### `/settings`

Configuracoes frontend:

- API base URL;
- modo visual DEV/PROD;
- status de health;
- instrucoes de ambiente.

### Futuro: `/templates`

Nao implementar ate o backend expor endpoints persistentes de listagem.

## API client

Criar `src/api/auraApi.ts`.

```ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok && response.status !== 422 && response.status !== 409) {
    throw new Error(data?.error?.message ?? data?.error ?? `HTTP ${response.status}`);
  }

  return data as T;
}
```

Funcoes:

- `getHealth()`
- `getDbHealth()`
- `createTemplateDraft(payload)`
- `approveReview(sessionId, payload)`
- `rejectReview(sessionId, payload)`
- `requestReviewChanges(sessionId, payload)`
- `compileMeta(payload)`
- `submitMeta(payload)`

## Tipos principais

### Pipeline state

```ts
type PipelineUiState =
  | "idle"
  | "checking_health"
  | "drafting"
  | "draft_ready"
  | "needs_fixes"
  | "reviewing"
  | "approved"
  | "compiling"
  | "compiled"
  | "submitting"
  | "submitted"
  | "failed";
```

### Runtime mode

```ts
type RuntimeMode = "DEV" | "PROD";
```

### Risk

```ts
type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
type AuditStatus = "READY_FOR_REVIEW" | "NEEDS_FIXES" | "BLOCKED";
```

## Estado local do workspace

Guardar em estado React:

- prompt atual;
- businessContext;
- defaults;
- ultimo `PipelineResponse`;
- `reviewSessionId`;
- `snapshotHash`;
- `snapshotVersion`;
- `approvalToken`;
- `compileChecksum`;
- `metaPayload`;
- aba ativa;
- artifacts selecionados.

Opcional: persistir em `localStorage` somente:

- businessContext draft;
- ultimo prompt;
- API base customizada;
- modo visual DEV/PROD.

Nao persistir access token Meta ou secrets no frontend.

## Fluxo de dados

```text
IntentComposer + BusinessContextForm
  -> createTemplateDraft
  -> PipelineResponse
  -> StrategySummary + WhatsAppPreview + AuditPanel + ReviewPanel + TracePanel
  -> approve/reject/requestChanges
  -> approvalToken
  -> compileMeta
  -> compileChecksum + metaPayload
  -> submitMeta(dryRun true/false)
```

## Componentes detalhados

### BusinessContextForm

Campos:

- companyName
- industry
- brandVoice
- description
- audience
- complianceNotes

Validacoes frontend leves:

- obrigatorios vazios;
- prompt minimo 10 caracteres;
- mostrar texto auxiliar.

Nao validar politica/compliance no frontend.

### IntentComposer

Campos:

- textarea `userPrompt`;
- category segmented control: MARKETING, UTILITY, AUTHENTICATION;
- language select, default `pt_BR`;
- botao "Gerar draft auditavel".

### AgentTimeline

Renderizar etapas:

- Strategist
- Copywriter
- Policy Reviewer
- Auditor
- Human Review Gate
- Meta Compiler
- Meta Submit

Status:

- pending;
- running;
- success;
- warning;
- blocked.

Derivar dos responses, nao inventar status interno complexo.

### WhatsAppPreview

Renderizar:

- HEADER;
- BODY;
- FOOTER;
- BUTTONS.

Se BODY tiver variaveis `{{1}}`, oferecer toggle:

- placeholders;
- exemplos.

### RiskBadge

Mapear:

- LOW: verde;
- MEDIUM: amarelo;
- HIGH: laranja;
- CRITICAL: vermelho.

### AuditChecklist

Renderizar `auditReport.checklist`.

Cada item:

- label;
- status;
- message.

### PolicyIssuesPanel

Combinar visualmente:

- `policyReview.violations`;
- `policyReview.warnings`;
- `policyReview.suggestions`;
- `auditReport.blockingIssues`;
- `auditReport.recommendedActions`.

Manter fontes separadas com labels.

### HumanReviewPanel

Entradas:

- reviewer name;
- comment.

Acoes:

- approve;
- reject;
- request changes.

Usar:

- `humanReview.reviewSessionId`;
- `humanReview.snapshotHash`;
- `humanReview.snapshotVersion`.

Apos approve:

- armazenar `approvalToken`;
- habilitar MetaCompilerPanel.

### MetaCompilerPanel

Botao:

- "Compilar payload Meta".

Mostrar:

- `compileChecksum`;
- `validation.errors`;
- `validation.warnings`;
- `metaPayload`.

### MetaSubmissionPanel

DEV:

- apenas dry-run.

PROD:

- dry-run recomendado primeiro;
- botao "Enviar para Meta" com confirmacao.

Mostrar:

- state;
- metaResponse;
- error.

### DecisionTraceTimeline

Para cada item:

- agent;
- kind;
- summary;
- confidence;
- rationale;
- inputs/output colapsaveis.

### ArtifactDrawer

Lista artifacts por label:

- `review_session.created`;
- `approval_gate.initial`;
- `meta_payload.draft`;
- `meta_payload.validation`;
- `meta_payload.compile_checksum`;
- `meta_submission`.

Valor em JSON viewer.

## Loading states

### Draft

Texto: "Gerando estrategia, copy e auditoria..."

Exibir skeletons:

- preview;
- risk panel;
- timeline.

### Review

Texto: "Aplicando decisao de review..."

Desabilitar botoes.

### Compile

Texto: "Compilando payload Meta..."

Desabilitar submit.

### Submit

Texto dry-run: "Validando dry-run..."

Texto prod: "Enviando para Meta..."

## Error states

### 400 validation

Mostrar por campo quando possivel.

### 409 review conflict

Mostrar:

"O snapshot mudou ou o hash nao confere. Gere um novo draft ou atualize a sessao."

### 422 operational

Nao tratar como falha de rede. Renderizar payload retornado:

- errors;
- warnings;
- recommendedActions.

### 503 DB

Mostrar banner:

"Banco indisponivel. Verifique Supabase Cloud e variaveis DATABASE_URL/DIRECT_URL."

## Success states

- Draft pronto: habilita review.
- Review aprovada: habilita compile.
- Compile valido: habilita submit dry-run.
- Dry-run pronto: mostrar payload final.
- Submit real: mostrar `metaResponse.status`.

## DEV/PROD

O frontend pode usar:

```env
VITE_AURA_RUNTIME_MODE=DEV
```

Em DEV:

- ocultar botao de envio real;
- manter dry-run;
- mostrar badge "DEV".

Em PROD:

- mostrar badge "PROD";
- envio real com confirmacao;
- nao permitir envio real se audit/report ou compile falhou.

## Autenticacao futura

Criar interfaces:

```ts
interface AuthSession {
  userId: string;
  name: string;
  email: string;
  roles: string[];
}
```

Usar reviewer default da sessao quando existir.

Preparar `ApiClient` para receber `Authorization: Bearer`.

## Multi-tenant futuro

Nao enviar `tenantId` agora.

Preparar:

- `TenantContext`;
- `selectedTenant`;
- nomes de tenant no dashboard;
- filtros futuros.

Quando backend expor contrato, adicionar header ou campo conforme API oficial.

## Regras de ouro

- Consumir apenas APIs existentes.
- Nao criar tabelas, Supabase client, Meta client ou backend paralelo.
- Nao duplicar scoring, policy review, compiler, approval token ou checksum.
- Renderizar fielmente `decisionTrace`, `artifacts`, `policyReview` e `auditReport`.
- Tratar 422 como resposta operacional renderizavel.
