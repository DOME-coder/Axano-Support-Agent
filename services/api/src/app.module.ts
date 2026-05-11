import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { DbModule } from './db/db.module';
import { HealthModule } from './health/health.module';
import { InternalModule } from './internal/internal.module';
import { LivekitModule } from './livekit/livekit.module';
import { WidgetSessionModule } from './widget-session/widget-session.module';

@Module({
  imports: [
    DbModule,
    AuthModule,
    LivekitModule,
    HealthModule,
    WidgetSessionModule,
    InternalModule,
  ],
})
export class AppModule {}
