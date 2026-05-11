import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DbModule } from '../db/db.module';
import { LivekitModule } from '../livekit/livekit.module';
import { WidgetSessionController } from './widget-session.controller';

@Module({
  imports: [AuthModule, DbModule, LivekitModule],
  controllers: [WidgetSessionController],
})
export class WidgetSessionModule {}
