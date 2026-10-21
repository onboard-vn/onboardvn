import { describe, expect, it } from 'vitest';
import { nearbyCircle } from './nearby-circle';

describe('nearbyCircle', () => {
  it.each([
    [105.85, 21.03],
    [0, 0],
    [179.99, 0],
    [0, 90],
  ])('draws a closed 5 km spherical ring around %j', (lng, lat) => {
    const circle = nearbyCircle([lng, lat], 5);
    const ring = circle.geometry.coordinates[0]!;
    expect(ring[0]).toEqual(ring.at(-1));
    for (const [pointLng, pointLat] of ring) {
      const radians = Math.PI / 180;
      const a =
        Math.sin(((pointLat! - lat) * radians) / 2) ** 2 +
        Math.cos(lat * radians) *
          Math.cos(pointLat! * radians) *
          Math.sin(((pointLng! - lng) * radians) / 2) ** 2;
      expect(6371 * 2 * Math.asin(Math.sqrt(Math.min(1, a)))).toBeCloseTo(5, 4);
    }
  });
});
