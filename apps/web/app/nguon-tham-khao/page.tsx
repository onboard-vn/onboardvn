import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { marked } from 'marked';
import type { Metadata } from 'next';

export const dynamic = 'force-static';

export const metadata: Metadata = { title: 'Nguồn tham khảo · Onboard VN' };

// Rendered once at build time from a repo-owned markdown file, so we trust its content
// (no user input reaches this path) instead of adding a sanitizer dependency.
export default async function ReferencesPage() {
  const filePath = path.join(process.cwd(), '../../docs/references.md');
  const markdown = await readFile(filePath, 'utf8');
  const html = await marked.parse(markdown);

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <article
        className="[&_a]:text-primary [&_a]:underline [&_h1]:mb-4 [&_h1]:text-2xl [&_h1]:font-semibold [&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_p]:mb-4 [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-6"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </main>
  );
}
