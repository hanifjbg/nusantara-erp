import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { JwtPayload } from './crypto';

/** Ambil JWT payload user dari request (dipasang JwtAuthGuard). */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload => {
    const req = ctx.switchToHttp().getRequest<{ user: JwtPayload }>();
    return req.user;
  },
);

/** Ambil tenantId dari JWT — SUMBER tenant konteks (bukan body/params). */
export const TenantId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const req = ctx.switchToHttp().getRequest<{ user: JwtPayload }>();
    return req.user.tenantId;
  },
);
