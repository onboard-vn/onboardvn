import { describe, expect, it, vi } from 'vitest';
import { createConsoleMailer } from './console.js';
import { mailer, onMailSent } from './index.js';
import { createSmtpMailer } from './smtp.js';
import { otpEmail, resetPasswordEmail, verifyEmail } from './templates.js';

const message = { to: 'a@example.test', subject: 'S', text: 'body', html: '<p>body</p>' };

describe('mailer', () => {
  it('smtp driver sends with the configured from address', async () => {
    const sendMail = vi.fn().mockResolvedValue({});
    const smtp = createSmtpMailer('smtp://localhost:2525', 'Onboard <no-reply@example.test>', {
      sendMail,
    });
    await smtp.send(message);
    expect(sendMail).toHaveBeenCalledWith({ from: 'Onboard <no-reply@example.test>', ...message });
  });

  it('smtp driver propagates transport errors', async () => {
    const smtp = createSmtpMailer('smtp://localhost:2525', 'x@example.test', {
      sendMail: vi.fn().mockRejectedValue(new Error('connection refused')),
    });
    await expect(smtp.send(message)).rejects.toThrow('connection refused');
  });

  it('console driver omits the body when includeBody is false', async () => {
    const info = vi.fn();
    await createConsoleMailer({ info } as never, false).send(message);
    expect(info).toHaveBeenCalledWith({ to: message.to, subject: 'S' }, expect.any(String));
  });

  it('console driver logs the body when includeBody is true', async () => {
    const info = vi.fn();
    await createConsoleMailer({ info } as never, true).send(message);
    expect(info).toHaveBeenCalledWith(
      { to: message.to, subject: 'S', text: 'body' },
      expect.any(String),
    );
  });

  it('notifies onMailSent listeners in test env (console driver)', async () => {
    const sent: string[] = [];
    const stop = onMailSent((m) => sent.push(m.to));
    await mailer.send(message);
    stop();
    await mailer.send(message);
    expect(sent).toEqual([message.to]);
  });
});

describe('templates', () => {
  it('OTP email includes the code and a typed subject', () => {
    const mail = otpEmail('123456', 'sign-in');
    expect(mail.subject).toContain('Mã đăng nhập');
    expect(mail.text).toContain('123456');
    expect(mail.html).toContain('123456');
  });

  it('link emails include the url and escape html', () => {
    const url = 'https://example.test/verify?token=a&b="<x>"';
    for (const mail of [verifyEmail(url), resetPasswordEmail(url)]) {
      expect(mail.text).toContain(url);
      expect(mail.html).toContain('token=a&amp;b=&quot;&lt;x&gt;&quot;');
      expect(mail.html).not.toContain('<x>');
    }
  });
});
