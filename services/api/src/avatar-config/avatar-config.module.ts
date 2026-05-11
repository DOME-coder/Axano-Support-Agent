import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DbModule } from '../db/db.module';
import { AvatarConfigController } from './avatar-config.controller';

@Module({
  imports: [AuthModule, DbModule],
  controllers: [AvatarConfigController],
})
export class AvatarConfigModule {}
