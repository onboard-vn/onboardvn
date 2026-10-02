export type EventsView = 'list' | 'calendar';

export interface EventFilterValues {
  province?: string;
  ward?: string;
  cafeId?: string;
  from?: string;
}

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Next.js `searchParams` → {@link EventFilterValues} (province/ward are slugs, `from` a date). */
export function parseEventSearchParams(
  sp: Record<string, string | string[] | undefined>,
): EventFilterValues {
  return {
    province: firstValue(sp.province),
    ward: firstValue(sp.phuong),
    cafeId: firstValue(sp.cafeId),
    from: firstValue(sp.from),
  };
}

/** `filters` → shareable `/events?...` query string, preserving `view`/`month` when given. */
export function eventFiltersToParams(
  filters: EventFilterValues,
  view?: EventsView,
  month?: string,
): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.province) params.set('province', filters.province);
  if (filters.ward) params.set('phuong', filters.ward);
  if (filters.cafeId) params.set('cafeId', filters.cafeId);
  if (filters.from) params.set('from', filters.from);
  if (view && view !== 'list') params.set('view', view);
  if (month) params.set('month', month);
  return params;
}

export function parseEventsView(sp: Record<string, string | string[] | undefined>): EventsView {
  return firstValue(sp.view) === 'calendar' ? 'calendar' : 'list';
}
