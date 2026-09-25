export const CAFE_TABS = ['about', 'games', 'events', 'photos'] as const;
export type CafeTab = (typeof CAFE_TABS)[number];

const CAFE_TAB_SET = new Set<string>(CAFE_TABS);

/** Reads `?tab=` from the resolved searchParams, defaulting to `about` for anything missing or
 * unrecognized (never throws on bad input from the URL). */
export function parseCafeTab(searchParams: Record<string, string | string[] | undefined>): CafeTab {
  const raw = searchParams.tab;
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value && CAFE_TAB_SET.has(value) ? (value as CafeTab) : 'about';
}
