import type { Logger } from 'pino';
import type { Mailer, MailMessage } from './types.js';

export function createConsoleMailer(log: Pick<Logger, 'info'>, includeBody: boolean): Mailer {
  return {
    async send({ to, subject, text }: MailMessage): Promise<void> {
      log.info({ to, subject, ...(includeBody && { text }) }, 'email (console transport)');
    },
  };
}
