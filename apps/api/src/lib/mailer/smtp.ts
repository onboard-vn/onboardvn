import { createTransport, type Transporter } from 'nodemailer';
import type { Mailer, MailMessage } from './types.js';

export function createSmtpMailer(
  url: string,
  from: string,
  transport: Pick<Transporter, 'sendMail'> = createTransport(url),
): Mailer {
  return {
    async send({ to, subject, text, html }: MailMessage): Promise<void> {
      await transport.sendMail({ from, to, subject, text, html });
    },
  };
}
