ALTER TABLE "template_engine"."review_sessions"
ADD COLUMN IF NOT EXISTS "execution_id" UUID,
ADD COLUMN IF NOT EXISTS "reviewer" JSONB,
ADD COLUMN IF NOT EXISTS "comment" TEXT,
ADD COLUMN IF NOT EXISTS "decisions_payload" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN IF NOT EXISTS "history_payload" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN IF NOT EXISTS "decision_trace" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN IF NOT EXISTS "artifacts" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN IF NOT EXISTS "review_result" JSONB,
ADD COLUMN IF NOT EXISTS "approval_token" TEXT,
ADD COLUMN IF NOT EXISTS "decided_at" TIMESTAMPTZ(6);

CREATE TABLE IF NOT EXISTS "template_engine"."review_approval_decisions" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "review_session_id" UUID NOT NULL,
    "template_id" UUID NOT NULL,
    "template_version_id" UUID NOT NULL,
    "snapshot_id" UUID NOT NULL,
    "decision" TEXT NOT NULL,
    "reviewer" JSONB NOT NULL,
    "comment" TEXT,
    "approval_token" TEXT,
    "raw_payload" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_approval_decisions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "template_engine"."review_history_events" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "review_session_id" UUID NOT NULL,
    "template_id" UUID NOT NULL,
    "template_version_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "raw_payload" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_history_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "review_approval_decisions_tenant_id_idx" ON "template_engine"."review_approval_decisions"("tenant_id");
CREATE INDEX IF NOT EXISTS "review_approval_decisions_tenant_id_review_session_id_idx" ON "template_engine"."review_approval_decisions"("tenant_id", "review_session_id");
CREATE INDEX IF NOT EXISTS "review_approval_decisions_tenant_id_template_id_idx" ON "template_engine"."review_approval_decisions"("tenant_id", "template_id");

CREATE INDEX IF NOT EXISTS "review_history_events_tenant_id_idx" ON "template_engine"."review_history_events"("tenant_id");
CREATE INDEX IF NOT EXISTS "review_history_events_tenant_id_review_session_id_idx" ON "template_engine"."review_history_events"("tenant_id", "review_session_id");
CREATE INDEX IF NOT EXISTS "review_history_events_tenant_id_type_idx" ON "template_engine"."review_history_events"("tenant_id", "type");

ALTER TABLE "template_engine"."review_approval_decisions"
DROP CONSTRAINT IF EXISTS "review_approval_decisions_review_session_id_fkey";

ALTER TABLE "template_engine"."review_approval_decisions"
ADD CONSTRAINT "review_approval_decisions_review_session_id_fkey"
FOREIGN KEY ("review_session_id") REFERENCES "template_engine"."review_sessions"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "template_engine"."review_history_events"
DROP CONSTRAINT IF EXISTS "review_history_events_review_session_id_fkey";

ALTER TABLE "template_engine"."review_history_events"
ADD CONSTRAINT "review_history_events_review_session_id_fkey"
FOREIGN KEY ("review_session_id") REFERENCES "template_engine"."review_sessions"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
