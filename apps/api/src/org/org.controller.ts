import { Body, Inject, Controller, Get, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { CurrentUser, TenantId } from '../common/current-user';
import { RequirePermissions } from '../common/decorators';
import type { JwtPayload } from '../common/crypto';
import { reqMeta } from '../common/http';
import { OrgService } from './org.service';

@ApiTags('org')
@ApiBearerAuth()
@Controller('org')
export class OrgController {
  constructor(@Inject(OrgService) private readonly org: OrgService) {}

  @Get('organizations')
  @RequirePermissions('org.read')
  orgs(@TenantId() tenantId: string) {
    return this.org.listOrgs(tenantId);
  }

  @Post('organizations')
  @RequirePermissions('org.create')
  createOrg(@TenantId() t: string, @Body() b: unknown, @CurrentUser() u: JwtPayload, @Req() r: Request) {
    return this.org.createOrg(t, b, u.sub, reqMeta(r).ip);
  }

  @Get('branches')
  @RequirePermissions('org.read')
  branches(@TenantId() tenantId: string) {
    return this.org.listBranches(tenantId);
  }

  @Post('branches')
  @RequirePermissions('branches.manage')
  createBranch(@TenantId() t: string, @Body() b: unknown, @CurrentUser() u: JwtPayload, @Req() r: Request) {
    return this.org.createBranch(t, b, u.sub, reqMeta(r).ip);
  }

  @Get('departments')
  @RequirePermissions('org.read')
  departments(@TenantId() tenantId: string) {
    return this.org.listDepartments(tenantId);
  }

  @Post('departments')
  @RequirePermissions('departments.manage')
  createDepartment(@TenantId() t: string, @Body() b: unknown, @CurrentUser() u: JwtPayload, @Req() r: Request) {
    return this.org.createDepartment(t, b, u.sub, reqMeta(r).ip);
  }

  @Get('cost-centers')
  @RequirePermissions('org.read')
  costCenters(@TenantId() tenantId: string) {
    return this.org.listCostCenters(tenantId);
  }

  @Post('cost-centers')
  @RequirePermissions('departments.manage')
  createCostCenter(@TenantId() t: string, @Body() b: unknown, @CurrentUser() u: JwtPayload, @Req() r: Request) {
    return this.org.createCostCenter(t, b, u.sub, reqMeta(r).ip);
  }

  @Get('job-grades')
  @RequirePermissions('org.read')
  grades(@TenantId() tenantId: string) {
    return this.org.listGrades(tenantId);
  }

  @Post('job-grades')
  @RequirePermissions('departments.manage')
  createGrade(@TenantId() t: string, @Body() b: unknown, @CurrentUser() u: JwtPayload) {
    return this.org.createGrade(t, b, u.sub);
  }

  @Get('job-positions')
  @RequirePermissions('org.read')
  positions(@TenantId() tenantId: string) {
    return this.org.listPositions(tenantId);
  }

  @Post('job-positions')
  @RequirePermissions('departments.manage')
  createPosition(@TenantId() t: string, @Body() b: unknown, @CurrentUser() u: JwtPayload) {
    return this.org.createPosition(t, b, u.sub);
  }

  @Get('reporting-lines')
  @RequirePermissions('org.read')
  reportingLines(@TenantId() tenantId: string) {
    return this.org.listReportingLines(tenantId);
  }

  @Post('reporting-lines')
  @RequirePermissions('departments.manage')
  createReportingLine(@TenantId() t: string, @Body() b: unknown, @CurrentUser() u: JwtPayload) {
    return this.org.createReportingLine(t, b, u.sub);
  }
}
