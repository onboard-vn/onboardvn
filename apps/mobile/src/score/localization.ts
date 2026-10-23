import { scoreGuideTranslations } from '../i18n/score-guide-translations';
import { scoreUiTranslations } from '../i18n/score-ui-translations';
import {
  localizedScoreGuide,
  t,
  translateKnown,
  type Language,
  type MessageValues,
} from '../ui/i18n';

const normalize = (value: string) => value.trim().replace(/\s+/g, ' ');

/** Resolve authored score copy from either the guide catalog or the UI catalog. */
export function scoreText(source: string, values?: MessageValues): string {
  const normalized = normalize(source);
  if (
    Object.hasOwn(scoreGuideTranslations, source) ||
    Object.hasOwn(scoreGuideTranslations, normalized)
  ) {
    return localizedScoreGuide(source);
  }
  return t(source, values);
}

/** Resolve score feedback that may be a fixed message or a model-generated message. */
export function scoreFeedbackText(source: string): string {
  const normalized = normalize(source);
  const wholeText =
    Object.hasOwn(scoreUiTranslations, normalized) ||
    Object.hasOwn(scoreGuideTranslations, normalized);
  if (wholeText) return scoreText(normalized);

  const patterns: [RegExp, string, string][] = [
    [/^Hòa điểm cao nhất: (.+) cùng thắng\.$/, 'Hòa điểm cao nhất: {names} cùng thắng.', 'names'],
    [
      /^Hòa điểm cao nhất: (.+)\. Xem ghi chú luật bên dưới\.$/,
      'Hòa điểm cao nhất: {names}. Xem ghi chú luật bên dưới.',
      'names',
    ],
    [/^Chọn nhân vật cho (.+)\.$/, 'Chọn nhân vật cho {name}.', 'name'],
    [/^Chọn Thắng\/Thua cho (.+)\.$/, 'Chọn Thắng/Thua cho {name}.', 'name'],
    [/^Gửi link này cho khách: (.+)$/, 'Gửi link này cho khách: {url}', 'url'],
  ];
  for (const [pattern, key, field] of patterns) {
    const match = normalized.match(pattern);
    if (match?.[1]) return scoreText(key, { [field]: match[1] });
  }

  return translateKnown(source);
}

export function scorePlayerName(player: { name: string; fallbackSeat?: number }): string {
  return player.fallbackSeat === undefined
    ? player.name
    : scoreText('Người chơi {seat}', { seat: player.fallbackSeat });
}

export function scoreTieNote(
  players: readonly { id: string; name: string; fallbackSeat?: number }[],
  winnerIds: readonly string[],
  sharedVictory: boolean,
): string {
  const names = winnerIds
    .map((id) => players.find((player) => player.id === id))
    .filter((player): player is NonNullable<typeof player> => !!player)
    .map(scorePlayerName)
    .join(', ');
  return sharedVictory
    ? scoreText('Hòa điểm cao nhất: {names} cùng thắng.', { names })
    : scoreText('Hòa điểm cao nhất: {names}. Xem ghi chú luật bên dưới.', { names });
}

/** Template category labels already carry an authored VI/EN pair. */
export function templateScoreText(vietnamese: string, english: string, language: Language) {
  if (language === 'en') return english;
  return vietnamese === english ? scoreText(english) : vietnamese;
}

export const scoreLocale = (language: Language) => (language === 'en' ? 'en-US' : 'vi-VN');
