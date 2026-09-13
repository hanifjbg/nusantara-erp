import { Module } from '@nestjs/common';
import { dbProvider } from '../db.provider';
import { GeoController } from './geo.controller';
import { GeoService } from './geo.service';

@Module({
  controllers: [GeoController],
  providers: [GeoService, dbProvider],
})
export class GeoModule {}
