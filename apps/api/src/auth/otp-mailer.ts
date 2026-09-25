import { mailer, otpEmail } from '../lib/mailer/index.js';

export interface OtpMessage {
  email: string;
  otp: string;
  type: string;
}

type OtpListener = (message: OtpMessage) => void;
const listeners = new Set<OtpListener>();

/** Test/dev hook: observe OTPs without parsing the email body. */
export const onOtpSent = (listener: OtpListener): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export async function sendOtpEmail(message: OtpMessage): Promise<void> {
  await mailer.send({ to: message.email, ...otpEmail(message.otp, message.type) });
  for (const listener of listeners) listener(message);
}
