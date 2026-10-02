import { z } from 'zod';
import { friendSummarySchema } from './social.js';

export const clubVisibilityEnum = z.enum(['public', 'private']);
export type ClubVisibility = z.infer<typeof clubVisibilityEnum>;

export const clubRoleEnum = z.enum(['owner', 'admin', 'member']);
export type ClubRole = z.infer<typeof clubRoleEnum>;

const clubNameSchema = z.string().trim().min(2).max(80);
const clubDescriptionSchema = z.string().trim().max(1000);
const externalIdSchema = z.string().trim().min(1).max(100);

export const clubCreateSchema = z.object({
  name: clubNameSchema,
  description: clubDescriptionSchema.optional(),
  provinceCode: z.string().min(1).optional(),
});
export type ClubCreateInput = z.infer<typeof clubCreateSchema>;

export const clubUpdateSchema = z
  .object({
    name: clubNameSchema,
    description: clubDescriptionSchema.nullable(),
    provinceCode: z.string().min(1).nullable(),
  })
  .partial();
export type ClubUpdateInput = z.infer<typeof clubUpdateSchema>;

export const clubSlugParamSchema = z.object({ slug: z.string().trim().min(1) });
export const clubJoinCodeParamSchema = z.object({ code: z.string().trim().min(1).max(100) });
export const clubIdAndUserIdParamSchema = z.object({ id: z.uuid(), userId: z.string().min(1) });
export const clubIdAndMemberIdParamSchema = z.object({ id: z.uuid(), memberId: z.uuid() });

export const clubJoinSchema = z.object({ externalId: externalIdSchema.optional() });
export type ClubJoinInput = z.infer<typeof clubJoinSchema>;

export const clubExternalMatchSchema = z.object({ externalId: externalIdSchema });
export type ClubExternalMatchInput = z.infer<typeof clubExternalMatchSchema>;

export const clubAddMemberSchema = z.object({ userId: z.string().min(1) });
export type ClubAddMemberInput = z.infer<typeof clubAddMemberSchema>;

export const clubMemberRoleUpdateSchema = z.object({ role: clubRoleEnum });
export type ClubMemberRoleUpdateInput = z.infer<typeof clubMemberRoleUpdateSchema>;

/** `id`/`description`/`provinceCode` are withheld from non-members of a private club. */
export const clubDtoSchema = z.object({
  id: z.uuid().optional(),
  slug: z.string(),
  name: z.string(),
  visibility: clubVisibilityEnum,
  description: z.string().nullable(),
  provinceCode: z.string().nullable(),
});
export type ClubDto = z.infer<typeof clubDtoSchema>;

export const clubRefSchema = z.object({ id: z.uuid(), slug: z.string(), name: z.string() });
export type ClubRef = z.infer<typeof clubRefSchema>;

export const clubMemberDtoSchema = z.object({
  user: friendSummarySchema,
  role: clubRoleEnum,
  joinedAt: z.iso.datetime(),
});
export type ClubMemberDto = z.infer<typeof clubMemberDtoSchema>;

export const clubDetailDtoSchema = z.object({
  club: clubDtoSchema,
  myRole: clubRoleEnum.nullable(),
  memberCount: z.number().int(),
  members: z.array(clubMemberDtoSchema).optional(),
});
export type ClubDetailDto = z.infer<typeof clubDetailDtoSchema>;

export const clubSummaryDtoSchema = z.object({
  id: z.uuid(),
  slug: z.string(),
  name: z.string(),
  memberCount: z.number().int(),
  myRole: clubRoleEnum,
});
export type ClubSummaryDto = z.infer<typeof clubSummaryDtoSchema>;

export const clubListResponseSchema = z.object({ items: z.array(clubSummaryDtoSchema) });
export type ClubListResponse = z.infer<typeof clubListResponseSchema>;

export const clubCreateResponseSchema = clubDetailDtoSchema.extend({ inviteUrl: z.string() });
export type ClubCreateResponse = z.infer<typeof clubCreateResponseSchema>;

export const clubInviteCodeResponseSchema = z.object({ inviteUrl: z.string() });
export type ClubInviteCodeResponse = z.infer<typeof clubInviteCodeResponseSchema>;

export const clubJoinResponseSchema = z.object({
  slug: z.string(),
  role: clubRoleEnum,
  externalMatched: z.boolean(),
});
export type ClubJoinResponse = z.infer<typeof clubJoinResponseSchema>;

export const clubExternalMatchResponseSchema = z.object({ matched: z.boolean() });

/** Never includes the external login id. */
export const clubExternalMemberDtoSchema = z.object({
  id: z.uuid(),
  externalId: z.string(),
  nickname: z.string(),
  stats: z.record(z.string(), z.unknown()),
  linkedUserId: z.string().nullable(),
});
export type ClubExternalMemberDto = z.infer<typeof clubExternalMemberDtoSchema>;

export const clubExternalMembersResponseSchema = z.object({
  items: z.array(clubExternalMemberDtoSchema),
});
export type ClubExternalMembersResponse = z.infer<typeof clubExternalMembersResponseSchema>;

export const clubAdminItemDtoSchema = z.object({
  id: z.uuid(),
  slug: z.string(),
  name: z.string(),
  visibility: clubVisibilityEnum,
  memberCount: z.number().int(),
  createdAt: z.iso.datetime(),
});
export type ClubAdminItemDto = z.infer<typeof clubAdminItemDtoSchema>;

export const clubAdminListResponseSchema = z.object({ items: z.array(clubAdminItemDtoSchema) });
export type ClubAdminListResponse = z.infer<typeof clubAdminListResponseSchema>;
