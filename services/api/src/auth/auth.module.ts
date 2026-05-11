import { Module } from '@nestjs/common';
import { DbModule } from '../db/db.module';
import { InternalServiceGuard } from './internal-service.guard';
import { TenantApiKeyGuard } from './tenant-api-key.guard';

@Module({
  imports: [DbModule],
  providers: [TenantApiKeyGuard, InternalServiceGuard],
  exports: [TenantApiKeyGuard, InternalServiceGuard],
})
export class AuthModule {}
