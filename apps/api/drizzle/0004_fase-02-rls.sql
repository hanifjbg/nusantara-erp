-- Fase 2 — RLS untuk tabel master tenant-scoped (idempotent, pola sama Fase 1).
-- price_list_items tanpa tenant_id → policy via EXISTS ke parent price_lists.
--> statement-breakpoint

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'exchange_rates', 'chart_of_accounts', 'fiscal_periods',
    'item_categories', 'items', 'item_variants',
    'units_of_measure', 'uom_conversions',
    'customers', 'customer_contacts', 'customer_addresses',
    'vendors', 'vendor_contacts',
    'warehouses', 'warehouse_zones', 'warehouse_bins',
    'price_lists', 'tax_codes'
  ];
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
--> statement-breakpoint
ALTER TABLE price_list_items ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS price_list_items_tenant_isolation ON price_list_items;
--> statement-breakpoint
CREATE POLICY price_list_items_tenant_isolation ON price_list_items FOR ALL TO PUBLIC
USING (EXISTS (
  SELECT 1 FROM price_lists pl
  WHERE pl.id = price_list_items.price_list_id
    AND pl.tenant_id::text = nullif(current_setting('app.tenant_id', true), '')
))
WITH CHECK (EXISTS (
  SELECT 1 FROM price_lists pl
  WHERE pl.id = price_list_items.price_list_id
    AND pl.tenant_id::text = nullif(current_setting('app.tenant_id', true), '')
));
