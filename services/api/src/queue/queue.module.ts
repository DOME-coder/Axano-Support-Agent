import { Global, Module, type OnApplicationShutdown, Inject, Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';

export const KNOWLEDGE_INDEXING_QUEUE = Symbol('KNOWLEDGE_INDEXING_QUEUE');

function buildRedisConnection() {
  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error('REDIS_URL is required');
  }
  return { url };
}

@Injectable()
class QueueLifecycle implements OnApplicationShutdown {
  constructor(@Inject(KNOWLEDGE_INDEXING_QUEUE) private readonly queue: Queue) {}

  async onApplicationShutdown(): Promise<void> {
    await this.queue.close();
  }
}

@Global()
@Module({
  providers: [
    {
      provide: KNOWLEDGE_INDEXING_QUEUE,
      useFactory: (): Queue =>
        new Queue('knowledge-indexing', {
          connection: buildRedisConnection(),
          defaultJobOptions: {
            attempts: 2,
            backoff: { type: 'exponential', delay: 5000 },
            removeOnComplete: { count: 100 },
            removeOnFail: { count: 100 },
          },
        }),
    },
    QueueLifecycle,
  ],
  exports: [KNOWLEDGE_INDEXING_QUEUE],
})
export class QueueModule {}
