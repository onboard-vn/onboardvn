import { createAuthClient } from 'better-auth/react';
import { emailOTPClient, inferAdditionalFields, usernameClient } from 'better-auth/client/plugins';

export const authClient = createAuthClient({
  basePath: '/api/auth',
  plugins: [
    emailOTPClient(),
    usernameClient(),
    inferAdditionalFields({ user: { bggUsername: { type: 'string', required: false } } }),
  ],
});
