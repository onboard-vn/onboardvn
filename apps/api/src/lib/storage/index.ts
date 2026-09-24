import { env } from '../env.js';
import { LocalStorageDriver } from './local.js';
import type { StorageDriver } from './types.js';

export type { StorageDriver };
export const UPLOADS_PUBLIC_PREFIX = '/api/uploads';
export const storage: StorageDriver = new LocalStorageDriver(
  env.UPLOADS_DIR,
  UPLOADS_PUBLIC_PREFIX,
);
