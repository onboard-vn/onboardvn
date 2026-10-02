import { z } from 'zod';

export const identityKindEnum = z.enum(['member', 'guest', 'external']);
export type IdentityKind = z.infer<typeof identityKindEnum>;

const birthYearSchema = z
  .number()
  .int()
  .min(1900)
  .refine((y) => y <= new Date().getFullYear(), 'Năm sinh không hợp lệ');

export const guestCreateSchema = z.object({
  displayName: z.string().trim().min(1).max(60).optional(),
  birthYear: birthYearSchema.optional(),
});
export type GuestCreateInput = z.infer<typeof guestCreateSchema>;

/** `birthYear` is only present for the guest themselves, their inviter and club admins. */
export const identityDtoSchema = z.object({
  id: z.uuid(),
  kind: identityKindEnum,
  displayName: z.string(),
  userId: z.string().nullable(),
  username: z.string().nullable(),
  image: z.string().nullable(),
  clubId: z.uuid().nullable(),
  invitedByIdentityId: z.uuid().nullable(),
  birthYear: z.number().int().nullable().optional(),
});
export type IdentityDto = z.infer<typeof identityDtoSchema>;

export const identityListQuerySchema = z.object({
  q: z.string().trim().max(60).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
export type IdentityListQuery = z.infer<typeof identityListQuerySchema>;
export interface IdentityListResponse {
  items: IdentityDto[];
}

export const tableIdParamSchema = z.object({ tableId: z.uuid() });
export const tableGuestParamSchema = z.object({ tableId: z.uuid(), identityId: z.uuid() });

export const claimRedeemSchema = z.object({ token: z.string().trim().min(16).max(200) });
export type ClaimRedeemInput = z.infer<typeof claimRedeemSchema>;

export const claimRequestCreateSchema = z.object({
  tableId: z.uuid(),
  note: z.string().trim().max(300).optional(),
});
export type ClaimRequestCreateInput = z.infer<typeof claimRequestCreateSchema>;

export interface ClaimLinkResponse {
  token: string;
  url: string;
  expiresAt: string;
}

export interface ClaimRedeemResponse {
  identity: IdentityDto;
}

export interface ClaimRequestDto {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  identity: { id: string; displayName: string };
  requester: { id: string; name: string; username: string | null };
  tableId: string | null;
  note: string | null;
  createdAt: string;
}
export interface ClaimRequestListResponse {
  items: ClaimRequestDto[];
}
