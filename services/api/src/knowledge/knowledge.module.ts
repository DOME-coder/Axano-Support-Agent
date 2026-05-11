import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DbModule } from '../db/db.module';
import { QueueModule } from '../queue/queue.module';
import { StorageModule } from '../storage/storage.module';
import { KnowledgeIndexerService } from './indexer.service';
import { KnowledgeController } from './knowledge.controller';

@Module({
  imports: [AuthModule, DbModule, QueueModule, StorageModule],
  controllers: [KnowledgeController],
  providers: [KnowledgeIndexerService],
})
export class KnowledgeModule {}
