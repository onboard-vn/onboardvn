import { GoogleCafeMap } from './google-cafe-map.web';
import { MapLibreCafeMap } from './maplibre-cafe-map.web';
import { GOOGLE_MAPS_API_KEY } from './style';

export const CafeMap = GOOGLE_MAPS_API_KEY ? GoogleCafeMap : MapLibreCafeMap;
