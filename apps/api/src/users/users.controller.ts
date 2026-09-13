import { Body, Inject, Controller, Delete, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { CurrentUser, TenantId } from '../common/current-user';
import { RequirePermissions } from '../common/decorators';
import type { JwtPayload } from '../common/crypto';
import { reqMeta } from '../common/http';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(@Inject(UsersService) private readonly users: UsersService) {}

  @Get()
  @RequirePermissions('users.read')
  list(@TenantId() tenantId: string) {
    return this.users.list(tenantId);
  }

  @Get(':id')
  @RequirePermissions('users.read')
  get(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.users.get(tenantId, id);
  }

  @Post()
  @RequirePermissions('users.create')
  create(
    @TenantId() tenantId: string,
    @Body() body: unknown,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    return this.users.create(tenantId, body, user.sub, reqMeta(req).ip);
  }

  @Patch(':id')
  @RequirePermissions('users.update')
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    return this.users.update(tenantId, id, body, user.sub, reqMeta(req).ip);
  }

  @Delete(':id')
  @RequirePermissions('users.delete')
  remove(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    return this.users.remove(tenantId, id, user.sub, reqMeta(req).ip);
  }

  @Post(':id/roles')
  @RequirePermissions('roles.manage')
  assignRole(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.users.assignRole(tenantId, id, body, user.sub);
  }

  @Post(':id/organizations')
  @RequirePermissions('users.update')
  addMembership(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.users.addMembership(tenantId, id, body, user.sub);
  }
}
