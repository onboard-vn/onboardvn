import { afterEach, describe, expect, it } from 'vitest';
import type { CafeMapPinDto } from '@onboard/shared';
import { getActiveLanguage, setActiveLanguage } from '../../ui/i18n';
import { renderCafeMapPopupHtml } from './popup';

const pin: CafeMapPinDto = {
  slug: 'meeple',
  name: 'Meeple & <Board>',
  lat: 10.77,
  lng: 106.7,
  venueType: 'boardgame_cafe',
  verified: true,
};

afterEach(() => setActiveLanguage('vi'));

describe('map popup localization', () => {
  it('translates controls in English while preserving and escaping venue names', () => {
    setActiveLanguage('en');
    const html = renderCafeMapPopupHtml(pin);

    expect(html).toContain('View venue');
    expect(html).toContain('Directions');
    expect(html).toContain('Verified');
    expect(html).toContain('Meeple &amp; &lt;Board&gt;');
    expect(html).not.toContain('Xem trang');
    expect(getActiveLanguage()).toBe('en');
  });
});
