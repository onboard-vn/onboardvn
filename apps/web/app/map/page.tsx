import type { Metadata } from 'next';
import { serverApi } from '@/lib/api-server';
import { mapFiltersToQuery, parseMapSearchParams } from '@/lib/map-filters';
import { SITE_NAME } from '@/lib/site';
import { MapView } from './map-view';

export const metadata: Metadata = { title: `Bản đồ quán · ${SITE_NAME}` };
// The API isn't reachable at web build time (separate Docker image); never prerender this.
export const dynamic = 'force-dynamic';

export default async function MapPage(props: PageProps<'/map'>) {
  const sp = await props.searchParams;
  const filters = parseMapSearchParams(sp);

  const client = await serverApi();
  const provincesRes = await client.api.locations.provinces.$get();
  const provinces = provincesRes.ok ? (await provincesRes.json()).items : [];

  const pinsRes = await client.api.cafes.map.$get({ query: mapFiltersToQuery(filters) });
  const initialPins = pinsRes.ok ? await pinsRes.json() : [];

  let initialGameName: string | null = null;
  if (filters.gameSlug) {
    const gameRes = await client.api.games[':slug'].$get({ param: { slug: filters.gameSlug } });
    if (gameRes.ok) {
      const game = await gameRes.json();
      initialGameName = game.nameVi || game.nameEn;
    }
  }

  return (
    <main className="flex h-[calc(100vh-3.5rem)] w-full flex-col">
      <MapView
        provinces={provinces}
        initialFilters={filters}
        initialPins={initialPins}
        initialGameName={initialGameName}
      />
    </main>
  );
}
