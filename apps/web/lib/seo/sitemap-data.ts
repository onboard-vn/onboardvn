import { publicApi } from '../api-public';
import { DEFAULT_PAGE_SIZE, fetchAllPages } from './paginate';

type PublicApiClient = ReturnType<typeof publicApi>;

export async function fetchAllGameSlugs(client: PublicApiClient = publicApi()): Promise<string[]> {
  const items = await fetchAllPages(async (page) => {
    const res = await client.api.games.$get({
      query: { page: String(page), pageSize: String(DEFAULT_PAGE_SIZE) },
    });
    return res.ok ? await res.json() : null;
  });
  return items.map((g) => g.slug);
}

/** The public `/api/cafes` list already excludes `pending` cafés (see `cafes/service.ts`). */
export async function fetchAllCafeSlugs(client: PublicApiClient = publicApi()): Promise<string[]> {
  const items = await fetchAllPages(async (page) => {
    const res = await client.api.cafes.$get({
      query: { page: String(page), pageSize: String(DEFAULT_PAGE_SIZE) },
    });
    return res.ok ? await res.json() : null;
  });
  return items.map((c) => c.slug);
}

/** The anonymous `GET /events` list only returns upcoming `public` meetups (see `events/service.ts`). */
export async function fetchAllEventSlugs(client: PublicApiClient = publicApi()): Promise<string[]> {
  const items = await fetchAllPages(async (page) => {
    const res = await client.api.events.$get({
      query: { page: String(page), pageSize: String(DEFAULT_PAGE_SIZE) },
    });
    return res.ok ? await res.json() : null;
  });
  return items.map((m) => m.slug);
}

export async function fetchAllProvinceSlugs(
  client: PublicApiClient = publicApi(),
): Promise<string[]> {
  const res = await client.api.locations.provinces.$get();
  if (!res.ok) throw new Error(`Province list fetch failed: ${res.status}`);
  const { items } = await res.json();
  return items.map((p) => p.slug);
}
