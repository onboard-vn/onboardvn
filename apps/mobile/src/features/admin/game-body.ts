import type { CategoryDto, GameDetailDto, GameCreateInput } from '@onboard/shared';

export type DescriptionSource = 'original' | 'translated_with_permission' | 'translated_from_bgg';
export type DescriptionLicense = 'CC-BY-SA-4.0' | 'permission-only';

export interface GameFormValues {
  nameEn: string;
  nameVi: string;
  minPlayers: string;
  maxPlayers: string;
  playMinutes: string;
  weight: string;
  minAge: string;
  bggId: string;
  isVietnamese: boolean;
  categoryIds: string[];
  descriptionVi: string;
  source: DescriptionSource;
  rightsHolder: string;
  permissionRef: string;
  license: DescriptionLicense;
  acceptLicense: boolean;
  videoUrls: string;
  imageCredit: string;
}

export type GameFormInitial = GameDetailDto;

export const gameValuesFrom = (
  initial: GameFormInitial | undefined,
  nameEn = '',
): GameFormValues => ({
  nameEn: initial?.nameEn ?? nameEn,
  nameVi: initial?.nameVi ?? '',
  minPlayers: initial?.minPlayers?.toString() ?? '',
  maxPlayers: initial?.maxPlayers?.toString() ?? '',
  playMinutes: initial?.playMinutes?.toString() ?? '',
  weight: initial?.weight ?? '',
  minAge: initial?.minAge?.toString() ?? '',
  bggId: initial?.bggId?.toString() ?? '',
  isVietnamese: initial?.isVietnamese ?? false,
  categoryIds: initial?.categories.map((c: CategoryDto) => c.id) ?? [],
  descriptionVi: initial?.descriptionVi ?? '',
  source: initial?.descriptionSource ?? 'original',
  rightsHolder: initial?.descriptionRightsHolder ?? '',
  permissionRef: initial?.descriptionPermissionRef ?? '',
  license: initial?.descriptionLicense ?? 'permission-only',
  acceptLicense: false,
  videoUrls: initial?.videoUrls.join('\n') ?? '',
  imageCredit: initial?.imageCredit ?? '',
});

export function validateGame(v: GameFormValues): string | null {
  if (!v.nameEn.trim()) return 'Nhập tên tiếng Anh';
  if (v.source === 'translated_with_permission') {
    if (!v.rightsHolder.trim()) return 'Nhập đơn vị cấp phép';
    if (!v.permissionRef.trim()) return 'Nhập tham chiếu giấy phép';
  } else if (v.source !== 'translated_from_bgg' && !v.acceptLicense) {
    return 'Cần xác nhận tự viết nội dung và đồng ý cấp phép CC BY-SA 4.0';
  }
  return null;
}

/** On edit an emptied field sends `null` to clear the stored value; on create it is omitted. */
export function buildGameBody(v: GameFormValues, editing: boolean) {
  const clear = editing ? null : undefined;
  const num = (raw: string) => (raw.trim() !== '' ? Number(raw.trim().replace(',', '.')) : clear);
  const str = (raw: string) => raw.trim() || clear;
  return {
    nameEn: v.nameEn.trim(),
    nameVi: str(v.nameVi),
    minPlayers: num(v.minPlayers),
    maxPlayers: num(v.maxPlayers),
    playMinutes: num(v.playMinutes),
    weight: num(v.weight),
    minAge: num(v.minAge),
    isVietnamese: v.isVietnamese,
    bggId: num(v.bggId),
    descriptionVi: str(v.descriptionVi),
    descriptionSource: v.source,
    descriptionRightsHolder: str(v.rightsHolder),
    descriptionPermissionRef: str(v.permissionRef),
    descriptionLicense: (v.source === 'original'
      ? 'CC-BY-SA-4.0'
      : v.source === 'translated_from_bgg'
        ? 'permission-only'
        : v.license) as DescriptionLicense | undefined,
    videoUrls: v.videoUrls
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean),
    acceptLicense: v.acceptLicense,
    imageCredit: str(v.imageCredit),
    categoryIds: v.categoryIds,
  };
}

export type GameBody = ReturnType<typeof buildGameBody>;
export const asCreateInput = (body: GameBody): GameCreateInput =>
  body as unknown as GameCreateInput;
