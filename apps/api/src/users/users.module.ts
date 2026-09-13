import { Module } from '@nestjs/common';
import { AuditService } from '../common/audit';
import { dbProvider } from '../db.provider';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService, AuditService, dbProvider],
})
export class UsersModule {}
