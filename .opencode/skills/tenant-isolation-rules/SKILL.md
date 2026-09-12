---
name: tenant-isolation-rules
description: Aturan wajib filter tenant pada setiap query multi-tenant di nusantara-erp. GUNAKAN saat menulis/mereview kode DB (Drizzle/NestJS) yang menyentuh tabel ber-tenant_id — backend, service, repository, raw query.
---

# Tenant Isolation Rules

Semua tabel memiliki kolom `tenant_id`. **Setiap query** (Query Builder/raw SQL) yang menyentuh tabel ber-`tenant_id` **WAJIB** difilter tenant dari konteks user — RLS aktif, tapi lapisan aplikasi harus juga filter eksplisit.

## Aturan
1. Ambil tenant dari session/auth context (bukan dari `req.body`/params/query).
2. Selalu tambahkan `tenantId` pada `WHERE` / `and(..., eq(table.tenantId, tenant))`.
3. Insert selalu set `tenant_id` dari context, bukan input user.
4. Filter yang dipakai di join anak-anakkan: scoping via parent `tenant_id` (hindari kolom `tenant_id` redundan yang tidak ada di baseline).
5. Update/Delete wajib `WHERE id = ... AND tenant_id = ...`.
6. Helper/repo wajib menerima atau menyelesaikan tenant id dari context — jangan buat overload tanpa tenant.

## Anti-pattern (tolak di review)
- `select().from(table)` tanpa `where`.
- Ambil `tenant_id` dari body/params.
- Query dengan parameter string yang bisa diinterpolasi (selalu parameterized — Drizzle memberi prepared statement).
- Meng-copy kolom `tenant_id` ke `.select()` yang tidak ada di baseline schema.

## Verifikasi (Security/Validator)
- grep query baru → pastikan ada `tenantId`/`tenant_id`.
- Test Tester: tabel multi-tenant wajib punya test yang memverifikasi isolasi (user org A tidak melihat data org B).

## Referensi
- `docs/00-architecture.md`, `schema_nusantara.json` (kolom `tenant_id`), persona `security.md`.