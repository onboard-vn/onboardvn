import { apiBase } from '../api/client';

export const mediaUrl = (url: string | null | undefined): string | null =>
  url ? (url.startsWith('/') ? `${apiBase()}${url}` : url) : null;
