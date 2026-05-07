import { Module, type Provider, type OnModuleDestroy, Inject, Injectable } from '@nestjs/common';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

export const DRIZZLE_DB = Symbol('DRIZZLE_DB');
export const PG_POOL = Symbol('PG_POOL');

export type DrizzleDB = NodePgDatabase<typeof schema>;

const poolProvider: Provider = {
  provide: PG_POOL,
  useFactory: (): Pool => {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL is required');
    }
    const min = Number.parseInt(process.env.DATABASE_POOL_MIN ?? '2', 10);
    const max = Number.parseInt(process.env.DATABASE_POOL_MAX ?? '10', 10);
    return new Pool({ connectionString: databaseUrl, min, max });
  },
};

const dbProvider: Provider = {
  provide: DRIZZLE_DB,
  inject: [PG_POOL],
  useFactory: (pool: Pool): DrizzleDB => drizzle(pool, { schema }),
};

@Injectable()
class PoolCloser implements OnModuleDestroy {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}

@Module({
  providers: [poolProvider, dbProvider, PoolCloser],
  exports: [DRIZZLE_DB, PG_POOL],
})
export class DbModule {}
