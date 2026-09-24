export interface ProvinceDto {
  code: string;
  name: string;
  slug: string;
}

export interface WardDto {
  code: string;
  provinceCode: string;
  name: string;
  slug: string;
}

export interface ProvinceListResponse {
  items: ProvinceDto[];
}

export interface WardListResponse {
  items: WardDto[];
}
