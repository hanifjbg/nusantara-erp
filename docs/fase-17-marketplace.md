# Fase 17 — Marketplace Integration

> **Goal**: Integrasi ke marketplace (produk, order) setelah Sales & Inventory solid.
> **Dependency**: Fase 01, 02 (items), 04 (stock), 05 (orders).
> **Tabel (3)**: marketplace_connections, marketplace_orders, marketplace_product_mappings

## Deliverable
- **Architect**: model koneksi (channel, credential terenkripsi), mapping produk, order. `domain:marketplace`.
- **Executor**: CRUD connections (credentials di secret manager, bukan DB biasa untuk token), product mappings (SKU lokal ↔ SKU marketplace), marketplace_orders (import order → create SO via Fase 5), sync status.
- **Tester**: mapping resolve, order import & dedup, update stok after marketplace order.
- **Validator/Security/QA**: conformity; **Security fokus: token API marketplace tidak bocor / terencgran di DB biasa**, tenant filter; demo (screenshot).

## Acceptance criteria
- [ ] Order marketplace masuk → SO & stok ter-update.
- [ ] Mapping cadangan & reversal jelas.
- [ ] Kredensial channel dienkripsi/disimpan aman.

## Dependensi
- Sales Fase 5 & Inventory Fase 4.

## Skill
`tenant-isolation-rules`, `nx-module-boundaries`.