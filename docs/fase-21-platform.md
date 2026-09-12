# Fase 21 — Platform Polish & Reporting

> **Goal**: Fitur pelengkap SaaS & reporting — boleh dicicil paralel dengan fase lain. Infra partisi (job bulanan) & notification disiapkan di Fase 0 oleh DevOps.
> **Dependency**: semua (data), Fase 0 infra.
> **Tabel (23)**: dashboards, dashboard_widgets, report_definitions, saved_filters, notifications, notification_templates, webhook_subscriptions, integration_sync_logs, import_jobs, import_job_errors, scheduled_jobs, job_execution_logs, activity_logs, api_keys, subscription_plans, tenant_subscriptions, usage_meters, consent_records, data_subject_requests, data_breach_incidents, data_retention_policies

## Deliverable
- **Architect**: platform layer — notification engine, scheduler (scheduled_jobs + QStash/Vercel Cron), webhooks, import jobs, reporting, SaaS billing, compliance.
- **Executor**: 
  - Reporting: report_definitions + saved_filters + dashboards/widgets.
  - Notifications: templates + per-user delivery (in-app/opsional email/wa).
  - Scheduler: scheduled_jobs/job_execution_logs; auto partition job (monthly).
  - Webhooks: subscriptions + integration_sync_logs.
  - Import/ETL: import_jobs + errors.
  - SaaS: subscription_plans, tenant_subscriptions, usage_meters.
  - Compliance: consent_records, data_subject_requests (GDPR/PDP), data_breach_incidents, data_retention_policies, api_keys.
  - Activity log.
- **Tester**: scheduler idempotent, webhook retry, usage meter akumulasi, retention policy menjalankan purge (dengan izin), import error handling.
- **Validator/Security/QA**: conformity; **Security fokus: api_keys aman, consent privacy, dpa compliance**, RLS; demo dashboard & scheduler (screenshot).

## Acceptance criteria
- [ ] Dashboard/widget source dari report_definitions; saved filters reusable.
- [ ] scheduled_jobs berjalan via pemicu lokal & Vercel (QStash/Vercel Cron) tanpa duplikasi.
- [ ] Webhook delivery + retry tercatat di integration_sync_logs.
- [ ] Import batch dengan error report granular.
- [ ] Tenant usage & subscription tercatat; consent & DSR proper.
- [ ] Retention policy menghapus sesuai aturan (dengan audit).

## Dependensi
- Pakai infra dari Fase 0 (partisi & notification).

## Skill
`partitioned-table-migration`, `tenant-isolation-rules`, `nx-module-boundaries`.