import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DbModule } from '../db/db.module';
import { QueueModule } from '../queue/queue.module';
import { StorageModule } from '../storage/storage.module';
import { KnowledgeIndexerService } from './indexer.service';
import { KnowledgeController } from './knowledge.controller';
import { InternalKnowledgeSearchController } from './search.controller';
import { KnowledgeSearchService } from './search.service';

@Module({
  imports: [AuthModule, DbModule, QueueModule, StorageModule],
  controllers: [KnowledgeController, InternalKnowledgeSearchController],
  providers: [KnowledgeIndexerService, KnowledgeSearchService],
})
export class KnowledgeModule {}
