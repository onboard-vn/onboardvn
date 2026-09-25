const UNSAFE_CHARS = /[\u0000-\u001f\u007f\\]/;
const RESOLVE_BASE = 'http://onboardvn.invalid';

/** Only a same-origin path is safe for a post-login redirect; anything else (absolute URL, protocol-relative, backslash/control-char tricks a proxy might normalize) is rejected. */
export function safeNextPath(value: string | undefined): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return null;
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
