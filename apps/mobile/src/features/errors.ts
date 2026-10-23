import { ApiError } from '../api/client';
import { containsVietnameseText, t, translateKnown } from '../ui/i18n';

export function errorMessage(e: unknown, fallback = 'Không kết nối được máy chủ'): string {
  const translatedFallback = translateKnown(fallback);
  if (!(e instanceof ApiError)) return translatedFallback;

  const translatedMessage = translateKnown(e.message);
  if (translatedMessage !== e.message || !containsVietnameseText(e.message))
    return translatedMessage;
  return t('Có lỗi xảy ra, thử lại sau');
}
