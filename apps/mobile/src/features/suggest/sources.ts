import type { SuggestPoolItemDto, SuggestQuery } from '@onboard/shared';

export type Source = SuggestQuery['source'];
export type ActionGroup = 'cafe' | 'personal' | 'area';

export const SOURCES: { value: Source; label: string; needsLogin?: boolean }[] = [
  { value: 'shelf', label: 'Tủ game của tôi', needsLogin: true },
  { value: 'club', label: 'Club', needsLogin: true },
  { value: 'friends', label: 'Nhóm bạn', needsLogin: true },
  { value: 'cafe', label: 'Quán' },
  { value: 'city', label: 'Cùng thành phố' },
  { value: 'wishlist', label: 'Muốn chơi', needsLogin: true },
  { value: 'all', label: 'Toàn quốc' },
];

export const PLAYER_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: 'Bất kỳ' },
  { value: 2, label: '2' },
  { value: 3, label: '3' },
  { value: 4, label: '4' },
  { value: 5, label: '5' },
  { value: 6, label: '6+' },
];

export interface SuggestChoice {
  source: Source | null;
  cafe: { id: string; slug: string; name: string } | null;
  club: { id: string; slug: string; name: string } | null;
  province: { code: string; name: string } | null;
  players: number | null;
}

export const initialChoice = (): SuggestChoice => ({
  source: null,
  cafe: null,
  club: null,
  province: null,
  players: null,
});

export function actionGroup(source: Source | null): ActionGroup {
  if (source === 'cafe') return 'cafe';
  if (source === 'shelf' || source === 'club' || source === 'friends') return 'personal';
  return 'area';
}

/** Null until the chosen source has everything the API needs. */
export function buildSuggestQuery(c: SuggestChoice): Record<string, string | number> | null {
  if (!c.source) return null;
  if (c.source === 'cafe' && !c.cafe) return null;
  if (c.source === 'club' && !c.club) return null;
  if ((c.source === 'city' || c.source === 'province') && !c.province) return null;
  const query: Record<string, string | number> = { source: c.source };
  if (c.source === 'cafe' && c.cafe) query.cafeId = c.cafe.id;
  if (c.source === 'club' && c.club) query.clubId = c.club.id;
  if ((c.source === 'city' || c.source === 'province') && c.province) {
    query.provinceCode = c.province.code;
  }
  if (c.players !== null) query.players = c.players;
  return query;
}

export function poolLabel(c: SuggestChoice, total: number): string {
  switch (c.source) {
    case 'shelf':
      return `Tủ game của bạn: ${total} game`;
    case 'club':
      return `Tủ game của thành viên ${c.club?.name ?? 'club'}: ${total} game`;
    case 'friends':
      return `Tủ game của bạn và bạn bè: ${total} game`;
    case 'wishlist':
      return `Danh sách Muốn chơi: ${total} game`;
    case 'cafe':
      return `Tủ game của ${c.cafe?.name ?? 'quán'}: ${total} game`;
    case 'city':
      return `Game có ở quán và người chơi tại ${c.province?.name ?? 'thành phố này'}: ${total} game`;
    case 'province':
      return `Game có ở các quán tại ${c.province?.name ?? 'tỉnh/thành'}: ${total} game`;
    default:
      return `Game có ở các quán trên toàn quốc: ${total} game`;
  }
}

function ownersText(item: SuggestPoolItemDto): string {
  const names = (item.owners ?? []).map((o) => o.name);
  const rest = (item.ownerCount ?? names.length) - names.length;
  if (names.length === 0) return '';
  return rest > 0 ? `${names.join(', ')} và ${rest} người khác` : names.join(', ');
}

export function whoHasIt(c: SuggestChoice, item: SuggestPoolItemDto): string {
  const owners = ownersText(item);
  switch (c.source) {
    case 'shelf':
      return 'Game trong tủ của bạn · rủ bạn bè qua chơi hoặc mang ra quán.';
    case 'club':
      return owners ? `Thành viên có game: ${owners}.` : 'Game này có trong tủ của bạn.';
    case 'friends':
      return owners ? `${owners} có game này.` : 'Game này có trong tủ của bạn.';
    case 'wishlist':
      return item.cafeCount > 0
        ? `Game bạn muốn chơi · ${item.cafeCount} quán đang có.`
        : 'Game bạn muốn chơi · chưa quán nào ghi nhận có game này.';
    case 'cafe':
      return `${c.cafe?.name ?? 'Quán'} đang có game này trong tủ.`;
    case 'city': {
      const place = c.province?.name ?? 'thành phố này';
      const people = item.ownerCount ?? 0;
      return people > 0
        ? `${item.cafeCount} quán và ${people} người chơi tại ${place} có game này${owners ? ` (${owners})` : ''}.`
        : `${item.cafeCount} quán tại ${place} có game này.`;
    }
    case 'province':
      return `${item.cafeCount} quán tại ${c.province?.name ?? 'tỉnh/thành này'} có game này.`;
    default:
      return `${item.cafeCount} quán trên toàn quốc có game này.`;
  }
}

/** `/events/new` query for "Tạo Kèo" from a drawn game. */
export function eventParams(c: SuggestChoice, gameSlug: string): Record<string, string> {
  const params: Record<string, string> = { game: gameSlug };
  if (c.source === 'cafe' && c.cafe) params.cafe = c.cafe.slug;
  if (c.source === 'club' && c.club) params.club = c.club.slug;
  return params;
}
