import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { StorageDriver } from './types.js';

export class LocalStorageDriver implements StorageDriver {
  constructor(
    private readonly rootDir: string,
    private readonly publicPrefix: string,
  ) {}

  async put(key: string, bytes: Uint8Array): Promise<void> {
    const filePath = join(this.rootDir, key);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, bytes);
  }

  url(key: string): string {
    return `${this.publicPrefix}/${key}`;
  }

  async delete(key: string): Promise<void> {
    await rm(join(this.rootDir, key), { force: true });
  }
}
