/** Splits `items` into consecutive slices of at most `size` — used to keep bulk requests under a
 * server-enforced batch limit (e.g. community game submissions capped at 20 per request). */
export function chunk<T>(items: T[], size: number): T[][] {
  if (size <= 0) return [items];
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}
