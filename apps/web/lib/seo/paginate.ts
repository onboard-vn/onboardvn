export const DEFAULT_PAGE_SIZE = 50;

/** Follows a `{ items, total }` paginated list endpoint until a short page or `total` is reached. */
export async function fetchAllPages<T>(
  fetchPage: (page: number) => Promise<{ items: T[]; total: number } | null>,
  pageSize = DEFAULT_PAGE_SIZE,
): Promise<T[]> {
  const results: T[] = [];
  let page = 1;
  for (;;) {
    const body = await fetchPage(page);
    if (!body) throw new Error(`Paginated fetch failed at page ${page}`);
    results.push(...body.items);
    if (body.items.length < pageSize || results.length >= body.total) break;
    page += 1;
  }
  return results;
}
