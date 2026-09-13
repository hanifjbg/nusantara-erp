import { Module } from '@nestjs/common';
import { AuditService } from '../common/audit';
import { dbProvider } from '../db.provider';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';

@Module({
  controllers: [TenantsController],
  providers: [TenantsService, AuditService, dbProvider],
})
export class TenantsModule {}
