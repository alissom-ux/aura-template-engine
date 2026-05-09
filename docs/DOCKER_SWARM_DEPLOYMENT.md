# Aura Template Engine Backend - Docker Swarm Deployment

This deploys only the Fastify + Prisma backend against Supabase Cloud. The old self-hosted Supabase database must not be used.

## Supabase Cloud Connections

Use only the Supabase Cloud pooler host for IPv4 compatibility:

- Runtime: Transaction/Shared Pooler on port `6543`, exposed as `DATABASE_URL`.
- Migrations: Session Pooler on port `5432`, exposed as `DIRECT_URL`.

Do not use Supabase Direct Connection URLs because they may be IPv6-only. Do not create schemas or tables manually in Supabase; Prisma migrations create the `template_engine` schema and all database objects.

## Required Environment

Create `.env.production` from `.env.production.example` and fill the real credentials:

```bash
AURA_BACKEND_TAG=latest
AURA_BACKEND_PORT=3001
AURA_BACKEND_REPLICAS=1
DATABASE_URL='postgresql://postgres.PROJECT_REF:PASSWORD@aws-1-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&connect_timeout=15&pool_timeout=15&sslmode=require'
DIRECT_URL='postgresql://postgres.PROJECT_REF:PASSWORD@aws-1-sa-east-1.pooler.supabase.com:5432/postgres?sslmode=require'
TEMPLATE_ENGINE_DEFAULT_TENANT_ID=00000000-0000-0000-0000-000000000001
```

Encode special characters in the password. For example, `#` must be `%23`.

## Database Migrations

Run migrations as a controlled release step before scaling replicas:

```bash
cd backend
npm ci
npm run prisma:generate
npm run prisma:migrate
npm run prisma:validate-cloud
cd ..
```

`npm run prisma:validate-cloud` confirms the `template_engine` schema, tables, indexes, foreign keys, and Prisma migration history.

## Deploy With Docker Swarm

```bash
docker network create --driver overlay --attachable MaternaNet || true
docker compose --env-file .env.production build
docker compose --env-file .env.production config
docker stack deploy --compose-file docker-compose.yml aura-template-engine
```

Check:

```bash
docker stack services aura-template-engine
docker service ps aura-template-engine_aura_backend
docker service logs -f aura-template-engine_aura_backend
```

Rollback:

```bash
docker service rollback aura-template-engine_aura_backend
```

Remove:

```bash
docker stack rm aura-template-engine
```

## Portainer Stack Instructions

1. Build the backend image from the repository stack or provide an image tagged as `aura-template-backend:${AURA_BACKEND_TAG}`.
2. In Portainer, go to **Stacks** -> **Add stack**.
3. Name the stack `aura-template-engine`.
4. Use the repository `docker-compose.yml`.
5. Add `DATABASE_URL`, `DIRECT_URL`, `AURA_BACKEND_TAG`, `AURA_BACKEND_PORT`, `AURA_BACKEND_REPLICAS`, and `TEMPLATE_ENGINE_DEFAULT_TENANT_ID` as protected environment variables.
6. Deploy the stack.
7. Open service logs and confirm the Fastify server started on port `3001`.
8. Test `/health` and `/health/db`.

## Production Notes

- Keep `DATABASE_URL` and `DIRECT_URL` as protected environment variables or secrets. Do not commit real credentials.
- Runtime must use `DATABASE_URL` through PgBouncer on port `6543`.
- Prisma migrations must use `DIRECT_URL` through the Session Pooler on port `5432`.
- Start with one replica until migrations and operational flows are confirmed.
- The compose file uses restart policy, rolling updates, resource limits, healthcheck, and JSON log rotation.
- The image runs as a non-root `aura` user.
