const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
const WEEKDAYS_VI = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];

const pad = (n: number): string => String(n).padStart(2, '0');

export function formatVnDateTime(iso: string): string {
  const vn = new Date(new Date(iso).getTime() + VN_OFFSET_MS);
  return `${pad(vn.getUTCHours())}:${pad(vn.getUTCMinutes())}, ${WEEKDAYS_VI[vn.getUTCDay()]} ${pad(vn.getUTCDate())}/${pad(vn.getUTCMonth() + 1)}/${vn.getUTCFullYear()}`;
}

export const formatLocalDateTime = (iso: string): string => new Date(iso).toLocaleString('vi-VN');

export const formatLocalDate = (iso: string): string => new Date(iso).toLocaleDateString('vi-VN');
