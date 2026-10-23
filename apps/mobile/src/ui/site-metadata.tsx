import { usePathname } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

/** Keep SPA metadata consistent with the same anonymous HTML served on direct navigation. */
export function SiteMetadata() {
  const path = usePathname();
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const controller = new AbortController();
    // Preserve verified initial HTML. Clear old-page details only on SPA navigation.
    const current = document.querySelector<HTMLLinkElement>('link[data-site-seo][rel="canonical"]');
    if (!current || new URL(current.href).pathname !== path) {
      document.querySelectorAll('[data-site-seo]').forEach((node) => node.remove());
      document.title = 'OnBoardVN';
      const robots = document.createElement('meta');
      robots.name = 'robots';
      robots.content = 'noindex,nofollow';
      robots.dataset.siteSeo = 'true';
      document.head.appendChild(robots);
    }
    fetch(`/api/site-metadata?path=${encodeURIComponent(path)}`, {
      credentials: 'omit',
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('Metadata unavailable');
        return response.json();
      })
      .then((page) => {
        if (controller.signal.aborted) return;
        document.querySelectorAll('[data-site-seo]').forEach((node) => node.remove());
        document.title = page.title;
        const values: Record<string, string> = {
          description: page.description,
          robots: page.indexable ? 'index,follow,max-image-preview:large' : 'noindex,nofollow',
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
        };
        for (const [key, value] of Object.entries(values)) {
          const meta = document.createElement('meta');
          meta.setAttribute(key.startsWith('og:') ? 'property' : 'name', key);
          meta.content = value;
          meta.dataset.siteSeo = 'true';
          document.head.appendChild(meta);
        }
        const canonical = document.createElement('link');
        canonical.rel = 'canonical';
        canonical.href = page.canonical;
        canonical.dataset.siteSeo = 'true';
        document.head.appendChild(canonical);
        if (page.jsonLd) {
          const script = document.createElement('script');
          script.type = 'application/ld+json';
          script.dataset.siteSeo = 'true';
          script.textContent = JSON.stringify(page.jsonLd);
          document.head.appendChild(script);
        }
      })
      .catch(() => {
        /* Remain generic/noindex when metadata cannot be verified. */
      });
    return () => controller.abort();
  }, [path]);
  return null;
}
