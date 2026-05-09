# Supabase Cloud Deployment

Este projeto usa duas conexões Prisma:

- `DATABASE_URL`: runtime via Supabase Transaction Pooler/PgBouncer, porta `6543`.
- `DIRECT_URL`: migrations via Supabase Session Pooler, porta `5432`.

As duas URLs usam o host `aws-1-sa-east-1.pooler.supabase.com`, que é compatível com IPv4. Caracteres especiais da senha devem estar URL-encoded. Exemplo: `#` vira `%23`.

## Variáveis

Crie um `.env.production` na VPS a partir de `.env.production.example`:

```bash
AURA_BACKEND_TAG=latest
AURA_BACKEND_PORT=3001
AURA_BACKEND_REPLICAS=1
DATABASE_URL='postgresql://postgres.PROJECT_REF:PASSWORD@aws-1-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&connect_timeout=15&pool_timeout=15&sslmode=require'
DIRECT_URL='postgresql://postgres.PROJECT_REF:PASSWORD@aws-1-sa-east-1.pooler.supabase.com:5432/postgres?sslmode=require'
TEMPLATE_ENGINE_DEFAULT_TENANT_ID=00000000-0000-0000-0000-000000000001
```

## Validação local/VPS

```bash
cd backend
npm ci
npm run prisma:generate
npm run build
npm run prisma:migrate
npm run prisma:validate-cloud
cd ..
docker compose --env-file .env.production config
docker compose --env-file .env.production build
docker compose --env-file .env.production up -d
```

## Deploy limpo em Docker Swarm

```bash
docker network create --driver overlay --attachable MaternaNet || true
docker compose --env-file .env.production build
docker compose --env-file .env.production config
docker stack deploy --compose-file docker-compose.yml aura-template-engine
docker service ls
docker service logs -f aura-template-engine_aura_backend
```

Antes do deploy, aplique as migrations fora do container de runtime:

```bash
cd backend
npm ci
npm run prisma:generate
npm run prisma:migrate
npm run prisma:validate-cloud
```
