// Turbopack/webpack can't bundle MapLibre's worker correctly; copy it to /public and point
// setWorkerUrl() at the static copy instead (both files, since the worker imports the other).
import { copyFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const destDir = path.join(import.meta.dirname, '../public/maplibre');
mkdirSync(destDir, { recursive: true });

for (const file of ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']) {
  copyFileSync(require.resolve(`maplibre-gl/dist/${file}`), path.join(destDir, file));
}
