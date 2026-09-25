import type { ApiErrorBody } from '@onboard/shared';

/** Reads `{ error: { message } }` from a failed API response, falling back to `fallback` when
 * the body isn't JSON or doesn't match the shape (network errors, HTML error pages, etc). */
export async function apiErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const body = (await res.json()) as Partial<ApiErrorBody>;
    return body?.error?.message || fallback;
  } catch {
    return fallback;
  }
}
