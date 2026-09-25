import { describe, expect, it } from 'vitest';
import { fetchAllCafeSlugs, fetchAllGameSlugs, fetchAllProvinceSlugs } from './sitemap-data';

type FakeClient = Parameters<typeof fetchAllGameSlugs>[0];

function jsonResponse(body: unknown) {
  return { ok: true, json: async () => body };
}

function pagedFakeClient(items: { slug: string }[], pageSize = 50) {
  const paged = async ({ query }: { query: { page: string; pageSize: string } }) => {
    const page = Number(query.page);
    const start = (page - 1) * pageSize;
    return jsonResponse({ items: items.slice(start, start + pageSize), total: items.length });
  };
  return { api: { games: { $get: paged }, cafes: { $get: paged } } } as unknown as FakeClient;
}

describe('fetchAllGameSlugs / fetchAllCafeSlugs', () => {
  it('follows pagination until a short page is returned', async () => {
    const items = Array.from({ length: 120 }, (_, i) => ({ slug: `slug-${i}` }));
    const client = pagedFakeClient(items, 50);

    const slugs = await fetchAllGameSlugs(client);
    expect(slugs).toHaveLength(120);
    expect(slugs[0]).toBe('slug-0');
    expect(slugs[119]).toBe('slug-119');
  });

  it('throws instead of returning a truncated list when the API call fails', async () => {
    const client = {
      api: { cafes: { $get: async () => ({ ok: false, json: async () => ({}) }) } },
    } as unknown as FakeClient;
    await expect(fetchAllCafeSlugs(client)).rejects.toThrow();
  });
});

describe('fetchAllProvinceSlugs', () => {
  it('returns province slugs from a single call', async () => {
    const client = {
      api: {
        locations: {
          provinces: {
            $get: async () =>
              jsonResponse({ items: [{ code: '79', name: 'TP.HCM', slug: 'tp-hcm' }] }),
          },
        },
      },
    } as unknown as FakeClient;
    expect(await fetchAllProvinceSlugs(client)).toEqual(['tp-hcm']);
  });
});
