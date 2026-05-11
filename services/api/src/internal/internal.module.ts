import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DbModule } from '../db/db.module';
import { InternalConversationsController } from './conversations.controller';

@Module({
  imports: [AuthModule, DbModule],
  controllers: [InternalConversationsController],
})
export class InternalModule {}
