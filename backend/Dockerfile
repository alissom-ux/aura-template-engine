# syntax=docker/dockerfile:1.7

FROM node:20-alpine AS deps

WORKDIR /app

RUN apk add --no-cache libc6-compat openssl

COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS build

WORKDIR /app

COPY tsconfig.json ./
COPY prisma ./prisma
COPY src ./src

# Prisma generate does not need the production database, but the schema references both URLs.
ENV DATABASE_URL="postgresql://postgres.PROJECT_REF:PASSWORD@aws-1-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require"
ENV DIRECT_URL="postgresql://postgres.PROJECT_REF:PASSWORD@aws-1-sa-east-1.pooler.supabase.com:5432/postgres?sslmode=require"

RUN npm run prisma:generate
RUN npm run build
RUN npm prune --omit=dev

FROM node:20-alpine AS runner

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3001

WORKDIR /app

RUN apk add --no-cache libc6-compat openssl \
  && addgroup -S aura \
  && adduser -S aura -G aura

COPY --from=build --chown=aura:aura /app/package.json /app/package-lock.json ./
COPY --from=build --chown=aura:aura /app/node_modules ./node_modules
COPY --from=build --chown=aura:aura /app/dist ./dist
COPY --from=build --chown=aura:aura /app/prisma ./prisma

USER aura

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "const port=process.env.PORT||3001; fetch('http://127.0.0.1:'+port+'/health').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/server.js"]
