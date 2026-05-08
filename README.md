# Aura Template Engine

Motor inteligente e conversacional para criação de templates de mensagem WhatsApp (Meta).

## Visão Geral

O Aura Template Engine é um módulo escalável da plataforma Aura, projetado para guiar equipes na criação de templates WhatsApp aprovados pela Meta, usando agentes de IA especializados em cada etapa do processo.

A arquitetura é **universal e reutilizável** — qualquer negócio pode ser plugado via `BusinessContext`, sem hardcoding de regras específicas.

## Stack

| Camada      | Tecnologia                          |
|-------------|-------------------------------------|
| Backend     | Node.js + Fastify + TypeScript      |
| Frontend    | React + Vite + TypeScript           |
| Automação   | n8n                                 |
| Banco       | Supabase (futuro)                   |
| IA          | OpenAI / Claude APIs                |

## Estrutura

```
aura-template-engine/
├── docs/               # Arquitetura, schemas e regras
├── backend/            # API Fastify + agentes de IA
├── frontend/           # Interface React + Vite
└── n8n/                # Workflows de automação
```

## Documentação

- [CORE_SCHEMA.md](docs/CORE_SCHEMA.md) — Schema universal do template
- [BUSINESS_CONTEXT.md](docs/BUSINESS_CONTEXT.md) — Como plugar diferentes negócios
- [AI_AGENTS.md](docs/AI_AGENTS.md) — Definição dos agentes de IA
- [SYSTEM_FLOW.md](docs/SYSTEM_FLOW.md) — Fluxo completo do sistema
- [META_POLICY_RULES.md](docs/META_POLICY_RULES.md) — Regras da Meta para templates

## Como Iniciar

### Backend
```bash
cd backend
npm install
npm run dev
```

### Dry-run de submissão Meta

Depois de gerar um draft, aprovar a review session e compilar o payload Meta local:

```http
POST /pipeline/meta/submit
Content-Type: application/json

{
  "reviewSessionId": "...",
  "approvalToken": "...",
  "compileChecksum": "...",
  "dryRun": true
}
```

Com `dryRun: true`, o backend não chama a Meta API e retorna o payload que seria enviado.

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Próximos Passos

Ver [SYSTEM_FLOW.md](docs/SYSTEM_FLOW.md) para o roadmap de implementação.
