CREATE TABLE "public"."categories" ( 
  "id" SERIAL,
  "name" VARCHAR(255) NOT NULL,
  "type" VARCHAR(50) NULL DEFAULT 'item'::character varying ,
  "outlet_id" INTEGER NULL,
  "is_active" BOOLEAN NULL DEFAULT true ,
  "created_at" TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ,
  "updated_at" TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ,
  CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "public"."customers" ( 
  "id" SERIAL,
  "name" VARCHAR(255) NOT NULL,
  "phone" VARCHAR(50) NULL,
  "email" VARCHAR(255) NULL,
  "address" TEXT NULL,
  "date_of_birth" DATE NULL,
  "outlet_id" INTEGER NULL,
  "total_spent" NUMERIC NULL DEFAULT 0 ,
  "total_visits" INTEGER NULL DEFAULT 0 ,
  "last_visit" TIMESTAMP NULL,
  "created_at" TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ,
  "updated_at" TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ,
  CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "public"."discount_usage" ( 
  "id" SERIAL,
  "promotion_id" INTEGER NULL,
  "transaction_id" INTEGER NULL,
  "discount_amount" NUMERIC NOT NULL,
  "created_at" TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ,
  CONSTRAINT "discount_usage_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "public"."employees" ( 
  "id" SERIAL,
  "user_id" INTEGER NOT NULL,
  "outlet_id" INTEGER NOT NULL,
  "employee_code" VARCHAR(50) NULL,
  "pin_code" VARCHAR(6) NULL,
  "position" VARCHAR(100) NULL,
  "salary" NUMERIC NULL,
  "is_active" BOOLEAN NULL DEFAULT true ,
  "hired_at" DATE NULL,
  "created_at" TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ,
  "updated_at" TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ,
  CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "public"."ingredients" ( 
  "id" SERIAL,
  "name" VARCHAR(255) NOT NULL,
  "category_id" INTEGER NULL,
  "unit" VARCHAR(50) NOT NULL,
  "stock" NUMERIC NULL DEFAULT 0 ,
  "min_stock" NUMERIC NULL DEFAULT 0 ,
  "cost_per_unit" NUMERIC NULL DEFAULT 0 ,
  "outlet_id" INTEGER NULL,
  "is_active" BOOLEAN NULL DEFAULT true ,
  "created_at" TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ,
  "updated_at" TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ,
  CONSTRAINT "ingredients_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "public"."item_modifiers" ( 
  "item_id" INTEGER NOT NULL,
  "modifier_id" INTEGER NOT NULL,
  CONSTRAINT "item_modifiers_pkey" PRIMARY KEY ("item_id", "modifier_id")
);
CREATE TABLE "public"."items" ( 
  "id" SERIAL,
  "name" VARCHAR(255) NOT NULL,
  "category_id" INTEGER NULL,
  "price" NUMERIC NOT NULL DEFAULT 0 ,
  "cost" NUMERIC NULL DEFAULT 0 ,
  "image" VARCHAR(500) NULL,
  "description" TEXT NULL,
  "sku" VARCHAR(100) NULL,
  "stock" NUMERIC NULL DEFAULT 0 ,
  "track_stock" BOOLEAN NULL DEFAULT false ,
  "min_stock" NUMERIC NULL DEFAULT 0 ,
  "outlet_id" INTEGER NULL,
  "is_active" BOOLEAN NULL DEFAULT true ,
  "created_at" TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ,
  "updated_at" TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ,
  CONSTRAINT "items_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "public"."modifiers" ( 
  "id" SERIAL,
  "name" VARCHAR(255) NOT NULL,
  "price" NUMERIC NULL DEFAULT 0 ,
  "outlet_id" INTEGER NULL,
  "is_active" BOOLEAN NULL DEFAULT true ,
  "created_at" TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ,
  "updated_at" TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ,
  CONSTRAINT "modifiers_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "public"."outlets" ( 
  "id" SERIAL,
  "tenant_id" INTEGER NULL,
  "name" VARCHAR(255) NOT NULL,
  "address" TEXT NULL,
  "phone" VARCHAR(50) NULL,
  "email" VARCHAR(255) NULL,
  "npwp" VARCHAR(50) NULL,
  "settings" JSONB NULL DEFAULT '{}'::jsonb ,
  "is_active" BOOLEAN NULL DEFAULT true ,
  "created_at" TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ,
  "updated_at" TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ,
  CONSTRAINT "outlets_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "public"."payments" ( 
  "id" SERIAL,
  "transaction_id" INTEGER NOT NULL,
  "method" VARCHAR(50) NOT NULL,
  "amount" NUMERIC NOT NULL,
  "change_amount" NUMERIC NULL DEFAULT 0 ,
  "reference_number" VARCHAR(255) NULL,
  "status" VARCHAR(50) NULL DEFAULT 'completed'::character varying ,
  "created_at" TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ,
  CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "public"."promotions" ( 
  "id" SERIAL,
  "outlet_id" INTEGER NULL,
  "name" VARCHAR(255) NOT NULL,
  "description" TEXT NULL,
  "discount_type" VARCHAR(50) NOT NULL,
  "discount_value" NUMERIC NOT NULL,
  "min_purchase" NUMERIC NULL DEFAULT 0 ,
  "max_discount" NUMERIC NULL,
  "applicable_to" VARCHAR(50) NULL DEFAULT 'all'::character varying ,
  "applicable_ids" JSON NULL,
  "start_date" TIMESTAMP NULL,
  "end_date" TIMESTAMP NULL,
  "usage_limit" INTEGER NULL,
  "usage_count" INTEGER NULL DEFAULT 0 ,
  "is_active" BOOLEAN NULL DEFAULT true ,
  "created_at" TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ,
  "updated_at" TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ,
  CONSTRAINT "promotions_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "public"."roles" ( 
  "id" SERIAL,
  "name" VARCHAR(50) NOT NULL,
  "permissions" JSONB NULL DEFAULT '{}'::jsonb ,
  "created_at" TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ,
  "updated_at" TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ,
  CONSTRAINT "roles_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "roles_name_key" UNIQUE ("name")
);
CREATE TABLE "public"."tables" ( 
  "id" SERIAL,
  "name" VARCHAR(100) NOT NULL,
  "capacity" INTEGER NULL DEFAULT 4 ,
  "status" VARCHAR(50) NULL DEFAULT 'available'::character varying ,
  "outlet_id" INTEGER NULL,
  "is_active" BOOLEAN NULL DEFAULT true ,
  "created_at" TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ,
  "updated_at" TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ,
  CONSTRAINT "tables_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "public"."tenants" ( 
  "id" SERIAL,
  "business_name" VARCHAR(255) NOT NULL,
  "owner_name" VARCHAR(255) NOT NULL,
  "email" VARCHAR(255) NOT NULL,
  "phone" VARCHAR(50) NULL,
  "address" TEXT NULL,
  "subscription_plan" VARCHAR(50) NULL DEFAULT 'basic'::character varying ,
  "subscription_status" VARCHAR(50) NULL DEFAULT 'trial'::character varying ,
  "subscription_starts_at" TIMESTAMP NULL,
  "subscription_expires_at" TIMESTAMP NULL,
  "max_outlets" INTEGER NULL DEFAULT 1 ,
  "max_users" INTEGER NULL DEFAULT 5 ,
  "billing_email" VARCHAR(255) NULL,
  "payment_method" VARCHAR(50) NULL,
  "last_payment_at" TIMESTAMP NULL,
  "next_billing_date" DATE NULL,
  "settings" JSONB NULL DEFAULT '{}'::jsonb ,
  "features" JSONB NULL DEFAULT '{}'::jsonb ,
  "is_active" BOOLEAN NULL DEFAULT true ,
  "created_at" TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ,
  "updated_at" TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ,
  "deleted_at" TIMESTAMP NULL,
  "google_sheet_id" VARCHAR(255) NULL,
  CONSTRAINT "tenants_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "tenants_email_key" UNIQUE ("email")
);
CREATE TABLE "public"."transaction_items" ( 
  "id" SERIAL,
  "transaction_id" INTEGER NOT NULL,
  "item_id" INTEGER NOT NULL,
  "variant_id" INTEGER NULL,
  "item_name" VARCHAR(255) NOT NULL,
  "quantity" NUMERIC NOT NULL,
  "unit_price" NUMERIC NOT NULL,
  "subtotal" NUMERIC NOT NULL,
  "discount_amount" NUMERIC NULL DEFAULT 0 ,
  "notes" TEXT NULL,
  "created_at" TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ,
  CONSTRAINT "transaction_items_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "public"."transaction_modifiers" ( 
  "id" SERIAL,
  "transaction_item_id" INTEGER NOT NULL,
  "modifier_id" INTEGER NOT NULL,
  "modifier_name" VARCHAR(255) NOT NULL,
  "price" NUMERIC NOT NULL,
  CONSTRAINT "transaction_modifiers_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "public"."transactions" ( 
  "id" SERIAL,
  "transaction_number" VARCHAR(100) NOT NULL,
  "order_type" VARCHAR(50) NOT NULL,
  "table_id" INTEGER NULL,
  "customer_name" VARCHAR(255) NULL,
  "customer_phone" VARCHAR(50) NULL,
  "subtotal" NUMERIC NULL DEFAULT 0 ,
  "discount_amount" NUMERIC NULL DEFAULT 0 ,
  "tax_amount" NUMERIC NULL DEFAULT 0 ,
  "service_charge" NUMERIC NULL DEFAULT 0 ,
  "total" NUMERIC NULL DEFAULT 0 ,
  "status" VARCHAR(50) NULL DEFAULT 'pending'::character varying ,
  "notes" TEXT NULL,
  "outlet_id" INTEGER NULL,
  "cashier_id" INTEGER NULL,
  "created_at" TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ,
  "updated_at" TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ,
  "completed_at" TIMESTAMP NULL,
  "promotion_id" INTEGER NULL,
  CONSTRAINT "transactions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "transactions_transaction_number_key" UNIQUE ("transaction_number")
);
CREATE TABLE "public"."users" ( 
  "id" SERIAL,
  "tenant_id" INTEGER NULL,
  "email" VARCHAR(255) NOT NULL,
  "password_hash" VARCHAR(255) NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "role_id" INTEGER NOT NULL,
  "outlet_id" INTEGER NULL,
  "is_active" BOOLEAN NULL DEFAULT true ,
  "last_login" TIMESTAMP NULL,
  "created_at" TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ,
  "updated_at" TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "users_email_key" UNIQUE ("email")
);
CREATE TABLE "public"."variants" ( 
  "id" SERIAL,
  "item_id" INTEGER NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "price_adjust" NUMERIC NULL DEFAULT 0 ,
  "sku" VARCHAR(100) NULL,
  "stock" NUMERIC NULL DEFAULT 0 ,
  "is_active" BOOLEAN NULL DEFAULT true ,
  "created_at" TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ,
  CONSTRAINT "variants_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "idx_customers_phone" 
ON "public"."customers" (
  "phone" ASC
);
CREATE INDEX "idx_customers_email" 
ON "public"."customers" (
  "email" ASC
);
CREATE INDEX "idx_customers_outlet" 
ON "public"."customers" (
  "outlet_id" ASC
);
CREATE INDEX "idx_discount_usage_transaction" 
ON "public"."discount_usage" (
  "transaction_id" ASC
);
CREATE INDEX "idx_discount_usage_promotion" 
ON "public"."discount_usage" (
  "promotion_id" ASC
);
CREATE INDEX "idx_ingredients_outlet" 
ON "public"."ingredients" (
  "outlet_id" ASC
);
CREATE INDEX "idx_items_outlet" 
ON "public"."items" (
  "outlet_id" ASC
);
CREATE INDEX "idx_items_category" 
ON "public"."items" (
  "category_id" ASC
);
CREATE INDEX "idx_items_active" 
ON "public"."items" (
  "is_active" ASC
);
CREATE INDEX "idx_outlets_tenant" 
ON "public"."outlets" (
  "tenant_id" ASC
);
CREATE INDEX "idx_promotions_active" 
ON "public"."promotions" (
  "is_active" ASC
);
CREATE INDEX "idx_promotions_dates" 
ON "public"."promotions" (
  "start_date" ASC,
  "end_date" ASC
);
CREATE INDEX "idx_promotions_outlet" 
ON "public"."promotions" (
  "outlet_id" ASC
);
CREATE INDEX "idx_tenants_email" 
ON "public"."tenants" (
  "email" ASC
);
CREATE INDEX "idx_tenants_status" 
ON "public"."tenants" (
  "subscription_status" ASC
);
CREATE INDEX "idx_tenants_active" 
ON "public"."tenants" (
  "is_active" ASC
);
CREATE INDEX "idx_transaction_items_transaction" 
ON "public"."transaction_items" (
  "transaction_id" ASC
);
CREATE INDEX "idx_transactions_number" 
ON "public"."transactions" (
  "transaction_number" ASC
);
CREATE INDEX "idx_transactions_outlet" 
ON "public"."transactions" (
  "outlet_id" ASC
);
CREATE INDEX "idx_transactions_cashier" 
ON "public"."transactions" (
  "cashier_id" ASC
);
CREATE INDEX "idx_transactions_status" 
ON "public"."transactions" (
  "status" ASC
);
CREATE INDEX "idx_transactions_created" 
ON "public"."transactions" (
  "created_at" ASC
);
CREATE INDEX "idx_users_email" 
ON "public"."users" (
  "email" ASC
);
CREATE INDEX "idx_users_outlet" 
ON "public"."users" (
  "outlet_id" ASC
);
CREATE INDEX "idx_users_tenant" 
ON "public"."users" (
  "tenant_id" ASC
);
ALTER TABLE "public"."categories" ADD CONSTRAINT "categories_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "public"."customers" ADD CONSTRAINT "customers_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "public"."discount_usage" ADD CONSTRAINT "discount_usage_promotion_id_fkey" FOREIGN KEY ("promotion_id") REFERENCES "public"."promotions" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "public"."discount_usage" ADD CONSTRAINT "discount_usage_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "public"."employees" ADD CONSTRAINT "employees_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "public"."employees" ADD CONSTRAINT "employees_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "public"."ingredients" ADD CONSTRAINT "ingredients_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "public"."ingredients" ADD CONSTRAINT "ingredients_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "public"."item_modifiers" ADD CONSTRAINT "item_modifiers_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."items" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "public"."item_modifiers" ADD CONSTRAINT "item_modifiers_modifier_id_fkey" FOREIGN KEY ("modifier_id") REFERENCES "public"."modifiers" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "public"."items" ADD CONSTRAINT "items_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "public"."items" ADD CONSTRAINT "items_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "public"."modifiers" ADD CONSTRAINT "modifiers_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "public"."outlets" ADD CONSTRAINT "outlets_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "public"."payments" ADD CONSTRAINT "payments_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "public"."promotions" ADD CONSTRAINT "promotions_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "public"."tables" ADD CONSTRAINT "tables_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "public"."transaction_items" ADD CONSTRAINT "transaction_items_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "public"."transaction_items" ADD CONSTRAINT "transaction_items_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."items" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "public"."transaction_items" ADD CONSTRAINT "transaction_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."variants" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "public"."transaction_modifiers" ADD CONSTRAINT "transaction_modifiers_transaction_item_id_fkey" FOREIGN KEY ("transaction_item_id") REFERENCES "public"."transaction_items" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "public"."transaction_modifiers" ADD CONSTRAINT "transaction_modifiers_modifier_id_fkey" FOREIGN KEY ("modifier_id") REFERENCES "public"."modifiers" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_table_id_fkey" FOREIGN KEY ("table_id") REFERENCES "public"."tables" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_cashier_id_fkey" FOREIGN KEY ("cashier_id") REFERENCES "public"."users" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_promotion_id_fkey" FOREIGN KEY ("promotion_id") REFERENCES "public"."promotions" ("id") ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE "public"."users" ADD CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "public"."users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "public"."users" ADD CONSTRAINT "users_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "public"."variants" ADD CONSTRAINT "variants_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."items" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;
CREATE FUNCTION "public"."update_updated_at"() RETURNS TRIGGER LANGUAGE PLPGSQL
AS
$$

BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;

$$;
