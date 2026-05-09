# Aura Template Engine Backend - Docker Swarm Deployment

This deploys only the Fastify + Prisma backend. It does not change frontend, endpoints, pipeline logic, compiler, or submission behavior.

## Production Image

Build from the backend context:

```bash
docker build -t your-registry/aura-template-engine-backend:VERSION ./backend
docker push your-registry/aura-template-engine-backend:VERSION
```

The Dockerfile uses Node 20 Alpine, generates Prisma Client during build, compiles TypeScript, prunes dev dependencies, exposes port `3001`, and includes a `/health` healthcheck.

## Required Runtime Environment

The backend expects:

```bash
DATABASE_URL=postgresql://supabase_admin:PASSWORD@supabase_db:5432/postgres
PORT=3001
```

Optional:

```bash
TEMPLATE_ENGINE_DEFAULT_TENANT_ID=00000000-0000-0000-0000-000000000001
AURA_BACKEND_REPLICAS=1
AURA_BACKEND_PORT=3001
SUPABASE_NETWORK=supabase_network
```

`supabase_db:5432` must be resolvable from the Aura backend container. Attach the backend service to the same external overlay network used by the Supabase stack.

## Create Or Verify The Supabase Overlay Network

If the Supabase stack already created an attachable overlay network, reuse its exact name:

```bash
docker network ls
```

If you need to create one:

```bash
docker network create --driver overlay --attachable supabase_network
```

The stack file uses:

```yaml
networks:
  supabase:
    external: true
    name: ${SUPABASE_NETWORK:-supabase_network}
```

## Database Migrations

Run migrations as a one-off task before or during release. Do not run migrations automatically in every replicated backend container.

Example:

```bash
docker run --rm \
  --network supabase_network \
  -e DATABASE_URL="postgresql://supabase_admin:PASSWORD@supabase_db:5432/postgres" \
  your-registry/aura-template-engine-backend:VERSION \
  npm run prisma:migrate
```

Healthcheck after migration:

```bash
curl http://HOST:3001/health
curl http://HOST:3001/health/db
```

## Deploy With Docker Swarm

Export variables:

```bash
export AURA_BACKEND_IMAGE=your-registry/aura-template-engine-backend:VERSION
export DATABASE_URL='postgresql://supabase_admin:PASSWORD@supabase_db:5432/postgres'
export SUPABASE_NETWORK=supabase_network
export AURA_BACKEND_PORT=3001
export AURA_BACKEND_REPLICAS=1
```

Deploy:

```bash
docker stack deploy -c docker-compose.yml aura
```

Check:

```bash
docker stack services aura
docker service ps aura_aura_backend
docker service logs -f aura_aura_backend
```

Update:

```bash
docker build -t your-registry/aura-template-engine-backend:NEW_VERSION ./backend
docker push your-registry/aura-template-engine-backend:NEW_VERSION
export AURA_BACKEND_IMAGE=your-registry/aura-template-engine-backend:NEW_VERSION
docker stack deploy -c docker-compose.yml aura
```

Rollback:

```bash
docker service rollback aura_aura_backend
```

Remove:

```bash
docker stack rm aura
```

## Portainer Stack Instructions

1. Build and push the backend image to a registry accessible by the Swarm nodes.
2. In Portainer, go to **Stacks** -> **Add stack**.
3. Name the stack, for example `aura`.
4. Paste the repository `docker-compose.yml` contents or use Git repository deployment.
5. Add environment variables in Portainer:

```text
AURA_BACKEND_IMAGE=your-registry/aura-template-engine-backend:VERSION
DATABASE_URL=postgresql://supabase_admin:PASSWORD@supabase_db:5432/postgres
SUPABASE_NETWORK=supabase_network
AURA_BACKEND_PORT=3001
AURA_BACKEND_REPLICAS=1
TEMPLATE_ENGINE_DEFAULT_TENANT_ID=00000000-0000-0000-0000-000000000001
```

6. Deploy the stack.
7. Open the service logs and confirm the Fastify server started on port `3001`.
8. Test `/health` and `/health/db`.

## Production Notes

- Keep `DATABASE_URL` as a Swarm/Portainer secret or protected environment variable. Do not commit real credentials.
- The backend connects internally to `supabase_db:5432`; no public database port is required.
- Run Prisma migrations as a controlled one-off task before scaling replicas.
- Start with one replica until DB migrations and idempotent operational flows are settled.
- The compose file uses restart policy, rolling updates, resource limits, healthcheck, and JSON log rotation.
- The image runs as a non-root `aura` user.
- The backend healthcheck uses `GET /health`; DB readiness is available at `GET /health/db`.
