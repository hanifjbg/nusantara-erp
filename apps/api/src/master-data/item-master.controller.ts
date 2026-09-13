import { Body, Controller, Get, Inject, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, TenantId } from '../common/current-user';
import { RequirePermissions } from '../common/decorators';
import type { JwtPayload } from '../common/crypto';
import { ItemMasterService } from './item-master.service';

@ApiTags('master-items')
@ApiBearerAuth()
@Controller('master')
export class ItemMasterController {
  constructor(@Inject(ItemMasterService) private readonly svc: ItemMasterService) {}

  @Get('uoms')
  @RequirePermissions('masterdata.read')
  uoms(@TenantId() t: string) {
    return this.svc.listUoms(t);
  }

  @Post('uoms')
  @RequirePermissions('uom.manage')
  createUom(@TenantId() t: string, @Body() b: unknown, @CurrentUser() u: JwtPayload) {
    return this.svc.createUom(t, b, u.sub);
  }

  @Post('uom-conversions')
  @RequirePermissions('uom.manage')
  createConversion(@TenantId() t: string, @Body() b: unknown, @CurrentUser() u: JwtPayload) {
    return this.svc.createConversion(t, b, u.sub);
  }

  @Post('uom-conversions/convert')
  @RequirePermissions('masterdata.read')
  convertQty(@TenantId() t: string, @Body() b: unknown) {
    return this.svc.convertQty(t, b);
  }

  @Get('item-categories')
  @RequirePermissions('masterdata.read')
  categories(@TenantId() t: string) {
    return this.svc.listCategories(t);
  }

  @Post('item-categories')
  @RequirePermissions('items.manage')
  createCategory(@TenantId() t: string, @Body() b: unknown, @CurrentUser() u: JwtPayload) {
    return this.svc.createCategory(t, b, u.sub);
  }

  @Get('items')
  @RequirePermissions('masterdata.read')
  items(@TenantId() t: string) {
    return this.svc.listItems(t);
  }

  @Post('items')
  @RequirePermissions('items.manage')
  createItem(@TenantId() t: string, @Body() b: unknown, @CurrentUser() u: JwtPayload) {
    return this.svc.createItem(t, b, u.sub);
  }

  @Get('item-variants')
  @RequirePermissions('masterdata.read')
  variants(@TenantId() t: string, @Query('itemId') itemId?: string) {
    return this.svc.listVariants(t, itemId);
  }

  @Post('item-variants')
  @RequirePermissions('items.manage')
  createVariant(@TenantId() t: string, @Body() b: unknown, @CurrentUser() u: JwtPayload) {
    return this.svc.createVariant(t, b, u.sub);
  }

  @Get('price-lists')
  @RequirePermissions('masterdata.read')
  priceLists(@TenantId() t: string) {
    return this.svc.listPriceLists(t);
  }

  @Post('price-lists')
  @RequirePermissions('pricing.manage')
  createPriceList(@TenantId() t: string, @Body() b: unknown, @CurrentUser() u: JwtPayload) {
    return this.svc.createPriceList(t, b, u.sub);
  }

  @Get('price-lists/:id/items')
  @RequirePermissions('masterdata.read')
  priceItems(@TenantId() t: string, @Param('id') id: string) {
    return this.svc.listPriceItems(t, id);
  }

  @Post('price-lists/:id/items')
  @RequirePermissions('pricing.manage')
  addPriceItem(@TenantId() t: string, @Param('id') id: string, @Body() b: unknown, @CurrentUser() u: JwtPayload) {
    return this.svc.addPriceItem(t, id, b, u.sub);
  }
}
