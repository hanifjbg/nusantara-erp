import {
  CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { env } from '../env';
import type { JwtPayload } from './crypto';
import { IS_PUBLIC_KEY, PERMISSIONS_KEY } from './decorators';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  // @Inject eksplisit: runtime tsx/esbuild tidak emit decorator metadata.
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(JwtService) private readonly jwt: JwtService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      user?: JwtPayload;
    }>();
    const header = req.headers.authorization ?? '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) throw new UnauthorizedException('bearer token wajib');

    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(token, { secret: env.JWT_SECRET });
      if (payload.type !== 'access') throw new UnauthorizedException('bukan access token');
      if (!payload.tenantId) throw new UnauthorizedException('token tanpa tenant');
      req.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('token tidak valid/kedaluwarsa');
    }
  }
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const req = ctx.switchToHttp().getRequest<{ user?: JwtPayload }>();
    const granted = new Set(req.user?.permissions ?? []);
    const missing = required.filter((p) => !granted.has(p));
    if (missing.length > 0) throw new ForbiddenException(`kurang permission: ${missing.join(', ')}`);
    return true;
  }
}
