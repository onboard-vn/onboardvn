import { env } from '../lib/env.js';
import { logger } from '../lib/logger.js';

export interface OtpMessage {
  email: string;
  otp: string;
  type: string;
}

type OtpListener = (message: OtpMessage) => void;
const listeners = new Set<OtpListener>();

/** Test/dev hook: real SMTP transport replaces this sink before public launch. */
export const onOtpSent = (listener: OtpListener): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export async function sendOtpEmail(message: OtpMessage): Promise<void> {
  const otp = env.NODE_ENV === 'production' ? '[redacted]' : message.otp;
  logger.info({ email: message.email, otp, type: message.type }, 'email OTP (console transport)');
  for (const listener of listeners) listener(message);
}
