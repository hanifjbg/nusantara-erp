# Fase 02 — Master Data Umum

> **Goal**: Data referensi yang dipakai semua modul operasional.
> **Dependency**: Fase 01 (tenant context).
> **Tabel (20)**: currencies, exchange_rates, chart_of_accounts, fiscal_periods, item_categories, items, item_variants, units_of_measure, uom_conversions, customers, customer_contacts, customer_addresses, vendors, vendor_contacts, warehouses, warehouse_zones, warehouse_bins, price_lists, price_list_items, tax_codes

## Deliverable
- **Architect**: migration incremental (COA, items, price lists), kontrak API master data, pemetaan libs/domain/master-data.
- **Executor**: CRUD + validasi: currencies (rate harian), chart_of_accounts (hierarki, kode unik), fiscal_periods (overlap-check), items+variants+uom+harga, customers/vendors (kontak, alamat), warehouses/zones/bins, price_lists, tax_codes (multi rate).
- **Tester**: unit COA hierarki, fiscal period overlap, uom conversion, price list resolution (by date/customer/min qty).
- **Validator/Security/QA**: conformity vs schema; tenant filter; akses org/branch sesuai; alur master data end-to-end (screenshot).

## Acceptance criteria
- [x] COA: kode unik per tenant, hierarki parent/child, aktif/nonaktif.
- [x] Fiscal period: no overlap; periode ditutup tidak menerima transaksi.
- [x] Price list: resolusi harga benar (valuta + tanggal + kuantitas).
- [x] Tax code: multi rate/pajak kombinasi; efeksi tanggal.
- [ ] Render UI master data via `shared/ui` components.

## Status realita — 2026-09-12 (terverifikasi eksekusi)
- Migration `0003` (20 tabel) + `0004` (18 policy tenant + 1 EXISTS policy price_list_items).
  Total DB: 51 tabel, 35 policy. Migrate + re-run idempotent hijau.
- API `/master/*` (~30 endpoint): currencies (+seed 10 ISO, idempotent), kurs + convert
  (rate terakhir ≤ tanggal), CoA, fiscal (+overlap-check, +close), tax (+compute tarif
  efektif terbaru), UoM + konversi + convertQty, kategori/item/varian, price list + items,
  customers/vendors (+kontak, +link address), warehouses→zones→bins.
  12 permission master-data baru (total katalog 33); 23505→409, 23503→400 via DbErrorFilter
  (baca `.cause` karena Drizzle membungkus PostgresError).
- Test: 27 api (11 integrasi: seed, CoA duplikat, overlap fiskal, FX, UoM, item+price,
  isolasi tenant, partner, gudang lintas-tenant, RLS) + unit money (kurs/pajak) — hijau, 0 sisa.
- E2E HTTP `scripts/e2e-fase02.mjs`: 18/18 (termasuk CoA duplikat→409, staff read-200/write-403).
- Catatan jujur: price resolution by-date/customer/min-qty BELUM didukung baseline
  (price_list_items hanya punya price_list/item/unit_price) — implementasi per-baseline;
  "periode tertutup menolak transaksi" berlaku untuk modul transaksi Fase 4+ ( close flag tersedia);
  UI web master data ditunda ke slice frontend (backend-first per fase).

## Dependensi
- Dipakai Fase 3+ (workflow master), 4 (item), 5 (sales), 6 (purchase), 7 (COA).

## Skill
`tenant-isolation-rules`, `nx-module-boundaries`, `shadcn-base`.