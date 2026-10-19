import type { ScoreTemplate } from '@onboard/shared';
import type { GameGuide } from './guides/types';

export function usesSharedScoreSheet(
  template: ScoreTemplate | null,
  guides: Record<string, GameGuide>,
): boolean {
  if (!template || template.templateVersion < 3) return false;
  if (template.slug === 'critter-kitchen')
    return template.categories.some((category) => category.key === 'meal');
  const guide = guides[template.slug];
  return (
    !!guide &&
    template.templateVersion >= (guide.minTemplateVersion ?? 3) &&
    (guide.requiredKeys ?? []).every((key) =>
      template.categories.some((category) => category.key === key),
    )
  );
}
