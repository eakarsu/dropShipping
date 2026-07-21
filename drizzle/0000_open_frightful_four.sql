CREATE TABLE "ai_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"merchant_id" varchar(64) DEFAULT 'legacy-quarantine' NOT NULL,
	"tool" varchar(64) NOT NULL,
	"input_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"output_text" text DEFAULT '' NOT NULL,
	"model" varchar(128) DEFAULT '' NOT NULL,
	"tokens_used" integer DEFAULT 0 NOT NULL,
	"status" varchar(16) DEFAULT 'ok' NOT NULL,
	"error_message" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" serial PRIMARY KEY NOT NULL,
	"merchant_id" varchar(64) DEFAULT 'legacy-quarantine' NOT NULL,
	"name" varchar(200) NOT NULL,
	"channel" varchar(32) NOT NULL,
	"status" varchar(32) DEFAULT 'draft' NOT NULL,
	"budget" numeric(10, 2) DEFAULT '0' NOT NULL,
	"spent" numeric(10, 2) DEFAULT '0' NOT NULL,
	"impressions" integer DEFAULT 0 NOT NULL,
	"clicks" integer DEFAULT 0 NOT NULL,
	"conversions" integer DEFAULT 0 NOT NULL,
	"copy" text DEFAULT '' NOT NULL,
	"starts_at" timestamp,
	"ends_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "channels" (
	"id" serial PRIMARY KEY NOT NULL,
	"merchant_id" varchar(64) DEFAULT 'legacy-quarantine' NOT NULL,
	"platform" varchar(32) NOT NULL,
	"store_name" varchar(200) NOT NULL,
	"store_url" varchar(500) DEFAULT '' NOT NULL,
	"status" varchar(32) DEFAULT 'connected' NOT NULL,
	"api_key_masked" varchar(64) DEFAULT '' NOT NULL,
	"total_listings" integer DEFAULT 0 NOT NULL,
	"monthly_revenue" numeric(10, 2) DEFAULT '0' NOT NULL,
	"connected_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"merchant_id" varchar(64) DEFAULT 'legacy-quarantine' NOT NULL,
	"email" varchar(320) NOT NULL,
	"name" varchar(200) NOT NULL,
	"phone" varchar(64) DEFAULT '' NOT NULL,
	"country" varchar(80) DEFAULT '' NOT NULL,
	"total_orders" integer DEFAULT 0 NOT NULL,
	"total_spent" numeric(10, 2) DEFAULT '0' NOT NULL,
	"segment" varchar(32) DEFAULT 'new' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory" (
	"id" serial PRIMARY KEY NOT NULL,
	"merchant_id" varchar(64) DEFAULT 'legacy-quarantine' NOT NULL,
	"product_id" integer NOT NULL,
	"warehouse" varchar(64) DEFAULT 'default' NOT NULL,
	"on_hand" integer DEFAULT 0 NOT NULL,
	"reserved" integer DEFAULT 0 NOT NULL,
	"reorder_point" integer DEFAULT 10 NOT NULL,
	"reorder_qty" integer DEFAULT 50 NOT NULL,
	"last_restocked_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "order_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"merchant_id" varchar(64) NOT NULL,
	"order_id" integer NOT NULL,
	"actor_user_id" integer,
	"action" varchar(64) NOT NULL,
	"from_state" varchar(32) NOT NULL,
	"to_state" varchar(32) NOT NULL,
	"idempotency_key" varchar(160) NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"previous_hash" varchar(64),
	"event_hash" varchar(64) NOT NULL,
	"signature" varchar(64) NOT NULL,
	"signing_key_id" varchar(64) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"merchant_id" varchar(64) DEFAULT 'legacy-quarantine' NOT NULL,
	"order_number" varchar(64) NOT NULL,
	"idempotency_key" varchar(128) NOT NULL,
	"channel" varchar(32) NOT NULL,
	"customer_id" integer,
	"total" numeric(10, 2) DEFAULT '0' NOT NULL,
	"status" varchar(32) DEFAULT 'draft' NOT NULL,
	"payment_status" varchar(32) DEFAULT 'unpaid' NOT NULL,
	"fulfillment_status" varchar(32) DEFAULT 'unfulfilled' NOT NULL,
	"refund_status" varchar(32) DEFAULT 'none' NOT NULL,
	"currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"subtotal" numeric(12, 2) DEFAULT '0' NOT NULL,
	"tax_total" numeric(12, 2) DEFAULT '0' NOT NULL,
	"shipping_total" numeric(12, 2) DEFAULT '0' NOT NULL,
	"row_version" integer DEFAULT 1 NOT NULL,
	"exception_code" varchar(64),
	"items_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"shipping_address" text DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pricing_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"merchant_id" varchar(64) DEFAULT 'legacy-quarantine' NOT NULL,
	"name" varchar(200) NOT NULL,
	"scope" varchar(32) DEFAULT 'global' NOT NULL,
	"scope_value" varchar(200) DEFAULT '' NOT NULL,
	"strategy" varchar(32) DEFAULT 'markup' NOT NULL,
	"markup_pct" numeric(5, 2) DEFAULT '0' NOT NULL,
	"min_margin_pct" numeric(5, 2) DEFAULT '10' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"merchant_id" varchar(64) DEFAULT 'legacy-quarantine' NOT NULL,
	"sku" varchar(64) NOT NULL,
	"title" varchar(300) NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"category" varchar(80) NOT NULL,
	"cost" numeric(10, 2) DEFAULT '0' NOT NULL,
	"price" numeric(10, 2) DEFAULT '0' NOT NULL,
	"image_url" varchar(500) DEFAULT '' NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" varchar(32) DEFAULT 'active' NOT NULL,
	"supplier_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "refunds" (
	"id" serial PRIMARY KEY NOT NULL,
	"merchant_id" varchar(64) NOT NULL,
	"order_id" integer NOT NULL,
	"idempotency_key" varchar(160) NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"status" varchar(24) DEFAULT 'pending' NOT NULL,
	"provider_reference" varchar(160),
	"failure_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "returns" (
	"id" serial PRIMARY KEY NOT NULL,
	"merchant_id" varchar(64) DEFAULT 'legacy-quarantine' NOT NULL,
	"order_id" integer NOT NULL,
	"reason" varchar(64) NOT NULL,
	"detail" text DEFAULT '' NOT NULL,
	"status" varchar(32) DEFAULT 'requested' NOT NULL,
	"refund_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"merchant_id" varchar(64) DEFAULT 'legacy-quarantine' NOT NULL,
	"product_id" integer NOT NULL,
	"customer_name" varchar(200) NOT NULL,
	"rating" integer DEFAULT 5 NOT NULL,
	"title" varchar(200) DEFAULT '' NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"channel" varchar(32) DEFAULT 'shopify' NOT NULL,
	"sentiment" varchar(16) DEFAULT 'unknown' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shipments" (
	"id" serial PRIMARY KEY NOT NULL,
	"merchant_id" varchar(64) DEFAULT 'legacy-quarantine' NOT NULL,
	"order_id" integer NOT NULL,
	"carrier" varchar(64) DEFAULT 'USPS' NOT NULL,
	"tracking_number" varchar(128) DEFAULT '' NOT NULL,
	"status" varchar(32) DEFAULT 'label_created' NOT NULL,
	"cost" numeric(10, 2) DEFAULT '0' NOT NULL,
	"shipped_at" timestamp,
	"delivered_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" serial PRIMARY KEY NOT NULL,
	"merchant_id" varchar(64) DEFAULT 'legacy-quarantine' NOT NULL,
	"name" varchar(200) NOT NULL,
	"country" varchar(80) NOT NULL,
	"contact_email" varchar(320) NOT NULL,
	"contact_phone" varchar(64) DEFAULT '' NOT NULL,
	"rating" numeric(2, 1) DEFAULT '0' NOT NULL,
	"lead_time_days" integer DEFAULT 7 NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"status" varchar(32) DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"merchant_id" varchar(64) DEFAULT 'legacy-quarantine' NOT NULL,
	"email" varchar(320) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"name" varchar(200) NOT NULL,
	"role" varchar(32) DEFAULT 'operator' NOT NULL,
	"customer_id" integer,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "webhook_receipts" (
	"id" serial PRIMARY KEY NOT NULL,
	"merchant_id" varchar(64) NOT NULL,
	"provider" varchar(32) NOT NULL,
	"provider_event_id" varchar(160) NOT NULL,
	"payload_hash" varchar(64) NOT NULL,
	"status" varchar(24) DEFAULT 'received' NOT NULL,
	"error" text,
	"processed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "customers_merchant_email_uidx" ON "customers" USING btree ("merchant_id","email");--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_merchant_product_warehouse_uidx" ON "inventory" USING btree ("merchant_id","product_id","warehouse");--> statement-breakpoint
CREATE UNIQUE INDEX "order_events_merchant_idempotency_uidx" ON "order_events" USING btree ("merchant_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "order_events_merchant_order_idx" ON "order_events" USING btree ("merchant_id","order_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_merchant_number_uidx" ON "orders" USING btree ("merchant_id","order_number");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_merchant_idempotency_uidx" ON "orders" USING btree ("merchant_id","idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "products_merchant_sku_uidx" ON "products" USING btree ("merchant_id","sku");--> statement-breakpoint
CREATE UNIQUE INDEX "refunds_merchant_idempotency_uidx" ON "refunds" USING btree ("merchant_id","idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "webhook_receipts_provider_event_uidx" ON "webhook_receipts" USING btree ("provider","provider_event_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "users_merchant_id_uidx" ON "users" ("merchant_id","id");
--> statement-breakpoint
CREATE UNIQUE INDEX "customers_merchant_id_uidx" ON "customers" ("merchant_id","id");
--> statement-breakpoint
CREATE UNIQUE INDEX "suppliers_merchant_id_uidx" ON "suppliers" ("merchant_id","id");
--> statement-breakpoint
CREATE UNIQUE INDEX "products_merchant_id_uidx" ON "products" ("merchant_id","id");
--> statement-breakpoint
CREATE UNIQUE INDEX "orders_merchant_id_uidx" ON "orders" ("merchant_id","id");
--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_role_check" CHECK ("role" IN ('customer','operator','merchant_admin'));
--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_customer_role_check" CHECK (("role"='customer' AND "customer_id" IS NOT NULL) OR ("role"<>'customer' AND "customer_id" IS NULL));
--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_customer_tenant_fk" FOREIGN KEY ("merchant_id","customer_id") REFERENCES "customers"("merchant_id","id");
--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_nonnegative_check" CHECK ("on_hand" >= 0 AND "reserved" >= 0 AND "reserved" <= "on_hand");
--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_state_check" CHECK ("status" IN ('draft','reserved','payment_pending','paid','payment_failed','partially_fulfilled','fulfilled','delivered','cancelled','refund_pending','refunded','refund_failed','exception'));
--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_totals_check" CHECK ("total" >= 0 AND "subtotal" >= 0 AND "tax_total" >= 0 AND "shipping_total" >= 0 AND "row_version" > 0);
--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refund_amount_check" CHECK ("amount" > 0);
--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_supplier_tenant_fk" FOREIGN KEY ("merchant_id","supplier_id") REFERENCES "suppliers"("merchant_id","id");
--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_product_tenant_fk" FOREIGN KEY ("merchant_id","product_id") REFERENCES "products"("merchant_id","id");
--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_tenant_fk" FOREIGN KEY ("merchant_id","customer_id") REFERENCES "customers"("merchant_id","id");
--> statement-breakpoint
ALTER TABLE "order_events" ADD CONSTRAINT "order_events_order_tenant_fk" FOREIGN KEY ("merchant_id","order_id") REFERENCES "orders"("merchant_id","id");
--> statement-breakpoint
ALTER TABLE "order_events" ADD CONSTRAINT "order_events_actor_tenant_fk" FOREIGN KEY ("merchant_id","actor_user_id") REFERENCES "users"("merchant_id","id");
--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_order_tenant_fk" FOREIGN KEY ("merchant_id","order_id") REFERENCES "orders"("merchant_id","id");
--> statement-breakpoint
ALTER TABLE "returns" ADD CONSTRAINT "returns_order_tenant_fk" FOREIGN KEY ("merchant_id","order_id") REFERENCES "orders"("merchant_id","id");
--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_order_tenant_fk" FOREIGN KEY ("merchant_id","order_id") REFERENCES "orders"("merchant_id","id");
--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_product_tenant_fk" FOREIGN KEY ("merchant_id","product_id") REFERENCES "products"("merchant_id","id");
--> statement-breakpoint
CREATE FUNCTION reject_order_event_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'order event history is append-only'; END;
$$;
--> statement-breakpoint
CREATE TRIGGER order_events_append_only BEFORE UPDATE OR DELETE ON "order_events"
FOR EACH ROW EXECUTE FUNCTION reject_order_event_mutation();
--> statement-breakpoint
CREATE FUNCTION reject_refund_delete() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'refund records cannot be deleted'; END;
$$;
--> statement-breakpoint
CREATE TRIGGER refunds_no_delete BEFORE DELETE ON "refunds"
FOR EACH ROW EXECUTE FUNCTION reject_refund_delete();
