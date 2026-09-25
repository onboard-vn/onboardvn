import { z } from 'zod';
import type { CafeConsentStatus } from './cafes.js';

export const cafeMemberRoleEnum = z.enum(['owner', 'staff']);
export type CafeMemberRole = z.infer<typeof cafeMemberRoleEnum>;

export const tokenParamSchema = z.object({ token: z.string().trim().min(1) });
export const inviteIdParamSchema = z.object({ id: z.uuid(), inviteId: z.uuid() });
export const cafeMemberParamSchema = z.object({ id: z.uuid(), userId: z.string().min(1) });

export interface CafeOwnerInviteDto {
  id: string;
  cafeId: string;
  createdBy: string;
  createdAt: string;
  expiresAt: string;
  usedAt: string | null;
  usedBy: string | null;
  revokedAt: string | null;
}

export interface CafeOwnerInviteCreatedDto {
  url: string;
  expiresAt: string;
}

export interface CafeOwnerInviteListResponse {
  items: CafeOwnerInviteDto[];
}

export interface CafeOwnerInvitePreviewDto {
  cafeName: string;
  status: 'valid' | 'used' | 'expired' | 'revoked';
}

export const cafeConsentDecisionSchema = z.object({
  decision: z.enum(['granted', 'declined']),
  reason: z.string().trim().max(1000).optional(),
});
export type CafeConsentDecisionInput = z.infer<typeof cafeConsentDecisionSchema>;

export const cafeStaffInputSchema = z.object({ username: z.string().trim().min(1) });
export type CafeStaffInput = z.infer<typeof cafeStaffInputSchema>;

export interface CafeMembershipDto {
  cafeId: string;
  cafeSlug: string;
  cafeName: string;
  role: CafeMemberRole;
  consentStatus: CafeConsentStatus;
}

export interface CafeMembershipListResponse {
  items: CafeMembershipDto[];
}

export interface CafeMemberDto {
  userId: string;
  role: CafeMemberRole;
  username: string | null;
  name: string;
  createdAt: string;
}

export interface CafeMemberListResponse {
  items: CafeMemberDto[];
}
