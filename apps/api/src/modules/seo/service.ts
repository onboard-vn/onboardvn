import { and, asc, count, eq, gte } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { cafes, clubs, games, meetups } from '../../db/schema/index.js';
import { env } from '../../lib/env.js';
import { ApiError } from '../../lib/errors.js';
import { getCafeBySlugService } from '../cafes/service.js';
import { publicCafeWhere } from '../cafes/visibility.js';
import { getClubBySlugService } from '../clubs/service.js';
import { getMeetupBySlugService } from '../events/service.js';
import { getGameBySlugService, listGamesService } from '../games/service.js';
import { gameFilterSchema } from '@onboard/shared';
import type { PageMetadata } from './render.js';

const ORIGIN = new URL(env.WEB_ORIGIN).origin;
const DESCRIPTION =
  'Tìm quán board game, khám phá game, tính điểm và tìm người cùng chơi trên khắp Việt Nam.';
const NAV = [
  { href: '/games', label: 'Game' },
  { href: '/map', label: 'Địa điểm chơi' },
  { href: '/events', label: 'Kèo chơi' },
  { href: '/score', label: 'Tính điểm' },
];
export const STATIC_PAGES: Record<string, [string, string]> = {
  '/': ['OnBoardVN · Tìm quán - Tìm game - Tìm người cùng chơi', DESCRIPTION],
  '/games': [
    'Danh mục game · OnBoardVN',
    'Tìm game theo tên, số người chơi, thời gian, độ khó; mở bảng điểm và công cụ chơi.',
  ],
  '/map': ['Bản đồ địa điểm chơi · OnBoardVN', 'Khám phá địa điểm chơi board game tại Việt Nam.'],
  '/events': [
    'Kèo chơi board game · OnBoardVN',
    'Khám phá những kèo chơi board game công khai và tìm người cùng chơi.',
  ],
  '/data-sources': [
    'Nguồn dữ liệu · OnBoardVN',
    'Nguồn dữ liệu, giấy phép và cách đóng góp dữ liệu cho cộng đồng OnBoardVN.',
  ],
  '/score': [
    'Tính điểm board game · OnBoardVN',
    'Mở bảng điểm cho game đang chơi, tự nhập người chơi và tính kết quả.',
  ],
  '/suggest': [
    'Hôm nay chơi gì? · OnBoardVN',
    'Tìm game phù hợp cho buổi chơi board game tiếp theo.',
  ],
  '/credits': ['Nguồn tham khảo · OnBoardVN', 'Nguồn dữ liệu, luật và giấy phép của OnBoardVN.'],
  '/developers': [
    'API và dữ liệu mở · OnBoardVN',
    'Tài liệu API và dữ liệu board game công khai của OnBoardVN.',
  ],
};
function base(path: string, title = 'OnBoardVN', description = DESCRIPTION): PageMetadata {
  return {
    title,
    description,
    canonical: ORIGIN + path,
    image: ORIGIN + '/opengraph-image.jpg',
    imageAlt: 'OnBoardVN · Cộng đồng board game Việt Nam',
    indexable: true,
    status: 200,
    links: NAV,
  };
}
function imageUrl(value: string | null | undefined): string | undefined {
  if (!value) return;
  try {
    const u = new URL(value, ORIGIN);
    if (['https:', 'http:'].includes(u.protocol)) return u.href;
  } catch {
    /* invalid catalog image uses site fallback */
  }
}
const snippet = (s: string | null | undefined, fallback: string) =>
  s?.replace(/\s+/g, ' ').trim().slice(0, 240) || fallback;
