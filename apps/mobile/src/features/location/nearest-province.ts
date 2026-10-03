/** Pre-2025 provincial capitals mapped to the post-merger province code, as [code, lat, lng]. */
const CAPITALS: [string, number, number][] = [
  ['01', 21.03, 105.85],
  ['04', 22.67, 106.26],
  ['08', 21.82, 105.21],
  ['08', 22.82, 104.98],
  ['11', 21.39, 103.02],
  ['12', 22.4, 103.46],
  ['14', 21.33, 103.91],
  ['15', 22.49, 103.97],
  ['15', 21.72, 104.91],
  ['19', 21.59, 105.85],
  ['19', 22.15, 105.83],
  ['20', 21.85, 106.76],
  ['22', 20.95, 107.08],
  ['24', 21.27, 106.19],
  ['24', 21.18, 106.07],
  ['25', 21.32, 105.4],
  ['25', 21.31, 105.6],
  ['25', 20.81, 105.34],
  ['31', 20.86, 106.68],
  ['31', 20.94, 106.33],
  ['33', 20.65, 106.05],
  ['33', 20.45, 106.34],
  ['37', 20.25, 105.97],
  ['37', 20.54, 105.91],
  ['37', 20.42, 106.17],
  ['38', 19.81, 105.78],
  ['40', 18.68, 105.68],
  ['42', 18.34, 105.91],
  ['44', 17.47, 106.62],
  ['44', 16.82, 107.1],
  ['46', 16.46, 107.59],
  ['48', 16.05, 108.2],
  ['48', 15.57, 108.47],
  ['51', 15.12, 108.8],
  ['51', 14.35, 108.0],
  ['52', 13.98, 108.0],
  ['52', 13.78, 109.22],
  ['56', 12.24, 109.19],
  ['56', 11.56, 108.99],
  ['66', 12.67, 108.04],
  ['66', 13.09, 109.3],
  ['68', 11.94, 108.44],
  ['68', 12.0, 107.69],
  ['68', 10.93, 108.1],
  ['75', 10.95, 106.82],
  ['75', 11.53, 106.89],
  ['79', 10.78, 106.7],
  ['79', 10.98, 106.65],
  ['79', 10.35, 107.08],
  ['80', 10.54, 106.41],
  ['80', 11.31, 106.1],
  ['82', 10.36, 106.36],
  ['82', 10.46, 105.63],
  ['86', 10.25, 105.97],
  ['86', 10.24, 106.38],
  ['86', 9.93, 106.34],
  ['91', 10.01, 105.08],
  ['91', 10.39, 105.43],
  ['92', 10.03, 105.78],
  ['92', 9.78, 105.47],
  ['92', 9.6, 105.97],
  ['96', 9.18, 105.15],
  ['96', 9.29, 105.72],
];

export function nearestProvinceCode(lat: number, lng: number): string {
  let best = CAPITALS[0]!;
  let bestDist = Infinity;
  for (const c of CAPITALS) {
    const dLat = c[1] - lat;
    const dLng = (c[2] - lng) * Math.cos((lat * Math.PI) / 180);
    const dist = dLat * dLat + dLng * dLng;
    if (dist < bestDist) {
      best = c;
      bestDist = dist;
    }
  }
  return best[0];
}

/** Browser geolocation → province code; null when unsupported, denied or outside Vietnam. */
export function locateProvinceCode(): Promise<string | null> {
  const geo = globalThis.navigator?.geolocation;
  if (!geo) return Promise.resolve(null);
  return new Promise((resolve) =>
    geo.getCurrentPosition(
      ({ coords }) => {
        const inVietnam =
          coords.latitude > 8 &&
          coords.latitude < 24 &&
          coords.longitude > 102 &&
          coords.longitude < 110;
        resolve(inVietnam ? nearestProvinceCode(coords.latitude, coords.longitude) : null);
      },
      () => resolve(null),
      { maximumAge: 24 * 60 * 60 * 1000, timeout: 10000 },
    ),
  );
}
