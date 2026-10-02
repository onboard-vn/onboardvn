const UNSAFE_CHARS = /[\u0000-\u001f\u007f\\]/;
const RESOLVE_BASE = 'http://onboardvn.invalid';

export function safeNextPath(value: string | string[] | undefined): string | null {
  if (typeof value !== 'string') return null;
  if (!value.startsWith('/') || value.startsWith('//')) return null;
  if (UNSAFE_CHARS.test(value)) return null;

  let decoded: string;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return null;
  }
  if (UNSAFE_CHARS.test(decoded)) return null;

  try {
    const url = new URL(value, RESOLVE_BASE);
    if (url.origin !== RESOLVE_BASE) return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}
