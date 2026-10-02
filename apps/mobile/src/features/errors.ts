import { ApiError } from '../api/client';

export const errorMessage = (e: unknown, fallback = 'Không kết nối được máy chủ'): string =>
  e instanceof ApiError ? e.message : fallback;
