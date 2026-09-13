import { describe, expect, it } from 'vitest';
import { isActive, MissingTenantError, requireTenantId, tenantEq } from './tenant';
import { tenants, users } from './schema/index';

describe('tenant helper (isolasi pusat)', () => {
  it('requireTenantId melempar bila kosong', () => {
    expect(() => requireTenantId(undefined)).toThrow(MissingTenantError);
    expect(() => requireTenantId(null)).toThrow(MissingTenantError);
    expect(() => requireTenantId('')).toThrow(MissingTenantError);
    expect(requireTenantId('t-1')).toBe('t-1');
  });

  it('tenantEq + isActive menghasilkan SQL (bukan undefined)', () => {
    expect(tenantEq(users.tenantId, 't-1')).toBeDefined();
    expect(isActive(users.deletedAt)).toBeDefined();
    expect(isActive(tenants.deletedAt)).toBeDefined();
  });
});
