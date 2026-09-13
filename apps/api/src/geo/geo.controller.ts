import { Body, Inject, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, TenantId } from '../common/current-user';
import { RequirePermissions } from '../common/decorators';
import type { JwtPayload } from '../common/crypto';
import { GeoService } from './geo.service';

@ApiTags('geo')
@ApiBearerAuth()
@Controller('geo')
export class GeoController {
  constructor(@Inject(GeoService) private readonly geo: GeoService) {}

  @Get('countries')
  @RequirePermissions('geo.read')
  countries() {
    return this.geo.listCountries();
  }

  @Get('provinces')
  @RequirePermissions('geo.read')
  provinces(@Query('countryId') countryId?: string) {
    return this.geo.listProvinces(countryId);
  }

  @Get('cities')
  @RequirePermissions('geo.read')
  cities(@Query('provinceId') provinceId?: string) {
    return this.geo.listCities(provinceId);
  }

  @Get('districts')
  @RequirePermissions('geo.read')
  districts(@Query('cityId') cityId?: string) {
    return this.geo.listDistricts(cityId);
  }

  @Get('sub-districts')
  @RequirePermissions('geo.read')
  subDistricts(@Query('districtId') districtId?: string) {
    return this.geo.listSubDistricts(districtId);
  }

  @Get('addresses')
  @RequirePermissions('geo.read')
  addresses(@TenantId() tenantId: string) {
    return this.geo.listAddresses(tenantId);
  }

  @Post('addresses')
  @RequirePermissions('addresses.manage')
  createAddress(@TenantId() t: string, @Body() b: unknown, @CurrentUser() u: JwtPayload) {
    return this.geo.createAddress(t, b, u.sub);
  }
}
