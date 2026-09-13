import { Module } from '@nestjs/common';
import { dbProvider } from '../db.provider';
import { SystemController } from './system.controller';
import { SystemService } from './system.service';

@Module({
  controllers: [SystemController],
  providers: [SystemService, dbProvider],
})
export class SystemModule {}
