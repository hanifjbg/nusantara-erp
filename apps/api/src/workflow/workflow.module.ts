import { Module } from '@nestjs/common';
import { AuditService } from '../common/audit';
import { dbProvider } from '../db.provider';
import { WorkflowController } from './workflow.controller';
import { WorkflowService } from './workflow.service';

@Module({
  controllers: [WorkflowController],
  providers: [WorkflowService, AuditService, dbProvider],
  exports: [WorkflowService],
})
export class WorkflowModule {}
