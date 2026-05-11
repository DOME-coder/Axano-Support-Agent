import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DbModule } from '../db/db.module';
import { TenantController } from './tenant.controller';

@Module({
  imports: [AuthModule, DbModule],
  controllers: [TenantController],
})
export class TenantModule {}
