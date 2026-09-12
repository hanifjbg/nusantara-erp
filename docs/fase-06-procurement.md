# Fase 06 — Procurement

> **Goal**: Mirror sisi beli dari Sales — requisition → PO → goods receipt, evaluasi vendor.
> **Dependency**: Fase 01, 02 (vendors, items), 03 (approval), 04 (stock in).
> **Tabel (9)**: vendor_evaluations, vendor_quotations, purchase_requisitions, purchase_requisition_lines, request_for_quotations, purchase_orders, purchase_order_lines, goods_receipts, procurement_contracts

## Deliverable
- **Architect**: alur PR→RFQ→PO→GR, kontrak OpenAPI, `domain:procurement`, integrasi stock in.
- **Executor**: PR (approval), RFQ (vendor quotation), PO (konversi), GR (diterima lantas stock in), vendor_evaluations (skor), procurement_contracts.
- **Tester**: alur dokumen, perbandingan quotation vendor, GR → stock in, partial receive, po closure.
- **Validator/Security/QA**: conformity; tenant filter; role approve; demo alur (screenshot).

## Acceptance criteria
- [ ] PR → (workflow) → RFQ → pilih vendor → PO → GR.
- [ ] GR memicu stock masuk (Fase 4) secara atomic & benar.
- [ ] Partial/reject handling di GR.
- [ ] Evaluasi vendor (skor) tercatat.

## Dependensi
- Finance Fase 7 (ap_invoices dari PO/GR).

## Skill
`tenant-isolation-rules`, `nx-module-boundaries`.