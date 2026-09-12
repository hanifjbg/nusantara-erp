# Fase 14 — Project Management

> **Goal**: Kelola proyek, task, milestone, resource, budget, timesheet & billing.
> **Dependency**: Fase 01, 02, 05 (invoicing optional), 07 (billing ke GL optional).
> **Tabel (7)**: projects, project_tasks, project_milestones, project_resources, project_budgets, project_billing, timesheets

## Deliverable
- **Architect**: model project/task/milestone + budgeting/billing, `domain:project`.
- **Executor**: CRUD projects (status, tim), tasks (assign), milestones, resources (alokasi & kapasitas), project budgets (vs actual dari timesheet), project_billing (draft invoice), timesheets (entry + approval).
- **Tester**: budget vs actual, timesheet approval, kapasitas resource, alur billing.
- **Validator/Security/QA**: conformity; tenant filter; demo (screenshot).

## Acceptance criteria
- [ ] Task/milestone tracking dgn status.
- [ ] Timesheet ter-approve & terkunci per period.
- [ ] Budget vs actual via timesheet/cost.
- [ ] Project billing menghasilkan draft invoice ke Fase 5/7.

## Dependensi
- Opsional integrasi finance.

## Skill
`tenant-isolation-rules`, `nx-module-boundaries`.