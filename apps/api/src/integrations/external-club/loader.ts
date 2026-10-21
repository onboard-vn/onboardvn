import { isAbsolute } from 'node:path';
import { pathToFileURL } from 'node:url';
import { z } from 'zod';
import {
  type ExternalClubSource,
  type ExternalClubPluginSource,
  type ExternalClubSourceFactory,
  type ExternalDayRange,
  externalDaySchema,
  externalGameSchema,
  externalMemberSchema,
} from './types.js';

const historyDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

async function readPlugin(read: () => Promise<unknown>): Promise<unknown> {
  try {
    return await read();
  } catch {
    throw new Error('External club source request failed');
  }
}

export interface ExternalClubConfig {
  EXTERNAL_CLUB_PLUGIN?: string | undefined;
  EXTERNAL_CLUB_BASE_URL?: string | undefined;
}

const loadedSources = new Map<string, Promise<ExternalClubSource>>();

/** Plugin output crosses a trust boundary: every list is validated before it reaches the sync. */
function validated(raw: ExternalClubPluginSource): ExternalClubSource {
  const source: ExternalClubSource = {
    source: raw.source,
    listGames: async () =>
      z.array(externalGameSchema).parse(await readPlugin(() => raw.listGames())),
    listMembers: async () =>
      z.array(externalMemberSchema).parse(await readPlugin(() => raw.listMembers())),
    listDays: async (range: ExternalDayRange) =>
      z.array(externalDaySchema).parse(await readPlugin(() => raw.listDays(range))),
  };

  if (raw.fetchDay) {
    source.fetchDay = async (date) =>
      externalDaySchema.nullable().parse(await readPlugin(() => raw.fetchDay!(date)));
  }
  if (raw.fetchMembers) {
    source.fetchMembers = async () =>
      z.array(externalMemberSchema).parse(await readPlugin(() => raw.fetchMembers!()));
  }
  if (raw.fetchGames) {
    source.fetchGames = async () =>
      z.array(externalGameSchema).parse(await readPlugin(() => raw.fetchGames!()));
  }
  if (raw.fetchHistoryDates) {
    source.fetchHistoryDates = async () =>
      z.array(historyDateSchema).parse(await readPlugin(() => raw.fetchHistoryDates!()));
  }

  return source;
}

export async function loadExternalClubSource(
  config: ExternalClubConfig,
): Promise<ExternalClubSource | null> {
  const { EXTERNAL_CLUB_PLUGIN: pluginPath, EXTERNAL_CLUB_BASE_URL: baseUrl } = config;
  if (!pluginPath || !baseUrl) return null;
  if (!isAbsolute(pluginPath)) throw new Error('EXTERNAL_CLUB_PLUGIN must be an absolute path');

  const key = JSON.stringify([pluginPath, baseUrl]);
  const existing = loadedSources.get(key);
  if (existing) return existing;

  const loading = createExternalClubSource(pluginPath, baseUrl);
  loadedSources.set(key, loading);
  try {
    return await loading;
  } catch (error) {
    if (loadedSources.get(key) === loading) loadedSources.delete(key);
    throw error;
  }
}

async function createExternalClubSource(
  pluginPath: string,
  baseUrl: string,
): Promise<ExternalClubSource> {
  const mod = (await import(pathToFileURL(pluginPath).href)) as {
    createSource?: ExternalClubSourceFactory;
    default?: ExternalClubSourceFactory;
  };
  const factory = mod.createSource ?? mod.default;
  if (typeof factory !== 'function') {
    throw new Error('External club plugin must export createSource({ baseUrl })');
  }
  let source: ExternalClubPluginSource;
  try {
    source = await factory({ baseUrl });
  } catch {
    throw new Error('External club source initialization failed');
  }
  if (!source.source) throw new Error('External club plugin returned a source without an id');
  return validated(source);
}
