import { z } from 'zod';

export const idParamSchema = z.object({ id: z.uuid() });
export const idAndGameIdParamSchema = z.object({ id: z.uuid(), gameId: z.uuid() });
export const idAndCodeParamSchema = z.object({
  id: z.uuid(),
  code: z.string().trim().min(6).max(20),
});
export const idAndPhotoIdParamSchema = z.object({ id: z.uuid(), photoId: z.uuid() });
