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
  logger.error({ err, requestId: c.get('requestId') }, 'unhandled error');
  const body: ApiErrorBody = { error: { code: 'INTERNAL', message: 'Lỗi hệ thống' } };
  return c.json(body, 500);
};

export const notFoundHandler: NotFoundHandler<AppEnv> = (c) => {
  const body: ApiErrorBody = { error: { code: 'NOT_FOUND', message: 'Không tìm thấy' } };
  return c.json(body, 404);
};
