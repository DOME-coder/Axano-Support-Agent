import { Module } from '@nestjs/common';
import { DbModule } from '../db/db.module';
import { TenantApiKeyGuard } from './tenant-api-key.guard';

@Module({
  imports: [DbModule],
  providers: [TenantApiKeyGuard],
  exports: [TenantApiKeyGuard],
})
export class AuthModule {}
