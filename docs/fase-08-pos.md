# Fase 08 — POS

> **Goal**: Point of sale untuk transaksi retail cepat.
> **Dependency**: Fase 01, 02, 04, 05, 07 (posting ke jurnal minimal).
> **Tabel (5)**: pos_terminals, pos_shifts, pos_transactions, pos_transaction_lines, pos_payments
> *Bisa ditukar urutannya dengan Fase 09 bila fokus bisnis manufaktur.*

## Deliverable
- **Architect**: model shift/terminal/transaksi, kontrak OpenAPI, `domain:pos`.
- **Executor**: setup terminals, shift open/close (kas), transaksi+lines (item, diskon, pajak), pembayaran (cash/card/qr), integrasi stock out & AR (cash) & jurnal.
- **Tester**: hitung total & kembalian, kas shift balance, void transaksi, concurrency dua terminal.
- **Validator/Security/QA**: conformity; tenant filter; security (pembatasan shift/terminal), demo transaksi POS (screenshot).

## Acceptance criteria
- [ ] Open shift → transaksi → close shift: kas balance benar.
- [ ] Transaksi POS reduce stock & menciptakan jurnal (invoice).
- [ ] Void/referensi traceable (tidak hapus).
- [ ] Pajak & diskon benar di line/header.

## Dependensi
- Mengirim data ke Sales (transaksi = invoice) & Finance.

## Skill
`tenant-isolation-rules`, `nx-module-boundaries`.