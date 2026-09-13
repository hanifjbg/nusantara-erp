-- Fase 1 — functions + RLS (idempotent, aman di-re-run).
-- 1) ensure_next_month_partition: helper partisi bulanan (dipakai audit_logs Fase 1,
--    stock_movements Fase 4; job otomatis di domain platform Fase 21).
-- 2) next_number: increment nomor dokumen atomik per (tenant, document_type, org?).
-- 3) RLS: isolasi baris per tenant untuk role app non-owner via setting 'app.tenant_id'.
--    Service layer tetap filter eksplisit (pertahanan berlapis); owner (dev lokal) bypass RLS.
--> statement-breakpoint

CREATE OR REPLACE FUNCTION ensure_next_month_partition(parent_table text)
RETURNS text AS $$
DECLARE
  next_start date := date_trunc('month', (now() + interval '1 month'))::date;
  next_end   date := (date_trunc('month', (now() + interval '2 months')))::date;
  part_name  text := parent_table || '_p' || to_char(next_start, 'YYYY_MM');
  parent_oid regclass;
  created    text;
BEGIN
  SELECT to_regclass(parent_table) INTO parent_oid;
  IF parent_oid IS NULL THEN
    RAISE NOTICE 'ensure_next_month_partition: % belum ada, skip', parent_table;
    RETURN 'skipped:' || parent_table;
  END IF;

  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS %I PARTITION OF %I FOR VALUES FROM (%L) TO (%L)',
    part_name, parent_table, next_start, next_end
  );
  created := 'ensured:' || part_name;
  RAISE NOTICE '%', created;
  RETURN created;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION next_number(p_tenant_id uuid, p_document_type varchar, p_organization_id uuid DEFAULT NULL)
RETURNS bigint AS $$
DECLARE
  v_next bigint;
BEGIN
  IF p_organization_id IS NULL THEN
    UPDATE number_sequences
       SET current_number = current_number + 1, updated_at = now()
     WHERE tenant_id = p_tenant_id
       AND document_type = p_document_type
       AND organization_id IS NULL
       AND deleted_at IS NULL
    RETURNING current_number INTO v_next;
  ELSE
    UPDATE number_sequences
       SET current_number = current_number + 1, updated_at = now()
     WHERE tenant_id = p_tenant_id
       AND document_type = p_document_type
       AND organization_id = p_organization_id
       AND deleted_at IS NULL
    RETURNING current_number INTO v_next;
  END IF;

  IF v_next IS NULL THEN
    RAISE EXCEPTION 'number_sequences tidak ditemukan (tenant=%, doc=%, org=%)', p_tenant_id, p_document_type, p_organization_id;
  END IF;
  RETURN v_next;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint

-- RLS per tabel tenant-scoped (policy memakai app.tenant_id; unset => NULL => deny).
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'tenant_settings', 'feature_flags', 'users', 'roles',
    'organizations', 'branches', 'departments', 'cost_centers',
    'reporting_lines', 'job_positions', 'job_grades', 'addresses',
    'number_sequences', 'custom_field_definitions', 'custom_field_values',
    'audit_logs'
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
