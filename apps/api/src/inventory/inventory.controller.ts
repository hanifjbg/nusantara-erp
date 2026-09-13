import { Body, Controller, Get, Inject, Param, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { CurrentUser, TenantId } from '../common/current-user';
import { RequirePermissions } from '../common/decorators';
import type { JwtPayload } from '../common/crypto';
import { reqMeta } from '../common/http';
import { InventoryService } from './inventory.service';

@ApiTags('inventory')
@ApiBearerAuth()
@Controller('inventory')
export class InventoryController {
  constructor(@Inject(InventoryService) private readonly svc: InventoryService) {}

  @Get('balances')
  @RequirePermissions('inventory.read')
  balances(
    @TenantId() t: string,
    @Query('itemId') itemId?: string,
    @Query('warehouseId') warehouseId?: string,
  ) {
    return this.svc.listBalances(t, { itemId, warehouseId });
  }

  @Get('movements')
  @RequirePermissions('inventory.read')
  movements(
    @TenantId() t: string,
    @Query('itemId') itemId?: string,
    @Query('warehouseId') warehouseId?: string,
  ) {
    return this.svc.listMovements(t, { itemId, warehouseId });
  }

  @Post('receive')
  @RequirePermissions('inventory.manage')
  receive(@TenantId() t: string, @Body() b: unknown, @CurrentUser() u: JwtPayload, @Req() r: Request) {
    return this.svc.receive(t, b, u.sub, reqMeta(r).ip);
  }

  @Post('issue')
  @RequirePermissions('inventory.manage')
  issue(@TenantId() t: string, @Body() b: unknown, @CurrentUser() u: JwtPayload, @Req() r: Request) {
    return this.svc.issue(t, b, u.sub, reqMeta(r).ip);
  }

  @Get('transfers')
  @RequirePermissions('inventory.read')
  transfers(@TenantId() t: string) {
    return this.svc.listTransfers(t);
  }

  @Post('transfers')
  @RequirePermissions('inventory.manage')
  transfer(@TenantId() t: string, @Body() b: unknown, @CurrentUser() u: JwtPayload, @Req() r: Request) {
    return this.svc.transfer(t, b, u.sub, reqMeta(r).ip);
  }

  @Get('opnames')
  @RequirePermissions('inventory.read')
  opnames(@TenantId() t: string) {
    return this.svc.listOpnames(t);
  }

  @Post('opnames')
  @RequirePermissions('inventory.manage')
  createOpname(@TenantId() t: string, @Body() b: unknown, @CurrentUser() u: JwtPayload) {
    return this.svc.createOpname(t, b, u.sub);
  }

  @Post('opnames/:id/count')
  @RequirePermissions('inventory.manage')
  countOpname(
    @TenantId() t: string,
    @Param('id') id: string,
    @Body() b: unknown,
    @CurrentUser() u: JwtPayload,
    @Req() r: Request,
  ) {
    return this.svc.countOpname(t, id, b, u.sub, reqMeta(r).ip);
  }

  @Post('opnames/:id/approve')
  @RequirePermissions('inventory.manage')
  approveOpname(@TenantId() t: string, @Param('id') id: string, @CurrentUser() u: JwtPayload) {
    return this.svc.approveOpname(t, id, u.sub);
  }

  @Post('partitions/ensure')
  @RequirePermissions('inventory.manage')
  ensurePartitions() {
    return this.svc.ensurePartitions();
  }
}
