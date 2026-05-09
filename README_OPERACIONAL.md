# Aura Template Engine - README Operacional

## Objetivo

O Aura Template Engine gera templates WhatsApp/Meta a partir de um prompt, aplica validacoes deterministicas de politica/compliance, cria uma etapa de review humana, compila payload Meta e permite dry-run ou submissao real para a Graph API.

Use este documento para operar o sistema localmente, entender o que esta pronto e evitar rotas legadas incompletas.

## Arquitetura resumida

- Backend: Fastify + TypeScript em `backend`.
- Frontend: React + Vite em `frontend`.
- Banco: Supabase Cloud PostgreSQL via Prisma.
- Runtime DB: `DATABASE_URL` pelo Transaction/Shared Pooler, porta `6543`.
- Migrations DB: `DIRECT_URL` pelo Session Pooler, porta `5432`.
- Schema Prisma: `template_engine`.
- Pipeline real: `/pipeline/*`.
- APIs antigas em `/api/*`: agora executam agentes funcionais basicos, mas continuam sem persistencia Prisma.

Documentos complementares:

- [ARCHITECTURE.md](ARCHITECTURE.md)
- [API_REFERENCE.md](API_REFERENCE.md)
- [docs/SUPABASE_CLOUD_DEPLOYMENT.md](docs/SUPABASE_CLOUD_DEPLOYMENT.md)
- [docs/DOCKER_SWARM_DEPLOYMENT.md](docs/DOCKER_SWARM_DEPLOYMENT.md)

## Variaveis de ambiente

Backend:

```bash
PORT=3001
NODE_ENV=development
DATABASE_URL=postgresql://postgres.PROJECT_REF:PASSWORD@aws-1-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&connect_timeout=15&pool_timeout=15&sslmode=require
DIRECT_URL=postgresql://postgres.PROJECT_REF:PASSWORD@aws-1-sa-east-1.pooler.supabase.com:5432/postgres?sslmode=require
TEMPLATE_ENGINE_DEFAULT_TENANT_ID=00000000-0000-0000-0000-000000000001
AURA_RUNTIME_MODE=DEV
AURA_AI_MODE=openai
AURA_AI_TEMPERATURE=0.3
AURA_AI_TIMEOUT_MS=30000
OPENAI_MODEL=gpt-5.5-mini
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
META_GRAPH_VERSION=v25.0
META_ACCESS_TOKEN=
META_WABA_ID=
META_APP_ID=
META_APP_SECRET=
SUPABASE_URL=
SUPABASE_ANON_KEY=
N8N_WEBHOOK_URL=
N8N_WEBHOOK_SECRET=
```

Frontend:

```bash
VITE_API_BASE_URL=http://localhost:3001
```

Obrigatorias para operacao local do pipeline:

- `DATABASE_URL`
- `DIRECT_URL`
- `TEMPLATE_ENGINE_DEFAULT_TENANT_ID`

Obrigatorias apenas para submissao real Meta (`dryRun=false`):

- `META_ACCESS_TOKEN`
- `META_WABA_ID`
- opcional: `META_GRAPH_VERSION`

Modo de execucao:

- `AURA_RUNTIME_MODE=DEV`: bloqueia submissao real Meta; dry-run permitido.
- `AURA_RUNTIME_MODE=PROD`: permite submissao real quando `dryRun=false` e envs Meta existem.
- `AURA_AI_MODE=openai`: usa OpenAI quando `OPENAI_API_KEY` existe.
- `AURA_AI_MODE=deterministic`: desliga chamadas OpenAI e usa engines deterministicas.

## Como iniciar desenvolvimento backend

```bash
cd backend
npm install
npm run prisma:generate
npm run prisma:migrate
npm run test:agents
npm run dev
```

Healthchecks:

```bash
curl http://localhost:3001/health
curl http://localhost:3001/health/db
```

Validar Supabase Cloud:

```bash
cd backend
npm run prisma:validate-cloud
```

## Como iniciar desenvolvimento frontend

```bash
cd frontend
npm install
npm run dev
```

O frontend usa `VITE_API_BASE_URL` e, se nao definido, chama `http://localhost:3001`.

Build:

```bash
cd frontend
npm run build
```

## Como operar via API

Fluxo ideal:

1. Criar draft: `POST /pipeline/template/draft`.
2. Ler `humanReview.reviewSessionId`, `snapshotHash`, `snapshotVersion`.
3. Aprovar: `POST /pipeline/review/:sessionId/approve`.
4. Ler `approvalToken`.
5. Compilar: `POST /pipeline/compiler/meta`.
6. Ler `compileChecksum`.
7. Dry-run: `POST /pipeline/meta/submit` com `dryRun=true`.
8. Envio real: repetir submit com `dryRun=false` e envs Meta configuradas.

