import type { Feature, Polygon } from 'geojson';

/** Great-circle points match the API's spherical distance (Earth radius 6371 km). */
export function nearbyCircle(center: [number, number], radiusKm: number): Feature<Polygon> {
  const [lng, lat] = center.map((value) => (value * Math.PI) / 180) as [number, number];
  const distance = radiusKm / 6371;
  const coordinates: number[][] = [];
  for (let step = 0; step <= 96; step += 1) {
    const bearing = (step * 2 * Math.PI) / 96;
    const pointLat = Math.asin(
      Math.sin(lat) * Math.cos(distance) + Math.cos(lat) * Math.sin(distance) * Math.cos(bearing),
    );
    const pointLng =
      lng +
      Math.atan2(
        Math.sin(bearing) * Math.sin(distance) * Math.cos(lat),
        Math.cos(distance) - Math.sin(lat) * Math.sin(pointLat),
      );
    coordinates.push([
      (((pointLng * 180) / Math.PI + 540) % 360) - 180,
      (pointLat * 180) / Math.PI,
    ]);
  }
  coordinates[coordinates.length - 1] = coordinates[0]!;
  return {
    type: 'Feature',
    properties: {},
    geometry: { type: 'Polygon', coordinates: [coordinates] },
  };
}
