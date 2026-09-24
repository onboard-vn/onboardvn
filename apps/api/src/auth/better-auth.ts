import { ROLES } from '@onboard/shared';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { emailOTP } from 'better-auth/plugins';
import { db } from '../db/client.js';
import * as schema from '../db/schema/index.js';
import { env } from '../lib/env.js';
import { sendOtpEmail } from './otp-mailer.js';

const google =
  env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
    ? { google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET } }
    : undefined;

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  basePath: '/api/auth',
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: [env.WEB_ORIGIN],
  database: drizzleAdapter(db, { provider: 'pg', schema, usePlural: true }),
  user: {
    additionalFields: {
      role: { type: [...ROLES], required: false, defaultValue: 'user', input: false },
    },
  },
  socialProviders: google,
  plugins: [
    emailOTP({
      sendVerificationOTP: sendOtpEmail,
      // Plain only outside production: e2e reads the OTP from the verifications table.
      storeOTP: env.NODE_ENV === 'production' ? 'hashed' : 'plain',
    }),
  ],
  rateLimit: { enabled: env.NODE_ENV !== 'test', window: 60, max: 30 },
  advanced: {
    // Same trust boundary as apiRateLimit (lib/client-ip.ts): only read X-Forwarded-For
    // when a reverse proxy (Caddy) is known to set it to the real client IP.
    ipAddress: { ipAddressHeaders: env.TRUST_PROXY ? ['x-forwarded-for'] : [] },
  },
  telemetry: { enabled: false },
});

export type Auth = typeof auth;
export type AuthSession = typeof auth.$Infer.Session;
