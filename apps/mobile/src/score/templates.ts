import { scoreTemplateSchema, type ScoreTemplate } from '@onboard/shared';
import acquire from '../../../../data/staging/score-templates/acquire-1963.json';
import grandAustria from '../../../../data/staging/score-templates/grand-austria-hotel-deluxe.json';
import theGang from '../../../../data/staging/score-templates/the-gang-2024.json';

export const scoreTemplates: Record<string, ScoreTemplate> = Object.fromEntries(
  [acquire, grandAustria, theGang].map((raw) => {
    const t = scoreTemplateSchema.parse(raw);
    return [t.slug, t];
  }),
);

export const templateList: ScoreTemplate[] = Object.values(scoreTemplates);
