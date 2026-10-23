import { afterEach, describe, expect, it } from 'vitest';
import { colors, setActiveTheme, themeStyles } from './theme';

function luminance(hex: string) {
  const channels = [1, 3, 5].map((offset) => {
    const channel = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722;
}

afterEach(() => setActiveTheme('light'));

describe('app theme', () => {
  it('updates an already imported stylesheet without mutating frozen rendered styles', () => {
    const styles = themeStyles(() => ({
      card: { backgroundColor: colors.card, color: colors.text },
    }));
    const light = Object.freeze(styles.card);
    setActiveTheme('dark');
    expect(styles.card).not.toBe(light);
    expect(styles.card.backgroundColor).not.toBe(light.backgroundColor);
    expect(styles.card.color).not.toBe(light.color);
    expect(styles.card).toBe(styles.card);
    setActiveTheme('light');
    expect(styles.card).toEqual(light);
  });

  it.each(['light', 'dark'] as const)('keeps primary button text readable in %s mode', (theme) => {
    setActiveTheme(theme);
    const background = luminance(colors.primary);
    const foreground = luminance(colors.onPrimary);
    const contrast =
      (Math.max(background, foreground) + 0.05) / (Math.min(background, foreground) + 0.05);
    expect(contrast).toBeGreaterThanOrEqual(4.5);
  });
});
