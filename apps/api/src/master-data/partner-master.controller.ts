import { Body, Controller, Get, Inject, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, TenantId } from '../common/current-user';
import { RequirePermissions } from '../common/decorators';
import type { JwtPayload } from '../common/crypto';
import { PartnerMasterService } from './partner-master.service';

@ApiTags('master-partners')
@ApiBearerAuth()
@Controller('master')
export class PartnerMasterController {
  constructor(@Inject(PartnerMasterService) private readonly svc: PartnerMasterService) {}

  @Get('customers')
  @RequirePermissions('masterdata.read')
  customers(@TenantId() t: string) {
    return this.svc.listCustomers(t);
  }

  @Post('customers')
  @RequirePermissions('customers.manage')
  createCustomer(@TenantId() t: string, @Body() b: unknown, @CurrentUser() u: JwtPayload) {
    return this.svc.createCustomer(t, b, u.sub);
  }

  @Post('customers/:id/contacts')
  @RequirePermissions('customers.manage')
  addContact(@TenantId() t: string, @Param('id') id: string, @Body() b: unknown, @CurrentUser() u: JwtPayload) {
    return this.svc.addContact(t, id, b, u.sub);
  }

  @Post('customers/:id/addresses')
  @RequirePermissions('customers.manage')
  linkAddress(@TenantId() t: string, @Param('id') id: string, @Body() b: unknown, @CurrentUser() u: JwtPayload) {
    return this.svc.linkAddress(t, id, b, u.sub);
  }

  @Get('vendors')
  @RequirePermissions('masterdata.read')
  vendors(@TenantId() t: string) {
    return this.svc.listVendors(t);
  }

  @Post('vendors')
  @RequirePermissions('vendors.manage')
  createVendor(@TenantId() t: string, @Body() b: unknown, @CurrentUser() u: JwtPayload) {
    return this.svc.createVendor(t, b, u.sub);
  }

  @Post('vendors/:id/contacts')
  @RequirePermissions('vendors.manage')
  addVendorContact(@TenantId() t: string, @Param('id') id: string, @Body() b: unknown, @CurrentUser() u: JwtPayload) {
    return this.svc.addVendorContact(t, id, b, u.sub);
  }
}
