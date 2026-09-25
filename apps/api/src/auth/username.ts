const USERNAME_PATTERN = /^[a-z0-9_.]+$/;

export const RESERVED_USERNAMES: ReadonlySet<string> = new Set([
  'admin',
  'administrator',
  'api',
  'onboard',
  'root',
  'support',
  'help',
  'moderator',
  'maintainer',
  'staff',
  'system',
  'null',
  'undefined',
  'me',
  'u',
  'login',
  'logout',
  'signup',
  'sign-up',
  'sign_up',
  'account',
  'friends',
  'invite',
  'shelf',
  'credits',
  'check-email',
  'check_email',
  'forgot-password',
  'forgot_password',
  'reset-password',
  'reset_password',
  'developers',
]);

/** Case-insensitive: the plugin validates sign-in input before normalizing it. */
export function isValidUsername(username: string): boolean {
  const normalized = username.toLowerCase();
  return USERNAME_PATTERN.test(normalized) && !RESERVED_USERNAMES.has(normalized);
}
