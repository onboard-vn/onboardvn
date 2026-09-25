import { z } from 'zod';
import { friendSummarySchema } from './social.js';

export const meetupVisibilityEnum = z.enum(['public', 'friends', 'private']);
export type MeetupVisibility = z.infer<typeof meetupVisibilityEnum>;

export const meetupStatusEnum = z.enum(['scheduled', 'cancelled']);
export type MeetupStatus = z.infer<typeof meetupStatusEnum>;

export const participantStatusEnum = z.enum(['going', 'maybe', 'declined', 'waitlist', 'invited']);
export type ParticipantStatus = z.infer<typeof participantStatusEnum>;

export const rsvpStatusEnum = z.enum(['going', 'maybe', 'declined']);
export type RsvpStatus = z.infer<typeof rsvpStatusEnum>;

const titleSchema = z.string().trim().min(1).max(140);
const seatsSchema = z.coerce.number().int().min(2).max(20);
const capacitySchema = z.coerce.number().int().min(1).max(500);

export const meetupTableCreateSchema = z.object({
  gameId: z.uuid().optional(),
  seats: seatsSchema.optional(),
  broughtByUserId: z.string().min(1).optional(),
  note: z.string().trim().max(500).optional(),
});
export type MeetupTableCreateInput = z.infer<typeof meetupTableCreateSchema>;

export const meetupTableUpdateSchema = z
  .object({
    gameId: z.uuid().nullable(),
    seats: seatsSchema.nullable(),
    broughtByUserId: z.string().min(1).nullable(),
    note: z.string().trim().max(500).nullable(),
  })
  .partial();
export type MeetupTableUpdateInput = z.infer<typeof meetupTableUpdateSchema>;

/** Café-based meetups derive province/ward from the café; `provinceCode` is only required for
 * the free-address path. `startsAt` allows a 5-minute past skew for client clock drift. */
const PAST_SKEW_MS = 5 * 60 * 1000;

export const meetupCreateSchema = z
  .object({
    title: titleSchema,
    description: z.string().trim().max(2000).optional(),
    startsAt: z.iso.datetime(),
    endsAt: z.iso.datetime().optional(),
    cafeId: z.uuid().optional(),
    addressLine: z.string().trim().max(300).optional(),
    provinceCode: z.string().min(1).optional(),
    wardCode: z.string().min(1).optional(),
    capacity: capacitySchema.optional(),
    visibility: meetupVisibilityEnum.default('public'),
    table: meetupTableCreateSchema.optional(),
  })
  .refine((input) => input.cafeId !== undefined || input.addressLine !== undefined, {
    message: 'Cần chọn quán hoặc nhập địa chỉ',
    path: ['addressLine'],
  })
  .refine((input) => input.cafeId !== undefined || input.provinceCode !== undefined, {
    message: 'Cần chọn tỉnh/thành',
    path: ['provinceCode'],
  })
  .refine((input) => !input.endsAt || new Date(input.endsAt) > new Date(input.startsAt), {
    message: 'Giờ kết thúc phải sau giờ bắt đầu',
    path: ['endsAt'],
  })
  .refine((input) => new Date(input.startsAt).getTime() >= Date.now() - PAST_SKEW_MS, {
    message: 'Thời gian bắt đầu không được ở quá khứ',
    path: ['startsAt'],
  });
export type MeetupCreateInput = z.infer<typeof meetupCreateSchema>;

export const meetupUpdateSchema = z
  .object({
    title: titleSchema,
    description: z.string().trim().max(2000).nullable(),
    startsAt: z.iso.datetime(),
    endsAt: z.iso.datetime().nullable(),
    cafeId: z.uuid().nullable(),
    addressLine: z.string().trim().max(300).nullable(),
    provinceCode: z.string().min(1),
    wardCode: z.string().min(1).nullable(),
    capacity: capacitySchema.nullable(),
    visibility: meetupVisibilityEnum,
  })
  .partial()
  .refine(
    (input) =>
      !input.endsAt || !input.startsAt || new Date(input.endsAt) > new Date(input.startsAt),
    {
      message: 'Giờ kết thúc phải sau giờ bắt đầu',
      path: ['endsAt'],
    },
  );
export type MeetupUpdateInput = z.infer<typeof meetupUpdateSchema>;

