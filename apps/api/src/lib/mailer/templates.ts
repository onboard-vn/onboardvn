import type { MailContent } from './types.js';

const BRAND = 'OnBoardVN';

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

interface EmailBody {
  heading: string;
  lines: string[];
  action?: { label: string; url: string };
  footer: string;
}

function render(subject: string, { heading, lines, action, footer }: EmailBody): MailContent {
  const text = [
    heading,
    '',
    ...lines,
    ...(action ? ['', `${action.label}: ${action.url}`] : []),
    '',
    footer,
    '',
    `— ${BRAND}`,
  ].join('\n');

  const paragraphs = lines.map((line) => `<p>${escapeHtml(line)}</p>`).join('');
  const button = action
    ? `<p><a href="${escapeHtml(action.url)}" style="display:inline-block;padding:10px 16px;background:#111;color:#fff;text-decoration:none;border-radius:6px">${escapeHtml(action.label)}</a></p>` +
      `<p style="font-size:12px;color:#666">Hoặc mở liên kết: ${escapeHtml(action.url)}</p>`
    : '';
  const html =
    `<div style="font-family:system-ui,sans-serif;max-width:480px;line-height:1.5">` +
    `<h2>${escapeHtml(heading)}</h2>${paragraphs}${button}` +
    `<p style="font-size:12px;color:#666">${escapeHtml(footer)}</p>` +
    `<p style="font-size:12px;color:#666">— ${BRAND}</p></div>`;

  return { subject: `[${BRAND}] ${subject}`, text, html };
}

const IGNORE_FOOTER = 'Nếu bạn không yêu cầu, hãy bỏ qua email này.';

const OTP_SUBJECTS: Record<string, string> = {
  'sign-in': 'Mã đăng nhập',
  'email-verification': 'Mã xác minh email',
  'forget-password': 'Mã đặt lại mật khẩu',
};

export function otpEmail(otp: string, type: string): MailContent {
  const subject = OTP_SUBJECTS[type] ?? 'Mã xác nhận';
  return render(subject, {
    heading: subject,
    lines: [`Mã của bạn là: ${otp}`, 'Mã có hiệu lực trong vài phút và chỉ dùng được một lần.'],
    footer: IGNORE_FOOTER,
  });
}

export function verifyEmail(url: string): MailContent {
  return render('Xác minh email', {
    heading: 'Xác minh địa chỉ email',
    lines: ['Cảm ơn bạn đã đăng ký. Bấm nút dưới đây để xác minh email và kích hoạt tài khoản.'],
    action: { label: 'Xác minh email', url },
    footer: IGNORE_FOOTER,
  });
}

export function resetPasswordEmail(url: string): MailContent {
  return render('Đặt lại mật khẩu', {
    heading: 'Đặt lại mật khẩu',
    lines: [
      'Bạn vừa yêu cầu đặt lại mật khẩu. Liên kết có hiệu lực trong 1 giờ và chỉ dùng được một lần.',
    ],
    action: { label: 'Đặt mật khẩu mới', url },
    footer: IGNORE_FOOTER,
  });
}

export function friendRequestEmail(fromName: string, url: string): MailContent {
  return render('Lời mời kết bạn mới', {
    heading: 'Bạn có lời mời kết bạn mới',
    lines: [`${fromName} vừa gửi lời mời kết bạn cho bạn.`],
    action: { label: 'Xem lời mời', url },
    footer: 'Bạn nhận được email này vì đã bật thông báo lời mời kết bạn trong cài đặt.',
  });
}
