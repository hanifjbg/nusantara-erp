import { Body, Inject, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, TenantId } from '../common/current-user';
import { RequirePermissions } from '../common/decorators';
import type { JwtPayload } from '../common/crypto';
import { SystemService } from './system.service';

@ApiTags('system')
@ApiBearerAuth()
@Controller('system')
export class SystemController {
  constructor(@Inject(SystemService) private readonly system: SystemService) {}

  @Get('number-sequences')
  @RequirePermissions('numbering.manage')
  sequences(@TenantId() tenantId: string) {
    return this.system.listSequences(tenantId);
  }

  @Post('number-sequences')
  @RequirePermissions('numbering.manage')
  defineSequence(@TenantId() t: string, @Body() b: unknown, @CurrentUser() u: JwtPayload) {
    return this.system.defineSequence(t, b, u.sub);
  }

  @Post('number-sequences/next')
  @RequirePermissions('numbering.use')
  nextNumber(@TenantId() tenantId: string, @Body() body: unknown) {
    return this.system.nextNumber(tenantId, body);
  }

  @Get('audit-logs')
  @RequirePermissions('audit.read')
  audit(
    @TenantId() tenantId: string,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.system.listAudit(tenantId, {
      entityType,
      entityId,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('custom-fields')
  @RequirePermissions('customfields.manage')
  fieldDefs(@TenantId() tenantId: string, @Query('entityType') entityType?: string) {
    return this.system.listFieldDefs(tenantId, entityType);
  }

  @Post('custom-fields')
  @RequirePermissions('customfields.manage')
  createFieldDef(@TenantId() t: string, @Body() b: unknown, @CurrentUser() u: JwtPayload) {
    return this.system.createFieldDef(t, b, u.sub);
  }

  @Post('custom-fields/:id/values')
  @RequirePermissions('customfields.manage')
  setFieldValue(
    @TenantId() t: string,
    @Param('id') id: string,
    @Body() b: unknown,
    @CurrentUser() u: JwtPayload,
  ) {
    return this.system.setFieldValue(t, id, b, u.sub);
  }
}
