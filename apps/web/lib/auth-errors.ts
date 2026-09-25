export interface AuthClientError {
  code?: string;
  message?: string;
  status?: number;
}

const MESSAGES: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: 'Sai email hoặc mật khẩu',
  INVALID_USERNAME_OR_PASSWORD: 'Sai tên đăng nhập hoặc mật khẩu',
  EMAIL_NOT_VERIFIED: 'Email chưa được xác minh. Đã gửi lại email xác minh, hãy kiểm tra hộp thư.',
  USERNAME_IS_ALREADY_TAKEN: 'Tên đăng nhập đã có người dùng',
  INVALID_USERNAME:
    'Tên đăng nhập chỉ gồm chữ thường, số, dấu _ và dấu chấm, không dùng tên dành riêng',
  USERNAME_TOO_SHORT: 'Tên đăng nhập cần ít nhất 3 ký tự',
  USERNAME_TOO_LONG: 'Tên đăng nhập tối đa 30 ký tự',
  USER_ALREADY_EXISTS: 'Email này đã được đăng ký',
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: 'Email này đã được đăng ký',
  PASSWORD_TOO_SHORT: 'Mật khẩu cần ít nhất 8 ký tự',
  PASSWORD_TOO_LONG: 'Mật khẩu quá dài',
  INVALID_TOKEN: 'Liên kết không hợp lệ hoặc đã hết hạn',
};

export function authErrorMessage(error: AuthClientError): string {
  if (error.status === 429) return 'Thử quá nhiều lần, vui lòng đợi một phút';
  return (error.code && MESSAGES[error.code]) || error.message || 'Có lỗi xảy ra, thử lại sau';
}
