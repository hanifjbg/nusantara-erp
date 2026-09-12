# Fase 13 — Fixed Assets

> **Goal**: Pencatatan aset tetap + depresiasi, disposal.
> **Dependency**: Fase 01, 02, 07 (GL posting), 10 (pemegang/employee).
> **Tabel (4)**: asset_categories, fixed_assets, asset_depreciation_schedules, asset_disposals

## Deliverable
- **Architect**: model aset & jadwal depresiasi (metode: straight-line, dst sesuai kategori), kontrak OpenAPI, `domain:fixed-assets`.
- **Executor**: CRUD aset (cost, tanggal perolehan, kategori, masa manfaat), generate depreciation schedule, running depreciation periodik (posting ke GL), disposals.
- **Tester**: perhitungan depresiasi per metode & bulan, stop-list di disposal, posting benar, roll-forward.
- **Validator/Security/QA**: conformity; tenant filter; demo: tambah aset → depresiasi → disposal (screenshot).

## Acceptance criteria
- [ ] Depresiasi bulanan akurat & posting ke GL.
- [ ] Disposal: saldo bersih & gain/loss tidak meleset.
- [ ] Aset per kategori/lokasi (org/warehouse) dapat dilihat.

## Dependensi
- Finance Fase 7.

## Skill
`tenant-isolation-rules`, `nx-module-boundaries`.