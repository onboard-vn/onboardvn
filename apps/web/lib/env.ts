/** Server-side base URL for the API; browsers use same-origin `/api` via rewrites. */
export const API_INTERNAL_URL = process.env.API_INTERNAL_URL ?? 'http://localhost:8787';
