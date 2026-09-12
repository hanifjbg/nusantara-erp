# Fase 18 — Support / Ticketing

> **Goal**: Ticketing customer support.
> **Dependency**: Fase 01, 02 (customers).
> **Tabel (3)**: tickets, ticket_categories, ticket_comments

## Deliverable
- **Architect**: model ticket + categories + comments (thread), `domain:support`.
- **Executor**: CRUD tickets (status, priority, assignee), categories, comments (internal/public) + timeline.
- **Tester**: status flow, permission (public vs internal comment), SLA label (opsional).
- **Validator/Security/QA**: conformity; tenant filter; privacy; demo (screenshot).

## Acceptance criteria
- [ ] Ticket lifecycle (open→in_progress→resolved/closed) dengan history.
- [ ] Comment public/internal dipisah hak akses.

## Dependensi
- Independen (prioritas rendah).

## Skill
`tenant-isolation-rules`.