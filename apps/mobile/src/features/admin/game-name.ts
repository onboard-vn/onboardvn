export interface ResolvedGame {
  id: string;
  name: string;
}

export const displayName = (g: { nameVi: string | null; nameEn: string }): string =>
  g.nameVi || g.nameEn;
