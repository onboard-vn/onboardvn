import type { GameExternalDto } from '@onboard/shared';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { gameExternalMetadata } from '../../db/schema/index.js';

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  ndash: '–',
  mdash: '—',
  rsquo: '’',
  lsquo: '‘',
  rdquo: '”',
  ldquo: '“',
  hellip: '…',
};

function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, body: string) => {
    if (body[0] === '#') {
      const code =
        body[1]?.toLowerCase() === 'x' ? parseInt(body.slice(2), 16) : Number(body.slice(1));
      return Number.isInteger(code) && code > 0 && code <= 0x10ffff
        ? String.fromCodePoint(code)
        : '';
    }
    return NAMED_ENTITIES[body.toLowerCase()] ?? match;
  });
}

/** Converts BGG HTML to plain text; output is never interpreted as HTML by clients. */
export function htmlToPlainText(html: string): string {
  const text = html
    .replace(/<(script|style|iframe|object|embed)\b[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6])\s*>/gi, '\n')
    .replace(/<[^>]*>/g, '');
  return decodeEntities(text)
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function asText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  return htmlToPlainText(value) || null;
}

function asHttpsUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

export function toExternalDto(payload: unknown): GameExternalDto {
  const item = asRecord(asRecord(payload).item);
  const images = asRecord(item.images);
  const href = typeof item.href === 'string' && item.href.startsWith('/') ? item.href : null;
  const imageUrl = asHttpsUrl(item.imageurl);
  return {
    description: asText(item.description),
    shortDescription: asText(item.short_description),
    imageUrl,
    thumbUrl: asHttpsUrl(images.square200) ?? asHttpsUrl(images.thumb) ?? imageUrl,
    bggUrl: href ? `https://boardgamegeek.com${href}` : null,
    attribution: 'BoardGameGeek',
  };
}

export async function findExternalByGameIds(
  gameIds: string[],
): Promise<Map<string, GameExternalDto>> {
  const result = new Map<string, GameExternalDto>();
  if (gameIds.length === 0) return result;
  const rows = await db
    .select({ gameId: gameExternalMetadata.gameId, payload: gameExternalMetadata.payload })
    .from(gameExternalMetadata)
    .where(
      and(inArray(gameExternalMetadata.gameId, gameIds), eq(gameExternalMetadata.source, 'bgg')),
    );
  for (const row of rows) result.set(row.gameId, toExternalDto(row.payload));
  return result;
}
