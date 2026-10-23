import { getActiveLanguage } from '../../ui/i18n';

function locale(): string {
  return getActiveLanguage() === 'en' ? 'en-GB' : 'vi-VN';
}

export function formatVnDateTime(iso: string): string {
  const date = new Date(iso);
  const parts = new Intl.DateTimeFormat(locale(), {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? '';
  const rawWeekday = part('weekday');
  const weekday =
    getActiveLanguage() === 'vi'
      ? rawWeekday.charAt(0).toLocaleUpperCase('vi-VN') +
        rawWeekday.slice(1).toLocaleLowerCase('vi-VN')
      : rawWeekday;
  return `${part('hour')}:${part('minute')}, ${weekday} ${part('day')}/${part('month')}/${part('year')}`;
}

export const formatLocalDateTime = (iso: string): string => new Date(iso).toLocaleString(locale());

export const formatLocalDate = (iso: string): string => new Date(iso).toLocaleDateString(locale());
