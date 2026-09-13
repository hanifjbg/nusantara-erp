import { Body, Controller, Get, Inject, Param, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { CurrentUser, TenantId } from '../common/current-user';
import { RequirePermissions } from '../common/decorators';
import type { JwtPayload } from '../common/crypto';
import { reqMeta } from '../common/http';
import { WorkflowService } from './workflow.service';

@ApiTags('workflow')
@ApiBearerAuth()
@Controller('workflow')
export class WorkflowController {
  constructor(@Inject(WorkflowService) private readonly svc: WorkflowService) {}

  @Get('definitions')
  @RequirePermissions('workflow.read')
  definitions(@TenantId() t: string) {
    return this.svc.listDefinitions(t);
  }

  @Post('definitions')
  @RequirePermissions('workflow.manage')
  createDefinition(@TenantId() t: string, @Body() b: unknown, @CurrentUser() u: JwtPayload) {
    return this.svc.createDefinition(t, b, u.sub);
  }

  @Get('definitions/:id')
  @RequirePermissions('workflow.read')
  definition(@TenantId() t: string, @Param('id') id: string) {
    return this.svc.getDefinition(t, id);
  }

  @Post('definitions/:id/steps')
  @RequirePermissions('workflow.manage')
  createStep(
    @TenantId() t: string,
    @Param('id') id: string,
    @Body() b: unknown,
    @CurrentUser() u: JwtPayload,
  ) {
    return this.svc.createStep(t, id, b, u.sub);
  }

  @Get('instances')
  @RequirePermissions('workflow.read')
  instances(
    @TenantId() t: string,
    @Query('status') status?: string,
    @Query('referenceType') referenceType?: string,
  ) {
    return this.svc.listInstances(t, { status, referenceType });
  }

  @Post('instances')
  @RequirePermissions('workflow.read')
  start(
    @TenantId() t: string,
    @Body() b: unknown,
    @CurrentUser() u: JwtPayload,
    @Req() r: Request,
  ) {
    return this.svc.startInstance(t, b, u.sub, reqMeta(r).ip);
  }

  @Get('instances/:id')
  @RequirePermissions('workflow.read')
  instance(@TenantId() t: string, @Param('id') id: string) {
    return this.svc.getInstance(t, id);
  }

  @Post('instances/:id/actions')
  @RequirePermissions('workflow.approve')
  act(
    @TenantId() t: string,
    @Param('id') id: string,
    @Body() b: unknown,
    @CurrentUser() u: JwtPayload,
    @Req() r: Request,
  ) {
    return this.svc.act(t, id, b, u, reqMeta(r).ip);
  }
}
