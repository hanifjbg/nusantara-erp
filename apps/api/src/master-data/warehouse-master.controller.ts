import { Body, Controller, Get, Inject, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, TenantId } from '../common/current-user';
import { RequirePermissions } from '../common/decorators';
import type { JwtPayload } from '../common/crypto';
import { WarehouseMasterService } from './warehouse-master.service';

@ApiTags('master-warehouses')
@ApiBearerAuth()
@Controller('master')
export class WarehouseMasterController {
  constructor(@Inject(WarehouseMasterService) private readonly svc: WarehouseMasterService) {}

  @Get('warehouses')
  @RequirePermissions('masterdata.read')
  warehouses(@TenantId() t: string) {
    return this.svc.listWarehouses(t);
  }

  @Post('warehouses')
  @RequirePermissions('warehouses.manage')
  createWarehouse(@TenantId() t: string, @Body() b: unknown, @CurrentUser() u: JwtPayload) {
    return this.svc.createWarehouse(t, b, u.sub);
  }

  @Get('warehouse-zones')
  @RequirePermissions('masterdata.read')
  zones(@TenantId() t: string, @Query('warehouseId') warehouseId?: string) {
    return this.svc.listZones(t, warehouseId);
  }

  @Post('warehouse-zones')
  @RequirePermissions('warehouses.manage')
  createZone(@TenantId() t: string, @Body() b: unknown, @CurrentUser() u: JwtPayload) {
    return this.svc.createZone(t, b, u.sub);
  }

  @Get('warehouse-bins')
  @RequirePermissions('masterdata.read')
  bins(@TenantId() t: string, @Query('zoneId') zoneId?: string) {
    return this.svc.listBins(t, zoneId);
  }

  @Post('warehouse-bins')
  @RequirePermissions('warehouses.manage')
  createBin(@TenantId() t: string, @Body() b: unknown, @CurrentUser() u: JwtPayload) {
    return this.svc.createBin(t, b, u.sub);
  }
}
