import { adminUiTranslations } from '../i18n/admin-ui-translations';
import { featureUiTranslations } from '../i18n/feature-ui-translations';
import { myCafesTranslations } from '../i18n/my-cafes-translations';
import { routeUiTranslations } from '../i18n/route-ui-translations';
import { scoreGuideTranslations } from '../i18n/score-guide-translations';
import { scoreUiTranslations } from '../i18n/score-ui-translations';
import { staticPageTranslations } from '../i18n/static-page-translations';

export type Language = 'vi' | 'en';
export type MessageValues = Record<string, string | number>;
export type TranslationMap = Record<string, { vi: string; en: string }>;

const coreMessages: TranslationMap = {
  Game: { vi: 'Game', en: 'Games' },
  'Bản đồ': { vi: 'Bản đồ', en: 'Map' },
  'Kèo': { vi: 'Kèo', en: 'Meetups' },
  'Hôm nay chơi gì?': { vi: 'Hôm nay chơi gì?', en: 'What should we play today?' },
  Club: { vi: 'Club', en: 'Clubs' },
  'Bạn bè': { vi: 'Bạn bè', en: 'Friends' },
  'Tủ game': { vi: 'Tủ game', en: 'Game shelf' },
  'Muốn chơi': { vi: 'Muốn chơi', en: 'Wishlist' },
  'Địa điểm chơi của tôi': { vi: 'Địa điểm chơi của tôi', en: 'My venues' },
  'Quản lý game': { vi: 'Quản lý game', en: 'Manage games' },
  'Quản lý địa điểm chơi': { vi: 'Quản lý địa điểm chơi', en: 'Manage venues' },
  'Quét mã': { vi: 'Quét mã', en: 'Scan barcode' },
  'Thể loại': { vi: 'Thể loại', en: 'Categories' },
  'Quản lý Kèo': { vi: 'Quản lý Kèo', en: 'Manage meetups' },
  'Quản lý club': { vi: 'Quản lý club', en: 'Manage clubs' },
  'Đóng góp cộng đồng': { vi: 'Đóng góp cộng đồng', en: 'Community contributions' },
  'Thành viên': { vi: 'Thành viên', en: 'Member' },
  'Đăng xuất': { vi: 'Đăng xuất', en: 'Sign out' },
  'Đăng nhập': { vi: 'Đăng nhập', en: 'Sign in' },
  'Đăng ký': { vi: 'Đăng ký', en: 'Create account' },
  Maintainer: { vi: 'Điều phối viên', en: 'Maintainer' },
  Admin: { vi: 'Quản trị viên', en: 'Admin' },
  'Onboard - trang chủ': { vi: 'Onboard - trang chủ', en: 'Onboard home' },
  'Đóng menu': { vi: 'Đóng menu', en: 'Close menu' },
  'Mở menu': { vi: 'Mở menu', en: 'Open menu' },
  'Thu gọn': { vi: 'Thu gọn', en: 'Collapse' },
  'Mở rộng': { vi: 'Mở rộng', en: 'Expand' },
  'Giao diện': { vi: 'Giao diện', en: 'Theme' },
  'Sáng': { vi: 'Sáng', en: 'Light' },
  'Tối': { vi: 'Tối', en: 'Dark' },
  'Ngôn ngữ': { vi: 'Ngôn ngữ', en: 'Language' },
  'Tiếng Việt': { vi: 'Tiếng Việt', en: 'Vietnamese' },
  English: { vi: 'English', en: 'English' },
  'Mã nguồn': { vi: 'Mã nguồn', en: 'Source code' },
  'Giấy phép dữ liệu': { vi: 'Giấy phép dữ liệu', en: 'Data licenses' },
  'Giấy phép mã nguồn AGPL-3.0-only': {
    vi: 'Giấy phép mã nguồn AGPL-3.0-only',
    en: 'AGPL-3.0-only source license',
  },
  'Dữ liệu CC BY-SA 4.0': { vi: 'Dữ liệu CC BY-SA 4.0', en: 'CC BY-SA 4.0 data' },
  'Thông tin & giấy phép': { vi: 'Thông tin & giấy phép', en: 'About & licenses' },
  'Nguồn tham khảo': { vi: 'Nguồn tham khảo', en: 'References' },
  'Nguồn dữ liệu & yêu cầu sửa/gỡ': {
    vi: 'Nguồn dữ liệu & yêu cầu sửa/gỡ',
    en: 'Data sources and correction/removal requests',
  },
  'Mã nguồn AGPL-3.0 · Dữ liệu CC BY-SA 4.0': {
    vi: 'Mã nguồn AGPL-3.0 · Dữ liệu CC BY-SA 4.0',
    en: 'Source code: AGPL-3.0 · Data: CC BY-SA 4.0',
  },
  CLB: { vi: 'CLB', en: 'Club' },
  'Rút nhiệm vụ': { vi: 'Rút nhiệm vụ', en: 'Draw a mission' },
  'Bảng điểm': { vi: 'Bảng điểm', en: 'Score sheet' },
  'Tính điểm': { vi: 'Tính điểm', en: 'Score a game' },
  Back: { vi: 'Quay lại', en: 'Back' },
};

