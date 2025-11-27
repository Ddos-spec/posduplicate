-- CreateTable
CREATE TABLE "integrations" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "integration_type" VARCHAR(50) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'inactive',
    "configuration" JSONB DEFAULT '{}',
    "credentials" JSONB DEFAULT '{}',
    "metadata" JSONB DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "activated_at" TIMESTAMP(6),
    "last_sync_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "integrations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_integrations_tenant" ON "integrations"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_integrations_type" ON "integrations"("integration_type");

-- CreateIndex
CREATE INDEX "idx_integrations_status" ON "integrations"("status");

-- CreateIndex
CREATE UNIQUE INDEX "unique_tenant_integration" ON "integrations"("tenant_id", "integration_type");

-- AddForeignKey
ALTER TABLE "integrations" ADD CONSTRAINT "integrations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
