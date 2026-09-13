-- Fase 04 — partisi stock_movements + RLS inventory (idempotent, re-run aman).
-- 1) stock_movements → PARTITION BY RANGE (movement_at), pola audit_logs (0000):
--    parent tanpa PK tunggal → PRIMARY KEY (id, movement_at) [syarat PG].
--    Aman: tabel masih 0 baris (fase awal); guard relkind agar re-run skip.
-- 2) Partisi bulan berjalan + bulan depan (dinamis) + DEFAULT.
-- 3) RLS tenant-isolation di 6 tabel inventory (pola 0006).
--> statement-breakpoint
DO $$
DECLARE
  is_part boolean;
  cur_start date := date_trunc('month', now())::date;
  nxt_start date := date_trunc('month', (now() + interval '1 month'))::date;
  nxt_end   date := date_trunc('month', (now() + interval '2 months'))::date;
BEGIN
  SELECT (relkind = 'p') INTO is_part FROM pg_class WHERE relname = 'stock_movements';
  IF is_part IS NOT TRUE THEN
    DROP TABLE IF EXISTS stock_movements;
    CREATE TABLE "stock_movements" (
      "id" uuid DEFAULT gen_random_uuid() NOT NULL,
      "tenant_id" uuid NOT NULL,
      "item_id" uuid NOT NULL,
      "warehouse_id" uuid,
      "from_warehouse_id" uuid,
      "to_warehouse_id" uuid,
      "batch_lot_id" uuid,
      "serial_number" varchar,
      "movement_type" varchar NOT NULL,
      "quantity" numeric(19,4) NOT NULL,
      "unit_cost" numeric(19,4),
      "reference_type" varchar,
      "reference_id" uuid,
      "movement_at" timestamp with time zone DEFAULT now() NOT NULL,
      "row_version" integer DEFAULT 1 NOT NULL,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
      "created_by" uuid,
      "updated_by" uuid,
      "deleted_at" timestamp with time zone,
      CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id", "movement_at"),
      CONSTRAINT "stock_movements_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action,
      CONSTRAINT "stock_movements_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action,
      CONSTRAINT "stock_movements_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE set null ON UPDATE no action,
      CONSTRAINT "stock_movements_from_warehouse_id_warehouses_id_fk" FOREIGN KEY ("from_warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE set null ON UPDATE no action,
      CONSTRAINT "stock_movements_to_warehouse_id_warehouses_id_fk" FOREIGN KEY ("to_warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE set null ON UPDATE no action,
      CONSTRAINT "stock_movements_batch_lot_id_batch_lots_id_fk" FOREIGN KEY ("batch_lot_id") REFERENCES "public"."batch_lots"("id") ON DELETE set null ON UPDATE no action
    ) PARTITION BY RANGE ("movement_at");
    CREATE INDEX IF NOT EXISTS "stock_movements_tenant_idx" ON "stock_movements" ("tenant_id");
    CREATE INDEX IF NOT EXISTS "stock_movements_item_idx" ON "stock_movements" ("item_id");
    CREATE INDEX IF NOT EXISTS "stock_movements_warehouse_idx" ON "stock_movements" ("warehouse_id");
    CREATE INDEX IF NOT EXISTS "stock_movements_movement_at_idx" ON "stock_movements" ("movement_at");
  END IF;

  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS %I PARTITION OF stock_movements FOR VALUES FROM (%L) TO (%L)',
    'stock_movements_p' || to_char(cur_start, 'YYYY_MM'), cur_start, nxt_start
  );
  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS %I PARTITION OF stock_movements FOR VALUES FROM (%L) TO (%L)',
    'stock_movements_p' || to_char(nxt_start, 'YYYY_MM'), nxt_start, nxt_end
  );
  EXECUTE 'CREATE TABLE IF NOT EXISTS stock_movements_p_default PARTITION OF stock_movements DEFAULT';
  PERFORM ensure_next_month_partition('stock_movements');
END;
$$;
--> statement-breakpoint
DO $$
DECLARE
  t text;
  tables text[] := ARRAY['stock_balances', 'stock_movements', 'stock_transfers', 'stock_opnames', 'serial_numbers', 'batch_lots'];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_tenant_isolation', t);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR ALL TO PUBLIC USING (tenant_id::text = nullif(current_setting(%L, true), %L)) WITH CHECK (tenant_id::text = nullif(current_setting(%L, true), %L))',
      t || '_tenant_isolation', t, 'app.tenant_id', '', 'app.tenant_id', ''
    );
  END LOOP;
END;
$$;
