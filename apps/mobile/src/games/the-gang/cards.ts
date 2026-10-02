import en from './cards.en.json';
import vi from './cards.vi.json';

export type CardKind = 'challenge' | 'specialist' | 'hbBad' | 'hbGood';
export type Lang = 'vi' | 'en';

export interface GangCard {
  code: string;
  kind: CardKind;
  set: 'base' | 'hb';
  difficulty: number | null;
  credit: string | null;
  title: Record<Lang, string>;
  text: Record<Lang, string>;
}

interface RawEn {
  set: string;
  kind: string;
  title: string;
  text?: string;
  difficulty?: number | null;
  credit?: string | null;
}
interface RawVi {
  title: string;
  text?: string;
}

const KINDS: readonly CardKind[] = ['challenge', 'specialist', 'hbBad', 'hbGood'];
const isKind = (k: string): k is CardKind => (KINDS as readonly string[]).includes(k);

export const gangCards: Record<string, GangCard> = Object.fromEntries(
  Object.entries(en as Record<string, RawEn>).flatMap(([code, e]) => {
    const v = (vi as Record<string, RawVi>)[code];
    if (!isKind(e.kind) || !v || e.text == null) return [];
    const card: GangCard = {
      code,
      kind: e.kind,
      set: e.set === 'hb' ? 'hb' : 'base',
      difficulty: e.difficulty ?? null,
      credit: e.credit ?? null,
      title: { en: e.title, vi: v.title },
      text: { en: e.text, vi: v.text ?? e.text },
    };
    return [[code, card]];
  }),
);

const codeNumber = (code: string) => Number(code.replace(/\D/g, ''));
export const byCodeNumber = (a: string, b: string) => codeNumber(a) - codeNumber(b);

export const codesOf = (kind: CardKind) =>
  Object.values(gangCards)
    .filter((c) => c.kind === kind)
    .map((c) => c.code)
    .sort(byCodeNumber);
