import { randomBytes } from 'node:crypto';
import { bggUsernameSchema, PRIVACY_LEVELS, ROLES } from '@onboard/shared';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { emailOTP, username } from 'better-auth/plugins';
import { db } from '../db/client.js';
import * as schema from '../db/schema/index.js';
import { env } from '../lib/env.js';
import { logger } from '../lib/logger.js';
import { mailer, resetPasswordEmail, verifyEmail } from '../lib/mailer/index.js';
import { handOverClubsBeforeUserDelete } from '../modules/clubs/service.js';
import { goingMeetupIdsForUser, promoteWaitlistForMeetups } from '../modules/events/service.js';
import { sendOtpEmail } from './otp-mailer.js';
import { profileGuard } from './profile-guard.js';
import { isValidUsername } from './username.js';

/** `before` snapshots the user's `going` meetups; `after` promotes their waitlists once the
 * cascaded `meetup_participants` rows are actually gone. No route uses `deleteUser` yet. */
const pendingWaitlistPromotions = new Map<string, string[]>();

const google =
  env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
    ? { google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET } }
    : undefined;

/** 12 random bytes -> 16-char base64url, no padding: shareable in a QR/link. */
const generateFriendCode = () => randomBytes(12).toString('base64url');

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
      friendCode: { type: 'string', required: false, input: false },
      profileVisibility: {
        type: [...PRIVACY_LEVELS],
        required: false,
        defaultValue: 'public',
        input: false,
      },
      playsVisibility: {
        type: [...PRIVACY_LEVELS],
        required: false,
        defaultValue: 'public',
        input: false,
      },
      friendsVisibility: {
        type: [...PRIVACY_LEVELS],
        required: false,
        defaultValue: 'friends',
        input: false,
      },
      emailOnFriendRequest: {
        type: 'boolean',
        required: false,
        defaultValue: false,
        input: false,
      },
      contributionBlockedAt: {
        type: 'date',
        required: false,
        input: false,
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => ({ data: { ...user, friendCode: generateFriendCode() } }),
      },
      delete: {
        before: async (user) => {
          await handOverClubsBeforeUserDelete(user.id);
          try {
            pendingWaitlistPromotions.set(user.id, await goingMeetupIdsForUser(user.id));
          } catch (err) {
            pendingWaitlistPromotions.delete(user.id);
            logger.error(
              { err, userId: user.id },
              'failed to snapshot going meetups before user delete',
            );
          }
        },
        after: async (user) => {
          const meetupIds = pendingWaitlistPromotions.get(user.id);
          pendingWaitlistPromotions.delete(user.id);
          try {
            if (meetupIds?.length) await promoteWaitlistForMeetups(meetupIds);
          } catch (err) {
            logger.error(
              { err, userId: user.id, meetupIds },
              'failed to promote waitlists after user delete',
            );
          }
        },
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
    enabled: env.NODE_ENV !== 'test' && !env.AUTH_RATE_LIMIT_DISABLED,
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
