# Fase 12 — Recruitment & Training

> **Goal**: Rekrutmen, training, dan performance management (KPI).
> **Dependency**: Fase 01 (user/org), Fase 03 (approval opsional).
> **Tabel (9)**: recruitment_requisitions, candidates, interview_schedules, training_programs, training_enrollments, certifications, performance_reviews, kpi_definitions, kpi_scores

## Deliverable
- **Architect**: alur rekrutmen (requisition→candidate→interview→hire link ke employee), training & enrollment, KPI. `domain:recruitment-training`.
- **Executor**: CRUD + status flow: requisition (approval), candidates, interview schedules, training programs/enrollments, certifications (expiry), performance reviews, kpi_definitions/scores.
- **Tester**: pipeline status, enrollment capacity, cert expiry reminder, kpi score aggregation.
- **Validator/Security/QA**: conformity; tenant filter; privacy candidate data; demo flow (screenshot).

## Acceptance criteria
- [ ] Candidate → hire: link membuat employee baru (Fase 10).
- [ ] Training enrollment & completion tercatat; cert punya masa berlaku.
- [ ] KPI scores diagregasi per period.

## Dependensi
- HR Core Fase 10 (hire).

## Skill
`tenant-isolation-rules`.