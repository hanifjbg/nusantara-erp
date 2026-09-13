import { Module } from '@nestjs/common';
import { AuditService } from '../common/audit';
import { dbProvider } from '../db.provider';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';

@Module({
  controllers: [InventoryController],
  providers: [InventoryService, AuditService, dbProvider],
  exports: [InventoryService],
})
export class InventoryModule {}
