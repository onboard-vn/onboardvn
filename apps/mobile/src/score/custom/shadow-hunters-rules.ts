import type { ScoreTemplate } from '@onboard/shared';
import type { SheetState } from '../model';

export const isShadowHunters = (template: ScoreTemplate): boolean =>
  template.slug === 'shadow-hunters';

/** Only validate recorded results; faction and survival do not determine victory alone. */
export function shadowHuntersError(template: ScoreTemplate, state: SheetState): string | null {
  const { players, values } = state;
  if (players.length < 4 || players.length > 8) return 'Shadow Hunters cần từ 4 đến 8 người.';
  const used = new Set<number>();
  for (const player of players) {
    const character = values[player.id]?.character;
    if (
      typeof character !== 'number' ||
      !Number.isInteger(character) ||
      !template.roles?.some((r) => r.key === String(character))
    )
      return `Chọn nhân vật cho ${player.name}.`;
    if (used.has(character)) return 'Mỗi nhân vật chỉ được chọn cho một người.';
    used.add(character);
    if (typeof values[player.id]?.won !== 'boolean') return `Chọn Thắng/Thua cho ${player.name}.`;
  }
  if (!players.some((p) => values[p.id]?.won === true)) return 'Chọn ít nhất một người thắng.';
  return null;
}
