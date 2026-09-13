import { Body, Inject, Controller, Get, Patch, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { CurrentUser, TenantId } from '../common/current-user';
import { RequirePermissions } from '../common/decorators';
import type { JwtPayload } from '../common/crypto';
import { reqMeta } from '../common/http';
import { TenantsService } from './tenants.service';

@ApiTags('tenants')
@ApiBearerAuth()
@Controller('tenants')
export class TenantsController {
  constructor(@Inject(TenantsService) private readonly tenants: TenantsService) {}

  @Get('mine')
  @RequirePermissions('tenants.read')
  mine(@TenantId() tenantId: string) {
    return this.tenants.getOwn(tenantId);
  }

  @Post()
  @RequirePermissions('tenants.create')
  create(@Body() body: unknown, @CurrentUser() user: JwtPayload, @Req() req: Request) {
    return this.tenants.create(body, user.sub, reqMeta(req).ip);
  }

  @Patch('mine')
  @RequirePermissions('tenants.update')
  updateMine(
    @TenantId() tenantId: string,
    @Body() body: unknown,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    return this.tenants.updateOwn(tenantId, body, user.sub, reqMeta(req).ip);
  }

  @Get('settings')
  @RequirePermissions('tenants.read')
  settings(@TenantId() tenantId: string) {
    return this.tenants.listSettings(tenantId);
  }

  @Post('settings')
  @RequirePermissions('tenants.update')
  upsertSetting(@TenantId() tenantId: string, @Body() body: unknown, @CurrentUser() user: JwtPayload) {
    return this.tenants.upsertSetting(tenantId, body, user.sub);
  }

  @Get('flags')
  @RequirePermissions('tenants.read')
  flags(@TenantId() tenantId: string) {
    return this.tenants.listFlags(tenantId);
  }

  @Post('flags')
  @RequirePermissions('flags.manage')
  upsertFlag(@TenantId() tenantId: string, @Body() body: unknown, @CurrentUser() user: JwtPayload) {
    return this.tenants.upsertFlag(tenantId, body, user.sub);
  }
}
