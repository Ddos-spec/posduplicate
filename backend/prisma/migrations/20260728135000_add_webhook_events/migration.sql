CREATE TABLE "public"."webhook_events" (
    "id" SERIAL NOT NULL,
    "idempotency_key" VARCHAR(255) NOT NULL,
    "integration_type" VARCHAR(50) NOT NULL,
    "tenant_id" INTEGER,
    "external_id" VARCHAR(255) NOT NULL,
    "event_status" VARCHAR(20) NOT NULL DEFAULT 'processing',
    "response_payload" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),
    "expires_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "webhook_events_idempotency_key_key"
    ON "public"."webhook_events"("idempotency_key");

CREATE INDEX "idx_webhook_events_tenant_type"
    ON "public"."webhook_events"("tenant_id", "integration_type");

CREATE INDEX "idx_webhook_events_expires"
    ON "public"."webhook_events"("expires_at");
