import type { ApiErrorBody } from '@onboard/shared';
import type { ErrorHandler, NotFoundHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { AppEnv } from '../types.js';
import { ApiError } from './errors.js';
import { logger } from './logger.js';

export const errorHandler: ErrorHandler<AppEnv> = (err, c) => {
  if (err instanceof ApiError) return c.json(err.toBody(), err.status);
  if (err instanceof HTTPException) {
    const body: ApiErrorBody = { error: { code: 'BAD_REQUEST', message: err.message } };
    return c.json(body, err.status);
  }
  // Postgres 22P02 (invalid_text_representation): malformed input reaching a typed column
  // (e.g. a non-UUID id) that slipped past request validation. Client error, not a 500.
  if (err && typeof err === 'object' && 'code' in err && err.code === '22P02') {
    const body: ApiErrorBody = {
      error: { code: 'VALIDATION_FAILED', message: 'Dữ liệu không hợp lệ' },
    };
    return c.json(body, 422);
  }
  logger.error({ err, requestId: c.get('requestId') }, 'unhandled error');
  const body: ApiErrorBody = { error: { code: 'INTERNAL', message: 'Lỗi hệ thống' } };
  return c.json(body, 500);
};

export const notFoundHandler: NotFoundHandler<AppEnv> = (c) => {
  const body: ApiErrorBody = { error: { code: 'NOT_FOUND', message: 'Không tìm thấy' } };
  return c.json(body, 404);
};
