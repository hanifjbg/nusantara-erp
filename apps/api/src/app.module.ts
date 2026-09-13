import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { GeoModule } from './geo/geo.module';
import { MasterDataModule } from './master-data/master-data.module';
import { WorkflowModule } from './workflow/workflow.module';
import { OrgModule } from './org/org.module';
import { RbacModule } from './rbac/rbac.module';
import { SystemModule } from './system/system.module';
import { TenantsModule } from './tenants/tenants.module';
import { UsersModule } from './users/users.module';
import { JwtAuthGuard, PermissionsGuard } from './common/guards';
import { HealthModule } from './health/health.module';

@Module({
  imports: [HealthModule, AuthModule, TenantsModule, UsersModule, RbacModule, OrgModule, GeoModule, SystemModule, MasterDataModule, WorkflowModule],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
