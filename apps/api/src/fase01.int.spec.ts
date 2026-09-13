/**
 * Integration Fase 1 (butuh Postgres lokal + migration termigrate).
 * Dijalankan bila DATABASE_URL asli tersedia; skip bila dummy (vitest.setup).
 * Data uji memakai prefix TEST_F1_* + suffix unik, dibersihkan di afterAll.
 */
import { JwtService } from '@nestjs/jwt';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AuthService } from './auth/auth.service';
import { AuditService } from './common/audit';
import { db } from './db/client';
import {
  auditLogs,
  branches,
  loginHistories,
  numberSequences,
  organizations,
  permissions,
  rolePermissions,
  roles,
  sessions,
  tenants,
  userOrganizations,
  userRoles,
  users,
} from './db/schema';
import { RbacService } from './rbac/rbac.service';
import { SystemService } from './system/system.service';
import { TenantsService } from './tenants/tenants.service';
import { UsersService } from './users/users.service';

const REAL_DB = !process.env.DATABASE_URL?.includes('vitest_dummy');
const SFX = Date.now().toString(36);
const code = (p: string) => `${p}_${SFX}`.slice(0, 32);

describe.skipIf(!REAL_DB)('Fase 1 integration', () => {
  const audit = new AuditService(db);
  const auth = new AuthService(db, new JwtService({}));
  const usersSvc = new UsersService(db, audit);
  const tenantsSvc = new TenantsService(db, audit);
  const rbac = new RbacService(db);
  const system = new SystemService(db);

  let tenantA = '';
  let tenantB = '';
  let adminId = '';
  let refreshToken = '';

  beforeAll(async () => {
    const [a] = await db
      .insert(tenants)
      .values({ tenantCode: code('TEST_F1_A'), tenantName: 'Test F1 A' })
      .returning({ id: tenants.id });
    const [b] = await db
      .insert(tenants)
      .values({ tenantCode: code('TEST_F1_B'), tenantName: 'Test F1 B' })
      .returning({ id: tenants.id });
    tenantA = a.id;
    tenantB = b.id;
  }, 30000);

  afterAll(async () => {
    // Bersih-bersih anak → induk (hanya data TEST_F1_*).
    for (const t of [tenantA, tenantB]) {
      if (!t) continue;
      await db.delete(sessions).where(eq(sessions.userId, adminId));
      await db.delete(loginHistories).where(eq(loginHistories.userId, adminId));
      await db.delete(auditLogs).where(eq(auditLogs.tenantId, t));
      await db.delete(userRoles).where(eq(userRoles.userId, adminId));
      await db.delete(userOrganizations).where(eq(userOrganizations.userId, adminId));
      const testRoles = await db.select({ id: roles.id }).from(roles).where(eq(roles.tenantId, t));
      for (const r of testRoles) {
        await db.delete(rolePermissions).where(eq(rolePermissions.roleId, r.id));
      }
      await db.delete(roles).where(eq(roles.tenantId, t));
      await db.delete(users).where(eq(users.tenantId, t));
      await db.delete(branches).where(eq(branches.tenantId, t));
      await db.delete(numberSequences).where(eq(numberSequences.tenantId, t));
      await db.delete(organizations).where(eq(organizations.tenantId, t));
      await db.delete(tenants).where(eq(tenants.id, t));
    }
  }, 30000);

  it('auth: user dibuat → login sukses → /me', async () => {
    const created = await usersSvc.create(
      tenantA,
      { email: `admin-${SFX}@test.id`, password: 'Rahasia123', fullName: 'Admin Tes' },
      null as never,
      null,
    );
    adminId = created.id;

    const pair = await auth.login(
      { email: `admin-${SFX}@test.id`, password: 'Rahasia123' },
      { ip: '127.0.0.1', userAgent: 'vitest' },
    );
    expect(pair.accessToken).toBeTruthy();
    expect(pair.refreshToken).toBeTruthy();
    refreshToken = pair.refreshToken;

    const me = await auth.me({
      sub: adminId,
      email: created.email,
      tenantId: tenantA,
      orgId: null,
      permissions: [],
      type: 'access',
      jti: 'x',
    });
    expect(me.user?.email).toBe(`admin-${SFX}@test.id`);
  }, 30000);

  it('auth: password salah → 401 + login_histories failed', async () => {
    await expect(
      auth.login({ email: `admin-${SFX}@test.id`, password: 'salah' }, { ip: null, userAgent: 'vitest' }),
    ).rejects.toThrow();
    const rows = await db.select().from(loginHistories).where(eq(loginHistories.userId, adminId));
    expect(rows.some((r) => r.status === 'failed')).toBe(true);
    expect(rows.some((r) => r.status === 'success')).toBe(true);
  }, 30000);

  it('auth: refresh rotation — token baru valid, token lama mati', async () => {
    const pair2 = await auth.refresh(refreshToken, { ip: null, userAgent: 'vitest' });
    expect(pair2.accessToken).toBeTruthy();
    await expect(auth.refresh(refreshToken, { ip: null, userAgent: 'vitest' })).rejects.toThrow();
    refreshToken = pair2.refreshToken;
  }, 30000);

  it('isolasi tenant: user tenant B tak terlihat dari tenant A', async () => {
    const other = await usersSvc.create(
      tenantB,
      { email: `other-${SFX}@test.id`, password: 'Rahasia123' },
      null as never,
      null,
    );
    const listA = await usersSvc.list(tenantA);
    expect(listA.every((u) => u.id !== other.id)).toBe(true);
    await expect(usersSvc.get(tenantA, other.id)).rejects.toThrow(/tidak ditemukan/);
    // getOwn tenant: hanya milik sendiri
    const mine = await tenantsSvc.getOwn(tenantA);
    expect(mine.id).toBe(tenantA);
  }, 30000);

  it('RBAC: role + permission → terbaca saat login', async () => {
    await rbac.syncPermissions();
    const role = await rbac.createRole(tenantA, { roleCode: 'OP', roleName: 'Operator' }, adminId);
    await rbac.setRolePermissions(tenantA, 'OP', { permissionCodes: ['users.read', 'org.read'] });
    await usersSvc.assignRole(tenantA, adminId, { roleCode: 'OP' }, adminId);
    const pair = await auth.login(
      { email: `admin-${SFX}@test.id`, password: 'Rahasia123' },
      { ip: null, userAgent: 'vitest' },
    );
    // Decode payload tanpa verify (sekadar assert klaim permissions ikut).
    const payload = JSON.parse(Buffer.from(pair.accessToken.split('.')[1], 'base64').toString());
    expect(payload.permissions).toContain('users.read');
    expect(payload.permissions).toContain('org.read');
    expect(role.id).toBeTruthy();
  }, 30000);

  it('numbering: increment atomik + format per tenant', async () => {
    await system.defineSequence(
      tenantA,
      { documentType: 'SO', formatPattern: 'SO/{YYYY}/{MM}/{SEQ:5}' },
      adminId,
    );
    const n1 = await system.nextNumber(tenantA, { documentType: 'SO' });
    const n2 = await system.nextNumber(tenantA, { documentType: 'SO' });
    expect(n2.seq).toBe(n1.seq + 1);
    expect(n1.formatted).toMatch(/^SO\/\d{4}\/\d{2}\/\d{5}$/);
  }, 30000);

  it('audit: tulis → masuk partisi bulan berjalan', async () => {
    await audit.write(tenantA, adminId, '127.0.0.1', {
      entityType: 'users',
      entityId: adminId,
      action: 'update',
    });
    const inPart = await db.execute(
      `SELECT count(*)::int AS c FROM audit_logs_p2026_09 WHERE tenant_id = '${tenantA}'`,
    );
    expect((inPart[0] as unknown as { c: number }).c).toBeGreaterThanOrEqual(1);
    const listed = await system.listAudit(tenantA, {});
    expect(listed.length).toBeGreaterThanOrEqual(1);
  }, 30000);

  it('infra: 16 policy RLS + 2 functions + partisi ada', async () => {
    const pol = await db.execute(
      `SELECT count(*)::int AS c FROM pg_policies WHERE schemaname='public'`,
    );
    expect((pol[0] as unknown as { c: number }).c).toBeGreaterThanOrEqual(16);
    const fn = await db.execute(
      `SELECT count(*)::int AS c FROM pg_proc WHERE proname IN ('ensure_next_month_partition','next_number')`,
    );
    expect((fn[0] as unknown as { c: number }).c).toBe(2);
    const part = await db.execute(
      `SELECT count(*)::int AS c FROM pg_tables WHERE schemaname='public' AND tablename LIKE 'audit_logs_p%'`,
    );
    expect((part[0] as unknown as { c: number }).c).toBeGreaterThanOrEqual(3);
    expect(permissions).toBeDefined();
  }, 30000);
});