const messages: TranslationMap = {
  ...coreMessages,
  ...featureUiTranslations,
  ...routeUiTranslations,
  ...myCafesTranslations,
  ...scoreUiTranslations,
  ...adminUiTranslations,
};

let activeLanguage: Language = 'vi';

export function setActiveLanguage(language: Language) {
  activeLanguage = language;
}

export function getActiveLanguage(): Language {
  return activeLanguage;
}

function normalizeMessage(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

export function registerTranslationMap(map: TranslationMap) {
  for (const [key, translation] of Object.entries(map)) {
    messages[normalizeMessage(key)] = translation;
  }
}

function applyValues(message: string, values?: MessageValues): string {
  return message.replace(/\{([a-zA-Z][\w]*)\}/g, (placeholder, key: string) => {
    if (!values || !(key in values)) {
      throw new Error(`Missing translation value for {${key}} in: ${message}`);
    }
    return String(values[key]);
  });
}

export function t(key: string, values?: MessageValues): string {
  const normalized = normalizeMessage(key);
  const message = messages[normalized];
  if (!message) throw new Error(`Missing ${activeLanguage} translation for: ${normalized}`);
  return applyValues(message[activeLanguage], values);
}

function matchTemplate(template: string, value: string): MessageValues | null {
  const normalizedTemplate = normalizeMessage(template);
  const placeholders = [...normalizedTemplate.matchAll(/\{([a-zA-Z][\w]*)\}/g)];
  if (placeholders.length === 0) return normalizeMessage(value) === normalizedTemplate ? {} : null;
  if (normalizedTemplate.replace(/\{[a-zA-Z][\w]*\}/g, '').replace(/\s/g, '').length < 4) return null;

  const normalizedValue = normalizeMessage(value);
  let templateCursor = 0;
  let valueCursor = 0;
  const values: MessageValues = {};
  for (let i = 0; i < placeholders.length; i += 1) {
    const placeholder = placeholders[i]!;
    const index = placeholder.index ?? 0;
    const prefix = normalizedTemplate.slice(templateCursor, index);
    if (!normalizedValue.startsWith(prefix, valueCursor)) return null;
    valueCursor += prefix.length;

    const tokenEnd = index + placeholder[0].length;
    const nextIndex = placeholders[i + 1]?.index ?? normalizedTemplate.length;
    const suffix = normalizedTemplate.slice(tokenEnd, nextIndex);
    const end = suffix ? normalizedValue.indexOf(suffix, valueCursor) : normalizedValue.length;
    if (end < valueCursor) return null;
    const captured = normalizedValue.slice(valueCursor, end);
    const name = placeholder[1]!;
    if (name in values && values[name] !== captured) return null;
    values[name] = captured;
    templateCursor = tokenEnd;
    valueCursor = end;
  }
  return normalizedValue.slice(valueCursor) === normalizedTemplate.slice(templateCursor) ? values : null;
}

/** Translate a known authored message in either locale without throwing for unknown text. */
export function translateKnown(message: string): string {
  const normalized = normalizeMessage(message);
  const entries = Object.entries(messages);

  for (const [key, translation] of entries) {
    if (
      normalized === key ||
      normalized === normalizeMessage(translation.vi) ||
      normalized === normalizeMessage(translation.en)
    ) {
      return translation[activeLanguage];
    }
  }

  const candidates = entries
    .filter(([key, translation]) => /\{[a-zA-Z][\w]*\}/.test(key) || /\{[a-zA-Z][\w]*\}/.test(translation.vi) || /\{[a-zA-Z][\w]*\}/.test(translation.en))
    .sort(([left], [right]) => {
      const literalLength = (value: string) => value.replace(/\{[a-zA-Z][\w]*\}/g, '').length;
      const literalDifference = literalLength(right) - literalLength(left);
      if (literalDifference !== 0) return literalDifference;
      return [...left.matchAll(/\{[a-zA-Z][\w]*\}/g)].length - [...right.matchAll(/\{[a-zA-Z][\w]*\}/g)].length;
    });
  for (const [key, translation] of candidates) {
    const values =
      matchTemplate(key, normalized) ??
      matchTemplate(translation.vi, normalized) ??
      matchTemplate(translation.en, normalized);
    if (values) return applyValues(translation[activeLanguage], values);
  }
  return message;
}

export function containsVietnameseText(message: string): boolean {
  return /[ăâđêôơưĂÂĐÊÔƠƯàáạảãèéẹẻẽìíịỉĩòóọỏõùúụủũỳýỵỷỹ]/i.test(message);
}

export function localizedContent(vietnamese: string): string {
  if (activeLanguage === 'vi') return vietnamese;
  const translated = staticPageTranslations[vietnamese] ?? staticPageTranslations[normalizeMessage(vietnamese)];
  if (!translated) throw new Error(`Missing English content translation for: ${normalizeMessage(vietnamese)}`);
  return translated;
}

export function localizedScoreGuide(vietnamese: string): string {
  if (activeLanguage === 'vi') return vietnamese;
  const translated = scoreGuideTranslations[vietnamese] ?? scoreGuideTranslations[normalizeMessage(vietnamese)];
  if (!translated) throw new Error(`Missing English score guide translation for: ${normalizeMessage(vietnamese)}`);
  return translated;
}
