import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { DbModule } from './db/db.module';
import { HealthModule } from './health/health.module';
import { InternalModule } from './internal/internal.module';
import { KnowledgeModule } from './knowledge/knowledge.module';
import { LivekitModule } from './livekit/livekit.module';
import { QueueModule } from './queue/queue.module';
import { StorageModule } from './storage/storage.module';
import { WidgetSessionModule } from './widget-session/widget-session.module';

@Module({
  imports: [
    DbModule,
    AuthModule,
    LivekitModule,
    HealthModule,
    WidgetSessionModule,
    InternalModule,
    QueueModule,
    StorageModule,
    KnowledgeModule,
  ],
})
export class AppModule {}
