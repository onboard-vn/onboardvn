import { Platform } from 'react-native';
import { colors, fontFamily } from './theme';

const FONT_HREF =
  'https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800&display=swap';

export function installWebStyles() {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  if (document.getElementById('onboard-web-styles')) return;
  for (const [rel, href, cross] of [
    ['preconnect', 'https://fonts.googleapis.com', false],
    ['preconnect', 'https://fonts.gstatic.com', true],
    ['stylesheet', FONT_HREF, false],
  ] as const) {
    const link = document.createElement('link');
    link.rel = rel;
    link.href = href;
    if (cross) link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  }
  const style = document.createElement('style');
  style.id = 'onboard-web-styles';
  style.textContent = `
    html, body { background: ${colors.bg}; }
    :is(body, div, span, input, textarea, button, select, a):not([style*="monospace"]) { font-family: ${fontFamily} !important; }
    a, [role="button"], [role="link"], [role="tab"], button { cursor: pointer; }
    :focus-visible { outline: 2px solid ${colors.primary}; outline-offset: 2px; }
    @media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }
  `;
  document.head.appendChild(style);
}
