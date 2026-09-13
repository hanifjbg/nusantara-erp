import {
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { and, eq, isNull } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { env } from '../env';
import { DB, type Db } from '../db.provider';
import { requireTenantId } from '@nusantara-erp/domain-identity';
import {
  loginHistories,
  organizations,
  permissions,
  rolePermissions,
  roles,
  sessions,
  tenants,
  userOrganizations,
  userRoles,
  users,
} from '../db/schema';
import { resolvePermissions, syncPermissionCatalog } from '../common/access';
import { sha256, type JwtPayload } from '../common/crypto';

export const loginSchema = z.object({
  email: z.string().email('email tidak valid'),
  password: z.string().min(1, 'password wajib'),
});

export const bootstrapSchema = z.object({
  tenantCode: z.string().min(2).max(32),
  tenantName: z.string().min(2),
  orgCode: z.string().min(2).max(32),
  orgName: z.string().min(2),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(8, 'password admin minimal 8 karakter'),
  adminName: z.string().min(2),
});

const INVALID = 'email atau password salah';

@Injectable()
export class AuthService {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(JwtService) private readonly jwt: JwtService,
  ) {}

  private async signPair(user: {
    id: string;
    email: string;
    tenantId: string;
    orgId: string | null;
    permissions: string[];
  }): Promise<{ accessToken: string; refreshToken: string; sessionId: string }> {
    const jti = randomUUID();
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(
        {
          sub: user.id,
          email: user.email,
          tenantId: user.tenantId,
          orgId: user.orgId,
          permissions: user.permissions,
          type: 'access',
          jti,
        } satisfies JwtPayload,
        { secret: env.JWT_SECRET, expiresIn: env.JWT_EXPIRES_IN },
      ),
      this.jwt.signAsync(
        {
          sub: user.id,
          email: user.email,
          tenantId: user.tenantId,
          orgId: user.orgId,
          permissions: [],
          type: 'refresh',
          jti,
        } satisfies JwtPayload,
        { secret: env.JWT_SECRET, expiresIn: env.JWT_REFRESH_EXPIRES_IN },
      ),
    ]);
    return { accessToken, refreshToken, sessionId: jti };
  }

  private async primaryOrgId(userId: string): Promise<string | null> {
    const rows = await this.db
      .select({ organizationId: userOrganizations.organizationId })
      .from(userOrganizations)
      .where(
        and(
          and(eq(userOrganizations.userId, userId), eq(userOrganizations.isPrimary, true)),
          isNull(userOrganizations.deletedAt),
        ),
      )
      .limit(1);
    return rows[0]?.organizationId ?? null;
  }

  async login(
    body: unknown,
    meta: { ip: string | null; userAgent: string | null },
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const { email, password } = loginSchema.parse(body);
    const found = await this.db
      .select()
      .from(users)
      .where(and(eq(users.email, email), isNull(users.deletedAt)))
      .limit(1);
    const user = found[0];

    const fail = async () => {
      if (user) {
        await this.db.insert(loginHistories).values({
          userId: user.id,
          ipAddress: meta.ip,
          userAgent: meta.userAgent,
          status: 'failed',
          failureReason: 'bad_credentials',
        });
      }
      throw new UnauthorizedException(INVALID);
    };

    if (!user || user.status !== 'active') await fail();
    if (!(await compare(password, user!.passwordHash))) await fail();

    const tenantId = requireTenantId(user!.tenantId);
    const [perms, orgId] = await Promise.all([
      resolvePermissions(this.db, user!.id, tenantId),
      this.primaryOrgId(user!.id),
    ]);
    const pair = await this.signPair({
      id: user!.id,
      email: user!.email,
      tenantId,
      orgId,
      permissions: perms,
    });
    await this.db.insert(sessions).values({
      userId: user!.id,
      tokenHash: sha256(pair.refreshToken),
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
      expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
    });
    await this.db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, user!.id));
    await this.db.insert(loginHistories).values({
      userId: user!.id,
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
      status: 'success',
    });
    return { accessToken: pair.accessToken, refreshToken: pair.refreshToken };
  }

  async refresh(
    refreshToken: string,
    meta: { ip: string | null; userAgent: string | null },
  ): Promise<{ accessToken: string; refreshToken: string }> {
    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(refreshToken, { secret: env.JWT_SECRET });
    } catch {
      throw new UnauthorizedException('refresh token tidak valid/kedaluwarsa');
    }
    if (payload.type !== 'refresh') throw new UnauthorizedException('bukan refresh token');

    const rows = await this.db
      .select()
      .from(sessions)
      .where(and(eq(sessions.tokenHash, sha256(refreshToken)), isNull(sessions.deletedAt)))
      .limit(1);
    const session = rows[0];
    if (!session || session.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('sesi tidak valid/kedaluwarsa');
    }

    const found = await this.db
      .select()
      .from(users)
      .where(and(eq(users.id, payload.sub), isNull(users.deletedAt)))
      .limit(1);
    const user = found[0];
    if (!user || user.status !== 'active') throw new UnauthorizedException('user tidak aktif');

    // Rotation: revoke sesi lama, terbitkan pasangan baru.
    await this.db
      .update(sessions)
      .set({ deletedAt: new Date() })
      .where(eq(sessions.id, session.id));

    const tenantId = requireTenantId(user.tenantId);
    const [perms, orgId] = await Promise.all([
      resolvePermissions(this.db, user.id, tenantId),
      this.primaryOrgId(user.id),
    ]);
    const pair = await this.signPair({
      id: user.id,
      email: user.email,
      tenantId,
      orgId,
      permissions: perms,
    });
    await this.db.insert(sessions).values({
      userId: user.id,
      tokenHash: sha256(pair.refreshToken),
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
      expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
    });
    return { accessToken: pair.accessToken, refreshToken: pair.refreshToken };
  }

  async logout(userId: string, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      await this.db
        .update(sessions)
        .set({ deletedAt: new Date() })
        .where(
          and(eq(sessions.userId, userId), eq(sessions.tokenHash, sha256(refreshToken))),
        );
    } else {
      await this.db
        .update(sessions)
        .set({ deletedAt: new Date() })
        .where(and(eq(sessions.userId, userId), isNull(sessions.deletedAt)));
    }
  }

  async me(user: JwtPayload) {
    const found = await this.db
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        status: users.status,
        tenantId: users.tenantId,
      })
      .from(users)
      .where(and(eq(users.id, user.sub), isNull(users.deletedAt)))
      .limit(1);
    const orgs = await this.db
      .select({
        organizationId: userOrganizations.organizationId,
        isPrimary: userOrganizations.isPrimary,
      })
      .from(userOrganizations)
      .where(
        and(eq(userOrganizations.userId, user.sub), isNull(userOrganizations.deletedAt)),
      );
    return { user: found[0] ?? null, organizations: orgs, permissions: user.permissions };
  }

  /**
   * Bootstrap tenant pertama + org + admin. Hanya bila BELUM ada tenant sama sekali.
   * Setelah itu endpoint ini terkunci (403) — admin berikutnya dibuat via /users.
   */
  async bootstrap(body: unknown): Promise<{ accessToken: string; refreshToken: string }> {
    const dto = bootstrapSchema.parse(body);
    const existing = await this.db.select({ id: tenants.id }).from(tenants).limit(1);
    if (existing.length > 0) throw new ForbiddenException('sudah di-bootstrap');

    await syncPermissionCatalog(this.db);

    const [tenant] = await this.db
      .insert(tenants)
      .values({ tenantCode: dto.tenantCode, tenantName: dto.tenantName })
      .returning({ id: tenants.id });
    const [org] = await this.db
      .insert(organizations)
      .values({ tenantId: tenant.id, orgCode: dto.orgCode, legalName: dto.orgName })
      .returning({ id: organizations.id });
    const [admin] = await this.db
      .insert(users)
      .values({
        tenantId: tenant.id,
        email: dto.adminEmail,
        passwordHash: await hash(dto.adminPassword, 10),
        fullName: dto.adminName,
        username: dto.adminEmail,
        status: 'active',
      })
      .returning({ id: users.id });
    const [role] = await this.db
      .insert(roles)
      .values({
        tenantId: tenant.id,
        roleCode: 'ADMIN',
        roleName: 'Administrator',
        isSystemRole: true,
      })
      .returning({ id: roles.id });

    const allPerms = await this.db
      .select({ id: permissions.id })
      .from(permissions)
      .where(isNull(permissions.deletedAt));
    if (allPerms.length > 0) {
      await this.db
        .insert(rolePermissions)
        .values(allPerms.map((p) => ({ roleId: role.id, permissionId: p.id })));
    }
    await this.db.insert(userRoles).values({ userId: admin.id, roleId: role.id });
    await this.db
      .insert(userOrganizations)
      .values({ userId: admin.id, organizationId: org.id, isPrimary: true });

    return this.login(
      { email: dto.adminEmail, password: dto.adminPassword },
      { ip: null, userAgent: 'bootstrap' },
    );
  }
}
