import {
  scoreTemplateSchema,
  type PlayDto,
  type ScoreTemplate,
  type ScoreTemplateDto,
  type TableDetailDto,
} from '@onboard/shared';
import { scoreTemplates } from '../score/templates';
import { api, ApiError } from './client';
import { clubsApi } from './clubs';
import { uuid } from './uuid';

export interface TableBundle {
  table: TableDetailDto;
  play: PlayDto | null;
  template: ScoreTemplate | null;
  templateId: string | null;
}

const orNull = <T>(p: Promise<T>): Promise<T | null> =>
  p.catch((e: unknown) => {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  });

async function loadTemplate(game: TableDetailDto['game']) {
  if (!game) return { template: null, templateId: null };
  const dto = await orNull(api<ScoreTemplateDto>(`/games/${game.id}/score-template`));
  const parsed = dto ? scoreTemplateSchema.safeParse(dto.definition) : null;
  if (dto && parsed?.success) return { template: parsed.data, templateId: dto.id };
  return { template: scoreTemplates[game.slug] ?? null, templateId: dto?.id ?? null };
}

export async function loadTableBundle(tableId: string): Promise<TableBundle> {
  const [table, play] = await Promise.all([
    clubsApi.table(tableId),
    orNull(api<PlayDto>(`/tables/${tableId}/play`)),
  ]);
  return { table, play, ...(await loadTemplate(table.game)) };
}

export const startTablePlay = (tableId: string, templateId: string | null) =>
  api<PlayDto>(`/tables/${tableId}/plays`, {
    body: { id: uuid(), ...(templateId ? { scoreTemplateId: templateId } : {}) },
  });
