import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { digestLoginId } from '../../lib/login-digest.js';
import { loadExternalClubSource } from './loader.js';
import type { ExternalClubSource } from './types.js';

async function withSource(
  pluginSource: string,
  run: (source: ExternalClubSource) => Promise<void>,
): Promise<void> {
  const directory = await mkdtemp(join(tmpdir(), 'external-club-live-'));
  try {
    const pluginPath = join(directory, 'plugin.mjs');
    await writeFile(pluginPath, `export const createSource = () => (${pluginSource});`);
    const source = await loadExternalClubSource({
      EXTERNAL_CLUB_PLUGIN: pluginPath,
      EXTERNAL_CLUB_BASE_URL: 'https://example.test',
    });
    if (!source) throw new Error('Expected the external club source to load');
    await run(source);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

const baseMethods = `
  source: 'live-test',
  listGames: async () => [],
  listMembers: async () => [],
  listDays: async () => [],
`;

function expectRedactedValidationError(error: unknown, sentinel: string): void {
  expect(error).toBeInstanceOf(Error);
  const message = error instanceof Error ? error.message : String(error);
  const issues = (error as { issues?: unknown }).issues;
  const serialized = JSON.stringify({ message, issues, error });

  expect(message).not.toContain(sentinel);
  expect(JSON.stringify(issues ?? [])).not.toContain(sentinel);
  expect(serialized).not.toContain(sentinel);
}

describe('external club live loader methods', () => {
  it('wraps and strips unknown keys from each optional method', async () => {
    await withSource(
      `({
        ${baseMethods}
        listMembers: async () => [{ externalId: 'listed-member', nickname: 'Listed', loginId: 'list-login-id' }],
        listDays: async () => [{
          date: '2026-10-21',
          tables: [{
            externalId: 'listed-table',
            gameName: 'Listed game',
            players: [{ externalMemberId: 'listed-member', loginId: 'day-login-id' }],
            status: 'confirmed',
          }],
        }],
        fetchDay: async (date) => date === '2026-10-22' ? null : ({
          date,
          venue: null,
          note: null,
          tables: [{
            externalId: 'table-1',
            hostExternalMemberId: 'member-1',
            gameName: 'Example game',
            players: [{ externalMemberId: 'member-1', loginId: 'fetch-day-login-id', ignored: true }],
            status: 'confirmed',
            ignored: true,
          }],
          ignored: true,
        }),
        fetchMembers: async () => [{ externalId: 'member-1', nickname: 'Player', loginId: 'fetch-member-login-id', ignored: true }],
        fetchGames: async () => [{
          externalId: 'game-1', name: 'Example game', owners: [{ externalMemberId: 'member-1', ignored: true }],
          expansions: [{ externalId: 'expansion-1', name: 'Example expansion', ignored: true }], ignored: true,
        }],
        fetchHistoryDates: async () => ['2026-10-21'],
      })`,
      async (source) => {
        const [listedMember] = await source.listMembers();
        expect(listedMember).toEqual({
          externalId: 'listed-member',
          nickname: 'Listed',
          stats: {},
          loginDigest: digestLoginId('list-login-id'),
        });
        expect(listedMember).not.toHaveProperty('loginId');

        const [listedDay] = await source.listDays({});
        expect(listedDay?.tables[0]?.players[0]).toEqual({
          externalMemberId: 'listed-member',
          loginDigest: digestLoginId('day-login-id'),
        });
        expect(listedDay?.tables[0]?.players[0]).not.toHaveProperty('loginId');

        expect(await source.fetchDay?.('2026-10-21')).toEqual({
          date: '2026-10-21',
          venue: null,
          note: null,
          tables: [
            {
              externalId: 'table-1',
              hostExternalMemberId: 'member-1',
              gameName: 'Example game',
              players: [
                {
                  externalMemberId: 'member-1',
                  loginDigest: digestLoginId('fetch-day-login-id'),
                },
              ],
              status: 'confirmed',
            },
          ],
        });
        expect(await source.fetchDay?.('2026-10-22')).toBeNull();
        expect(await source.fetchMembers?.()).toEqual([
          {
            externalId: 'member-1',
            nickname: 'Player',
            stats: {},
            loginDigest: digestLoginId('fetch-member-login-id'),
          },
        ]);
        expect(await source.fetchGames?.()).toEqual([
          {
            externalId: 'game-1',
            name: 'Example game',
            owners: [{ externalMemberId: 'member-1' }],
            expansions: [{ externalId: 'expansion-1', name: 'Example expansion' }],
          },
        ]);
        expect(await source.fetchHistoryDates?.()).toEqual(['2026-10-21']);
      },
    );
  });

  it('rejects invalid payloads from every optional method', async () => {
    await withSource(
      `({
        ${baseMethods}
        fetchDay: async () => ({ date: 'invalid-date', tables: [] }),
        fetchMembers: async () => [{ externalId: '', nickname: 'Player' }],
        fetchGames: async () => [{ externalId: 'game-1', name: 'Game', owners: 'invalid', expansions: [] }],
        fetchHistoryDates: async () => ['2026-2-03'],
      })`,
      async (source) => {
        await expect(source.fetchDay?.('2026-10-21')).rejects.toThrow();
        await expect(source.fetchMembers?.()).rejects.toThrow();
        await expect(source.fetchGames?.()).rejects.toThrow();
        await expect(source.fetchHistoryDates?.()).rejects.toThrow();
      },
    );
  });

  it('leaves optional methods absent when the plugin does not provide them', async () => {
    await withSource(`({ ${baseMethods} })`, async (source) => {
      expect(source.fetchDay).toBeUndefined();
      expect(source.fetchMembers).toBeUndefined();
      expect(source.fetchGames).toBeUndefined();
      expect(source.fetchHistoryDates).toBeUndefined();
    });
  });

  it('strips non-allowlisted member stats fields', async () => {
    await withSource(
      `({
        ${baseMethods}
        listMembers: async () => [{
          externalId: 'member-1',
          nickname: 'Player',
          stats: {
            gamesOwned: 6,
            tablesHosted: 4,
            bringingsMade: 2,
            joinedAt: '2024-10-01',
            loginId: 'stats-login-id',
            secretId: 'stats-secret-id',
            email: 'stats-email',
            realName: 'stats-real-name',
          },
        }],
      })`,
      async (source) => {
        const [member] = await source.listMembers();
        expect(member?.stats).toEqual({
          gamesOwned: 6,
          tablesHosted: 4,
          bringingsMade: 2,
          joinedAt: '2024-10-01',
        });
        for (const field of ['loginId', 'secretId', 'email', 'realName']) {
          expect(member?.stats).not.toHaveProperty(field);
        }
      },
    );
  });

  it('does not expose login ids in malformed member or player validation errors', async () => {
    const sentinel = 'SENTINEL-LOGIN-123';
    await withSource(
      `({
        ${baseMethods}
        listMembers: async () => [{
          externalId: '',
          nickname: 'Malformed member',
          loginId: '${sentinel}',
        }],
        listDays: async () => [{
          date: '2026-10-21',
          tables: [{
            externalId: 'table-1',
            gameName: 'Example game',
            players: [{ externalMemberId: '', loginId: '${sentinel}' }],
            status: 'confirmed',
          }],
        }],
      })`,
      async (source) => {
        const memberError = await source.listMembers().then(
          () => { throw new Error('Expected invalid member payload to fail validation'); },
          (error: unknown) => error,
        );
        expectRedactedValidationError(memberError, sentinel);

        const playerError = await source.listDays({}).then(
          () => { throw new Error('Expected invalid player payload to fail validation'); },
          (error: unknown) => error,
        );
        expectRedactedValidationError(playerError, sentinel);
      },
    );
  });

  it('does not propagate plugin error text across the loader boundary', async () => {
    const rawId = 'raw-club-id-in-plugin-error';
    await withSource(
      `({
        ${baseMethods}
        listMembers: async () => { throw new Error('failed for ${rawId}'); },
      })`,
      async (source) => {
        let message = '';
        try {
          await source.listMembers();
        } catch (error) {
          message = error instanceof Error ? error.message : String(error);
        }

        expect(message).toBe('External club source request failed');
        expect(message).not.toContain(rawId);
      },
    );
  });
});
