# Aura Template Engine - API Reference

Base URL local:

```text
http://localhost:3001
```

Formato padrao de erro de validacao:

```json
{
  "success": false,
  "error": {
    "formErrors": [],
    "fieldErrors": {}
  }
}
```

## Health

### GET /health

Verifica se o processo Fastify esta vivo.

Response 200:

```json
{
  "status": "ok",
  "version": "0.1.0"
}
```

### GET /health/db

Verifica conectividade Prisma/Supabase.

Response 200:

```json
{
  "status": "ok",
  "database": "connected",
  "schema": "template_engine",
  "reviewRepository": "accessible"
}
```

Response 503:

```json
{
  "status": "error",
  "database": "unavailable"
}
```

## Pipeline operacional

### POST /pipeline/template/draft

Cria um draft auditavel, gera review snapshot e persiste no Prisma.

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

Response 200 quando pronto para review:

```json
{
  "success": true,
  "executionId": "uuid",
  "nextStep": "review_template",
  "warnings": [],
  "campaignIntent": {},
  "communicationStrategy": {},
  "templateComponents": [
    { "type": "BODY", "text": "..." }
  ],
  "policyReview": {
    "status": "APPROVED",
    "approved": true,
    "confidence": 0.8
  },
  "auditReport": {
    "status": "READY_FOR_REVIEW",
    "riskLevel": "LOW",
    "blockingIssues": []
  },
  "humanReview": {
    "required": true,
    "status": "PENDING_REVIEW",
    "reviewSessionId": "uuid",
    "snapshotVersion": 1,
    "snapshotHash": "sha256",
    "approvalGate": {
      "status": "LOCKED",
      "canCompile": false,
      "canSubmit": false,
      "requiresExplicitApproval": true
    }
  },
  "persistence": {
    "saved": true,
    "templateId": "uuid",
    "templateVersionId": "uuid",
    "versionNumber": 1,
    "reviewSessionId": "uuid"
  }
}
```

Response 422 quando precisa correcao:

```json
{
  "success": false,
  "executionId": "uuid",
  "nextStep": "fix_policy_violations",
  "warnings": ["..."],
  "errors": [
    { "code": "audit.blocking_issue", "message": "..." }
  ],
  "auditReport": {
    "status": "NEEDS_FIXES",
    "blockingIssues": ["..."]
  },
  "persistence": {
    "saved": true,
    "templateId": "uuid",
    "templateVersionId": "uuid",
    "versionNumber": 1,
    "reviewSessionId": "uuid"
  }
}
```

Response 400:

```json
{
  "success": false,
  "error": {
    "formErrors": [],
    "fieldErrors": {
      "userPrompt": ["String must contain at least 10 character(s)"]
    }
  }
}
```

### POST /pipeline/review/:sessionId/approve

Aprova um snapshot. Abre o approval gate e retorna `approvalToken`.

Request:

```json
{
  "reviewer": "Alissom",
  "comment": "Aprovado para teste interno",
  "snapshotHash": "hash-retornado-no-draft",
  "snapshotVersion": 1
}
```

