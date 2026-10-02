export const GAME_MODULE_SLUGS: ReadonlySet<string> = new Set(['the-gang-2024']);

export function gameModuleHref(slug: string): string | null {
  return GAME_MODULE_SLUGS.has(slug) ? `/app/games/${slug}/missions` : null;
}
