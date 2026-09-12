# Fase 19 — Document Management & Legal

> **Goal**: Simpan & versioning dokumen, kontrak & klausul, dokumen legal, perizinan.
> **Dependency**: Fase 01 (user/org), Fase 06 (kontrak) opsional.
> **Tabel (7)**: documents, document_folders, document_versions, contracts, contract_clauses, legal_documents, licenses_permits

## Deliverable
- **Architect**: model folder/dokumen + versioning, `domain:document-legal`.
- **Executor**: CRUD folders, documents (upload, metadata, status), versions (riwayat), contracts + clauses, legal_documents, licenses_permits (masa berlaku + reminder).
- **Tester**: version history & checkout, folder access permission, expiry reminder, contract clause linking.
- **Validator/Security/QA**: conformity; **Security: akses dokumen sesuai org/peran**, privacy; demo (screenshot).

## Acceptance criteria
- [ ] Versioning tidak menghilangkan versi lama.
- [ ] Hak akses folder/dokumen enforced.
- [ ] Expiry licences/perizinan muncul di notifikasi (platform).

## Dependensi
- Biar bisa nyusul — tidak jadi blocker.

## Skill
`tenant-isolation-rules`.