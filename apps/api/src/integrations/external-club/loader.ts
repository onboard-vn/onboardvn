import { isAbsolute } from 'node:path';
import { pathToFileURL } from 'node:url';
import { z } from 'zod';
import {
  type ExternalClubSource,
  type ExternalClubSourceFactory,
  type ExternalDayRange,
  externalDaySchema,
  externalGameSchema,
  externalMemberSchema,
} from './types.js';

export interface ExternalClubConfig {
  EXTERNAL_CLUB_PLUGIN?: string | undefined;
  EXTERNAL_CLUB_BASE_URL?: string | undefined;
}

/** Plugin output crosses a trust boundary: every list is validated before it reaches the sync. */
function validated(raw: ExternalClubSource): ExternalClubSource {
  return {
    source: raw.source,
    listGames: async () => z.array(externalGameSchema).parse(await raw.listGames()),
    listMembers: async () => z.array(externalMemberSchema).parse(await raw.listMembers()),
    listDays: async (range: ExternalDayRange) =>
      z.array(externalDaySchema).parse(await raw.listDays(range)),
  };
}

export async function loadExternalClubSource(
  config: ExternalClubConfig,
): Promise<ExternalClubSource | null> {
  const { EXTERNAL_CLUB_PLUGIN: pluginPath, EXTERNAL_CLUB_BASE_URL: baseUrl } = config;
  if (!pluginPath || !baseUrl) return null;
  if (!isAbsolute(pluginPath)) throw new Error('EXTERNAL_CLUB_PLUGIN must be an absolute path');

  const mod = (await import(pathToFileURL(pluginPath).href)) as {
    createSource?: ExternalClubSourceFactory;
    default?: ExternalClubSourceFactory;
  };
  const factory = mod.createSource ?? mod.default;
  if (typeof factory !== 'function') {
    throw new Error('External club plugin must export createSource({ baseUrl })');
  }
  const source = await factory({ baseUrl });
  if (!source.source) throw new Error('External club plugin returned a source without an id');
  return validated(source);
}
