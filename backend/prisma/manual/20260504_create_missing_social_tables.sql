BEGIN;

CREATE TABLE IF NOT EXISTS "public"."social_accounts" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "platform" VARCHAR(50) NOT NULL,
    "account_name" VARCHAR(100) NOT NULL,
    "account_id" VARCHAR(100) NOT NULL,
    "access_token" TEXT,
    "refresh_token" TEXT,
    "token_expires" TIMESTAMP(6),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB DEFAULT '{}'::jsonb,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "social_accounts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."social_posts" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "account_id" INTEGER,
    "content" TEXT,
    "media_urls" JSONB DEFAULT '[]'::jsonb,
    "platform" VARCHAR(50) NOT NULL,
    "scheduled_at" TIMESTAMP(6),
    "published_at" TIMESTAMP(6),
    "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
    "external_id" VARCHAR(255),
    "error_message" TEXT,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "social_posts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."social_analytics" (
    "id" SERIAL NOT NULL,
    "post_id" INTEGER NOT NULL,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "reach" INTEGER NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "comments" INTEGER NOT NULL DEFAULT 0,
    "shares" INTEGER NOT NULL DEFAULT 0,
    "saves" INTEGER NOT NULL DEFAULT 0,
    "engagement_rate" DECIMAL(5,2),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "social_analytics_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "social_accounts_tenant_id_platform_account_id_key"
  ON "public"."social_accounts"("tenant_id", "platform", "account_id");

CREATE INDEX IF NOT EXISTS "idx_social_posts_tenant"
  ON "public"."social_posts"("tenant_id");

CREATE INDEX IF NOT EXISTS "idx_social_posts_status"
  ON "public"."social_posts"("status");

CREATE INDEX IF NOT EXISTS "idx_social_posts_schedule"
  ON "public"."social_posts"("scheduled_at");

CREATE UNIQUE INDEX IF NOT EXISTS "social_analytics_post_id_key"
  ON "public"."social_analytics"("post_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'social_accounts_tenant_id_fkey'
  ) THEN
    ALTER TABLE "public"."social_accounts"
      ADD CONSTRAINT "social_accounts_tenant_id_fkey"
      FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'social_posts_tenant_id_fkey'
  ) THEN
    ALTER TABLE "public"."social_posts"
      ADD CONSTRAINT "social_posts_tenant_id_fkey"
      FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'social_posts_account_id_fkey'
  ) THEN
    ALTER TABLE "public"."social_posts"
      ADD CONSTRAINT "social_posts_account_id_fkey"
      FOREIGN KEY ("account_id") REFERENCES "public"."social_accounts"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'social_posts_created_by_fkey'
  ) THEN
    ALTER TABLE "public"."social_posts"
      ADD CONSTRAINT "social_posts_created_by_fkey"
      FOREIGN KEY ("created_by") REFERENCES "public"."users"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'social_analytics_post_id_fkey'
  ) THEN
    ALTER TABLE "public"."social_analytics"
      ADD CONSTRAINT "social_analytics_post_id_fkey"
      FOREIGN KEY ("post_id") REFERENCES "public"."social_posts"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

COMMIT;