export const meetupFilterSchema = z.object({
  provinceCode: z.string().min(1).optional(),
  wardCode: z.string().min(1).optional(),
  cafeId: z.uuid().optional(),
  from: z.iso.datetime().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(50).default(20),
});
export type MeetupFilter = z.infer<typeof meetupFilterSchema>;

export const meetupCalendarQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Định dạng tháng phải là YYYY-MM'),
});
export type MeetupCalendarQuery = z.infer<typeof meetupCalendarQuerySchema>;

export const rsvpInputSchema = z
  .object({
    status: rsvpStatusEnum,
    tableId: z.uuid().nullable().optional(),
    code: z.string().trim().min(1).optional(),
  })
  .refine((input) => input.status === 'going' || !input.tableId, {
    message: 'Chỉ chọn bàn khi trạng thái là going',
    path: ['tableId'],
  });
export type RsvpInput = z.infer<typeof rsvpInputSchema>;

export const meetupInviteFriendsSchema = z.object({
  userIds: z.array(z.string().min(1)).min(1).max(50),
});
export type MeetupInviteFriendsInput = z.infer<typeof meetupInviteFriendsSchema>;

export const meetupSlugParamSchema = z.object({ slug: z.string().min(1) });
export const meetupDetailQuerySchema = z.object({ code: z.string().trim().min(1).optional() });
export const meetupIdAndTableIdParamSchema = z.object({ id: z.uuid(), tableId: z.uuid() });

export const meetupPublicUserSchema = friendSummarySchema;
export type MeetupPublicUser = z.infer<typeof meetupPublicUserSchema>;

export const meetupCafeRefSchema = z.object({ id: z.uuid(), slug: z.string(), name: z.string() });
export type MeetupCafeRef = z.infer<typeof meetupCafeRefSchema>;

export const meetupTableDtoSchema = z.object({
  id: z.uuid(),
  host: meetupPublicUserSchema,
  game: z
    .object({ id: z.uuid(), slug: z.string(), nameVi: z.string().nullable(), nameEn: z.string() })
    .nullable(),
  seats: z.number().int().nullable(),
  broughtBy: meetupPublicUserSchema.nullable(),
  note: z.string().nullable(),
  position: z.number().int(),
  seatedUsers: z.array(meetupPublicUserSchema),
});
export type MeetupTableDto = z.infer<typeof meetupTableDtoSchema>;

export const meetupSummaryDtoSchema = z.object({
  id: z.uuid(),
  slug: z.string(),
  title: z.string(),
  startsAt: z.iso.datetime(),
  endsAt: z.iso.datetime().nullable(),
  cafe: meetupCafeRefSchema.nullable(),
  /** Café name, free-address `addressLine`, or "Địa điểm đã ẩn" when the café isn't publicly
   * visible and no free address was stored. */
  locationLabel: z.string(),
  addressLine: z.string().nullable(),
  provinceCode: z.string(),
  wardCode: z.string().nullable(),
  capacity: z.number().int().nullable(),
  goingCount: z.number().int(),
  visibility: meetupVisibilityEnum,
  status: meetupStatusEnum,
  createdBy: meetupPublicUserSchema,
});
export type MeetupSummaryDto = z.infer<typeof meetupSummaryDtoSchema>;

export const meetupDetailDtoSchema = meetupSummaryDtoSchema.extend({
  description: z.string().nullable(),
  tables: z.array(meetupTableDtoSchema),
  viewerStatus: participantStatusEnum.nullable(),
});
export type MeetupDetailDto = z.infer<typeof meetupDetailDtoSchema>;

export const meetupCreateResponseDtoSchema = meetupDetailDtoSchema.extend({
  inviteUrl: z.string(),
});
export type MeetupCreateResponseDto = z.infer<typeof meetupCreateResponseDtoSchema>;

export const meetupInviteCodeResponseSchema = z.object({ inviteUrl: z.string() });
export type MeetupInviteCodeResponse = z.infer<typeof meetupInviteCodeResponseSchema>;

export const meetupListResponseSchema = z.object({
  items: z.array(meetupSummaryDtoSchema),
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
});
export type MeetupListResponse = z.infer<typeof meetupListResponseSchema>;

export const meetupCalendarDaySchema = z.object({
  date: z.string(),
  players: z.number().int(),
  tables: z.number().int(),
  meetupIds: z.array(z.uuid()),
});
export type MeetupCalendarDay = z.infer<typeof meetupCalendarDaySchema>;
