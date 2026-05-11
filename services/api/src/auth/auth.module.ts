import { Module } from '@nestjs/common';
import { DbModule } from '../db/db.module';
import { InternalServiceGuard } from './internal-service.guard';
import { SessionGuard } from './session.guard';
import { TenantApiKeyGuard } from './tenant-api-key.guard';

@Module({
  imports: [DbModule],
  providers: [TenantApiKeyGuard, InternalServiceGuard, SessionGuard],
  exports: [TenantApiKeyGuard, InternalServiceGuard, SessionGuard],
})
export class AuthModule {}
