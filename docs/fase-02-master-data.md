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
- [ ] COA: kode unik per tenant, hierarki parent/child, aktif/nonaktif.
- [ ] Fiscal period: no overlap; periode ditutup tidak menerima transaksi.
- [ ] Price list: resolusi harga benar (valuta + tanggal + kuantitas).
- [ ] Tax code: multi rate/pajak kombinasi; efeksi tanggal.
- [ ] Render UI master data via `shared/ui` components.

## Dependensi
- Dipakai Fase 3+ (workflow master), 4 (item), 5 (sales), 6 (purchase), 7 (COA).

## Skill
`tenant-isolation-rules`, `nx-module-boundaries`, `shadcn-base`.