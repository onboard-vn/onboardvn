import type {
  CafeAmenities,
  CafeConsentStatus,
  CafeFeeModel,
  CafeLinks,
  CafeOpeningHours,
  VenueType,
} from '@onboard/shared';

export interface CafeFormValues {
  name: string;
  provinceCode: string;
  wardCode: string;
  addressLine: string;
  legacyDistrict: string;
  lat: number | null;
  lng: number | null;
  venueType: VenueType;
  fanpage: string;
  phone: string;
  maps: string;
  amenities: CafeAmenities;
  feeModel: CafeFeeModel;
  feeNote: string;
  hours: CafeOpeningHours;
  consentStatus: CafeConsentStatus;
  sourceUrl: string;
  consentNote: string;
}

export const emptyCafeValues = (): CafeFormValues => ({
  name: '',
  provinceCode: '',
  wardCode: '',
  addressLine: '',
  legacyDistrict: '',
  lat: null,
  lng: null,
  venueType: 'boardgame_cafe',
  fanpage: '',
  phone: '',
  maps: '',
  amenities: {},
  feeModel: 'unknown',
  feeNote: '',
  hours: undefined,
  consentStatus: 'granted',
  sourceUrl: '',
  consentNote: '',
});

export function validateCafe(v: CafeFormValues): string | null {
  if (!v.name.trim()) return 'Nhập tên quán';
  if (!v.provinceCode) return 'Chọn tỉnh/thành';
  if (!v.wardCode) return 'Chọn phường/xã';
  if (!v.addressLine.trim()) return 'Nhập địa chỉ';
  if (v.consentStatus !== 'granted' && !v.sourceUrl.trim()) {
    return 'Nguồn dữ liệu (sourceUrl) bắt buộc khi chưa được đồng ý';
  }
  return null;
}

/** On edit an emptied field sends `null` to clear the stored value; on create it is omitted. */
export function buildCafeBody(v: CafeFormValues, editing: boolean, storedLinks?: CafeLinks | null) {
  const clear = editing ? null : undefined;
  const str = (raw: string) => raw.trim() || clear;
  const edited = { fanpage: v.fanpage.trim(), maps: v.maps.trim(), phone: v.phone.trim() };
  const merged = Object.fromEntries(
    Object.entries({ ...storedLinks, ...edited }).filter(([, value]) => !!value),
  ) as NonNullable<CafeLinks>;
  return {
    name: v.name.trim(),
    provinceCode: v.provinceCode,
    wardCode: v.wardCode,
    addressLine: v.addressLine.trim(),
    legacyDistrict: str(v.legacyDistrict),
    lat: v.lat ?? clear,
    lng: v.lng ?? clear,
    openingHours: v.hours ?? clear,
    links: Object.keys(merged).length > 0 ? merged : clear,
    sourceUrl: str(v.sourceUrl),
    consentStatus: v.consentStatus,
    consentNote: str(v.consentNote),
    venueType: v.venueType,
    amenities: v.amenities,
    feeModel: v.feeModel,
    feeNote: v.feeNote.trim() || clear,
  };
}
