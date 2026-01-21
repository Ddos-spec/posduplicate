-- Add item_id to stock_movements
ALTER TABLE "public"."stock_movements" ADD COLUMN "item_id" INTEGER;
ALTER TABLE "public"."stock_movements"
  ADD CONSTRAINT "fk_stock_movements_item"
  FOREIGN KEY ("item_id") REFERENCES "public"."items"("id")
  ON DELETE CASCADE ON UPDATE NO ACTION;
CREATE INDEX "idx_stock_movements_item" ON "public"."stock_movements"("item_id");

-- Add external_id to social_posts
ALTER TABLE "public"."social_posts" ADD COLUMN "external_id" VARCHAR(255);

-- Extend social_analytics schema
ALTER TABLE "public"."social_analytics" ADD COLUMN "impressions" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "public"."social_analytics" ADD COLUMN "reach" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "public"."social_analytics" ADD COLUMN "likes" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "public"."social_analytics" ADD COLUMN "comments" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "public"."social_analytics" ADD COLUMN "shares" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "public"."social_analytics" ADD COLUMN "saves" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "public"."social_analytics" ADD COLUMN "engagement_rate" DECIMAL(5,2);
ALTER TABLE "public"."social_analytics" ADD COLUMN "created_at" TIMESTAMP(6) NOT NULL DEFAULT NOW();
ALTER TABLE "public"."social_analytics" ADD COLUMN "updated_at" TIMESTAMP(6) NOT NULL DEFAULT NOW();

-- Migrate existing values
UPDATE "public"."social_analytics"
SET impressions = COALESCE(reach_count, 0),
    reach = COALESCE(reach_count, 0),
    likes = COALESCE(likes_count, 0),
    comments = COALESCE(comments_count, 0),
    shares = COALESCE(shares_count, 0),
    updated_at = COALESCE(last_updated, NOW()),
    created_at = COALESCE(last_updated, NOW());

-- Drop legacy columns
ALTER TABLE "public"."social_analytics" DROP COLUMN "likes_count";
ALTER TABLE "public"."social_analytics" DROP COLUMN "comments_count";
ALTER TABLE "public"."social_analytics" DROP COLUMN "shares_count";
ALTER TABLE "public"."social_analytics" DROP COLUMN "reach_count";
ALTER TABLE "public"."social_analytics" DROP COLUMN "last_updated";
