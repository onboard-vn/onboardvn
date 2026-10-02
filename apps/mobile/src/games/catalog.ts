import index from './game-index.json';

export interface GameEntry {
  slug: string;
  name: string;
  year: number | null;
  players: [number | null, number | null];
  mode: string | null;
}

export const games = index as GameEntry[];

const gamesBySlug = new Map(games.map((g) => [g.slug, g]));
const searchKeys = games.map((g) => ({ game: g, key: normalize(g.name) }));

export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .trim();
}

export function getGame(slug: string): GameEntry | undefined {
  return gamesBySlug.get(slug);
}

export function searchGames(query: string, limit = 50): GameEntry[] {
  const q = normalize(query);
  if (!q) return games.slice(0, limit);
  const prefix: GameEntry[] = [];
  const substring: GameEntry[] = [];
  for (const { game, key } of searchKeys) {
    if (key.startsWith(q)) prefix.push(game);
    else if (key.includes(q)) substring.push(game);
  }
  return [...prefix, ...substring].slice(0, limit);
}

export function playersLabel([min, max]: GameEntry['players']): string {
  if (min == null && max == null) return '';
  if (min === max || max == null) return `${min} người`;
  if (min == null) return `${max} người`;
  return `${min}-${max} người`;
}

export function modeLabel(mode: string | null): string {
  return mode === 'coop' ? 'Co-op' : 'Cạnh tranh';
}
