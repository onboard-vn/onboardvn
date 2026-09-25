import { env } from '../env.js';
import { logger } from '../logger.js';
import { createConsoleMailer } from './console.js';
import { createSmtpMailer } from './smtp.js';
import type { Mailer, MailMessage } from './types.js';

export type { Mailer, MailContent, MailMessage } from './types.js';
export { otpEmail, resetPasswordEmail, verifyEmail } from './templates.js';

type MailListener = (message: MailMessage) => void;
const listeners = new Set<MailListener>();

/** Test/dev hook: observe every outgoing email (e.g. to read verification links). */
export const onMailSent = (listener: MailListener): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const driver: Mailer =
  env.NODE_ENV !== 'test' && env.SMTP_URL && env.MAIL_FROM
    ? createSmtpMailer(env.SMTP_URL, env.MAIL_FROM)
    : createConsoleMailer(logger, env.NODE_ENV !== 'production');

export const mailer: Mailer = {
  async send(message) {
    await driver.send(message);
    for (const listener of listeners) listener(message);
  },
};
