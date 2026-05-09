CREATE SCHEMA IF NOT EXISTS "template_engine";

CREATE TABLE "template_engine"."templates" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "source_prompt" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "current_version_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "templates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "template_engine"."template_versions" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "template_id" UUID NOT NULL,
    "version_number" INTEGER NOT NULL,
    "source_prompt" TEXT NOT NULL,
    "campaign_intent" JSONB NOT NULL,
    "communication_strategy" JSONB NOT NULL,
    "template_components" JSONB NOT NULL,
    "variants" JSONB NOT NULL DEFAULT '[]',
    "approval_state" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'GENERATED',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "template_versions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "template_engine"."review_sessions" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "template_id" UUID NOT NULL,
    "template_version_id" UUID NOT NULL,
    "status" TEXT NOT NULL,
    "snapshot_hash" TEXT,
    "snapshot_version" INTEGER,
    "snapshot_payload" JSONB,
    "approval_state" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "review_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "template_engine"."policy_reviews" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "template_version_id" UUID NOT NULL,
    "status" TEXT NOT NULL,
    "approved" BOOLEAN NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "risk" JSONB NOT NULL,
    "category_prediction" JSONB NOT NULL,
    "violations" JSONB NOT NULL DEFAULT '[]',
    "warnings" JSONB NOT NULL DEFAULT '[]',
    "suggestions" JSONB NOT NULL DEFAULT '[]',
    "raw_payload" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "policy_reviews_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "template_engine"."audit_reports" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "template_version_id" UUID NOT NULL,
    "status" TEXT NOT NULL,
    "risk_level" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "blocking_issues" JSONB NOT NULL DEFAULT '[]',
    "warnings" JSONB NOT NULL DEFAULT '[]',
    "recommended_actions" JSONB NOT NULL DEFAULT '[]',
    "checklist" JSONB NOT NULL DEFAULT '[]',
    "submission_gate" JSONB NOT NULL,
    "raw_payload" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "audit_reports_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "templates_current_version_id_key" ON "template_engine"."templates"("current_version_id");
CREATE INDEX "templates_tenant_id_idx" ON "template_engine"."templates"("tenant_id");
CREATE INDEX "templates_tenant_id_status_idx" ON "template_engine"."templates"("tenant_id", "status");

CREATE UNIQUE INDEX "template_versions_template_id_version_number_key" ON "template_engine"."template_versions"("template_id", "version_number");
CREATE INDEX "template_versions_tenant_id_idx" ON "template_engine"."template_versions"("tenant_id");
CREATE INDEX "template_versions_tenant_id_template_id_idx" ON "template_engine"."template_versions"("tenant_id", "template_id");

CREATE INDEX "review_sessions_tenant_id_idx" ON "template_engine"."review_sessions"("tenant_id");
CREATE INDEX "review_sessions_tenant_id_template_id_idx" ON "template_engine"."review_sessions"("tenant_id", "template_id");
CREATE INDEX "review_sessions_tenant_id_template_version_id_idx" ON "template_engine"."review_sessions"("tenant_id", "template_version_id");

CREATE UNIQUE INDEX "policy_reviews_template_version_id_key" ON "template_engine"."policy_reviews"("template_version_id");
CREATE INDEX "policy_reviews_tenant_id_idx" ON "template_engine"."policy_reviews"("tenant_id");
CREATE INDEX "policy_reviews_tenant_id_status_idx" ON "template_engine"."policy_reviews"("tenant_id", "status");

CREATE UNIQUE INDEX "audit_reports_template_version_id_key" ON "template_engine"."audit_reports"("template_version_id");
CREATE INDEX "audit_reports_tenant_id_idx" ON "template_engine"."audit_reports"("tenant_id");
CREATE INDEX "audit_reports_tenant_id_status_idx" ON "template_engine"."audit_reports"("tenant_id", "status");

ALTER TABLE "template_engine"."template_versions"
ADD CONSTRAINT "template_versions_template_id_fkey"
FOREIGN KEY ("template_id") REFERENCES "template_engine"."templates"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "template_engine"."templates"
ADD CONSTRAINT "templates_current_version_id_fkey"
FOREIGN KEY ("current_version_id") REFERENCES "template_engine"."template_versions"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "template_engine"."review_sessions"
ADD CONSTRAINT "review_sessions_template_version_id_fkey"
FOREIGN KEY ("template_version_id") REFERENCES "template_engine"."template_versions"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "template_engine"."policy_reviews"
ADD CONSTRAINT "policy_reviews_template_version_id_fkey"
FOREIGN KEY ("template_version_id") REFERENCES "template_engine"."template_versions"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "template_engine"."audit_reports"
ADD CONSTRAINT "audit_reports_template_version_id_fkey"
FOREIGN KEY ("template_version_id") REFERENCES "template_engine"."template_versions"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
