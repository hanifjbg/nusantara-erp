// Skema workflow engine skeleton (rujukan: docs/schema_nusantara.json).
// definitions + instances tenant-scoped; steps & actions scope via parent (aturan skill #4).
// approver_type: 'role' | 'user' | 'permission'.
//   - role → approver_reference_id = roles.id
//   - user → approver_reference_id = users.id
//   - permission → approver_reference_id = permissions.id
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { isNull, sql } from 'drizzle-orm';
import { tenants, users, uuidv7 } from '@nusantara-erp/domain-identity';

const tz = (name: string) => timestamp(name, { withTimezone: true });
const pk = () =>
  uuid('id').primaryKey().default(sql`gen_random_uuid()`).$defaultFn(() => uuidv7());

export const workflowDefinitions = pgTable(
  'workflow_definitions',
  {
    id: pk(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: tz('created_at').defaultNow().notNull(),
    updatedAt: tz('updated_at').defaultNow().notNull(),
    deletedAt: tz('deleted_at'),
    rowVersion: integer('row_version').default(1).notNull(),
    createdBy: uuid('created_by'),
    updatedBy: uuid('updated_by'),
    moduleCode: varchar('module_code').notNull(),
    documentType: varchar('document_type').notNull(),
    name: varchar('name').notNull(),
    description: text('description'),
  },
  (t) => [
    uniqueIndex('wf_def_tenant_module_doc_uidx')
      .on(t.tenantId, t.moduleCode, t.documentType)
      .where(isNull(t.deletedAt)),
  ],
);

export const workflowSteps = pgTable(
  'workflow_steps',
  {
    id: pk(),
    workflowDefinitionId: uuid('workflow_definition_id')
      .notNull()
      .references(() => workflowDefinitions.id),
    stepOrder: smallint('step_order').notNull(),
    approverReferenceId: uuid('approver_reference_id'),
    conditionJson: jsonb('condition_json'),
    slaHours: smallint('sla_hours'),
    createdAt: tz('created_at').defaultNow().notNull(),
    updatedAt: tz('updated_at').defaultNow().notNull(),
    createdBy: uuid('created_by'),
    updatedBy: uuid('updated_by'),
    deletedAt: tz('deleted_at'),
    approverType: varchar('approver_type').notNull(),
    stepName: varchar('step_name').notNull(),
  },
  (t) => [
    uniqueIndex('wf_steps_def_order_uidx')
      .on(t.workflowDefinitionId, t.stepOrder)
      .where(isNull(t.deletedAt)),
  ],
);

export const workflowInstances = pgTable(
  'workflow_instances',
  {
    id: pk(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    workflowDefinitionId: uuid('workflow_definition_id')
      .notNull()
      .references(() => workflowDefinitions.id),
    referenceId: uuid('reference_id'),
    currentStep: smallint('current_step'),
    initiatedBy: uuid('initiated_by').references(() => users.id),
    createdAt: tz('created_at').defaultNow().notNull(),
    updatedAt: tz('updated_at').defaultNow().notNull(),
    completedAt: tz('completed_at'),
    rowVersion: integer('row_version').default(1).notNull(),
    createdBy: uuid('created_by'),
    updatedBy: uuid('updated_by'),
    deletedAt: tz('deleted_at'),
    referenceType: varchar('reference_type').notNull(),
    status: varchar('status').default('pending').notNull(),
    // Konteks dokumen saat instance dibuat — dipakai evaluasi conditional
    // branch di act(); context per-action di-merge di atasnya (override).
    contextJson: jsonb('context_json').$type<Record<string, unknown>>().default({}).notNull(),
  },
);

export const workflowApprovalActions = pgTable(
  'workflow_approval_actions',
  {
    id: pk(),
    workflowInstanceId: uuid('workflow_instance_id')
      .notNull()
      .references(() => workflowInstances.id),
    stepId: uuid('step_id')
      .notNull()
      .references(() => workflowSteps.id),
    approverUserId: uuid('approver_user_id').references(() => users.id),
    actionAt: tz('action_at').defaultNow().notNull(),
    createdAt: tz('created_at').defaultNow().notNull(),
    updatedAt: tz('updated_at').defaultNow().notNull(),
    createdBy: uuid('created_by'),
    updatedBy: uuid('updated_by'),
    deletedAt: tz('deleted_at'),
    action: varchar('action').notNull(),
    comments: text('comments'),
  },
  (t) => [
    // Satu keputusan final per step: no double approve/reject.
    uniqueIndex('wf_actions_instance_step_final_uidx')
      .on(t.workflowInstanceId, t.stepId)
      .where(sql`${t.deletedAt} IS NULL AND ${t.action} IN ('approved','rejected')`),
  ],
);