Response 200:

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
  "decision": {
    "decision": "APPROVE",
    "reviewer": { "id": "alissom", "name": "Alissom" }
  }
}
```

Response 404:

```json
{
  "success": false,
  "error": {
    "code": "review.session_not_found",
    "message": "Review session not found."
  }
}
```

Response 409 para hash/version incorretos:

```json
{
  "success": false,
  "error": {
    "code": "review.snapshot_hash_mismatch",
    "message": "Snapshot hash does not match the current review snapshot.",
    "details": {
      "expected": "hash-correto",
      "received": "hash-incorreto"
    }
  }
}
```

### POST /pipeline/review/:sessionId/reject

Mesmo payload de approve. Fecha o gate como rejeitado.

Response 200:

```json
{
  "success": true,
  "reviewStatus": "REJECTED",
  "gateStatus": "REJECTED",
  "canCompile": false,
  "approvalToken": null
}
```

### POST /pipeline/review/:sessionId/request-changes

Mesmo payload de approve. Marca a sessao como alteracoes solicitadas.

Response 200:

```json
{
  "success": true,
  "reviewStatus": "CHANGES_REQUESTED",
  "gateStatus": "CHANGES_REQUESTED",
  "canCompile": false
}
```

### POST /pipeline/compiler/meta

Compila um snapshot aprovado para payload Meta.

Request:

```json
{
  "reviewSessionId": "uuid-da-review",
  "approvalToken": "token-retornado-na-aprovacao"
}
```

Response 200:

```json
{
  "success": true,
  "compiled": true,
  "compileChecksum": "sha256",
  "metaPayload": {
    "name": "template_name",
    "category": "MARKETING",
    "language": "pt_BR",
    "components": [
      { "type": "BODY", "text": "Ola {{1}}", "example": { "body_text": [["Maria"]] } }
    ]
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

Response 422:

```json
{
  "success": false,
  "compiled": false,
  "validation": {
    "valid": false,
    "warnings": [],
    "errors": [
      { "code": "compiler.review_session_not_found", "message": "Review session not found." }
    ]
  },
  "decisionTrace": [],
  "artifacts": [],
  "error": {
    "code": "compiler.review_session_not_found",
    "message": "Review session not found."
  }
}
```

### POST /pipeline/meta/submit

Submete ou simula submissao Meta.

Request dry-run:

```json
{
  "reviewSessionId": "uuid-da-review",
  "approvalToken": "token-retornado-na-aprovacao",
  "compileChecksum": "checksum-retornado-no-compiler",
  "dryRun": true
}
```

Response 200 dry-run:

```json
{
  "success": true,
  "state": "DRY_RUN_READY",
  "dryRun": true,
  "metaPayload": {
    "name": "template_name",
    "category": "MARKETING",
    "language": "pt_BR",
    "components": []
  },
  "validation": {
    "valid": true,
    "errors": []
  },
  "decisionTrace": [],
  "artifacts": []
}
```

Request envio real:

```json
{
  "reviewSessionId": "uuid-da-review",
  "approvalToken": "token-retornado-na-aprovacao",
  "compileChecksum": "checksum-retornado-no-compiler",
  "dryRun": false
}
```

Response 200 envio real:

```json
{
  "success": true,
  "state": "META_PENDING",
  "dryRun": false,
  "metaPayload": {},
  "metaResponse": {
    "id": "meta-template-id",
    "status": "PENDING",
    "category": "MARKETING"
  },
  "validation": {
    "valid": true,
    "errors": []
  }
}
```

Response 422:

```json
{
  "success": false,
  "state": "FAILED",
  "dryRun": false,
  "validation": {
    "valid": false,
    "errors": [
      {
        "code": "submission.env.missing_access_token",
        "message": "META_ACCESS_TOKEN is required when dryRun is false."
      }
    ]
  },
  "error": {
    "code": "submission.env.missing_access_token",
    "message": "META_ACCESS_TOKEN is required when dryRun is false."
  }
}
```

## APIs legadas / desenvolvimento

Estas rotas existem, mas nao sao recomendadas para operacao real porque nao usam persistencia Prisma. Os agentes nao sao mais stubs, mas o fluxo persistente oficial continua sendo `/pipeline/*`.

### POST /api/business-contexts

Cria BusinessContext em memoria.

Request:

```json
{
  "name": "Aura Store",
  "segment": "E-commerce",
  "description": "Loja online de moda com comunicacao consultiva.",
  "tone": {
    "primary": "empathetic",
    "avoid": ["urgencia falsa"],
    "guidelines": "claro, acolhedor e objetivo"
  },
  "audience": {
    "description": "Clientes recorrentes",
    "painPoints": ["tempo curto"],
    "expectations": ["ofertas relevantes"]
  },
  "policies": [
    { "id": "no_fake_discount", "rule": "Nao prometer desconto inexistente", "severity": "block" }
  ],
  "examples": [
    { "type": "communication_sample", "content": "Oi, podemos ajudar?" }
  ]
}
```

Response 201:

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Aura Store",
    "createdAt": "2026-05-09T00:00:00.000Z"
  }
}
```

### GET /api/business-contexts

Lista contexts em memoria.

### GET /api/business-contexts/:id

Retorna context em memoria ou 404.

### PUT /api/business-contexts/:id

Atualiza context em memoria.

### POST /api/templates/generate

Chama `AgentOrchestrator` legado. Gera componentes e auditoria basica, mas nao persiste no Prisma.

Request:

```json
{
  "intent": "Criar template de recuperacao de carrinho",
  "businessContextId": "uuid",
  "category": "MARKETING",
  "language": "pt_BR"
}
```

Response possivel:

```json
{
  "templateId": "uuid",
  "template": {
    "id": "uuid",
    "name": "draft_abcd1234",
    "category": "MARKETING",
    "language": "pt_BR",
    "status": "DRAFT",
    "components": [],
    "businessContextId": "uuid",
    "auditLog": []
  },
  "auditReport": {
    "status": "BLOCKED",
    "canSubmit": false,
    "requiresHumanReview": true,
    "summary": "Pipeline error"
  },
  "success": false,
  "error": "Pipeline error details if any agent fails"
}
```

### GET /api/templates

Lista templates em memoria; aceita query `businessContextId` e `status`.

### GET /api/templates/:id

Retorna template em memoria ou 404.

### PATCH /api/templates/:id

Atualiza template em memoria se status for `DRAFT`.

### POST /api/templates/:id/submit

Nao implementado.

Response 422:

```json
{
  "success": false,
  "error": "Legacy in-memory template submission is disabled. Use /pipeline/compiler/meta and /pipeline/meta/submit."
}
```

### POST /api/agents/:type/run

Tipos validos: `strategist`, `copywriter`, `policy_reviewer`, `compiler`, `auditor`.

Tipos validos executam agentes reais ou fallback deterministico. Tipo invalido retorna 400.

Response 400:

```json
{
  "success": false,
  "error": "Invalid agent type. Valid types: strategist, copywriter, policy_reviewer, compiler, auditor"
}
```

## Exemplos Postman/Insomnia

### Sequencia operacional

1. `POST {{baseUrl}}/pipeline/template/draft`
2. Copie:
   - `humanReview.reviewSessionId`
   - `humanReview.snapshotHash`
   - `humanReview.snapshotVersion`
3. `POST {{baseUrl}}/pipeline/review/{{reviewSessionId}}/approve`
4. Copie `approvalToken`.
5. `POST {{baseUrl}}/pipeline/compiler/meta`
6. Copie `compileChecksum`.
7. `POST {{baseUrl}}/pipeline/meta/submit` com `dryRun=true`.

### Environment

```json
{
  "baseUrl": "http://localhost:3001",
  "reviewSessionId": "",
  "snapshotHash": "",
  "snapshotVersion": "1",
  "approvalToken": "",
  "compileChecksum": ""
}
```

### Draft

```http
POST {{baseUrl}}/pipeline/template/draft
Content-Type: application/json

{
  "userPrompt": "Crie uma mensagem para clientes que demonstraram interesse em um produto e ainda nao compraram.",
  "businessContext": {
    "companyName": "Aura Store",
    "industry": "E-commerce",
    "brandVoice": "Empatico, claro e sem pressao"
  },
  "defaults": {
    "category": "MARKETING",
    "language": "pt_BR"
  }
}
```

### Approve

```http
POST {{baseUrl}}/pipeline/review/{{reviewSessionId}}/approve
Content-Type: application/json

{
  "reviewer": "Alissom",
  "comment": "Aprovado para dry-run.",
  "snapshotHash": "{{snapshotHash}}",
  "snapshotVersion": 1
}
```

### Compile

```http
POST {{baseUrl}}/pipeline/compiler/meta
Content-Type: application/json

{
  "reviewSessionId": "{{reviewSessionId}}",
  "approvalToken": "{{approvalToken}}"
}
```

### Submit dry-run

```http
POST {{baseUrl}}/pipeline/meta/submit
Content-Type: application/json

{
  "reviewSessionId": "{{reviewSessionId}}",
  "approvalToken": "{{approvalToken}}",
  "compileChecksum": "{{compileChecksum}}",
  "dryRun": true
}
```
