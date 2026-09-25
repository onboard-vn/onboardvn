import { and, ne, type SQL } from 'drizzle-orm';
import { cafes } from '../../db/schema/index.js';

const HIDDEN_STATUSES = new Set(['pending', 'declined']);

/** A café is public once it has any consent — everything except awaiting review or declined. */
export function isPubliclyVisibleCafe(consentStatus: string): boolean {
  return !HIDDEN_STATUSES.has(consentStatus);
}

/** SQL predicate mirroring {@link isPubliclyVisibleCafe} for use in every public café query. */
export function publicCafeWhere(): SQL {
  return and(ne(cafes.consentStatus, 'pending'), ne(cafes.consentStatus, 'declined'))!;
}
