import { publicApi } from '../api-public';
import type { LlmsCafeEntry, LlmsGameEntry } from './llms';
import { DEFAULT_PAGE_SIZE, fetchAllPages } from './paginate';

type PublicApiClient = ReturnType<typeof publicApi>;

export async function fetchAllGamesForLlms(
  client: PublicApiClient = publicApi(),
): Promise<LlmsGameEntry[]> {
  return fetchAllPages(async (page) => {
    const res = await client.api.games.$get({
      query: { page: String(page), pageSize: String(DEFAULT_PAGE_SIZE) },
    });
    return res.ok ? await res.json() : null;
  });
}

/** The public `/api/cafes` list already excludes `pending` cafés (see `cafes/service.ts`). */
export async function fetchAllCafesForLlms(
  client: PublicApiClient = publicApi(),
): Promise<LlmsCafeEntry[]> {
  return fetchAllPages(async (page) => {
    const res = await client.api.cafes.$get({
      query: { page: String(page), pageSize: String(DEFAULT_PAGE_SIZE) },
    });
    return res.ok ? await res.json() : null;
  });
}
