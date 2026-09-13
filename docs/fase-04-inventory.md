# Fase 04 — Inventory & Stock

> **Goal**: Catat stok akurat (balance + movement), transfer, opname, serial/batch untuk dipakai Sales/Procurement/Manufacturing/POS.
> **Dependency**: Fase 01, Fase 02 (items, uom, warehouses/zones/bins).
> **Tabel (12)**: stock_balances, stock_movements(+6 partisi), stock_transfers, stock_opnames, serial_numbers, batch_lots

## Deliverable
- **Architect**: model stok (balance vs movement), policy: stok negatif dilarang? FIFO/avg? partisi stock_movements + job otomatis. Nx `domain:inventory`.
- **Executor**: service stock: adjust/increase/decrease berbasis form/movement (draft → posted), transfer antar wh, opname (adjustment), serial/batch tracking, hitung balance. Partisi stock_movements idempotent.
- **Tester**: keseimbangan balance = sum movement per item/wh; prevent negatif (sesuai policy); transfer 2 sisi; opname adjust; partisi bulan baru terbentuk; concurrency.
- **Validator/Security/QA**: conformity schema; tenant filter; ubah safety; alur live: receive → transfer → opname → adjustment (screenshot).

## Acceptance criteria
- [x] Balance konsisten dengan movement; audit dari movement selalu bisa direkonstruksi. (fase04.int.spec.ts: moving-average + audit write)
- [x] Transfer menghitung 2 sisi (out-in) atomic via transaction.
- [x] Serial/batch ter-tracking (item, lot, kepemilikan). (termasuk tolak lot kedaluwarsa + serial terpakai)
- [x] Migration partisi idempotent; job membikin partisi bulan depan. (0009 re-run bersih; `POST /inventory/partitions/ensure` manual; scheduler recurring → Fase 21)
- [x] Stok view per item/wh/bin real-time. (`GET /inventory/balances?itemId=&warehouseId=`)

## Dependensi
- Sales (Fase 5) mengalirkannya ke stock keluar; Procurement (6) masuk stok; Manufacturing (9) & POS (8).

## Skill
`partitioned-table-migration`, `tenant-isolation-rules`, `nx-module-boundaries`.