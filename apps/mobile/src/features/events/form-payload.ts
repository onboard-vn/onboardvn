import type { MeetupCreateInput, MeetupUpdateInput, MeetupVisibility } from '@onboard/shared';
import { localDateTimeInputToIso } from './time';

export interface EventPlaceInput {
  placeMode: 'cafe' | 'address';
  cafeId: string | null;
  addressLine: string;
  provinceCode: string;
  wardCode: string;
}

export interface EventFormFields extends EventPlaceInput {
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  capacity: string;
  visibility: MeetupVisibility;
  clubId?: string;
}

/** `POST /events` body: omitted (`undefined`) keys mean "not set" — `meetupCreateSchema` fields
 * are optional, not nullable. */
export function buildCreatePayload(
  fields: EventFormFields,
  table?: { gameId?: string; seats?: number },
): MeetupCreateInput {
  return {
    title: fields.title,
    description: fields.description || undefined,
    startsAt: localDateTimeInputToIso(fields.startsAt),
    endsAt: fields.endsAt ? localDateTimeInputToIso(fields.endsAt) : undefined,
    ...(fields.placeMode === 'cafe'
      ? { cafeId: fields.cafeId! }
      : {
          addressLine: fields.addressLine.trim(),
          provinceCode: fields.provinceCode,
          wardCode: fields.wardCode || undefined,
        }),
    capacity: fields.capacity ? Number(fields.capacity) : undefined,
    visibility: fields.visibility,
    ...(fields.visibility === 'club' && fields.clubId && { clubId: fields.clubId }),
    ...(table && { table }),
  };
}

/** `PATCH /events/:id` body: every field is sent explicitly — `null` clears it, or (for
 * `cafeId`/`addressLine`) switches the location type — since `meetupUpdateSchema` fields are
 * nullable-partial and an omitted key means "leave unchanged", which we never want from a form
 * that always holds the full current value. */
export function buildUpdatePayload(fields: EventFormFields): MeetupUpdateInput {
  return {
    title: fields.title,
    description: fields.description.trim() ? fields.description : null,
    startsAt: localDateTimeInputToIso(fields.startsAt),
    endsAt: fields.endsAt ? localDateTimeInputToIso(fields.endsAt) : null,
    ...(fields.placeMode === 'cafe'
      ? { cafeId: fields.cafeId!, addressLine: null }
      : {
          cafeId: null,
          addressLine: fields.addressLine.trim(),
          provinceCode: fields.provinceCode,
          wardCode: fields.wardCode || null,
        }),
    capacity: fields.capacity ? Number(fields.capacity) : null,
    visibility: fields.visibility,
  };
}
