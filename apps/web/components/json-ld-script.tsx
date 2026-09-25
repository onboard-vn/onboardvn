import { escapeJsonLdScript } from '@/lib/seo/json-ld';

export function JsonLdScript({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: escapeJsonLdScript(JSON.stringify(data)) }}
    />
  );
}
