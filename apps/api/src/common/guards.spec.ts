import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { ExecutionContext } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import type { JwtPayload } from './crypto';
import { JwtAuthGuard, PermissionsGuard } from './guards';

const user: JwtPayload = {
  sub: 'u-1',
  email: 'a@x.id',
  tenantId: 't-1',
  orgId: null,
  permissions: ['users.read'],
  type: 'access',
  jti: 'j-1',
};

function ctxOf(opts: {
  headers?: Record<string, string>;
  handler?: object;
  clazz?: object;
}): ExecutionContext {
  const req = { headers: opts.headers ?? {}, user: undefined as unknown as JwtPayload };
  return {
    getHandler: () => opts.handler ?? {},
    getClass: () => opts.clazz ?? {},
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
}

describe('PermissionsGuard', () => {
  const guard = new PermissionsGuard(new Reflector());

  it('lolos bila route tanpa syarat', () => {
    expect(guard.canActivate(ctxOf({}))).toBe(true);
  });

  it('lolos bila permission cukup', () => {
    const handler = {};
    Reflect.defineMetadata('permissions', ['users.read'], handler);
    const ctx = ctxOf({ handler });
    (ctx.switchToHttp().getRequest() as { user: JwtPayload }).user = user;
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('403 bila kurang permission', () => {
    const handler = {};
    Reflect.defineMetadata('permissions', ['users.delete'], handler);
    const ctx = ctxOf({ handler });
    (ctx.switchToHttp().getRequest() as { user: JwtPayload }).user = user;
    expect(() => guard.canActivate(ctx)).toThrow(/kurang permission/);
  });
});

describe('JwtAuthGuard', () => {
  const guard = new JwtAuthGuard(new Reflector(), new JwtService({}));

  it('lolos untuk @Public tanpa token', async () => {
    const handler = {};
    Reflect.defineMetadata('isPublic', true, handler);
    await expect(guard.canActivate(ctxOf({ handler }))).resolves.toBe(true);
  });

  it('401 tanpa bearer', async () => {
    await expect(guard.canActivate(ctxOf({}))).rejects.toThrow(/bearer token/);
  });
});
