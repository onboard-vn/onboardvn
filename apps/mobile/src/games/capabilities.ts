import type { Href } from 'expo-router';
import { gameModules } from './modules';
import { scoreTemplates } from '../score/templates';

export type Capability = 'all' | 'scoring' | 'tools' | 'any';
export const capabilityOptions = [
  { value: 'all' as const, label: 'Tất cả' },
  { value: 'scoring' as const, label: 'Có tính điểm' },
  { value: 'tools' as const, label: 'Có công cụ chơi' },
];
export function parseCapability(value: string | string[] | undefined): Capability {
  if (value === 'any') return 'any'; // Preserve previously shared library links.
  return capabilityOptions.find((o) => o.value === value)?.value ?? 'all';
}
export function hasCapability(slug: string, capability: Capability): boolean {
  const scoring = !!scoreTemplates[slug];
  const tools = !!gameModules[slug]?.length;
  return (
    capability === 'all' ||
    (capability === 'scoring' ? scoring : capability === 'tools' ? tools : scoring || tools)
  );
}
export function capabilitySlugs(capability: Capability): string[] {
  return [...new Set([...Object.keys(scoreTemplates), ...Object.keys(gameModules)])]
    .filter((slug) => hasCapability(slug, capability))
    .sort();
}

export function gameDestination(slug: string, capability: Capability = 'all'): Href {
  if (capability === 'scoring' && hasCapability(slug, 'scoring')) {
    return { pathname: '/score/[slug]', params: { slug } };
  }
  if (capability === 'tools' && gameModules[slug]?.length) return gameModules[slug]![0]!.href;
  return { pathname: '/games/[slug]', params: { slug } };
}