export async function pageMetadata(
  rawPath: string,
  featurePaths: readonly string[] = [],
): Promise<PageMetadata> {
  const path = rawPath.replace(/\/$/, '') || '/';
  const generic = () => ({ ...base('/'), indexable: false });
  if (
    /^\/(admin|account|my-cafes|login|signup|check-email|forgot-password|reset-password|invite|claim|friends|shelf|wishlist|club|u|meetup)(\/|$)/.test(
      path,
    ) ||
    /^\/(clubs|events)\/(new|join|mine)(\/|$)/.test(path) ||
    /\/(manage|edit|contribute)$/.test(path) ||
    path === '/clubs' ||
    path.startsWith('/score/table/')
  )
    return generic();
  try {
    const fixed = STATIC_PAGES[path];
    if (fixed) {
      const page = base(path, ...fixed);
      if (path === '/')
        page.jsonLd = {
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: 'OnBoardVN',
          url: ORIGIN,
          description: DESCRIPTION,
          inLanguage: 'vi',
        };
      if (path === '/games') {
        const list = await listGamesService(gameFilterSchema.parse({ pageSize: 50 }));
        page.links = list.items.map((g) => ({
          href: `/games/${encodeURIComponent(g.slug)}`,
          label: g.nameVi || g.nameEn,
        }));
      }
      return page;
    }
    const gameMatch = path.match(/^\/(games|score)\/([a-z0-9-]+)(\/missions)?$/);
    if (gameMatch) {
      const [, kind, slug, missions] = gameMatch;
      if ((kind === 'score' || missions) && !featurePaths.includes(path))
        return { ...generic(), status: 404, title: 'Không tìm thấy trang · OnBoardVN' };
      const game = await getGameBySlugService(slug!, false, false);
      const name = game.nameVi || game.nameEn;
      const prefix = kind === 'score' ? 'Tính điểm ' : missions ? 'Công cụ chơi ' : '';
      const page = base(
        path,
        `${prefix}${name} · OnBoardVN`,
        snippet(
          game.descriptionVi,
          `${prefix || 'Khám phá '}${name}: luật chơi, thông tin và nơi chơi trên OnBoardVN.`,
        ),
      );
      page.image = imageUrl(game.imageUrl) ?? page.image;
      page.imageAlt = name;
      page.jsonLd = {
        '@context': 'https://schema.org',
        '@type': kind === 'score' || missions ? 'WebPage' : 'Game',
        name: `${prefix}${name}`,
        url: page.canonical,
        description: page.description,
        image: page.image,
      };
      return page;
    }
    const cafeMatch = path.match(/^\/cafes\/([a-z0-9-]+)$/);
    if (cafeMatch) {
      const cafe = await getCafeBySlugService(cafeMatch[1]!);
      const page = base(
        path,
        `${cafe.name} · OnBoardVN`,
        `${cafe.name} — ${cafe.addressLine}, ${cafe.wardName}, ${cafe.provinceName}. Khám phá địa điểm và game có thể chơi.`,
      );
      page.image = imageUrl(cafe.coverUrl || cafe.logoUrl) ?? page.image;
      page.imageAlt = cafe.name;
      page.jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'EntertainmentBusiness',
        name: cafe.name,
        url: page.canonical,
        address: {
          '@type': 'PostalAddress',
          streetAddress: cafe.addressLine,
          addressLocality: cafe.wardName,
          addressRegion: cafe.provinceName,
          addressCountry: 'VN',
        },
      };
      return page;
    }
    const eventMatch = path.match(/^\/events\/([a-z0-9-]+)$/);
    if (eventMatch) {
      const meetup = await getMeetupBySlugService(eventMatch[1]!, null, undefined);
      const page = base(
        path,
        `${meetup.title} · OnBoardVN`,
        snippet(meetup.description, `Kèo chơi ${meetup.title} tại ${meetup.locationLabel}.`),
      );
      page.indexable = meetup.status === 'scheduled';
      page.jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Event',
        name: meetup.title,
        url: page.canonical,
        description: page.description,
        startDate: meetup.startsAt,
        ...(meetup.endsAt ? { endDate: meetup.endsAt } : {}),
        eventStatus:
          meetup.status === 'cancelled'
            ? 'https://schema.org/EventCancelled'
            : 'https://schema.org/EventScheduled',
        location: { '@type': 'Place', name: meetup.locationLabel },
      };
      return page;
    }
    const clubMatch = path.match(/^\/clubs\/([a-z0-9-]+)$/);
    if (clubMatch) {
      const { club } = await getClubBySlugService(clubMatch[1]!, null);
      if (club.visibility !== 'public') return generic();
      return base(
        path,
        `${club.name} · OnBoardVN`,
        snippet(club.description, `CLB board game ${club.name} trên OnBoardVN.`),
      );
    }
    return { ...generic(), title: 'Không tìm thấy trang · OnBoardVN', status: 404 };
  } catch (error) {
    if (error instanceof ApiError && [403, 404].includes(error.status))
      return { ...generic(), title: 'Không tìm thấy trang · OnBoardVN', status: 404 };
    throw error;
  }
}

export const SITEMAP_SIZE = 1000;
export const sitemapKinds = ['games', 'cafes', 'events', 'clubs'] as const;
export type SitemapKind = (typeof sitemapKinds)[number];
export async function sitemapEntries(kind: SitemapKind, page: number) {
  const table = { games, cafes, events: meetups, clubs }[kind];
  const where =
    kind === 'cafes'
      ? publicCafeWhere()
      : kind === 'clubs'
        ? eq(clubs.visibility, 'public')
        : kind === 'events'
          ? and(
              eq(meetups.visibility, 'public'),
              eq(meetups.status, 'scheduled'),
              gte(meetups.startsAt, new Date()),
            )
          : undefined;
  const rows = await db
    .select({ slug: table.slug, updatedAt: table.updatedAt })
    .from(table)
    .where(where)
    .orderBy(asc(table.slug))
    .limit(SITEMAP_SIZE)
    .offset((page - 1) * SITEMAP_SIZE);
  return rows.map((r) => ({
    url: `${ORIGIN}/${kind}/${encodeURIComponent(r.slug)}`,
    lastmod: r.updatedAt,
  }));
}
export const siteOrigin = ORIGIN;

export async function sitemapPages(kind: SitemapKind): Promise<number> {
  const table = { games, cafes, events: meetups, clubs }[kind];
  const where =
    kind === 'cafes'
      ? publicCafeWhere()
      : kind === 'clubs'
        ? eq(clubs.visibility, 'public')
        : kind === 'events'
          ? and(
              eq(meetups.visibility, 'public'),
              eq(meetups.status, 'scheduled'),
              gte(meetups.startsAt, new Date()),
            )
          : undefined;
  const [row] = await db.select({ total: count() }).from(table).where(where);
  return Math.max(1, Math.ceil((row?.total ?? 0) / SITEMAP_SIZE));
}
