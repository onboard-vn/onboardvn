import { Platform } from 'react-native';
import { colors, fontFamily } from './theme';
import type { Language } from './i18n';
import type { AppTheme } from './theme';

const FONT_HREF =
  'https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800&display=swap';

export function installWebStyles(theme: AppTheme, language: Language) {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  if (!document.querySelector('link[href="https://fonts.googleapis.com"]')) {
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
  }
  let style = document.getElementById('onboard-web-styles') as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement('style');
    style.id = 'onboard-web-styles';
    document.head.appendChild(style);
  }
  document.documentElement.lang = language;
  document.documentElement.dataset.theme = theme;
  document.body.dataset.theme = theme;
  style.textContent = `
    html, body { background: ${colors.bg}; color: ${colors.text}; color-scheme: ${theme}; }
    :root {
      --onboard-bg: ${colors.bg};
      --onboard-card: ${colors.card};
      --onboard-border: ${colors.border};
      --onboard-text: ${colors.text};
      --onboard-muted: ${colors.muted};
      --onboard-primary: ${colors.primary};
      --onboard-success: ${colors.success};
      --onboard-success-soft: ${colors.successSoft};
      --onboard-surface-muted: ${colors.surfaceMuted};
    }
    :is(body, div, span, input, textarea, button, select, a):not([style*="monospace"]) { font-family: ${fontFamily} !important; }
    a, [role="button"], [role="link"], [role="tab"], button { cursor: pointer; }
    :focus-visible { outline: 2px solid ${colors.primary}; outline-offset: 2px; }
    .maplibregl-ctrl-group { background: ${colors.card}; border: 1px solid ${colors.border}; }
    .maplibregl-ctrl-group button { border-color: ${colors.border}; }
    .maplibregl-ctrl-group button:hover { background-color: ${colors.surfaceMuted}; }
    .maplibregl-ctrl-attrib { background: ${colors.card}; color: ${colors.muted}; }
    .maplibregl-ctrl-attrib a { color: ${colors.primary}; }
    [data-theme="dark"] .maplibregl-ctrl-icon { filter: invert(1); }
    [data-theme="dark"] .maplibregl-ctrl-group button { background-color: ${colors.card}; }
    [data-theme="dark"] .maplibregl-ctrl-group button:hover { background-color: ${colors.surfaceMuted}; }
    .maplibregl-popup-anchor-top .maplibregl-popup-tip { border-bottom-color: ${colors.card}; }
    .maplibregl-popup-anchor-bottom .maplibregl-popup-tip { border-top-color: ${colors.card}; }
    .maplibregl-popup-anchor-left .maplibregl-popup-tip { border-right-color: ${colors.card}; }
    .maplibregl-popup-anchor-right .maplibregl-popup-tip { border-left-color: ${colors.card}; }
    @media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }
  `;
}
