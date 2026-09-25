export const MAP_STYLE_URL =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL ?? 'https://tiles.openfreemap.org/styles/liberty';

/** Hà Nội — default map center when no café coordinates are set yet. */
export const DEFAULT_MAP_CENTER: [number, number] = [105.8542, 21.0285];

/** Turbopack/webpack can't resolve MapLibre's bundled worker URL correctly, so it's pointed at a
 * same-origin static copy instead (see `scripts/copy-maplibre-worker.mjs`). */
export const MAP_WORKER_URL = '/maplibre/maplibre-gl-worker.mjs';

let webglSupportCache: boolean | null = null;

/** Probes once per page load (cached across every map component) — creating a WebGL context on
 * every render exhausts the browser's context limit and blanks the map. The probe context is
 * released immediately. */
export function isWebglSupported(): boolean {
  if (webglSupportCache !== null) return webglSupportCache;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    webglSupportCache = Boolean(gl);
    (gl as WebGLRenderingContext | null)?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    webglSupportCache = false;
  }
  return webglSupportCache;
}
