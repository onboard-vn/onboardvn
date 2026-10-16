import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const templatesFile = resolve(root, 'src/score/templates.ts');
const templates = await readFile(templatesFile, 'utf8');
const scoring = [];
for (const match of templates.matchAll(/import\s+\w+\s+from\s+['"]([^'"]+\.json)['"]/g)) {
  const template = JSON.parse(await readFile(resolve(dirname(templatesFile), match[1]), 'utf8'));
  scoring.push(`/score/${template.slug}`);
}
const modules = await readFile(resolve(root, 'src/games/modules.ts'), 'utf8');
const tools = [...modules.matchAll(/href:\s*['"]([^'"]+)['"]/g)].map((m) => m[1]);
await writeFile(
  resolve(root, 'dist/seo-capabilities.json'),
  JSON.stringify([...scoring, ...tools]),
);
