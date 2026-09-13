-- Fase 04 Inventory & Stock — tabel dasar (DDL saja; partisi + RLS menyusul 0009).
-- Catatan: stock_movements sudah ada di DB (bawaan backup); di sini hanya
-- dilengkapi FK batch_lot_id secara idempoten. 5 tabel lain dibuat baru.
--> statement-breakpoint
CREATE TABLE "batch_lots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"warehouse_id" uuid,
	"batch_no" varchar NOT NULL,
	"quantity" numeric(19,4) DEFAULT 0 NOT NULL,
	"unit_cost" numeric(19,4) DEFAULT 0 NOT NULL,
	"manufactured_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"row_version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "serial_numbers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"warehouse_id" uuid,
	"serial_no" varchar NOT NULL,
	"status" varchar DEFAULT 'active' NOT NULL,
	"location" varchar,
	"row_version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "stock_balances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"warehouse_id" uuid,
	"quantity" numeric(19,4) DEFAULT 0 NOT NULL,
	"unit_cost" numeric(19,4) DEFAULT 0 NOT NULL,
	"valued_cost" numeric(19,4) DEFAULT 0 NOT NULL,
	"location" varchar,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"row_version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "stock_transfers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"source_warehouse_id" uuid NOT NULL,
	"target_warehouse_id" uuid NOT NULL,
	"transfer_no" varchar NOT NULL,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"completed_at" timestamp with time zone,
	"approved_at" timestamp with time zone,
	"row_version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "stock_opnames" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"warehouse_id" uuid,
	"opname_no" varchar NOT NULL,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"counted_at" timestamp with time zone,
	"approved_at" timestamp with time zone,
	"row_version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "batch_lots" ADD CONSTRAINT "batch_lots_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "batch_lots" ADD CONSTRAINT "batch_lots_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "batch_lots" ADD CONSTRAINT "batch_lots_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "serial_numbers" ADD CONSTRAINT "serial_numbers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "serial_numbers" ADD CONSTRAINT "serial_numbers_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "serial_numbers" ADD CONSTRAINT "serial_numbers_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "stock_balances" ADD CONSTRAINT "stock_balances_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "stock_balances" ADD CONSTRAINT "stock_balances_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "stock_balances" ADD CONSTRAINT "stock_balances_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_source_warehouse_id_warehouses_id_fk" FOREIGN KEY ("source_warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_target_warehouse_id_warehouses_id_fk" FOREIGN KEY ("target_warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "stock_opnames" ADD CONSTRAINT "stock_opnames_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "stock_opnames" ADD CONSTRAINT "stock_opnames_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "batch_lots_tenant_no_uidx" ON "batch_lots" USING btree ("tenant_id","batch_no") WHERE "batch_lots"."deleted_at" IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "serial_numbers_tenant_no_uidx" ON "serial_numbers" USING btree ("tenant_id","serial_no") WHERE "serial_numbers"."deleted_at" IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "stock_balances_tenant_item_wh_uidx" ON "stock_balances" USING btree ("tenant_id","item_id","warehouse_id") WHERE "stock_balances"."deleted_at" IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "stock_transfers_tenant_no_uidx" ON "stock_transfers" USING btree ("tenant_id","transfer_no") WHERE "stock_transfers"."deleted_at" IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "stock_opnames_tenant_no_uidx" ON "stock_opnames" USING btree ("tenant_id","opname_no") WHERE "stock_opnames"."deleted_at" IS NULL;
--> statement-breakpoint
CREATE INDEX "batch_lots_tenant_idx" ON "batch_lots" USING btree ("tenant_id");
--> statement-breakpoint
CREATE INDEX "batch_lots_item_idx" ON "batch_lots" USING btree ("item_id");
--> statement-breakpoint
CREATE INDEX "batch_lots_expires_idx" ON "batch_lots" USING btree ("expires_at") WHERE "expires_at" IS NOT NULL;
--> statement-breakpoint
CREATE INDEX "serial_numbers_tenant_idx" ON "serial_numbers" USING btree ("tenant_id");
--> statement-breakpoint
CREATE INDEX "serial_numbers_item_idx" ON "serial_numbers" USING btree ("item_id");
--> statement-breakpoint
CREATE INDEX "stock_balances_tenant_idx" ON "stock_balances" USING btree ("tenant_id");
--> statement-breakpoint
CREATE INDEX "stock_balances_item_idx" ON "stock_balances" USING btree ("item_id");
--> statement-breakpoint
CREATE INDEX "stock_transfers_tenant_idx" ON "stock_transfers" USING btree ("tenant_id");
--> statement-breakpoint
CREATE INDEX "stock_transfers_status_idx" ON "stock_transfers" USING btree ("status");
--> statement-breakpoint
CREATE INDEX "stock_opnames_tenant_idx" ON "stock_opnames" USING btree ("tenant_id");
--> statement-breakpoint
CREATE INDEX "stock_opnames_status_idx" ON "stock_opnames" USING btree ("status");
--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'stock_movements_batch_lot_id_batch_lots_id_fk') THEN
		ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_batch_lot_id_batch_lots_id_fk" FOREIGN KEY ("batch_lot_id") REFERENCES "public"."batch_lots"("id") ON DELETE set null ON UPDATE no action;
	END IF;
END
$$;
