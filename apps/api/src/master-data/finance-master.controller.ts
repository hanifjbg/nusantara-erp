import { Body, Controller, Get, Inject, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, TenantId } from '../common/current-user';
import { RequirePermissions } from '../common/decorators';
import type { JwtPayload } from '../common/crypto';
import { FinanceMasterService } from './finance-master.service';

@ApiTags('master-finance')
@ApiBearerAuth()
@Controller('master')
export class FinanceMasterController {
  constructor(@Inject(FinanceMasterService) private readonly svc: FinanceMasterService) {}

  @Get('currencies')
  @RequirePermissions('masterdata.read')
  currencies() {
    return this.svc.listCurrencies();
  }

  @Post('currencies')
  @RequirePermissions('currencies.manage')
  createCurrency(@Body() b: unknown, @CurrentUser() u: JwtPayload) {
    return this.svc.createCurrency(b, u.sub);
  }

  @Post('currencies/seed')
  @RequirePermissions('currencies.manage')
  seed(@CurrentUser() u: JwtPayload) {
    return this.svc.seedCurrencies(u.sub);
  }

  @Get('exchange-rates')
  @RequirePermissions('masterdata.read')
  rates(@TenantId() t: string) {
    return this.svc.listRates(t);
  }

  @Post('exchange-rates')
  @RequirePermissions('fx.manage')
  createRate(@TenantId() t: string, @Body() b: unknown, @CurrentUser() u: JwtPayload) {
    return this.svc.createRate(t, b, u.sub);
  }

  @Post('exchange-rates/convert')
  @RequirePermissions('masterdata.read')
  convert(@TenantId() t: string, @Body() b: unknown) {
    return this.svc.convert(t, b);
  }

  @Get('chart-of-accounts')
  @RequirePermissions('masterdata.read')
  coa(@TenantId() t: string) {
    return this.svc.listCoa(t);
  }

  @Post('chart-of-accounts')
  @RequirePermissions('coa.manage')
  createCoa(@TenantId() t: string, @Body() b: unknown, @CurrentUser() u: JwtPayload) {
    return this.svc.createCoa(t, b, u.sub);
  }

  @Get('fiscal-periods')
  @RequirePermissions('masterdata.read')
  fiscal(@TenantId() t: string) {
    return this.svc.listFiscal(t);
  }

  @Post('fiscal-periods')
  @RequirePermissions('fiscal.manage')
  createFiscal(@TenantId() t: string, @Body() b: unknown, @CurrentUser() u: JwtPayload) {
    return this.svc.createFiscal(t, b, u.sub);
  }

  @Patch('fiscal-periods/:id/close')
  @RequirePermissions('fiscal.manage')
  closeFiscal(@TenantId() t: string, @Param('id') id: string) {
    return this.svc.closeFiscal(t, id);
  }

  @Get('tax-codes')
  @RequirePermissions('masterdata.read')
  tax(@TenantId() t: string) {
    return this.svc.listTax(t);
  }

  @Post('tax-codes')
  @RequirePermissions('tax.manage')
  createTax(@TenantId() t: string, @Body() b: unknown, @CurrentUser() u: JwtPayload) {
    return this.svc.createTax(t, b, u.sub);
  }

  @Post('tax-codes/compute')
  @RequirePermissions('masterdata.read')
  computeTax(@TenantId() t: string, @Body() b: unknown) {
    return this.svc.computeTax(t, b);
  }
}
