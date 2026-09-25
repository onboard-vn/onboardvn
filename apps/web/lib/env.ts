/** Server-side base URL for the API; browsers use same-origin `/api` via rewrites. */
export const API_INTERNAL_URL = process.env.API_INTERNAL_URL ?? 'http://localhost:8787';

/** Public site origin (no trailing slash) used for canonical URLs, sitemap, robots and llms.txt. */
export const SITE_URL = (process.env.SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');

/** Optional contact email shown on /data-sources; falls back to the GitHub issues link. */
export const CONTACT_EMAIL = process.env.CONTACT_EMAIL || null;
