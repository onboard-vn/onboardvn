import { zValidator as baseValidator } from '@hono/zod-validator';
import type { ValidationTargets } from 'hono';
import type { ZodType } from 'zod';
import { ApiError } from './errors.js';

export const zValidator = <T extends ZodType, Target extends keyof ValidationTargets>(
  target: Target,
  schema: T,
) =>
  baseValidator(target, schema, (result) => {
    if (!result.success) {
      throw new ApiError('VALIDATION_FAILED', 422, 'Dữ liệu không hợp lệ', result.error.issues);
    }
  });
