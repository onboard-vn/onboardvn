import { z } from 'zod';

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(8787),
    DATABASE_URL: z.url(),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.url(),
    WEB_ORIGIN: z.url(),
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    UPLOADS_DIR: z.string().optional().default('./uploads'),
    GAMEUPC_BASE_URL: z.url().optional(),
    GAMEUPC_API_KEY: z.string().optional(),
    EXTERNAL_CLUB_PLUGIN: z.preprocess((v) => v || undefined, z.string().optional()),
    EXTERNAL_CLUB_BASE_URL: z.preprocess((v) => v || undefined, z.url().optional()),
    /** Set to true only behind a reverse proxy (Caddy) that itself sets X-Forwarded-For to the real client IP. */
    TRUST_PROXY: z.preprocess((v) => v === 'true' || v === '1', z.boolean()),
    SMTP_URL: z.preprocess((v) => v || undefined, z.url().optional()),
    MAIL_FROM: z.preprocess((v) => v || undefined, z.string().min(3).optional()),
    /** e2e-only: disables Better Auth's own IP-keyed rate limiter without touching NODE_ENV. */
    AUTH_RATE_LIMIT_DISABLED: z.preprocess((v) => v === 'true' || v === '1', z.boolean()),
  })
  .superRefine((v, ctx) => {
    if (v.NODE_ENV !== 'production') return;
    for (const key of ['SMTP_URL', 'MAIL_FROM'] as const) {
      if (!v[key])
        ctx.addIssue({ code: 'custom', path: [key], message: `${key} bắt buộc khi production` });
    }
    if (v.AUTH_RATE_LIMIT_DISABLED) {
      ctx.addIssue({
        code: 'custom',
        path: ['AUTH_RATE_LIMIT_DISABLED'],
        message: 'AUTH_RATE_LIMIT_DISABLED không được bật khi production',
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

export function parseEnv(source: NodeJS.ProcessEnv): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    throw new Error(`Invalid environment:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}

export const env = parseEnv(process.env);
