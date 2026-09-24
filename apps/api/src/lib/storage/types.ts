export interface StorageDriver {
  put(key: string, bytes: Uint8Array, contentType: string): Promise<void>;
  url(key: string): string;
  delete(key: string): Promise<void>;
}
