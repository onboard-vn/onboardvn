import { bggUsernameSchema, ROLES } from '@onboard/shared';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { emailOTP, username } from 'better-auth/plugins';
import { db } from '../db/client.js';
import * as schema from '../db/schema/index.js';
import { env } from '../lib/env.js';
import { mailer, resetPasswordEmail, verifyEmail } from '../lib/mailer/index.js';
import { sendOtpEmail } from './otp-mailer.js';
import { profileGuard } from './profile-guard.js';
import { isValidUsername } from './username.js';

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
      bggUsername: {
        type: 'string',
        required: false,
        input: true,
        validator: { input: bggUsernameSchema.nullable() },
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 8,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: ({ user, url }) =>
      mailer.send({ to: user.email, ...resetPasswordEmail(url) }),
  },
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: ({ user, url }) => mailer.send({ to: user.email, ...verifyEmail(url) }),
  },
  socialProviders: google,
  hooks: { before: profileGuard },
  plugins: [
    emailOTP({
      sendVerificationOTP: sendOtpEmail,
      // Plain only outside production: e2e reads the OTP from the verifications table.
      storeOTP: env.NODE_ENV === 'production' ? 'hashed' : 'plain',
    }),
    username({
      minUsernameLength: 3,
      maxUsernameLength: 30,
      usernameValidator: isValidUsername,
      displayUsernameValidator: isValidUsername,
      validationOrder: { username: 'post-normalization' },
    }),
  ],
  rateLimit: {
    enabled: env.NODE_ENV !== 'test',
    window: 60,
    max: 30,
    customRules: {
      '/sign-in/*': { window: 60, max: 5 },
      '/sign-up/email': { window: 60, max: 5 },
      '/request-password-reset': { window: 60, max: 3 },
    },
  },
  advanced: {
    // Same trust boundary as apiRateLimit (lib/client-ip.ts): only read X-Forwarded-For
    // when a reverse proxy (Caddy) is known to set it to the real client IP.
    ipAddress: { ipAddressHeaders: env.TRUST_PROXY ? ['x-forwarded-for'] : [] },
    // Send mail off the response path so sign-up/reset timing doesn't reveal registered emails.
    backgroundTasks: { handler: () => undefined },
  },
  telemetry: { enabled: false },
});

export type Auth = typeof auth;
export type AuthSession = typeof auth.$Infer.Session;
