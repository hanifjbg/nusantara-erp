-- Fase 0 — helper partisi bulanan (skill partitioned-table-migration).
-- Dipakai Fase 1 (audit_logs) & Fase 4 (stock_movements): PARTITION BY RANGE bulanan.
-- Idempotent: CREATE TABLE IF NOT EXISTS; aman di-re-run. Tidak pernah DROP.
-- Jika parent table belum ada (mis. sebelum Fase 1), fungsi hanya NOTICE + skip.

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
