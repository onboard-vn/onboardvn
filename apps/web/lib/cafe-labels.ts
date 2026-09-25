import type {
  CafeAmenities,
  CafeDayKey,
  CafeFeeModel,
  CafeOpenStatus,
  VenueType,
} from '@onboard/shared';
import { CAFE_DAY_KEYS } from '@onboard/shared';

export const VENUE_TYPE_LABELS: Record<VenueType, string> = {
  boardgame_cafe: 'Cafe board game',
  byog_cafe: 'Quán cho mang game tới (BYOG)',
  event_space: 'Không gian sự kiện',
};

export const FEE_MODEL_LABELS: Record<CafeFeeModel, string> = {
  free: 'Miễn phí',
  with_drink: 'Miễn phí khi gọi đồ uống',
  hourly: 'Tính theo giờ',
  per_person: 'Tính theo người',
  game_rental: 'Thuê game riêng',
  unknown: 'Chưa rõ',
};

export const DAY_LABELS: Record<CafeDayKey, string> = {
  mon: 'Thứ Hai',
  tue: 'Thứ Ba',
  wed: 'Thứ Tư',
  thu: 'Thứ Năm',
  fri: 'Thứ Sáu',
  sat: 'Thứ Bảy',
  sun: 'Chủ Nhật',
};

export { CAFE_DAY_KEYS };

type TriStateAmenityKey = Extract<
  keyof CafeAmenities,
  | 'foodAvailable'
  | 'outsideFoodAllowed'
  | 'outsideDrinkAllowed'
  | 'privateRoom'
  | 'byogAllowed'
  | 'largeTables'
  | 'wifi'
  | 'airCon'
  | 'motorbikeParking'
  | 'carParking'
  | 'nonSmoking'
  | 'bankTransfer'
>;

/** Labels for tri-state amenities, in display order. */
export const AMENITY_LABELS: Record<TriStateAmenityKey, string> = {
  foodAvailable: 'Có đồ ăn sẵn',
  outsideFoodAllowed: 'Cho mang đồ ăn vào',
  outsideDrinkAllowed: 'Cho mang đồ uống vào',
  privateRoom: 'Phòng/khu riêng',
  byogAllowed: 'Cho mang game tới',
  largeTables: 'Bàn lớn/nhóm đông',
  wifi: 'Wifi',
  airCon: 'Điều hòa',
  motorbikeParking: 'Chỗ để xe máy',
  carParking: 'Chỗ để ô tô',
  nonSmoking: 'Không hút thuốc',
  bankTransfer: 'Chuyển khoản',
};

export const AMENITY_KEYS = Object.keys(AMENITY_LABELS) as TriStateAmenityKey[];

export function openStatusLabel(status: CafeOpenStatus | undefined): string | null {
  if (!status) return null;
  switch (status.state) {
    case 'open':
      return status.until ? `Đang mở · Đóng lúc ${status.until}` : 'Đang mở';
    case 'closing_soon':
      return status.until ? `Sắp đóng · Đóng lúc ${status.until}` : 'Sắp đóng';
    case 'closed':
      return status.nextOpen
        ? `Đã đóng · Mở lúc ${status.nextOpen.time} ${DAY_LABELS[status.nextOpen.day]}`
        : 'Đã đóng';
    case 'unknown':
      return null;
  }
}
