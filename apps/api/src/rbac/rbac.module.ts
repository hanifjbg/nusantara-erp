import { Module } from '@nestjs/common';
import { dbProvider } from '../db.provider';
import { RbacController } from './rbac.controller';
import { RbacService } from './rbac.service';

@Module({
  controllers: [RbacController],
  providers: [RbacService, dbProvider],
})
export class RbacModule {}