Exemplo minimo:

```bash
curl -X POST http://localhost:3001/pipeline/template/draft \
  -H "Content-Type: application/json" \
  -d '{
    "userPrompt": "Crie uma mensagem para reengajar clientes que abandonaram o carrinho.",
    "businessContext": {
      "companyName": "Aura Store",
      "industry": "E-commerce",
      "brandVoice": "Empatico, claro e sem pressao"
    },
    "defaults": {
      "category": "MARKETING",
      "language": "pt_BR"
    }
  }'
```

Veja exemplos completos em [API_REFERENCE.md](API_REFERENCE.md).

## O que ja esta implementado

- Pipeline completo de draft com agentes operacionais e fallback deterministico.
- `StrategistAgent` com analise de intent, categoria, CTA, tom e guidance estrategico.
- `CopywriterAgent` com geracao de componentes Meta, variaveis e alternativas.
- `AuditorAgent` com auditoria de risco/compliance enriquecida por IA quando disponivel.
- Persistencia em Prisma/Supabase para draft, versao, review inicial, policy review e audit report.
- Review humana com hash/version do snapshot.
- Persistencia da decisao de review.
- Compilador local de payload Meta.
- Validador local basico de payload Meta.
- Dry-run de submissao.
- Cliente real para Meta Graph API quando `dryRun=false`.
- Modo DEV/PROD para bloquear envio real fora de producao.
- Persistencia de artefatos operacionais de compile/submit para sobreviver restart/redeploy.
- Frontend React para criar draft e aprovar/rejeitar/pedir alteracoes.
- Dockerfile e docker-compose preparados para Supabase Cloud.

## O que ainda e placeholder/mock

- Integracao Anthropic ainda nao e usada.
- Rotas `/api/templates/*` e `/api/business-contexts/*` persistem apenas em memoria.
- `POST /api/templates/:id/submit` nao envia para Meta.
- Listagem persistente de templates/reviews ainda nao tem endpoint publico.
- Sem autenticacao, autorizacao e tenant por usuario.

## Pontos quebrados/TODOs identificados

- `TemplateService` tem comentario "replace with Supabase in Phase 4", mas ainda usa `Map`.
- `BusinessContextService` tambem usa `Map`.
- `TemplateService.submitToMeta` retorna erro fixo de nao implementado.
- `eslint` e usado nos scripts, mas nao esta listado em `devDependencies`.
- `@fastify/env` esta instalado, mas nao e usado.
- CORS permissivo (`origin: true`).
- `META_WABA_ID` tem default hardcoded no codigo; recomendavel remover em producao.

## Dependencias criticas

Backend:

- `fastify`
- `@fastify/cors`
- `@prisma/client`
- `prisma`
- `zod`
- `dotenv`
- `uuid`
- `openai`
- `@anthropic-ai/sdk`

Frontend:

- `react`
- `react-dom`
- `react-router-dom`
- `vite`
- `typescript`

Infra:

- Supabase Cloud PostgreSQL.
- Docker/Docker Compose para deploy containerizado.
- Meta Graph API para submissao real.

## Fluxo interno recomendado

1. Operador descreve objetivo e contexto de negocio no frontend.
2. Sistema gera draft e mostra riscos, explicacoes e componentes.
3. Revisor humano aprova apenas se snapshot estiver aceitavel.
4. Time faz dry-run Meta para validar payload.
5. Somente apos dry-run bem-sucedido, executar envio real.
6. Se houver request changes, criar novo draft/version antes de compilar.
7. Guardar `reviewSessionId`, `approvalToken` e `compileChecksum` em log operacional.

## Deploy limpo na VPS

```bash
cp .env.production.example .env.production
# editar .env.production com credenciais reais

cd backend
npm ci
npm run prisma:generate
npm run prisma:migrate
npm run prisma:validate-cloud
cd ..

docker network create --driver overlay --attachable MaternaNet || true
docker compose --env-file .env.production config
docker compose --env-file .env.production build
docker stack deploy --compose-file docker-compose.yml aura-template-engine
docker service logs -f aura-template-engine_aura_backend
```

## Roadmap recomendado

1. Transformar `/api/*` em legacy documentado ou remover do roteamento.
2. Criar endpoints persistentes para listar templates, versions, reviews e audit reports.
3. Persistir compile artifacts e submission attempts em banco.
4. Hidratar compiler/submission pelo Prisma.
5. Implementar autenticao e tenant real.
6. Integrar LLMs por adapters, mantendo engines deterministicas como fallback.
7. Criar testes automatizados.
8. Endurecer CORS, logs e secrets.
9. Implementar status polling da Meta.
10. Adicionar workflow completo para request changes e novas versoes.
