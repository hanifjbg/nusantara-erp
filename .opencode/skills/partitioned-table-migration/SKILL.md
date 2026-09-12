---
name: partitioned-table-migration
description: Pola migration untuk tabel partition bulanan (audit_logs_p*, stock_movements_p*) di nusantara-erp — idempotent + job otomatis buat partisi bulan depan. GUNAKAN saat menulis migration/infra partisi Drizzle.
---

# Partitioned Table Migration

Tabel `audit_logs` dan `stock_movements` di-`PARTITION BY RANGE` bulanan (`audit_logs_p*`, `stock_movements_p*`). Migration harus **idempotent** dan ada **job otomatis** yang menyiapkan partisi bulan mendatang.

## Prinsip
1. **Idempotent**: `CREATE TABLE IF NOT EXISTS` untuk partisi; re-run tanpa error.
2. Partisi default/holder bulan berikutnya disiapkan minimal N bulan ke depan.
3. Migration baru yang hanya menambah partisi bulan X = aman dijalankan kapan pun.
4. Jangan ever `DROP` partisi lama tanpa aturan retensi + izin (data audit).

## Pola SQL (Drizzle raw migration)
```sql
-- partisi per bulan (contoh)
CREATE TABLE IF NOT EXISTS audit_logs_p2026_09
  PARTITION OF audit_logs
  FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');

-- job: di domain platform (Fase 21) atau skrip ciplak DevOps
CREATE OR REPLACE FUNCTION create_next_month_partition(tbl regclass)
RETURNS void AS $$
DECLARE
  n record;
BEGIN
  -- loop: evaluasi partition key, buat partisi +1 (dan +2/+3) bulan jika belum ada
END;
$$ LANGUAGE plpgsql;
```

## Aturan implementasi
- Gunakan pola dari `docs/00-architecture.md` (bagian partisi) & blueprint 2.1/6.
- Migration default untuk fase lain TIDAK menyentuh partisi.
- Job partisi masuk domain `platform` (Fase 21) tapi infrastruktur-nya disiapkan DevOps di **Fase 0** (cron local + Vercel Cron daily untuk Vercel).

## Verifikasi
- Re-run migration dua kali tanpa error.
- `dtk`/psql: partisi bulan berjalan & bulan depan ada.
- Test idempotency di CI bila feasible.

## Referensi
`docs/fase-21-platform.md`, blueprint Bagian 2.1/6, `schema_nusantara.json` (lihat partisi `*_p*`).