import { Module } from '@nestjs/common';
import { DbModule } from '../db/db.module';
import { InternalServiceGuard } from './internal-service.guard';
import { SessionOrApiKeyGuard } from './session-or-api-key.guard';
import { SessionGuard } from './session.guard';
import { TenantApiKeyGuard } from './tenant-api-key.guard';

@Module({
  imports: [DbModule],
  providers: [
    TenantApiKeyGuard,
    InternalServiceGuard,
    SessionGuard,
    SessionOrApiKeyGuard,
  ],
  exports: [
    TenantApiKeyGuard,
    InternalServiceGuard,
    SessionGuard,
    SessionOrApiKeyGuard,
  ],
})
export class AuthModule {}
