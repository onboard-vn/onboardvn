export interface PageMetadata {
  title: string;
  description: string;
  canonical: string;
  image: string;
  imageAlt: string;
  indexable: boolean;
  status: 200 | 404 | 503;
  jsonLd?: Record<string, unknown>;
  links?: { href: string; label: string }[];
}
export const escapeHtml = (s: string): string =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
export function renderPage(shell: string, page: PageMetadata): string {
  const tag = (key: string, value: string) =>
    `<meta data-site-seo="true" ${key.startsWith('og:') ? 'property' : 'name'}="${key}" content="${escapeHtml(value)}">`;
  const tags = [
    tag('description', page.description),
    tag('robots', page.indexable ? 'index,follow,max-image-preview:large' : 'noindex,nofollow'),
    `<link data-site-seo="true" rel="canonical" href="${escapeHtml(page.canonical)}">`,
    ...Object.entries({
      'og:type': 'website',
      'og:site_name': 'OnBoardVN',
      'og:locale': 'vi_VN',
      'og:title': page.title,
      'og:description': page.description,
      'og:url': page.canonical,
      'og:image': page.image,
      'og:image:alt': page.imageAlt,
      'twitter:card': 'summary_large_image',
      'twitter:title': page.title,
      'twitter:description': page.description,
      'twitter:image': page.image,
      'twitter:image:alt': page.imageAlt,
    }).map(([k, v]) => tag(k, v)),
    ...(page.image.endsWith('/opengraph-image.jpg')
      ? [
          tag('og:image:width', '1200'),
          tag('og:image:height', '630'),
          tag('og:image:type', 'image/jpeg'),
        ]
      : []),
    ...(page.jsonLd
      ? [
          `<script data-site-seo="true" type="application/ld+json">${JSON.stringify(page.jsonLd)
            .replace(/</g, '\\u003c')
            .replace(/\u2028/g, '\\u2028')
            .replace(/\u2029/g, '\\u2029')}</script>`,
        ]
      : []),
  ].join('\n');
  const content = `<main><h1>${escapeHtml(page.title)}</h1><p>${escapeHtml(page.description)}</p><nav aria-label="Khám phá">${(page.links ?? []).map((l) => `<a href="${escapeHtml(l.href)}">${escapeHtml(l.label)}</a>`).join(' · ')}</nav></main>`;
  return shell
    .replace(/<html\b[^>]*>/i, '<html lang="vi">')
    .replace(/<title>[^]*?<\/title>/i, () => `<title>${escapeHtml(page.title)}</title>`)
    .replace(/<(?:meta|link)\b[^>]*data-site-seo="true"[^>]*>/gi, '')
    .replace(/<script\b[^>]*data-site-seo="true"[^>]*>[^]*?<\/script>/gi, '')
    .replace('</head>', () => `${tags}\n</head>`)
    .replace(
      /(<div\b[^>]*id="root"[^>]*>)[^]*?(<\/div>)/i,
      (_match, open: string, close: string) => `${open}${content}${close}`,
    );
}
export function renderSitemap(entries: { url: string; lastmod?: Date | string }[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries.map((e) => `<url><loc>${escapeHtml(e.url)}</loc>${e.lastmod ? `<lastmod>${escapeHtml(new Date(e.lastmod).toISOString())}</lastmod>` : ''}</url>`).join('')}</urlset>`;
}
export function renderSitemapIndex(urls: string[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((u) => `<sitemap><loc>${escapeHtml(u)}</loc></sitemap>`).join('')}</sitemapindex>`;
}
