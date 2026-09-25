import type { Metadata } from 'next';
import { Be_Vietnam_Pro } from 'next/font/google';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { SITE_URL } from '@/lib/env';
import { SITE_NAME, SITE_SLOGAN, SITE_TAGLINE } from '@/lib/site';
import { cn } from '@/lib/utils';
import './globals.css';

const beVietnamPro = Be_Vietnam_Pro({
  variable: '--font-be-vietnam',
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_NAME,
  description: `${SITE_TAGLINE}. ${SITE_SLOGAN}.`,
  openGraph: { siteName: SITE_NAME, type: 'website', locale: 'vi_VN' },
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="vi" className={cn('h-full antialiased', beVietnamPro.variable)}>
      <body className="flex min-h-full flex-col font-sans">
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
