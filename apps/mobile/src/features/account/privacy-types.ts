import type { PrivacyLevel } from '@onboard/shared';

export const LEVEL_LABEL: Record<PrivacyLevel, string> = {
  public: 'Công khai',
  friends: 'Chỉ bạn bè',
  private: 'Chỉ mình tôi',
};

export const LEVELS: PrivacyLevel[] = ['public', 'friends', 'private'];

export interface PrivacyValues {
  profileVisibility: PrivacyLevel;
  playsVisibility: PrivacyLevel;
  friendsVisibility: PrivacyLevel;
  emailOnFriendRequest: boolean;
  clubShelfSuggest: boolean;
  provinceCode: string | null;
}

export interface AccountMe {
  id: string;
  name: string;
  username: string | null;
  displayUsername: string | null;
  bggUsername: string | null;
  profileVisibility: PrivacyLevel;
  playsVisibility: PrivacyLevel;
  friendsVisibility: PrivacyLevel;
  emailOnFriendRequest: boolean;
  clubShelfSuggest?: boolean;
  provinceCode?: string | null;
}

export const privacyValuesFrom = (u: AccountMe): PrivacyValues => ({
  profileVisibility: u.profileVisibility,
  playsVisibility: u.playsVisibility,
  friendsVisibility: u.friendsVisibility,
  emailOnFriendRequest: u.emailOnFriendRequest,
  clubShelfSuggest: u.clubShelfSuggest ?? true,
  provinceCode: u.provinceCode ?? null,
});
