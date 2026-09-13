import { Module } from '@nestjs/common';
import { dbProvider } from '../db.provider';
import { FinanceMasterController } from './finance-master.controller';
import { FinanceMasterService } from './finance-master.service';
import { ItemMasterController } from './item-master.controller';
import { ItemMasterService } from './item-master.service';
import { PartnerMasterController } from './partner-master.controller';
import { PartnerMasterService } from './partner-master.service';
import { WarehouseMasterController } from './warehouse-master.controller';
import { WarehouseMasterService } from './warehouse-master.service';

@Module({
  controllers: [
    FinanceMasterController,
    ItemMasterController,
    PartnerMasterController,
    WarehouseMasterController,
  ],
  providers: [
    FinanceMasterService,
    ItemMasterService,
    PartnerMasterService,
    WarehouseMasterService,
    dbProvider,
  ],
})
export class MasterDataModule {}
