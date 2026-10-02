export interface RecenterTarget {
  lat: number;
  lng: number;
  zoom?: number;
}

export interface PinEditorMapProps {
  lat: number | null;
  lng: number | null;
  onPick: (lat: number, lng: number) => void;
  recenterTo?: RecenterTarget | null;
}

export const VN_LAT_RANGE = [8, 24] as const;
export const VN_LNG_RANGE = [102, 110] as const;

export const isOutsideVietnam = (lat: number | null, lng: number | null): boolean =>
  lat !== null &&
  lng !== null &&
  (lat < VN_LAT_RANGE[0] ||
    lat > VN_LAT_RANGE[1] ||
    lng < VN_LNG_RANGE[0] ||
    lng > VN_LNG_RANGE[1]);
