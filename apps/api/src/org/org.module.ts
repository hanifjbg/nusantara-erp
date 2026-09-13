import { Module } from '@nestjs/common';
import { AuditService } from '../common/audit';
import { dbProvider } from '../db.provider';
import { OrgController } from './org.controller';
import { OrgService } from './org.service';

@Module({
  controllers: [OrgController],
  providers: [OrgService, AuditService, dbProvider],
})
export class OrgModule {}
