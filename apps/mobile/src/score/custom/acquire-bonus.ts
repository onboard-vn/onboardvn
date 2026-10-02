export const ACQUIRE_CHAINS = [
  { key: 'tower', name: 'Tower', color: '#ca8a04' },
  { key: 'luxor', name: 'Luxor', color: '#dc2626' },
  { key: 'american', name: 'American', color: '#2563eb' },
  { key: 'festival', name: 'Festival', color: '#16a34a' },
  { key: 'worldwide', name: 'Worldwide', color: '#92400e' },
  { key: 'imperial', name: 'Imperial', color: '#db2777' },
  { key: 'continental', name: 'Continental', color: '#0891b2' },
] as const;

export type ChainKey = (typeof ACQUIRE_CHAINS)[number]['key'];
export type Prices = Partial<Record<ChainKey, number>>;
export type Shares = Record<string, Partial<Record<ChainKey, number>>>;

const roundUp100 = (n: number) => Math.ceil(n / 100) * 100;

export interface ChainBonus {
  chain: ChainKey;
  payouts: Record<string, number>;
}

export function chainBonuses(prices: Prices, shares: Shares, playerIds: string[]): ChainBonus[] {
  const out: ChainBonus[] = [];
  for (const { key } of ACQUIRE_CHAINS) {
    const price = prices[key] ?? 0;
    if (price <= 0) continue;
    const held = playerIds
      .map((id) => ({ id, n: shares[id]?.[key] ?? 0 }))
      .filter((h) => h.n > 0)
      .sort((a, b) => b.n - a.n);
    const first = held[0];
    if (!first) continue;
    const major = price * 10;
    const minor = price * 5;
    const payouts: Record<string, number> = {};
    const topTie = held.filter((h) => h.n === first.n);
    if (held.length === 1) payouts[first.id] = major + minor;
    else if (topTie.length > 1) {
      for (const h of topTie) payouts[h.id] = roundUp100((major + minor) / topTie.length);
    } else {
      payouts[first.id] = major;
      const second = held[1] as { id: string; n: number };
      const secondTie = held.filter((h) => h.n === second.n);
      for (const h of secondTie) payouts[h.id] = roundUp100(minor / secondTie.length);
    }
    out.push({ chain: key, payouts });
  }
  return out;
}

export function stockSales(prices: Prices, shares: Shares, playerId: string): number {
  return ACQUIRE_CHAINS.reduce(
    (sum, { key }) => sum + (prices[key] ?? 0) * (shares[playerId]?.[key] ?? 0),
    0,
  );
}

export function endBonus(bonuses: ChainBonus[], playerId: string): number {
  return bonuses.reduce((sum, b) => sum + (b.payouts[playerId] ?? 0), 0);
}
