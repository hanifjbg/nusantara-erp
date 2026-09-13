import { Body, Inject, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, TenantId } from '../common/current-user';
import { RequirePermissions } from '../common/decorators';
import type { JwtPayload } from '../common/crypto';
import { RbacService } from './rbac.service';

@ApiTags('rbac')
@ApiBearerAuth()
@Controller('rbac')
export class RbacController {
  constructor(@Inject(RbacService) private readonly rbac: RbacService) {}

  @Get('roles')
  @RequirePermissions('roles.manage')
  roles(@TenantId() tenantId: string) {
    return this.rbac.listRoles(tenantId);
  }

  @Post('roles')
  @RequirePermissions('roles.manage')
  createRole(@TenantId() tenantId: string, @Body() body: unknown, @CurrentUser() user: JwtPayload) {
    return this.rbac.createRole(tenantId, body, user.sub);
  }

  @Get('roles/:code/permissions')
  @RequirePermissions('roles.manage')
  rolePerms(@TenantId() tenantId: string, @Param('code') code: string) {
    return this.rbac.getRolePermissions(tenantId, code);
  }

  @Post('roles/:code/permissions')
  @RequirePermissions('roles.manage')
  setRolePerms(@TenantId() tenantId: string, @Param('code') code: string, @Body() body: unknown) {
    return this.rbac.setRolePermissions(tenantId, code, body);
  }

  @Get('permissions')
  @RequirePermissions('permissions.read')
  perms() {
    return this.rbac.listPermissions();
  }

  @Post('permissions/sync')
  @RequirePermissions('roles.manage')
  sync() {
    return this.rbac.syncPermissions();
  }
}
