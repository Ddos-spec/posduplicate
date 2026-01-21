CREATE TABLE "public"."roles" ( 
  "id" SERIAL,
  "name" VARCHAR(50) NOT NULL,
  "permissions" JSONB NULL DEFAULT '{}'::jsonb ,
  "created_at" TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ,
  "updated_at" TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ,
  CONSTRAINT "roles_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "roles_name_key" UNIQUE ("name")
);
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
CREATE TABLE "public"."item_modifiers" ( 
  "item_id" INTEGER NOT NULL,
  "modifier_id" INTEGER NOT NULL,
  CONSTRAINT "item_modifiers_pkey" PRIMARY KEY ("item_id", "modifier_id")
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
  "invited_by" INTEGER NULL,
  "invitation_token" VARCHAR(255) NULL,
  "first_login" BOOLEAN NULL DEFAULT true ,
  "dashboard_preferences" JSONB NULL DEFAULT '{}'::jsonb ,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "users_email_key" UNIQUE ("email"),
  CONSTRAINT "users_invitation_token_key" UNIQUE ("invitation_token")
);
CREATE TABLE "public"."transaction_modifiers" ( 
  "id" SERIAL,
  "transaction_item_id" INTEGER NOT NULL,
  "modifier_id" INTEGER NOT NULL,
  "modifier_name" VARCHAR(255) NOT NULL,
  "price" NUMERIC NOT NULL,
  CONSTRAINT "transaction_modifiers_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "public"."discount_usage" ( 
  "id" SERIAL,
  "promotion_id" INTEGER NULL,
  "transaction_id" INTEGER NULL,
  "discount_amount" NUMERIC NOT NULL,
  "created_at" TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ,
  CONSTRAINT "discount_usage_pkey" PRIMARY KEY ("id")
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
  "price_gofood" NUMERIC NULL,
  "price_grabfood" NUMERIC NULL,
  "price_shopeefood" NUMERIC NULL,
  CONSTRAINT "items_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "public"."activity_logs" ( 
  "id" SERIAL,
  "user_id" INTEGER NOT NULL,
  "outlet_id" INTEGER NULL,
  "action_type" VARCHAR(100) NOT NULL,
  "entity_type" VARCHAR(100) NOT NULL,
  "entity_id" INTEGER NULL,
  "old_value" JSON NULL,
  "new_value" JSON NULL,
  "reason" TEXT NULL,
  "created_at" TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ,
  CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "public"."sales_transactions" ( 
  "id" SERIAL,
  "outlet" VARCHAR(255) NOT NULL,
  "receipt_number" VARCHAR(100) NOT NULL,
  "date" TIMESTAMP NOT NULL,
  "time" VARCHAR(20) NOT NULL,
  "category" VARCHAR(100) NOT NULL,
  "brand" VARCHAR(100) NOT NULL DEFAULT 'Unbranded'::character varying ,
  "item_name" VARCHAR(255) NOT NULL,
  "variant" VARCHAR(100) NULL,
  "sku" VARCHAR(100) NULL,
  "quantity" INTEGER NOT NULL,
  "gross_sales" NUMERIC NOT NULL,
  "discounts" NUMERIC NOT NULL DEFAULT 0 ,
  "refunds" NUMERIC NOT NULL DEFAULT 0 ,
  "net_sales" NUMERIC NOT NULL,
  "tax" NUMERIC NOT NULL DEFAULT 0 ,
  "gratuity" NUMERIC NOT NULL DEFAULT 0 ,
  "sales_type" VARCHAR(50) NOT NULL,
  "payment_method" VARCHAR(50) NOT NULL,
  "served_by" VARCHAR(255) NOT NULL,
  "collected_by" VARCHAR(255) NOT NULL,
  "outlet_id" INTEGER NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT now() ,
  "updated_at" TIMESTAMP NOT NULL DEFAULT now() ,
  CONSTRAINT "sales_transactions_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "public"."_prisma_migrations" ( 
  "id" VARCHAR(36) NOT NULL,
  "checksum" VARCHAR(64) NOT NULL,
  "finished_at" TIMESTAMP WITH TIME ZONE NULL,
  "migration_name" VARCHAR(255) NOT NULL,
  "logs" TEXT NULL,
  "rolled_back_at" TIMESTAMP WITH TIME ZONE NULL,
  "started_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now() ,
  "applied_steps_count" INTEGER NOT NULL DEFAULT 0 ,
  CONSTRAINT "_prisma_migrations_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "public"."api_keys" ( 
  "id" SERIAL,
  "tenant_id" INTEGER NOT NULL,
  "key_name" VARCHAR(255) NOT NULL,
  "api_key" VARCHAR(255) NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true ,
  "last_used" TIMESTAMP NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ,
  "expires_at" TIMESTAMP NULL,
  CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "public"."inventory" (
  "id" SERIAL,
  "name" VARCHAR(255) NOT NULL,
  "sku" VARCHAR(100) NULL,
  "category" VARCHAR(100) NOT NULL,
  "unit" VARCHAR(50) NOT NULL,
  "current_stock" NUMERIC NOT NULL DEFAULT 0,
  "min_stock" NUMERIC NOT NULL DEFAULT 0,
  "alert" BOOLEAN NOT NULL DEFAULT false,
  "stock_alert" NUMERIC NOT NULL DEFAULT 0,
  "track_cost" BOOLEAN NOT NULL DEFAULT false,
  "cost_amount" NUMERIC NOT NULL DEFAULT 0,
  "outlet_id" INTEGER NULL,
  "supplier_id" INTEGER NULL,
  "business_type" VARCHAR(20) NOT NULL DEFAULT 'fnb',
  "days_cover" NUMERIC NULL DEFAULT 0,
  "source" VARCHAR(50) NULL,
  "batch_no" VARCHAR(100) NULL,
  "expiry_date" DATE NULL,
  "variant" VARCHAR(255) NULL,
  "barcode" VARCHAR(100) NULL,
  "last_restock_date" TIMESTAMP NULL,
  "avg_daily_usage" NUMERIC NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "inventory_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "inventory_business_type_check" CHECK (business_type IN ('fnb', 'pharmacy', 'retail'))
);
CREATE TABLE "public"."purchase_orders" (
  "id" SERIAL,
  "outlet_id" INTEGER NOT NULL,
  "po_number" VARCHAR(100) NOT NULL,
  "supplier_id" INTEGER NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
  "order_date" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expected_date" DATE NULL,
  "received_date" TIMESTAMP NULL,
  "subtotal" NUMERIC NOT NULL DEFAULT 0,
  "tax_amount" NUMERIC NOT NULL DEFAULT 0,
  "discount_amount" NUMERIC NOT NULL DEFAULT 0,
  "total" NUMERIC NOT NULL DEFAULT 0,
  "notes" TEXT NULL,
  "created_by" INTEGER NOT NULL,
  "approved_by" INTEGER NULL,
  "approved_at" TIMESTAMP NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "purchase_orders_po_number_key" UNIQUE ("po_number"),
  CONSTRAINT "po_status_check" CHECK (status IN ('draft', 'pending', 'approved', 'ordered', 'partial', 'received', 'cancelled'))
);
CREATE TABLE "public"."purchase_order_items" (
  "id" SERIAL,
  "po_id" INTEGER NOT NULL,
  "inventory_id" INTEGER NOT NULL,
  "quantity" NUMERIC NOT NULL,
  "unit" VARCHAR(50) NOT NULL,
  "unit_price" NUMERIC NOT NULL DEFAULT 0,
  "subtotal" NUMERIC NOT NULL DEFAULT 0,
  "received_qty" NUMERIC NOT NULL DEFAULT 0,
  "notes" TEXT NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "purchase_order_items_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "public"."inventory_settings" (
  "id" SERIAL,
  "outlet_id" INTEGER NOT NULL,
  "business_type" VARCHAR(20) NOT NULL DEFAULT 'fnb',
  "low_stock_threshold_days" INTEGER NOT NULL DEFAULT 3,
  "auto_reorder_enabled" BOOLEAN NOT NULL DEFAULT false,
  "reorder_lead_days" INTEGER NOT NULL DEFAULT 2,
  "track_expiry" BOOLEAN NOT NULL DEFAULT false,
  "expiry_warning_days" INTEGER NOT NULL DEFAULT 30,
  "track_batch" BOOLEAN NOT NULL DEFAULT false,
  "settings" JSONB NULL DEFAULT '{}'::jsonb,
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "inventory_settings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "inventory_settings_outlet_unique" UNIQUE ("outlet_id")
);
CREATE TABLE "public"."inventory_alerts" (
  "id" SERIAL,
  "outlet_id" INTEGER NOT NULL,
  "inventory_id" INTEGER NOT NULL,
  "alert_type" VARCHAR(50) NOT NULL,
  "severity" VARCHAR(20) NOT NULL DEFAULT 'warning',
  "message" TEXT NOT NULL,
  "is_read" BOOLEAN NOT NULL DEFAULT false,
  "is_resolved" BOOLEAN NOT NULL DEFAULT false,
  "resolved_at" TIMESTAMP NULL,
  "resolved_by" INTEGER NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "inventory_alerts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "alert_severity_check" CHECK (severity IN ('info', 'warning', 'critical'))
);
CREATE TABLE "public"."inventory_forecast" (
  "id" SERIAL,
  "outlet_id" INTEGER NOT NULL,
  "inventory_id" INTEGER NULL,
  "forecast_date" DATE NOT NULL,
  "predicted_usage" NUMERIC NOT NULL DEFAULT 0,
  "actual_usage" NUMERIC NULL,
  "confidence_level" NUMERIC NULL,
  "factors" JSONB NULL DEFAULT '{}'::jsonb,
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "inventory_forecast_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "public"."recipes" ( 
  "id" SERIAL,
  "item_id" INTEGER NOT NULL,
  "ingredient_id" INTEGER NOT NULL,
  "quantity" NUMERIC NOT NULL,
  "unit" VARCHAR(50) NULL,
  CONSTRAINT "recipes_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "public"."integrations" ( 
  "id" SERIAL,
  "tenant_id" INTEGER NOT NULL,
  "integration_type" VARCHAR(50) NOT NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'inactive'::character varying ,
  "configuration" JSONB NULL DEFAULT '{}'::jsonb ,
  "credentials" JSONB NULL DEFAULT '{}'::jsonb ,
  "metadata" JSONB NULL DEFAULT '{}'::jsonb ,
  "is_active" BOOLEAN NOT NULL DEFAULT false ,
  "activated_at" TIMESTAMP NULL,
  "last_sync_at" TIMESTAMP NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ,
  "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ,
  CONSTRAINT "integrations_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "public"."suppliers" ( 
  "id" SERIAL,
  "outlet_id" INTEGER NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "phone" VARCHAR(50) NULL,
  "email" VARCHAR(255) NULL,
  "address" TEXT NULL,
  "notes" TEXT NULL,
  "is_active" BOOLEAN NULL DEFAULT true ,
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ,
  "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ,
  CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "public"."expenses" ( 
  "id" SERIAL,
  "outlet_id" INTEGER NOT NULL,
  "expense_type" VARCHAR(50) NOT NULL,
  "category" VARCHAR(100) NOT NULL,
  "amount" NUMERIC NOT NULL,
  "description" TEXT NULL,
  "payment_method" VARCHAR(50) NULL,
  "receipt_image" VARCHAR(500) NULL,
  "reference_id" INTEGER NULL,
  "supplier_id" INTEGER NULL,
  "invoice_number" VARCHAR(100) NULL,
  "due_date" TIMESTAMP NULL,
  "paid_at" TIMESTAMP NULL,
  "user_id" INTEGER NOT NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ,
  "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ,
  CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "public"."stock_movements" ( 
  "id" SERIAL,
  "outlet_id" INTEGER NOT NULL,
  "ingredient_id" INTEGER NULL,
  "inventory_id" INTEGER NULL,
  "type" VARCHAR(20) NOT NULL,
  "quantity" NUMERIC NOT NULL,
  "unit_price" NUMERIC NOT NULL DEFAULT 0 ,
  "total_cost" NUMERIC NOT NULL DEFAULT 0 ,
  "stock_before" NUMERIC NOT NULL,
  "stock_after" NUMERIC NOT NULL,
  "supplier" VARCHAR(255) NULL,
  "invoice_number" VARCHAR(100) NULL,
  "notes" TEXT NULL,
  "user_id" INTEGER NOT NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ,
  "supplier_id" INTEGER NULL,
  CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "accounting"."chart_of_accounts" ( 
  "id" SERIAL,
  "tenant_id" INTEGER NOT NULL,
  "account_code" VARCHAR(20) NOT NULL,
  "account_name" VARCHAR(255) NOT NULL,
  "account_type" VARCHAR(50) NOT NULL,
  "category" VARCHAR(100) NULL,
  "parent_id" INTEGER NULL,
  "normal_balance" VARCHAR(10) NOT NULL DEFAULT 'DEBIT'::character varying ,
  "description" TEXT NULL,
  "is_system" BOOLEAN NULL DEFAULT false ,
  "is_active" BOOLEAN NULL DEFAULT true ,
  "created_at" TIMESTAMP WITH TIME ZONE NULL DEFAULT CURRENT_TIMESTAMP ,
  "updated_at" TIMESTAMP WITH TIME ZONE NULL DEFAULT CURRENT_TIMESTAMP ,
  CONSTRAINT "chart_of_accounts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "unique_account_code" UNIQUE ("tenant_id", "account_code")
);
CREATE TABLE "accounting"."accounting_periods" ( 
  "id" SERIAL,
  "tenant_id" INTEGER NOT NULL,
  "period_name" VARCHAR(50) NOT NULL,
  "start_date" DATE NOT NULL,
  "end_date" DATE NOT NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'open'::character varying ,
  "closed_at" TIMESTAMP WITH TIME ZONE NULL,
  "closed_by" INTEGER NULL,
  "notes" TEXT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE NULL DEFAULT CURRENT_TIMESTAMP ,
  "updated_at" TIMESTAMP WITH TIME ZONE NULL DEFAULT CURRENT_TIMESTAMP ,
  CONSTRAINT "accounting_periods_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "unique_period" UNIQUE ("tenant_id", "period_name")
);
CREATE TABLE "accounting"."journal_entry_lines" ( 
  "id" SERIAL,
  "journal_entry_id" INTEGER NOT NULL,
  "account_id" INTEGER NOT NULL,
  "description" TEXT NULL,
  "debit_amount" NUMERIC NOT NULL DEFAULT 0 ,
  "credit_amount" NUMERIC NOT NULL DEFAULT 0 ,
  "created_at" TIMESTAMP WITH TIME ZONE NULL DEFAULT CURRENT_TIMESTAMP ,
  CONSTRAINT "journal_entry_lines_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "accounting"."journal_entries" ( 
  "id" SERIAL,
  "tenant_id" INTEGER NOT NULL,
  "outlet_id" INTEGER NULL,
  "journal_number" VARCHAR(100) NOT NULL,
  "journal_type" VARCHAR(50) NOT NULL,
  "transaction_date" TIMESTAMP WITH TIME ZONE NOT NULL,
  "period_id" INTEGER NULL,
  "description" TEXT NULL,
  "reference_type" VARCHAR(50) NULL,
  "reference_id" INTEGER NULL,
  "total_debit" NUMERIC NOT NULL DEFAULT 0 ,
  "total_credit" NUMERIC NOT NULL DEFAULT 0 ,
  "status" VARCHAR(20) NOT NULL DEFAULT 'posted'::character varying ,
  "posted_by" INTEGER NULL,
  "posted_at" TIMESTAMP WITH TIME ZONE NULL,
  "voided_by" INTEGER NULL,
  "voided_at" TIMESTAMP WITH TIME ZONE NULL,
  "void_reason" TEXT NULL,
  "created_by" INTEGER NOT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE NULL DEFAULT CURRENT_TIMESTAMP ,
  "updated_at" TIMESTAMP WITH TIME ZONE NULL DEFAULT CURRENT_TIMESTAMP ,
  CONSTRAINT "journal_entries_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "unique_journal_number" UNIQUE ("tenant_id", "journal_number")
);
CREATE TABLE "accounting"."general_ledger" ( 
  "id" SERIAL,
  "tenant_id" INTEGER NOT NULL,
  "outlet_id" INTEGER NULL,
  "account_id" INTEGER NOT NULL,
  "journal_entry_id" INTEGER NOT NULL,
  "transaction_date" TIMESTAMP WITH TIME ZONE NOT NULL,
  "description" TEXT NULL,
  "debit_amount" NUMERIC NOT NULL DEFAULT 0 ,
  "credit_amount" NUMERIC NOT NULL DEFAULT 0 ,
  "balance" NUMERIC NOT NULL DEFAULT 0 ,
  "balance_type" VARCHAR(10) NULL,
  "created_at" TIMESTAMP WITH TIME ZONE NULL DEFAULT CURRENT_TIMESTAMP ,
  CONSTRAINT "general_ledger_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "accounting"."ar_collections" ( 
  "id" SERIAL,
  "tenant_id" INTEGER NOT NULL,
  "ar_id" INTEGER NOT NULL,
  "collection_date" DATE NOT NULL,
  "collection_amount" NUMERIC NOT NULL,
  "payment_method" VARCHAR(50) NOT NULL,
  "reference_number" VARCHAR(100) NULL,
  "notes" TEXT NULL,
  "created_by" INTEGER NOT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE NULL DEFAULT CURRENT_TIMESTAMP ,
  CONSTRAINT "ar_collections_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "accounting"."accounts_payable" ( 
  "id" SERIAL,
  "tenant_id" INTEGER NOT NULL,
  "outlet_id" INTEGER NULL,
  "supplier_id" INTEGER NOT NULL,
  "invoice_number" VARCHAR(100) NOT NULL,
  "invoice_date" DATE NOT NULL,
  "due_date" DATE NOT NULL,
  "amount" NUMERIC NOT NULL,
  "paid_amount" NUMERIC NOT NULL DEFAULT 0 ,
  "balance" NUMERIC NOT NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'unpaid'::character varying ,
  "reference_type" VARCHAR(50) NULL,
  "reference_id" INTEGER NULL,
  "notes" TEXT NULL,
  "created_by" INTEGER NOT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE NULL DEFAULT CURRENT_TIMESTAMP ,
  "updated_at" TIMESTAMP WITH TIME ZONE NULL DEFAULT CURRENT_TIMESTAMP ,
  CONSTRAINT "accounts_payable_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "accounting"."ap_payments" ( 
  "id" SERIAL,
  "tenant_id" INTEGER NOT NULL,
  "ap_id" INTEGER NOT NULL,
  "payment_date" DATE NOT NULL,
  "payment_amount" NUMERIC NOT NULL,
  "payment_method" VARCHAR(50) NOT NULL,
  "reference_number" VARCHAR(100) NULL,
  "notes" TEXT NULL,
  "created_by" INTEGER NOT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE NULL DEFAULT CURRENT_TIMESTAMP ,
  CONSTRAINT "ap_payments_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "accounting"."accounts_receivable" ( 
  "id" SERIAL,
  "tenant_id" INTEGER NOT NULL,
  "outlet_id" INTEGER NULL,
  "customer_id" INTEGER NULL,
  "customer_name" VARCHAR(255) NOT NULL,
  "invoice_number" VARCHAR(100) NOT NULL,
  "invoice_date" DATE NOT NULL,
  "due_date" DATE NOT NULL,
  "amount" NUMERIC NOT NULL,
  "received_amount" NUMERIC NOT NULL DEFAULT 0 ,
  "balance" NUMERIC NOT NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'unpaid'::character varying ,
  "reference_type" VARCHAR(50) NULL,
  "reference_id" INTEGER NULL,
  "notes" TEXT NULL,
  "created_by" INTEGER NOT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE NULL DEFAULT CURRENT_TIMESTAMP ,
  "updated_at" TIMESTAMP WITH TIME ZONE NULL DEFAULT CURRENT_TIMESTAMP ,
  CONSTRAINT "accounts_receivable_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "accounting"."fixed_assets" ( 
  "id" SERIAL,
  "tenant_id" INTEGER NOT NULL,
  "outlet_id" INTEGER NULL,
  "asset_code" VARCHAR(50) NOT NULL,
  "asset_name" VARCHAR(255) NOT NULL,
  "category" VARCHAR(100) NOT NULL,
  "purchase_date" DATE NOT NULL,
  "purchase_price" NUMERIC NOT NULL,
  "salvage_value" NUMERIC NOT NULL DEFAULT 0 ,
  "useful_life_months" INTEGER NOT NULL,
  "depreciation_method" VARCHAR(50) NOT NULL DEFAULT 'STRAIGHT_LINE'::character varying ,
  "accumulated_depreciation" NUMERIC NOT NULL DEFAULT 0 ,
  "book_value" NUMERIC NOT NULL,
  "account_id_asset" INTEGER NOT NULL,
  "account_id_depreciation" INTEGER NOT NULL,
  "account_id_expense" INTEGER NOT NULL,
  "location" VARCHAR(255) NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'active'::character varying ,
  "disposal_date" DATE NULL,
  "disposal_value" NUMERIC NULL,
  "notes" TEXT NULL,
  "created_by" INTEGER NOT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE NULL DEFAULT CURRENT_TIMESTAMP ,
  "updated_at" TIMESTAMP WITH TIME ZONE NULL DEFAULT CURRENT_TIMESTAMP ,
  CONSTRAINT "fixed_assets_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "unique_asset_code" UNIQUE ("tenant_id", "asset_code")
);
CREATE TABLE "accounting"."depreciation_logs" ( 
  "id" SERIAL,
  "tenant_id" INTEGER NOT NULL,
  "asset_id" INTEGER NOT NULL,
  "period_id" INTEGER NULL,
  "depreciation_date" DATE NOT NULL,
  "depreciation_amount" NUMERIC NOT NULL,
  "accumulated_depreciation" NUMERIC NOT NULL,
  "book_value" NUMERIC NOT NULL,
  "journal_entry_id" INTEGER NULL,
  "notes" TEXT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE NULL DEFAULT CURRENT_TIMESTAMP ,
  CONSTRAINT "depreciation_logs_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "accounting"."tax_configurations" ( 
  "id" SERIAL,
  "tenant_id" INTEGER NOT NULL,
  "tax_type" VARCHAR(50) NOT NULL,
  "tax_code" VARCHAR(20) NULL,
  "tax_rate" NUMERIC NOT NULL,
  "account_id" INTEGER NOT NULL,
  "is_active" BOOLEAN NULL DEFAULT true ,
  "effective_date" DATE NOT NULL,
  "expiration_date" DATE NULL,
  "notes" TEXT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE NULL DEFAULT CURRENT_TIMESTAMP ,
  "updated_at" TIMESTAMP WITH TIME ZONE NULL DEFAULT CURRENT_TIMESTAMP ,
  CONSTRAINT "tax_configurations_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "accounting"."tax_transactions" ( 
  "id" SERIAL,
  "tenant_id" INTEGER NOT NULL,
  "outlet_id" INTEGER NULL,
  "tax_config_id" INTEGER NOT NULL,
  "transaction_type" VARCHAR(50) NOT NULL,
  "transaction_date" DATE NOT NULL,
  "amount" NUMERIC NOT NULL,
  "tax_amount" NUMERIC NOT NULL,
  "reference_type" VARCHAR(50) NULL,
  "reference_id" INTEGER NULL,
  "journal_entry_id" INTEGER NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'recorded'::character varying ,
  "notes" TEXT NULL,
  "created_by" INTEGER NOT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE NULL DEFAULT CURRENT_TIMESTAMP ,
  CONSTRAINT "tax_transactions_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "accounting"."bank_reconciliations" ( 
  "id" SERIAL,
  "tenant_id" INTEGER NOT NULL,
  "outlet_id" INTEGER NULL,
  "account_id" INTEGER NOT NULL,
  "reconciliation_date" DATE NOT NULL,
  "book_balance" NUMERIC NOT NULL,
  "bank_statement_balance" NUMERIC NOT NULL,
  "difference" NUMERIC NOT NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'reconciled'::character varying ,
  "notes" TEXT NULL,
  "reconciled_by" INTEGER NULL,
  "reconciled_at" TIMESTAMP WITH TIME ZONE NULL,
  "created_by" INTEGER NOT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE NULL DEFAULT CURRENT_TIMESTAMP ,
  CONSTRAINT "bank_reconciliations_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "accounting"."bank_reconciliation_details" ( 
  "id" SERIAL,
  "reconciliation_id" INTEGER NOT NULL,
  "transaction_type" VARCHAR(20) NOT NULL,
  "transaction_amount" NUMERIC NOT NULL,
  "transaction_date" DATE NOT NULL,
  "description" TEXT NULL,
  "reference_number" VARCHAR(100) NULL,
  "matched_to_journal_id" INTEGER NULL,
  "is_matched" BOOLEAN NULL DEFAULT false ,
  CONSTRAINT "bank_reconciliation_details_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "accounting"."budgets" ( 
  "id" SERIAL,
  "tenant_id" INTEGER NOT NULL,
  "outlet_id" INTEGER NULL,
  "budget_name" VARCHAR(255) NOT NULL,
  "period_id" INTEGER NOT NULL,
  "account_id" INTEGER NOT NULL,
  "budgeted_amount" NUMERIC NOT NULL,
  "notes" TEXT NULL,
  "created_by" INTEGER NOT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE NULL DEFAULT CURRENT_TIMESTAMP ,
  "updated_at" TIMESTAMP WITH TIME ZONE NULL DEFAULT CURRENT_TIMESTAMP ,
  CONSTRAINT "budgets_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "accounting"."financial_report_cache" ( 
  "id" SERIAL,
  "tenant_id" INTEGER NOT NULL,
  "outlet_id" INTEGER NULL,
  "report_type" VARCHAR(50) NOT NULL,
  "period_id" INTEGER NOT NULL,
  "report_data" JSONB NOT NULL,
  "generated_at" TIMESTAMP WITH TIME ZONE NULL DEFAULT CURRENT_TIMESTAMP ,
  "expires_at" TIMESTAMP WITH TIME ZONE NULL,
  CONSTRAINT "financial_report_cache_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "unique_report_cache" UNIQUE ("tenant_id", "outlet_id", "report_type", "period_id")
);
CREATE TABLE "accounting"."audit_logs" ( 
  "id" SERIAL,
  "tenant_id" INTEGER NOT NULL,
  "user_id" INTEGER NOT NULL,
  "action_type" VARCHAR(50) NOT NULL,
  "entity_type" VARCHAR(50) NOT NULL,
  "entity_id" INTEGER NOT NULL,
  "old_values" JSONB NULL,
  "new_values" JSONB NULL,
  "ip_address" VARCHAR(45) NULL,
  "user_agent" TEXT NULL,
  "reason" TEXT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE NULL DEFAULT CURRENT_TIMESTAMP ,
  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "accounting"."ai_forecast_data" ( 
  "id" SERIAL,
  "tenant_id" INTEGER NOT NULL,
  "outlet_id" INTEGER NULL,
  "account_id" INTEGER NULL,
  "forecast_type" VARCHAR(50) NOT NULL,
  "forecast_date" DATE NOT NULL,
  "forecast_amount" NUMERIC NOT NULL,
  "actual_amount" NUMERIC NULL,
  "confidence_level" NUMERIC NULL,
  "model_version" VARCHAR(20) NULL,
  "notes" TEXT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE NULL DEFAULT CURRENT_TIMESTAMP ,
  CONSTRAINT "ai_forecast_data_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "public"."owner_invitations" ( 
  "id" SERIAL,
  "email" VARCHAR(255) NOT NULL,
  "business_name" VARCHAR(255) NOT NULL,
  "owner_name" VARCHAR(255) NOT NULL,
  "invitation_token" VARCHAR(255) NOT NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'pending'::character varying ,
  "invited_by" INTEGER NOT NULL,
  "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
  "accepted_at" TIMESTAMP WITH TIME ZONE NULL,
  "created_at" TIMESTAMP WITH TIME ZONE NULL DEFAULT CURRENT_TIMESTAMP ,
  "updated_at" TIMESTAMP WITH TIME ZONE NULL DEFAULT CURRENT_TIMESTAMP ,
  CONSTRAINT "owner_invitations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "owner_invitations_invitation_token_key" UNIQUE ("invitation_token")
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
  "invited_by" INTEGER NULL,
  "business_type" VARCHAR(50) NULL,
  "onboarding_completed" BOOLEAN NULL DEFAULT false ,
  "onboarding_step" INTEGER NULL DEFAULT 1 ,
  CONSTRAINT "tenants_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "tenants_email_key" UNIQUE ("email")
);
CREATE INDEX "idx_outlets_tenant" 
ON "public"."outlets" (
  "tenant_id" ASC
);
CREATE INDEX "idx_transactions_cashier" 
ON "public"."transactions" (
  "cashier_id" ASC
);
CREATE INDEX "idx_transactions_created" 
ON "public"."transactions" (
  "created_at" ASC
);
CREATE INDEX "idx_transactions_status" 
ON "public"."transactions" (
  "status" ASC
);
CREATE INDEX "idx_transactions_outlet" 
ON "public"."transactions" (
  "outlet_id" ASC
);
CREATE INDEX "idx_transactions_number" 
ON "public"."transactions" (
  "transaction_number" ASC
);
CREATE INDEX "idx_transaction_items_transaction" 
ON "public"."transaction_items" (
  "transaction_id" ASC
);
CREATE INDEX "idx_users_invitation_token" 
ON "public"."users" (
  "invitation_token" ASC
);
CREATE INDEX "idx_users_tenant" 
ON "public"."users" (
  "tenant_id" ASC
);
CREATE INDEX "idx_users_email" 
ON "public"."users" (
  "email" ASC
);
CREATE INDEX "idx_users_outlet" 
ON "public"."users" (
  "outlet_id" ASC
);
CREATE INDEX "idx_customers_phone" 
ON "public"."customers" (
  "phone" ASC
);
CREATE INDEX "idx_customers_outlet" 
ON "public"."customers" (
  "outlet_id" ASC
);
CREATE INDEX "idx_customers_email" 
ON "public"."customers" (
  "email" ASC
);
CREATE INDEX "idx_ingredients_outlet" 
ON "public"."ingredients" (
  "outlet_id" ASC
);
CREATE INDEX "idx_promotions_dates" 
ON "public"."promotions" (
  "start_date" ASC,
  "end_date" ASC
);
CREATE INDEX "idx_promotions_active" 
ON "public"."promotions" (
  "is_active" ASC
);
CREATE INDEX "idx_promotions_outlet" 
ON "public"."promotions" (
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
CREATE INDEX "idx_items_category" 
ON "public"."items" (
  "category_id" ASC
);
CREATE INDEX "idx_items_active" 
ON "public"."items" (
  "is_active" ASC
);
CREATE INDEX "idx_items_outlet" 
ON "public"."items" (
  "outlet_id" ASC
);
CREATE INDEX "idx_activity_logs_outlet" 
ON "public"."activity_logs" (
  "outlet_id" ASC
);
CREATE INDEX "idx_activity_logs_created" 
ON "public"."activity_logs" (
  "created_at" ASC
);
CREATE INDEX "idx_activity_logs_user" 
ON "public"."activity_logs" (
  "user_id" ASC
);
CREATE INDEX "idx_activity_logs_action" 
ON "public"."activity_logs" (
  "action_type" ASC
);
CREATE INDEX "idx_sales_receipt" 
ON "public"."sales_transactions" (
  "receipt_number" ASC
);
CREATE INDEX "idx_sales_category" 
ON "public"."sales_transactions" (
  "category" ASC
);
CREATE INDEX "idx_sales_date" 
ON "public"."sales_transactions" (
  "date" ASC
);
CREATE INDEX "idx_sales_outlet" 
ON "public"."sales_transactions" (
  "outlet_id" ASC
);
CREATE INDEX "idx_api_keys_tenant" 
ON "public"."api_keys" (
  "tenant_id" ASC
);
CREATE UNIQUE INDEX "api_keys_api_key_key" 
ON "public"."api_keys" (
  "api_key" ASC
);
CREATE INDEX "idx_api_keys_key" 
ON "public"."api_keys" (
  "api_key" ASC
);
CREATE INDEX "idx_inventory_outlet"
ON "public"."inventory" (
  "outlet_id" ASC
);
CREATE INDEX "idx_inventory_category"
ON "public"."inventory" (
  "category" ASC
);
CREATE INDEX "idx_inventory_business_type"
ON "public"."inventory" (
  "business_type" ASC
);
CREATE INDEX "idx_inventory_supplier"
ON "public"."inventory" (
  "supplier_id" ASC
);
CREATE INDEX "idx_inventory_sku"
ON "public"."inventory" (
  "sku" ASC
);
CREATE INDEX "idx_inventory_barcode"
ON "public"."inventory" (
  "barcode" ASC
);
CREATE INDEX "idx_inventory_expiry"
ON "public"."inventory" (
  "expiry_date" ASC
);
CREATE INDEX "idx_po_outlet"
ON "public"."purchase_orders" (
  "outlet_id" ASC
);
CREATE INDEX "idx_po_supplier"
ON "public"."purchase_orders" (
  "supplier_id" ASC
);
CREATE INDEX "idx_po_status"
ON "public"."purchase_orders" (
  "status" ASC
);
CREATE INDEX "idx_po_date"
ON "public"."purchase_orders" (
  "order_date" ASC
);
CREATE INDEX "idx_po_items_po"
ON "public"."purchase_order_items" (
  "po_id" ASC
);
CREATE INDEX "idx_po_items_inventory"
ON "public"."purchase_order_items" (
  "inventory_id" ASC
);
CREATE INDEX "idx_inv_alerts_outlet"
ON "public"."inventory_alerts" (
  "outlet_id" ASC
);
CREATE INDEX "idx_inv_alerts_inventory"
ON "public"."inventory_alerts" (
  "inventory_id" ASC
);
CREATE INDEX "idx_inv_alerts_type"
ON "public"."inventory_alerts" (
  "alert_type" ASC
);
CREATE INDEX "idx_inv_alerts_resolved"
ON "public"."inventory_alerts" (
  "is_resolved" ASC
);
CREATE INDEX "idx_inv_forecast_outlet"
ON "public"."inventory_forecast" (
  "outlet_id" ASC
);
CREATE INDEX "idx_inv_forecast_date"
ON "public"."inventory_forecast" (
  "forecast_date" ASC
);
CREATE UNIQUE INDEX "unique_tenant_integration" 
ON "public"."integrations" (
  "tenant_id" ASC,
  "integration_type" ASC
);
CREATE INDEX "idx_integrations_tenant" 
ON "public"."integrations" (
  "tenant_id" ASC
);
CREATE INDEX "idx_integrations_type" 
ON "public"."integrations" (
  "integration_type" ASC
);
CREATE INDEX "idx_integrations_status" 
ON "public"."integrations" (
  "status" ASC
);
CREATE INDEX "idx_suppliers_outlet" 
ON "public"."suppliers" (
  "outlet_id" ASC
);
CREATE INDEX "idx_suppliers_active" 
ON "public"."suppliers" (
  "is_active" ASC
);
CREATE INDEX "idx_expenses_user" 
ON "public"."expenses" (
  "user_id" ASC
);
CREATE INDEX "idx_expenses_supplier" 
ON "public"."expenses" (
  "supplier_id" ASC
);
CREATE INDEX "idx_expenses_created" 
ON "public"."expenses" (
  "created_at" ASC
);
CREATE INDEX "idx_expenses_category" 
ON "public"."expenses" (
  "category" ASC
);
CREATE INDEX "idx_expenses_type" 
ON "public"."expenses" (
  "expense_type" ASC
);
CREATE INDEX "idx_expenses_outlet" 
ON "public"."expenses" (
  "outlet_id" ASC
);
CREATE INDEX "idx_stock_movements_created" 
ON "public"."stock_movements" (
  "created_at" ASC
);
CREATE INDEX "idx_stock_movements_outlet" 
ON "public"."stock_movements" (
  "outlet_id" ASC
);
CREATE INDEX "idx_stock_movements_ingredient" 
ON "public"."stock_movements" (
  "ingredient_id" ASC
);
CREATE INDEX "idx_stock_movements_inventory" 
ON "public"."stock_movements" (
  "inventory_id" ASC
);
CREATE INDEX "idx_stock_movements_type" 
ON "public"."stock_movements" (
  "type" ASC
);
CREATE INDEX "idx_stock_movements_supplier" 
ON "public"."stock_movements" (
  "supplier_id" ASC
);
CREATE INDEX "idx_stock_movements_user" 
ON "public"."stock_movements" (
  "user_id" ASC
);
CREATE INDEX "idx_coa_active" 
ON "accounting"."chart_of_accounts" (
  "is_active" ASC
);
CREATE INDEX "idx_coa_tenant" 
ON "accounting"."chart_of_accounts" (
  "tenant_id" ASC
);
CREATE INDEX "idx_coa_type" 
ON "accounting"."chart_of_accounts" (
  "account_type" ASC
);
CREATE INDEX "idx_coa_parent" 
ON "accounting"."chart_of_accounts" (
  "parent_id" ASC
);
CREATE INDEX "idx_period_status" 
ON "accounting"."accounting_periods" (
  "status" ASC
);
CREATE INDEX "idx_period_tenant" 
ON "accounting"."accounting_periods" (
  "tenant_id" ASC
);
CREATE INDEX "idx_journal_line_entry" 
ON "accounting"."journal_entry_lines" (
  "journal_entry_id" ASC
);
CREATE INDEX "idx_journal_line_account" 
ON "accounting"."journal_entry_lines" (
  "account_id" ASC
);
CREATE INDEX "idx_journal_date" 
ON "accounting"."journal_entries" (
  "transaction_date" ASC
);
CREATE INDEX "idx_journal_type" 
ON "accounting"."journal_entries" (
  "journal_type" ASC
);
CREATE INDEX "idx_journal_tenant" 
ON "accounting"."journal_entries" (
  "tenant_id" ASC
);
CREATE INDEX "idx_journal_reference" 
ON "accounting"."journal_entries" (
  "reference_type" ASC,
  "reference_id" ASC
);
CREATE INDEX "idx_journal_outlet" 
ON "accounting"."journal_entries" (
  "outlet_id" ASC
);
CREATE INDEX "idx_journal_status" 
ON "accounting"."journal_entries" (
  "status" ASC
);
CREATE INDEX "idx_gl_tenant" 
ON "accounting"."general_ledger" (
  "tenant_id" ASC
);
CREATE INDEX "idx_gl_journal" 
ON "accounting"."general_ledger" (
  "journal_entry_id" ASC
);
CREATE INDEX "idx_gl_date" 
ON "accounting"."general_ledger" (
  "transaction_date" ASC
);
CREATE INDEX "idx_gl_account" 
ON "accounting"."general_ledger" (
  "account_id" ASC
);
CREATE INDEX "idx_ar_collection_tenant" 
ON "accounting"."ar_collections" (
  "tenant_id" ASC
);
CREATE INDEX "idx_ar_collection_date" 
ON "accounting"."ar_collections" (
  "collection_date" ASC
);
CREATE INDEX "idx_ar_collection_ar" 
ON "accounting"."ar_collections" (
  "ar_id" ASC
);
CREATE INDEX "idx_ap_tenant" 
ON "accounting"."accounts_payable" (
  "tenant_id" ASC
);
CREATE INDEX "idx_ap_status" 
ON "accounting"."accounts_payable" (
  "status" ASC
);
CREATE INDEX "idx_ap_due_date" 
ON "accounting"."accounts_payable" (
  "due_date" ASC
);
CREATE INDEX "idx_ap_supplier" 
ON "accounting"."accounts_payable" (
  "supplier_id" ASC
);
CREATE INDEX "idx_ap_payment_date" 
ON "accounting"."ap_payments" (
  "payment_date" ASC
);
CREATE INDEX "idx_ap_payment_ap" 
ON "accounting"."ap_payments" (
  "ap_id" ASC
);
CREATE INDEX "idx_ap_payment_tenant" 
ON "accounting"."ap_payments" (
  "tenant_id" ASC
);
CREATE INDEX "idx_ar_tenant" 
ON "accounting"."accounts_receivable" (
  "tenant_id" ASC
);
CREATE INDEX "idx_ar_status" 
ON "accounting"."accounts_receivable" (
  "status" ASC
);
CREATE INDEX "idx_ar_customer" 
ON "accounting"."accounts_receivable" (
  "customer_id" ASC
);
CREATE INDEX "idx_ar_due_date" 
ON "accounting"."accounts_receivable" (
  "due_date" ASC
);
CREATE INDEX "idx_asset_category" 
ON "accounting"."fixed_assets" (
  "category" ASC
);
CREATE INDEX "idx_asset_tenant" 
ON "accounting"."fixed_assets" (
  "tenant_id" ASC
);
CREATE INDEX "idx_asset_status" 
ON "accounting"."fixed_assets" (
  "status" ASC
);
CREATE INDEX "idx_depr_log_journal" 
ON "accounting"."depreciation_logs" (
  "journal_entry_id" ASC
);
CREATE INDEX "idx_depr_log_date" 
ON "accounting"."depreciation_logs" (
  "depreciation_date" ASC
);
CREATE INDEX "idx_depr_log_tenant" 
ON "accounting"."depreciation_logs" (
  "tenant_id" ASC
);
CREATE INDEX "idx_depr_log_asset" 
ON "accounting"."depreciation_logs" (
  "asset_id" ASC
);
CREATE INDEX "idx_tax_active" 
ON "accounting"."tax_configurations" (
  "is_active" ASC
);
CREATE INDEX "idx_tax_type" 
ON "accounting"."tax_configurations" (
  "tax_type" ASC
);
CREATE INDEX "idx_tax_tenant" 
ON "accounting"."tax_configurations" (
  "tenant_id" ASC
);
CREATE INDEX "idx_tax_trans_tenant" 
ON "accounting"."tax_transactions" (
  "tenant_id" ASC
);
CREATE INDEX "idx_tax_trans_type" 
ON "accounting"."tax_transactions" (
  "transaction_type" ASC
);
CREATE INDEX "idx_tax_trans_date" 
ON "accounting"."tax_transactions" (
  "transaction_date" ASC
);
CREATE INDEX "idx_bank_recon_tenant" 
ON "accounting"."bank_reconciliations" (
  "tenant_id" ASC
);
CREATE INDEX "idx_bank_recon_date" 
ON "accounting"."bank_reconciliations" (
  "reconciliation_date" ASC
);
CREATE INDEX "idx_bank_recon_account" 
ON "accounting"."bank_reconciliations" (
  "account_id" ASC
);
CREATE INDEX "idx_bank_recon_detail_recon" 
ON "accounting"."bank_reconciliation_details" (
  "reconciliation_id" ASC
);
CREATE INDEX "idx_budget_tenant" 
ON "accounting"."budgets" (
  "tenant_id" ASC
);
CREATE INDEX "idx_budget_period" 
ON "accounting"."budgets" (
  "period_id" ASC
);
CREATE INDEX "idx_budget_account" 
ON "accounting"."budgets" (
  "account_id" ASC
);
CREATE INDEX "idx_report_cache_tenant" 
ON "accounting"."financial_report_cache" (
  "tenant_id" ASC
);
CREATE INDEX "idx_report_cache_period" 
ON "accounting"."financial_report_cache" (
  "period_id" ASC
);
CREATE INDEX "idx_audit_tenant" 
ON "accounting"."audit_logs" (
  "tenant_id" ASC
);
CREATE INDEX "idx_audit_user" 
ON "accounting"."audit_logs" (
  "user_id" ASC
);
CREATE INDEX "idx_audit_entity" 
ON "accounting"."audit_logs" (
  "entity_type" ASC,
  "entity_id" ASC
);
CREATE INDEX "idx_audit_date" 
ON "accounting"."audit_logs" (
  "created_at" ASC
);
CREATE INDEX "idx_forecast_date" 
ON "accounting"."ai_forecast_data" (
  "forecast_date" ASC
);
CREATE INDEX "idx_forecast_tenant" 
ON "accounting"."ai_forecast_data" (
  "tenant_id" ASC
);
CREATE INDEX "idx_forecast_account" 
ON "accounting"."ai_forecast_data" (
  "account_id" ASC
);
CREATE INDEX "idx_owner_invitations_status" 
ON "public"."owner_invitations" (
  "status" ASC
);
CREATE INDEX "idx_owner_invitations_token" 
ON "public"."owner_invitations" (
  "invitation_token" ASC
);
CREATE INDEX "idx_owner_invitations_email" 
ON "public"."owner_invitations" (
  "email" ASC
);
CREATE INDEX "idx_tenants_email" 
ON "public"."tenants" (
  "email" ASC
);
CREATE INDEX "idx_tenants_active" 
ON "public"."tenants" (
  "is_active" ASC
);
CREATE INDEX "idx_tenants_status" 
ON "public"."tenants" (
  "subscription_status" ASC
);
ALTER TABLE "public"."categories" ADD CONSTRAINT "categories_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "public"."outlets" ADD CONSTRAINT "outlets_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "public"."variants" ADD CONSTRAINT "variants_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."items" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "public"."modifiers" ADD CONSTRAINT "modifiers_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "public"."item_modifiers" ADD CONSTRAINT "item_modifiers_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."items" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "public"."item_modifiers" ADD CONSTRAINT "item_modifiers_modifier_id_fkey" FOREIGN KEY ("modifier_id") REFERENCES "public"."modifiers" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "public"."tables" ADD CONSTRAINT "tables_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_table_id_fkey" FOREIGN KEY ("table_id") REFERENCES "public"."tables" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_cashier_id_fkey" FOREIGN KEY ("cashier_id") REFERENCES "public"."users" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_promotion_id_fkey" FOREIGN KEY ("promotion_id") REFERENCES "public"."promotions" ("id") ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE "public"."transaction_items" ADD CONSTRAINT "transaction_items_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "public"."transaction_items" ADD CONSTRAINT "transaction_items_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."items" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "public"."transaction_items" ADD CONSTRAINT "transaction_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."variants" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "public"."users" ADD CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "public"."users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "public"."users" ADD CONSTRAINT "users_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "public"."users" ADD CONSTRAINT "users_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "public"."users" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "public"."transaction_modifiers" ADD CONSTRAINT "transaction_modifiers_transaction_item_id_fkey" FOREIGN KEY ("transaction_item_id") REFERENCES "public"."transaction_items" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "public"."transaction_modifiers" ADD CONSTRAINT "transaction_modifiers_modifier_id_fkey" FOREIGN KEY ("modifier_id") REFERENCES "public"."modifiers" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "public"."payments" ADD CONSTRAINT "payments_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "public"."customers" ADD CONSTRAINT "customers_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "public"."ingredients" ADD CONSTRAINT "ingredients_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "public"."ingredients" ADD CONSTRAINT "ingredients_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "public"."promotions" ADD CONSTRAINT "promotions_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "public"."discount_usage" ADD CONSTRAINT "discount_usage_promotion_id_fkey" FOREIGN KEY ("promotion_id") REFERENCES "public"."promotions" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "public"."discount_usage" ADD CONSTRAINT "discount_usage_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "public"."items" ADD CONSTRAINT "items_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "public"."items" ADD CONSTRAINT "items_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "public"."activity_logs" ADD CONSTRAINT "activity_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "public"."api_keys" ADD CONSTRAINT "api_keys_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "public"."recipes" ADD CONSTRAINT "recipes_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."items" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."recipes" ADD CONSTRAINT "recipes_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."integrations" ADD CONSTRAINT "integrations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."suppliers" ADD CONSTRAINT "fk_suppliers_outlet" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "public"."expenses" ADD CONSTRAINT "fk_expenses_outlet" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "public"."expenses" ADD CONSTRAINT "fk_expenses_supplier" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers" ("id") ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE "public"."expenses" ADD CONSTRAINT "fk_expenses_user" FOREIGN KEY ("user_id") REFERENCES "public"."users" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "public"."expenses" ADD CONSTRAINT "fk_expenses_reference" FOREIGN KEY ("reference_id") REFERENCES "public"."stock_movements" ("id") ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE "public"."stock_movements" ADD CONSTRAINT "fk_stock_movements_outlet" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "public"."stock_movements" ADD CONSTRAINT "fk_stock_movements_ingredient" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "public"."stock_movements" ADD CONSTRAINT "fk_stock_movements_inventory" FOREIGN KEY ("inventory_id") REFERENCES "public"."inventory" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "public"."stock_movements" ADD CONSTRAINT "fk_stock_movements_user" FOREIGN KEY ("user_id") REFERENCES "public"."users" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "public"."inventory" ADD CONSTRAINT "inventory_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers" ("id") ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE "public"."purchase_orders" ADD CONSTRAINT "purchase_orders_outlet_fkey" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "public"."purchase_orders" ADD CONSTRAINT "purchase_orders_supplier_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers" ("id") ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE "public"."purchase_orders" ADD CONSTRAINT "purchase_orders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "public"."purchase_orders" ADD CONSTRAINT "purchase_orders_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "public"."users" ("id") ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE "public"."purchase_order_items" ADD CONSTRAINT "po_items_po_fkey" FOREIGN KEY ("po_id") REFERENCES "public"."purchase_orders" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "public"."purchase_order_items" ADD CONSTRAINT "po_items_inventory_fkey" FOREIGN KEY ("inventory_id") REFERENCES "public"."inventory" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "public"."inventory_settings" ADD CONSTRAINT "inventory_settings_outlet_fkey" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "public"."inventory_alerts" ADD CONSTRAINT "inventory_alerts_outlet_fkey" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "public"."inventory_alerts" ADD CONSTRAINT "inventory_alerts_inventory_fkey" FOREIGN KEY ("inventory_id") REFERENCES "public"."inventory" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "public"."inventory_alerts" ADD CONSTRAINT "inventory_alerts_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "public"."users" ("id") ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE "public"."inventory_forecast" ADD CONSTRAINT "inventory_forecast_outlet_fkey" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "public"."inventory_forecast" ADD CONSTRAINT "inventory_forecast_inventory_fkey" FOREIGN KEY ("inventory_id") REFERENCES "public"."inventory" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "accounting"."chart_of_accounts" ADD CONSTRAINT "chart_of_accounts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "accounting"."chart_of_accounts" ADD CONSTRAINT "chart_of_accounts_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "accounting"."chart_of_accounts" ("id") ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE "accounting"."accounting_periods" ADD CONSTRAINT "accounting_periods_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "accounting"."accounting_periods" ADD CONSTRAINT "accounting_periods_closed_by_fkey" FOREIGN KEY ("closed_by") REFERENCES "public"."users" ("id") ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE "accounting"."journal_entry_lines" ADD CONSTRAINT "journal_entry_lines_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "accounting"."journal_entries" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "accounting"."journal_entry_lines" ADD CONSTRAINT "journal_entry_lines_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounting"."chart_of_accounts" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "accounting"."journal_entries" ADD CONSTRAINT "journal_entries_voided_by_fkey" FOREIGN KEY ("voided_by") REFERENCES "public"."users" ("id") ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE "accounting"."journal_entries" ADD CONSTRAINT "journal_entries_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "accounting"."journal_entries" ADD CONSTRAINT "journal_entries_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "accounting"."journal_entries" ADD CONSTRAINT "journal_entries_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets" ("id") ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE "accounting"."journal_entries" ADD CONSTRAINT "journal_entries_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "accounting"."accounting_periods" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "accounting"."journal_entries" ADD CONSTRAINT "journal_entries_posted_by_fkey" FOREIGN KEY ("posted_by") REFERENCES "public"."users" ("id") ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE "accounting"."general_ledger" ADD CONSTRAINT "general_ledger_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "accounting"."general_ledger" ADD CONSTRAINT "general_ledger_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets" ("id") ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE "accounting"."general_ledger" ADD CONSTRAINT "general_ledger_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounting"."chart_of_accounts" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "accounting"."general_ledger" ADD CONSTRAINT "general_ledger_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "accounting"."journal_entries" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "accounting"."ar_collections" ADD CONSTRAINT "ar_collections_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "accounting"."ar_collections" ADD CONSTRAINT "ar_collections_ar_id_fkey" FOREIGN KEY ("ar_id") REFERENCES "accounting"."accounts_receivable" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "accounting"."ar_collections" ADD CONSTRAINT "ar_collections_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "accounting"."accounts_payable" ADD CONSTRAINT "accounts_payable_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets" ("id") ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE "accounting"."accounts_payable" ADD CONSTRAINT "accounts_payable_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "accounting"."accounts_payable" ADD CONSTRAINT "accounts_payable_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "accounting"."accounts_payable" ADD CONSTRAINT "accounts_payable_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "accounting"."ap_payments" ADD CONSTRAINT "ap_payments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "accounting"."ap_payments" ADD CONSTRAINT "ap_payments_ap_id_fkey" FOREIGN KEY ("ap_id") REFERENCES "accounting"."accounts_payable" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "accounting"."ap_payments" ADD CONSTRAINT "ap_payments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "accounting"."accounts_receivable" ADD CONSTRAINT "accounts_receivable_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "accounting"."accounts_receivable" ADD CONSTRAINT "accounts_receivable_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets" ("id") ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE "accounting"."accounts_receivable" ADD CONSTRAINT "accounts_receivable_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers" ("id") ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE "accounting"."accounts_receivable" ADD CONSTRAINT "accounts_receivable_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "accounting"."fixed_assets" ADD CONSTRAINT "fixed_assets_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "accounting"."fixed_assets" ADD CONSTRAINT "fixed_assets_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets" ("id") ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE "accounting"."fixed_assets" ADD CONSTRAINT "fixed_assets_account_id_asset_fkey" FOREIGN KEY ("account_id_asset") REFERENCES "accounting"."chart_of_accounts" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "accounting"."fixed_assets" ADD CONSTRAINT "fixed_assets_account_id_depreciation_fkey" FOREIGN KEY ("account_id_depreciation") REFERENCES "accounting"."chart_of_accounts" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "accounting"."fixed_assets" ADD CONSTRAINT "fixed_assets_account_id_expense_fkey" FOREIGN KEY ("account_id_expense") REFERENCES "accounting"."chart_of_accounts" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "accounting"."fixed_assets" ADD CONSTRAINT "fixed_assets_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "accounting"."depreciation_logs" ADD CONSTRAINT "depreciation_logs_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "accounting"."journal_entries" ("id") ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE "accounting"."depreciation_logs" ADD CONSTRAINT "depreciation_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "accounting"."depreciation_logs" ADD CONSTRAINT "depreciation_logs_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "accounting"."fixed_assets" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "accounting"."depreciation_logs" ADD CONSTRAINT "depreciation_logs_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "accounting"."accounting_periods" ("id") ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE "accounting"."tax_configurations" ADD CONSTRAINT "tax_configurations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "accounting"."tax_configurations" ADD CONSTRAINT "tax_configurations_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounting"."chart_of_accounts" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "accounting"."tax_transactions" ADD CONSTRAINT "tax_transactions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "accounting"."tax_transactions" ADD CONSTRAINT "tax_transactions_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets" ("id") ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE "accounting"."tax_transactions" ADD CONSTRAINT "tax_transactions_tax_config_id_fkey" FOREIGN KEY ("tax_config_id") REFERENCES "accounting"."tax_configurations" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "accounting"."tax_transactions" ADD CONSTRAINT "tax_transactions_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "accounting"."journal_entries" ("id") ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE "accounting"."tax_transactions" ADD CONSTRAINT "tax_transactions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "accounting"."bank_reconciliations" ADD CONSTRAINT "bank_reconciliations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "accounting"."bank_reconciliations" ADD CONSTRAINT "bank_reconciliations_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets" ("id") ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE "accounting"."bank_reconciliations" ADD CONSTRAINT "bank_reconciliations_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounting"."chart_of_accounts" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "accounting"."bank_reconciliations" ADD CONSTRAINT "bank_reconciliations_reconciled_by_fkey" FOREIGN KEY ("reconciled_by") REFERENCES "public"."users" ("id") ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE "accounting"."bank_reconciliations" ADD CONSTRAINT "bank_reconciliations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "accounting"."bank_reconciliation_details" ADD CONSTRAINT "bank_reconciliation_details_reconciliation_id_fkey" FOREIGN KEY ("reconciliation_id") REFERENCES "accounting"."bank_reconciliations" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "accounting"."bank_reconciliation_details" ADD CONSTRAINT "bank_reconciliation_details_matched_to_journal_id_fkey" FOREIGN KEY ("matched_to_journal_id") REFERENCES "accounting"."journal_entries" ("id") ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE "accounting"."budgets" ADD CONSTRAINT "budgets_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "accounting"."budgets" ADD CONSTRAINT "budgets_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets" ("id") ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE "accounting"."budgets" ADD CONSTRAINT "budgets_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "accounting"."accounting_periods" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "accounting"."budgets" ADD CONSTRAINT "budgets_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounting"."chart_of_accounts" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "accounting"."budgets" ADD CONSTRAINT "budgets_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "accounting"."financial_report_cache" ADD CONSTRAINT "financial_report_cache_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "accounting"."financial_report_cache" ADD CONSTRAINT "financial_report_cache_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets" ("id") ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE "accounting"."financial_report_cache" ADD CONSTRAINT "financial_report_cache_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "accounting"."accounting_periods" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "accounting"."audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "accounting"."audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "accounting"."ai_forecast_data" ADD CONSTRAINT "ai_forecast_data_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "accounting"."ai_forecast_data" ADD CONSTRAINT "ai_forecast_data_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets" ("id") ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE "accounting"."ai_forecast_data" ADD CONSTRAINT "ai_forecast_data_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounting"."chart_of_accounts" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "public"."owner_invitations" ADD CONSTRAINT "owner_invitations_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "public"."users" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "public"."tenants" ADD CONSTRAINT "tenants_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "public"."users" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
CREATE FUNCTION "accounting"."update_asset_timestamp"() RETURNS TRIGGER LANGUAGE PLPGSQL
AS
$$

BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;

$$;
CREATE FUNCTION "accounting"."update_coa_timestamp"() RETURNS TRIGGER LANGUAGE PLPGSQL
AS
$$

BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;

$$;
CREATE FUNCTION "accounting"."update_journal_timestamp"() RETURNS TRIGGER LANGUAGE PLPGSQL
AS
$$

BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;

$$;
CREATE FUNCTION "accounting"."update_period_timestamp"() RETURNS TRIGGER LANGUAGE PLPGSQL
AS
$$

BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;

$$;
CREATE FUNCTION "public"."update_updated_at"() RETURNS TRIGGER LANGUAGE PLPGSQL
AS
$$

BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;

$$;
CREATE FUNCTION "public"."update_updated_at_column"() RETURNS TRIGGER LANGUAGE PLPGSQL
AS
$$

BEGIN
   NEW.updated_at = CURRENT_TIMESTAMP;
   RETURN NEW;
END;

$$;
CREATE VIEW "accounting"."v_asset_register"
AS
 SELECT id,
    tenant_id,
    asset_code,
    asset_name,
    category,
    purchase_date,
    purchase_price,
    useful_life_months,
    depreciation_method,
    accumulated_depreciation,
    book_value,
    status,
    location,
        CASE
            WHEN ((status)::text = 'active'::text) THEN 'In Use'::text
            WHEN ((status)::text = 'disposed'::text) THEN 'Disposed'::text
            WHEN ((status)::text = 'sold'::text) THEN 'Sold'::text
            ELSE 'Unknown'::text
        END AS status_label,
    (purchase_price - accumulated_depreciation) AS current_book_value
   FROM accounting.fixed_assets fa;;
CREATE VIEW "accounting"."v_trial_balance"
AS
 SELECT coa.tenant_id,
    coa.account_code,
    coa.account_name,
    coa.account_type,
    coa.normal_balance,
    COALESCE(sum(
        CASE
            WHEN (jel.debit_amount > (0)::numeric) THEN jel.debit_amount
            ELSE (0)::numeric
        END), (0)::numeric) AS total_debit,
    COALESCE(sum(
        CASE
            WHEN (jel.credit_amount > (0)::numeric) THEN jel.credit_amount
            ELSE (0)::numeric
        END), (0)::numeric) AS total_credit,
    COALESCE(sum(
        CASE
            WHEN ((coa.normal_balance)::text = 'DEBIT'::text) THEN (jel.debit_amount - jel.credit_amount)
            ELSE (jel.credit_amount - jel.debit_amount)
        END), (0)::numeric) AS balance
   FROM ((accounting.chart_of_accounts coa
     LEFT JOIN accounting.journal_entry_lines jel ON ((coa.id = jel.account_id)))
     LEFT JOIN accounting.journal_entries je ON (((je.id = jel.journal_entry_id) AND ((je.status)::text = 'posted'::text))))
  WHERE (coa.is_active = true)
  GROUP BY coa.tenant_id, coa.id, coa.account_code, coa.account_name, coa.account_type, coa.normal_balance;;
CREATE VIEW "public"."v_inventory_low_stock"
AS
SELECT
  i.id,
  i.outlet_id,
  i.name,
  i.sku,
  i.category,
  i.business_type,
  i.current_stock,
  i.min_stock,
  i.stock_alert,
  i.unit,
  i.days_cover,
  i.expiry_date,
  s.name as supplier_name,
  CASE
    WHEN i.current_stock <= 0 THEN 'Habis'
    WHEN i.current_stock <= i.min_stock THEN 'Menipis'
    ELSE 'Aman'
  END as status
FROM inventory i
LEFT JOIN suppliers s ON s.id = i.supplier_id
WHERE i.is_active = true
  AND (i.current_stock <= i.min_stock OR (i.alert = true AND i.current_stock <= i.stock_alert));;
CREATE VIEW "public"."v_inventory_expiring"
AS
SELECT
  i.id,
  i.outlet_id,
  i.name,
  i.sku,
  i.batch_no,
  i.expiry_date,
  i.current_stock,
  i.unit,
  (i.expiry_date - CURRENT_DATE) as days_until_expiry,
  CASE
    WHEN i.expiry_date < CURRENT_DATE THEN 'Expired'
    WHEN (i.expiry_date - CURRENT_DATE) <= 30 THEN 'Expiring Soon'
    WHEN (i.expiry_date - CURRENT_DATE) <= 90 THEN 'Warning'
    ELSE 'OK'
  END as expiry_status
FROM inventory i
WHERE i.is_active = true
  AND i.business_type = 'pharmacy'
  AND i.expiry_date IS NOT NULL
ORDER BY i.expiry_date ASC;;
CREATE VIEW "accounting"."v_ap_aging"
AS
 SELECT ap.id,
    ap.tenant_id,
    ap.supplier_id,
    s.name AS supplier_name,
    ap.invoice_number,
    ap.invoice_date,
    ap.due_date,
    ap.amount,
    ap.paid_amount,
    ap.balance,
    ap.status,
    (CURRENT_DATE - ap.due_date) AS days_overdue,
        CASE
            WHEN ((ap.status)::text = 'paid'::text) THEN 'Paid'::text
            WHEN (ap.balance = (0)::numeric) THEN 'Fully Paid'::text
            WHEN (CURRENT_DATE > ap.due_date) THEN 'Overdue'::text
            WHEN (((CURRENT_DATE - ap.due_date) >= '-30'::integer) AND ((CURRENT_DATE - ap.due_date) <= 0)) THEN 'Due Soon'::text
            ELSE 'Current'::text
        END AS aging_category
   FROM (accounting.accounts_payable ap
     JOIN suppliers s ON ((s.id = ap.supplier_id)))
  WHERE ((ap.status)::text <> 'cancelled'::text);;
CREATE VIEW "accounting"."v_ar_aging"
AS
 SELECT id,
    tenant_id,
    customer_id,
    customer_name,
    invoice_number,
    invoice_date,
    due_date,
    amount,
    received_amount,
    balance,
    status,
    (CURRENT_DATE - due_date) AS days_overdue,
        CASE
            WHEN ((status)::text = 'paid'::text) THEN 'Collected'::text
            WHEN (balance = (0)::numeric) THEN 'Fully Collected'::text
            WHEN (CURRENT_DATE > due_date) THEN 'Overdue'::text
            WHEN (((CURRENT_DATE - due_date) >= '-30'::integer) AND ((CURRENT_DATE - due_date) <= 0)) THEN 'Due Soon'::text
            ELSE 'Current'::text
        END AS aging_category
   FROM accounting.accounts_receivable ar
  WHERE ((status)::text <> 'bad_debt'::text);;
CREATE TRIGGER "update_inventory_updated_at"
BEFORE UPDATE ON "public"."inventory"
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER "update_purchase_orders_updated_at"
BEFORE UPDATE ON "public"."purchase_orders"
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER "update_inventory_settings_updated_at"
BEFORE UPDATE ON "public"."inventory_settings"
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
