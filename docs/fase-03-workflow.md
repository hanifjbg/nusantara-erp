# Fase 03 — Workflow Engine (skeleton)

> **Goal**: Engine approval generik yang dipakai PR/PO/cuti/claim — dibangun basic di fase ini, diperluas per kebutuhan fase berikut.
> **Dependency**: Fase 01 (tenant, user, org), Fase 02 (optional config).
> **Tabel (4)**: workflow_definitions, workflow_steps, workflow_instances, workflow_approval_actions

## Deliverable
- **Architect**: desain engine (definisi → step → instance → action), API template `POST /workflow/instances`, Nx `domain:workflow`.
- **Executor**: CRUD workflow_definitions/steps; engine evaluasi step (order, roles/permissions approver, conditional branch); instance lifecycle (draft → pending → approved/rejected); action approve/reject/reassign.
- **Tester**: alur multi-step, role approver, branch condition, duplikasi action, idempotent action.
- **Validator/Security/QA**: conformity vs schema; tenant filter di seluruh query; RBAC approver; alur live demo (screenshot).

## Acceptance criteria
- [ ] Definition: step berurutan + role approver + condition (opsional).
- [ ] Instance: status transisi benar; action sekali (no double approve).
- [ ] Notifikasi dasar (record di activity_logs/notification — Fase 21) dicatat hook hanya bila tersedia.
- [ ] Reusable: modul lain (Fase 4+) bisa register workflow.

## Dependensi
- Dipakai oleh approval di banyak domain (Fase 5+).

## Skill
`nx-module-boundaries`, `tenant-isolation-rules`.