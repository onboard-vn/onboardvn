import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('../../lib/env.js', () => ({ env: { WEB_ORIGIN: 'https://onboard.example' } }));
vi.mock('../../db/client.js', () => ({ db: {} }));
vi.mock('../games/service.js', () => ({
  getGameBySlugService: vi.fn(),
  listGamesService: vi.fn(),
}));
vi.mock('../cafes/service.js', () => ({ getCafeBySlugService: vi.fn() }));
vi.mock('../events/service.js', () => ({ getMeetupBySlugService: vi.fn() }));
vi.mock('../clubs/service.js', () => ({ getClubBySlugService: vi.fn() }));
import { getGameBySlugService, listGamesService } from '../games/service.js';
import { getCafeBySlugService } from '../cafes/service.js';
import { getMeetupBySlugService } from '../events/service.js';
import { getClubBySlugService } from '../clubs/service.js';
import { ApiError } from '../../lib/errors.js';
import { pageMetadata } from './service.js';
beforeEach(() => vi.resetAllMocks());
describe('anonymous SEO visibility', () => {
  it('never resolves private/token/account paths and uses generic canonical', async () => {
    for (const path of [
      '/account',
      '/events/join/secret',
      '/clubs/join/secret',
      '/admin/games',
      '/score/table/id',
      '/u/person',
      '/cafes/secret/contribute',
    ]) {
      const page = await pageMetadata(path);
      expect(page.indexable).toBe(false);
      expect(page.canonical).toBe('https://onboard.example/');
      expect(page.title).toBe('OnBoardVN');
    }
    expect(getMeetupBySlugService).not.toHaveBeenCalled();
  });
  it('private club names cannot reach social metadata', async () => {
    vi.mocked(getClubBySlugService).mockResolvedValue({
      club: { name: 'Secret club', slug: 'secret', visibility: 'private' },
    } as never);
    const page = await pageMetadata('/clubs/secret');
    expect(JSON.stringify(page)).not.toContain('Secret club');
    expect(page.indexable).toBe(false);
    expect(getClubBySlugService).toHaveBeenCalledWith('secret', null);
  });
  it('uses only anonymous redacted cafe DTO media', async () => {
    vi.mocked(getCafeBySlugService).mockResolvedValue({
      name: 'Cafe',
      addressLine: 'Street',
      wardName: 'Ward',
      provinceName: 'Province',
    } as never);
    const page = await pageMetadata('/cafes/cafe');
    expect(page.image).toBe('https://onboard.example/opengraph-image.jpg');
    expect(page.jsonLd).not.toHaveProperty('geo');
  });
  it('does not accept invite codes or cookies for event metadata and hides inaccessible events', async () => {
    vi.mocked(getMeetupBySlugService).mockRejectedValue(new ApiError('NOT_FOUND', 404));
    const page = await pageMetadata('/events/private');
    expect(page.status).toBe(404);
    expect(page.indexable).toBe(false);
    expect(getMeetupBySlugService).toHaveBeenCalledWith('private', null, undefined);
  });
  it('cancels indexing for cancelled public events, with schema status', async () => {
    vi.mocked(getMeetupBySlugService).mockResolvedValue({
      title: 'Public',
      description: 'Game',
      locationLabel: 'Cafe',
      status: 'cancelled',
      startsAt: '2026-11-01T10:00:00Z',
    } as never);
    const page = await pageMetadata('/events/public');
    expect(page.indexable).toBe(false);
    expect(page.jsonLd?.eventStatus).toBe('https://schema.org/EventCancelled');
  });
  it('validates actual feature routes and preserves page-specific canonical', async () => {
    vi.mocked(getGameBySlugService).mockResolvedValue({
      nameEn: 'Acquire',
      nameVi: null,
      descriptionVi: null,
      imageUrl: null,
    } as never);
    expect((await pageMetadata('/score/acquire')).status).toBe(404);
    const page = await pageMetadata('/score/acquire', ['/score/acquire']);
    expect(page.title).toContain('Tính điểm Acquire');
    expect(page.canonical).toBe('https://onboard.example/score/acquire');
    expect(getGameBySlugService).toHaveBeenCalledWith('acquire', false, false);
  });
  it('links catalog entries using encoded slugs', async () => {
    vi.mocked(listGamesService).mockResolvedValue({
      items: [{ slug: 'test', nameEn: 'Test' }],
    } as never);
    const page = await pageMetadata('/games');
    expect(page.links).toEqual([{ href: '/games/test', label: 'Test' }]);
  });
  it('does not pretend dependency errors are not-found pages', async () => {
    vi.mocked(getGameBySlugService).mockRejectedValue(new Error('offline'));
    await expect(pageMetadata('/games/test')).rejects.toThrow('offline');
  });
});
