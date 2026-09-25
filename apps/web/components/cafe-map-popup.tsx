import type { CafeMapPinDto } from '@onboard/shared';
import { openStatusLabel, VENUE_TYPE_LABELS } from '@/lib/cafe-labels';

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
}

/** MapLibre popups render raw DOM, so the card is built as an HTML string instead of JSX. */
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
        <a href="/cafes/${encodeURIComponent(pin.slug)}">Xem trang</a>
        <a href="${directionsUrl}" target="_blank" rel="noopener noreferrer">Chỉ đường</a>
      </div>
    </div>
  `;
}
