import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/env';

// SITE_URL is only known at runtime (image is built without it); never prerender.
export const dynamic = 'force-dynamic';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/api/auth', '/tai-khoan'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
