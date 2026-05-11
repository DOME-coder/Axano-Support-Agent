import { Injectable, Logger } from '@nestjs/common';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';

// Minimal storage abstraction. Phase 1 only supports STORAGE_DRIVER=local
// which writes uploads under STORAGE_LOCAL_PATH/<tenantId>/<sourceId>.<ext>.
// Phase 2 (or whenever we move off Hetzner) will add an S3 driver
// behind the same interface.

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly driver: string;
  private readonly localPath: string;

  constructor() {
    this.driver = process.env.STORAGE_DRIVER ?? 'local';
    this.localPath = process.env.STORAGE_LOCAL_PATH ?? './storage';
    if (this.driver !== 'local') {
      throw new Error(`storage driver '${this.driver}' not implemented; only 'local' for now`);
    }
  }

  /**
   * Write a buffer to `<localPath>/<tenantId>/<filename>` and return the
   * resolved absolute path. Creates the tenant subdirectory if missing.
   */
  async putTenantFile(tenantId: string, filename: string, data: Buffer): Promise<string> {
    const tenantDir = resolve(this.localPath, tenantId);
    await mkdir(tenantDir, { recursive: true });
    const fullPath = join(tenantDir, filename);
    await writeFile(fullPath, data);
    this.logger.log(`stored ${data.length} bytes at ${fullPath}`);
    return fullPath;
  }
}
