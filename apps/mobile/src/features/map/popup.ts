import type { CafeMapPinDto } from '@onboard/shared';
import { VENUE_TYPE_LABELS, openStatusLabel } from '../cafes/labels';

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export const escapeHtml = (s: string): string => s.replace(/[&<>"']/g, (c) => ESCAPES[c]!);

export function renderCafeMapPopupHtml(pin: CafeMapPinDto): string {
  const statusText = openStatusLabel(pin.openStatus);
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${pin.lat},${pin.lng}`;

  return `
    <div class="cafe-map-popup">
      <p class="cafe-map-popup__title">
        ${escapeHtml(pin.name)}
        ${pin.verified ? '<span class="cafe-map-popup__badge">Đã xác minh</span>' : ''}
      </p>
      <p class="cafe-map-popup__meta">${escapeHtml(VENUE_TYPE_LABELS[pin.venueType])}</p>
      ${statusText ? `<p class="cafe-map-popup__meta">${escapeHtml(statusText)}</p>` : ''}
      <div class="cafe-map-popup__actions">
        <a data-cafe-link href="/cafes/${encodeURIComponent(pin.slug)}">Xem trang</a>
        <a href="${directionsUrl}" target="_blank" rel="noopener noreferrer">Chỉ đường</a>
      </div>
    </div>
  `;
}
