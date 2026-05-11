import { Module } from '@nestjs/common';
import { DbModule } from '../db/db.module';
import { DashboardAuthController } from './dashboard-auth.controller';

@Module({
  imports: [DbModule],
  controllers: [DashboardAuthController],
})
export class DashboardAuthModule {}
