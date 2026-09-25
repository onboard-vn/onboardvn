import { z } from 'zod';

export const PRIVACY_LEVELS = ['public', 'friends', 'private'] as const;
export const privacyLevelSchema = z.enum(PRIVACY_LEVELS);
export type PrivacyLevel = z.infer<typeof privacyLevelSchema>;

export const friendSummarySchema = z.object({
  id: z.string(),
  username: z.string().nullable(),
  displayUsername: z.string().nullable(),
  name: z.string(),
  image: z.string().nullable(),
});
export type FriendSummary = z.infer<typeof friendSummarySchema>;

export const friendRequestDtoSchema = z.object({
  fromUserId: z.string(),
  toUserId: z.string(),
  createdAt: z.iso.datetime(),
  user: friendSummarySchema,
});
export type FriendRequestDto = z.infer<typeof friendRequestDtoSchema>;

export const friendCodeSchema = z.object({ code: z.string() });
export type FriendCodeDto = z.infer<typeof friendCodeSchema>;

export const sendFriendRequestSchema = z.object({ username: z.string().trim().min(1) });
export type SendFriendRequestInput = z.infer<typeof sendFriendRequestSchema>;

export const friendRequestDirectionSchema = z.enum(['in', 'out']);
export const friendRequestListQuerySchema = z.object({ dir: friendRequestDirectionSchema });

export const fromUserIdParamSchema = z.object({ fromUserId: z.string().min(1) });
export const toUserIdParamSchema = z.object({ toUserId: z.string().min(1) });
export const userIdParamSchema = z.object({ userId: z.string().min(1) });
export const inviteCodeParamSchema = z.object({ code: z.string().trim().min(1) });

export const blockCreateSchema = z.object({ userId: z.string().min(1) });
export type BlockCreateInput = z.infer<typeof blockCreateSchema>;

export const privacyUpdateSchema = z
  .object({
    profileVisibility: privacyLevelSchema,
    playsVisibility: privacyLevelSchema,
    friendsVisibility: privacyLevelSchema,
    emailOnFriendRequest: z.boolean(),
  })
  .partial();
export type PrivacyUpdateInput = z.infer<typeof privacyUpdateSchema>;

export const friendsListResultSchema = z.union([
  z.object({ hidden: z.literal(true) }),
  z.object({ items: z.array(friendSummarySchema) }),
]);
export type FriendsListResult = z.infer<typeof friendsListResultSchema>;
