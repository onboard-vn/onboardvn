import type { SuggestRarity } from '@onboard/shared';

export const HAND_SIZE = 5;
export const DECK_SIZE = 11;

export const RARITY_LEVEL: Record<SuggestRarity, number> = {
  common: 0,
  rare: 1,
  epic: 2,
  legendary: 3,
  ancient: 4,
};

export function shuffled<T>(items: T[], rand: () => number = Math.random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

/** Distinct items while the pool allows it; small pools repeat to fill the hand. */
export function pickHand<T>(pool: T[], rand: () => number = Math.random, size = HAND_SIZE): T[] {
  if (pool.length === 0) return [];
  const deck = shuffled(pool, rand);
  return Array.from({ length: size }, (_, i) => deck[i % deck.length]!);
}

export interface DealMove {
  /** Deck index, dealt from the top (highest index) down. */
  card: number;
  /** Hand slot 0..4, or 'muck' for a burned card. */
  to: number | 'muck';
  hint: string;
}

/** Texas hold'em board: burn, flop 3, burn, turn, burn, river. */
export function dealPlan(deckSize: number = DECK_SIZE): DealMove[] {
  let top = deckSize - 1;
  const moves: DealMove[] = [];
  const burn = () => moves.push({ card: top--, to: 'muck', hint: 'Huỷ 1 lá…' });
  const deal = (slot: number, hint: string) => moves.push({ card: top--, to: slot, hint });
  burn();
  deal(0, 'Flop');
  deal(1, 'Flop');
  deal(2, 'Flop');
  burn();
  deal(3, 'Turn');
  burn();
  deal(4, 'River');
  return moves;
}

const PILE_SCALE = 0.62;

export interface TableLayout {
  cardW: number;
  cardH: number;
  slotX: (slot: number) => number;
  deck: { x: number; y: number };
  muck: { x: number; y: number };
  pileScale: number;
}

export function tableLayout(width: number, height: number): TableLayout {
  const cardW = Math.max(40, Math.min(110, Math.floor((width - 88) / 5.2)));
  const cardH = Math.round(cardW * 1.6);
  const pileY = Math.max(-cardH, -height / 2 + 48 + (cardH * PILE_SCALE) / 2);
  return {
    cardW,
    cardH,
    slotX: (slot) => (slot - 2) * (cardW + 12),
    deck: { x: -2.5 * cardW, y: pileY },
    muck: { x: 2.5 * cardW, y: pileY },
    pileScale: PILE_SCALE,
  };
}
