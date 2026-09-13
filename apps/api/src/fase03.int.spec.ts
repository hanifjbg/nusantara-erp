/**
 * Integration Fase 3 (butuh Postgres lokal). Data TEST_F3_* dibersihkan di afterAll.
 */
import { hash } from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AuditService } from './common/audit';
import type { JwtPayload } from './common/crypto';
import { db } from './db/client';
import {
  roles,
  tenants,
  userRoles,
  users,
  workflowApprovalActions,
  workflowDefinitions,
  workflowInstances,
  workflowSteps,
} from './db/schema';
import { RbacService } from './rbac/rbac.service';
import { UsersService } from './users/users.service';
import { WorkflowService } from './workflow/workflow.service';

const REAL_DB = !process.env.DATABASE_URL?.includes('vitest_dummy');
const SFX = Date.now().toString(36);
const code = (p: string) => `${p}_${SFX}`.slice(0, 32);
const ACTOR = '00000000-0000-0000-0000-000000000003';

const caller = (sub: string, permissions: string[] = ['workflow.read', 'workflow.approve']): JwtPayload => ({
  sub,
  email: `${sub}@t.id`,
  tenantId: '',
  orgId: null,
  permissions,
  type: 'access',
  jti: 'test',
});

describe.skipIf(!REAL_DB)('Fase 3 integration', () => {
  const audit = new AuditService(db);
  const wf = new WorkflowService(db, audit);
  const rbac = new RbacService(db);
  const usersSvc = new UsersService(db, audit);

  let tenantA = '';
  let tenantB = '';
  let adminId = '';
  let staffId = '';
  let mgrRoleId = '';
  let defId = '';

  beforeAll(async () => {
    const [a] = await db
      .insert(tenants)
      .values({ tenantCode: code('TEST_F3_A'), tenantName: 'Test F3 A' })
      .returning({ id: tenants.id });
    const [b] = await db
      .insert(tenants)
      .values({ tenantCode: code('TEST_F3_B'), tenantName: 'Test F3 B' })
      .returning({ id: tenants.id });
    tenantA = a.id;
    tenantB = b.id;

    const pw = await hash('Rahasia123', 4);
    const [admin] = await db
      .insert(users)
      .values({ tenantId: tenantA, email: `admin-${SFX}@t.id`, passwordHash: pw, fullName: 'Admin', status: 'active' })
      .returning({ id: users.id });
    const [staff] = await db
      .insert(users)
      .values({ tenantId: tenantA, email: `staff-${SFX}@t.id`, passwordHash: pw, fullName: 'Staff', status: 'active' })
      .returning({ id: users.id });
    adminId = admin.id;
    staffId = staff.id;

    await rbac.syncPermissions();
    const role = await rbac.createRole(tenantA, { roleCode: 'MGR', roleName: 'Manager' }, ACTOR);
    mgrRoleId = role.id;
    await usersSvc.assignRole(tenantA, staffId, { roleCode: 'MGR' }, ACTOR);

    const def = await wf.createDefinition(
      tenantA,
      { moduleCode: 'procurement', documentType: 'PR', name: 'PR Approval' },
      ACTOR,
    );
    defId = def.id;
    await wf.createStep(
      tenantA,
      defId,
      { stepOrder: 1, approverType: 'user', approverReferenceId: adminId, stepName: 'Check admin' },
      ACTOR,
    );
    await wf.createStep(
      tenantA,
      defId,
      {
        stepOrder: 2,
        approverType: 'role',
        approverReferenceId: mgrRoleId,
        stepName: 'Manager approval',
        conditionJson: { field: 'total', op: 'gte', value: 10000 },
      },
      ACTOR,
    );
  }, 30000);

  afterAll(async () => {
    for (const t of [tenantA, tenantB]) {
      if (!t) continue;
      const insts = await db.select({ id: workflowInstances.id }).from(workflowInstances).where(eq(workflowInstances.tenantId, t));
      for (const i of insts) {
        await db.delete(workflowApprovalActions).where(eq(workflowApprovalActions.workflowInstanceId, i.id));
      }
      await db.delete(workflowInstances).where(eq(workflowInstances.tenantId, t));
      const defs = await db.select({ id: workflowDefinitions.id }).from(workflowDefinitions).where(eq(workflowDefinitions.tenantId, t));
      for (const d of defs) {
        await db.delete(workflowSteps).where(eq(workflowSteps.workflowDefinitionId, d.id));
      }
      await db.delete(workflowDefinitions).where(eq(workflowDefinitions.tenantId, t));
      await db.delete(userRoles).where(eq(userRoles.userId, adminId));
      await db.delete(userRoles).where(eq(userRoles.userId, staffId));
      await db.delete(roles).where(eq(roles.tenantId, t));
      await db.delete(users).where(eq(users.tenantId, t));
      await db.delete(tenants).where(eq(tenants.id, t));
    }
  }, 30000);

  it('conditional branch: total kecil → step 2 dilompat, langsung approved', async () => {
    const inst = await wf.startInstance(
      tenantA,
      { definitionId: defId, referenceType: 'PR', context: { total: 5000 } },
      adminId,
      null,
    );
    expect(inst.status).toBe('pending');
    expect(inst.currentStep).toBe(1);
    const done = await wf.act(tenantA, inst.id, { action: 'approved' }, { ...caller(adminId), tenantId: tenantA }, null);
    expect(done.instance.status).toBe('approved');
    expect(done.instance.completedAt).toBeTruthy();
  }, 30000);

  it('multi-step: step1 user + step2 role → approved', async () => {
    const inst = await wf.startInstance(
      tenantA,
      { definitionId: defId, referenceType: 'PR', context: { total: 50000 } },
      adminId,
      null,
    );
    const s1 = await wf.act(tenantA, inst.id, { action: 'approved' }, { ...caller(adminId), tenantId: tenantA }, null);
    expect(s1.instance.status).toBe('pending');
    expect(s1.instance.currentStep).toBe(2);
    // staff tanpa MGR? staff PUNYA MGR → lolos; admin BUKAN MGR → ditolak:
    await expect(
      wf.act(tenantA, inst.id, { action: 'approved' }, { ...caller(adminId), tenantId: tenantA }, null),
    ).rejects.toThrow(/bukan approver/);
    const s2 = await wf.act(tenantA, inst.id, { action: 'approved' }, { ...caller(staffId), tenantId: tenantA }, null);
    expect(s2.instance.status).toBe('approved');
  }, 30000);

  it('no double approve + reject flow', async () => {
    const inst = await wf.startInstance(
      tenantA,
      { definitionId: defId, referenceType: 'PR', context: { total: 100 } },
      adminId,
      null,
    );
    await wf.act(tenantA, inst.id, { action: 'approved' }, { ...caller(adminId), tenantId: tenantA }, null);
    await expect(
      wf.act(tenantA, inst.id, { action: 'approved' }, { ...caller(adminId), tenantId: tenantA }, null),
    ).rejects.toThrow(/sudah approved/);

    const inst2 = await wf.startInstance(
      tenantA,
      { definitionId: defId, referenceType: 'PR', context: {} },
      adminId,
      null,
    );
    const rej = await wf.act(
      tenantA,
      inst2.id,
      { action: 'rejected', comments: 'budget kurang' },
      { ...caller(adminId), tenantId: tenantA },
      null,
    );
    expect(rej.instance.status).toBe('rejected');
    expect(rej.instance.completedAt).toBeTruthy();
  }, 30000);

  it('reassign user-step ke staff → staff bisa approve', async () => {
    const inst = await wf.startInstance(
      tenantA,
      { definitionId: defId, referenceType: 'PR', context: { total: 10 } },
      adminId,
      null,
    );
    await wf.act(
      tenantA,
      inst.id,
      { action: 'reassigned', reassignTo: staffId, comments: 'delegasi' },
      { ...caller(adminId), tenantId: tenantA },
      null,
    );
    const done = await wf.act(tenantA, inst.id, { action: 'approved' }, { ...caller(staffId), tenantId: tenantA }, null);
    expect(done.instance.status).toBe('approved');
  }, 30000);

  it('isolasi: definisi tenant B tak terlihat dari A', async () => {
    const defB = await wf.createDefinition(tenantB, { moduleCode: 'x', documentType: 'y', name: 'B' }, ACTOR);
    const listA = await wf.listDefinitions(tenantA);
    expect(listA.every((d) => d.id !== defB.id)).toBe(true);
    await expect(wf.getDefinition(tenantA, defB.id)).rejects.toThrow(/tidak ditemukan/);
  }, 30000);

  it('infra: policy RLS workflow (≥39 total)', async () => {
    const pol = await db.execute(`SELECT count(*)::int AS c FROM pg_policies WHERE schemaname='public'`);
    expect((pol[0] as unknown as { c: number }).c).toBeGreaterThanOrEqual(39);
  }, 30000);
});
