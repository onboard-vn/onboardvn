import { describe, expect, it } from 'vitest';
import { scoreTemplates } from '../templates';
import { strategyGuides } from './strategy-guides';
import { euroGuides } from './euro-guides';
import { mixedGuides } from './mixed-guides';
const guides = { ...strategyGuides, ...euroGuides, ...mixedGuides };
describe('versioned quantity guide contracts', () => {
  it.each(Object.entries(guides))(
    '%s references real fields and labels each named quantity',
    (slug, guide) => {
      const template = scoreTemplates[slug]!;
      expect(template.templateVersion).toBeGreaterThanOrEqual(guide.minTemplateVersion ?? 1);
      const keys = guide.groups.flatMap((g) => g.fields.map((f) => f.key));
      expect(new Set(keys).size).toBe(keys.length);
      for (const group of guide.groups)
        for (const field of group.fields) {
          const category = template.categories.find((c) => c.key === field.key);
          expect(category, field.key).toBeDefined();
          if (category?.input === 'counts')
            for (const key of category.inputs ?? [])
              expect(field.inputs?.[key], `${slug}.${field.key}.${key}`).toBeTruthy();
        }
    },
  );
});
