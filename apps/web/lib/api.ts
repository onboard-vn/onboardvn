import type { AppType } from '@onboard/api';
import { hc } from 'hono/client';

export const api = hc<AppType>(typeof window === 'undefined' ? '' : window.location.origin, {
  init: { credentials: 'include' },
});
