# SYSTEM_FLOW.md — Fluxo Completo do Sistema

## Visão Macro

```
[Usuário no Frontend]
        │
        │  1. Descreve intenção + seleciona BusinessContext
        ▼
[Frontend React/Vite]
        │
        │  2. POST /api/templates/generate
        ▼
[Backend Fastify]
        │
        │  3. Valida requisição e carrega BusinessContext
        ▼
[Agent Pipeline]
        │
        ├──→ [Strategist Agent]      → StrategyPlan
        ├──→ [Copywriter Agent]      → Components
        ├──→ [Policy Reviewer Agent] → ReviewResult
        ├──→ [Compiler Agent]        → CompiledTemplate
        └──→ [Auditor Agent]         → AuditReport
        │
        │  4. Template compilado + relatório de auditoria
        ▼
[Backend Fastify]
        │
        │  5a. Retorna preview para o usuário revisar
        │  5b. (Se aprovado) Submete para Meta API
        ▼
[Meta WhatsApp API]
        │
        │  6. Meta retorna status (APPROVED | REJECTED | PENDING)
        ▼
[Backend Fastify]
        │
        │  7. Atualiza status no banco (Supabase)
        │  8. Dispara webhook para n8n
        ▼
[n8n Automation]
        │
        ├──→ Notificação para equipe
        ├──→ Registro em sistema externo (CRM, etc.)
        └──→ Trigger de campanha se APPROVED
```

---

## Endpoints da API

### Templates

| Método | Endpoint                        | Descrição                              |
|--------|---------------------------------|----------------------------------------|
| POST   | `/api/templates/generate`       | Inicia pipeline de geração             |
| GET    | `/api/templates/:id`            | Busca template por ID                  |
| GET    | `/api/templates`                | Lista templates (filtros disponíveis)  |
| PATCH  | `/api/templates/:id`            | Atualiza template em DRAFT             |
| POST   | `/api/templates/:id/submit`     | Submete para a Meta API                |
| POST   | `/api/templates/:id/regenerate` | Regenera com novos parâmetros          |

### Business Contexts

| Método | Endpoint                        | Descrição                              |
|--------|---------------------------------|----------------------------------------|
| POST   | `/api/business-contexts`        | Cria novo contexto de negócio          |
| GET    | `/api/business-contexts`        | Lista contextos                        |
| GET    | `/api/business-contexts/:id`    | Busca contexto por ID                  |
| PUT    | `/api/business-contexts/:id`    | Atualiza contexto                      |

### Agents (debug/dev)

| Método | Endpoint                        | Descrição                              |
|--------|---------------------------------|----------------------------------------|
| POST   | `/api/agents/:type/run`         | Executa agente individualmente         |

---

## Estados do Template

```
DRAFT
  │
  ├──→ (pipeline executado) ──→ PENDING_REVIEW (revisão humana)
  │                                    │
  │                         ├──→ APPROVED_INTERNAL ──→ (submit Meta) ──→ PENDING_META
  │                         └──→ REJECTED_INTERNAL                              │
  │                                                              ├──→ APPROVED
  │                                                              └──→ REJECTED
  │
  └──→ (usuário descarta) ──→ ARCHIVED
```

---

## Fluxo de Erro dos Agentes

```
[Agente falha]
      │
      ▼
  tipo de falha?
      │
      ├── POLICY_VIOLATION
      │       └──→ Retorna ao Copywriter com instruções de correção
      │
      ├── META_FORMAT_ERROR
      │       └──→ Retorna ao Compiler com diagnóstico
      │
      ├── LOW_AUDIT_SCORE (< 60)
      │       └──→ Retorna ao Copywriter para reescrita
      │
      └── FATAL_ERROR
              └──→ Pipeline interrompido, erro retornado ao frontend
```

---

## Integração com n8n

O backend dispara webhooks para n8n nos seguintes eventos:

| Evento                     | Payload                                    |
|----------------------------|--------------------------------------------|
| `template.generated`       | ID, status, auditScore                     |
| `template.submitted`       | ID, metaTemplateId                         |
| `template.approved`        | ID, metaTemplateId, businessContextId      |
| `template.rejected`        | ID, rejection reason da Meta               |
| `pipeline.failed`          | ID, step, error message                    |

---

## Integração Supabase (Futuro)

Tabelas planejadas:
- `business_contexts` — Contextos de negócio
- `templates` — Templates e seus status
- `template_components` — Componentes dos templates
- `audit_logs` — Histórico de auditorias
- `pipeline_runs` — Execuções do pipeline de agentes

---

## Roadmap de Implementação

### Fase 1 — Core (atual)
- [x] Estrutura de pastas e documentação
- [ ] Backend Fastify com rotas stub
- [ ] Schemas TypeScript definidos
- [ ] Frontend básico com formulário de intenção

### Fase 2 — Agentes
- [ ] Integração OpenAI/Claude API
- [ ] Implementação do Strategist e Copywriter
- [ ] Policy Reviewer com regras básicas da Meta
- [ ] Compiler para formato Meta API

### Fase 3 — Integração Meta
- [ ] Autenticação Meta Graph API
- [ ] Submissão de templates
- [ ] Webhook de status de aprovação

### Fase 4 — Supabase + n8n
- [ ] Persistência no Supabase
- [ ] Workflows n8n para notificações
- [ ] Dashboard de acompanhamento

### Fase 5 — Produto
- [ ] Multi-tenancy completo
- [ ] UI avançada com preview do template
- [ ] Analytics de aprovação por categoria/segmento
