import type {
  ClaimRedeemResponse,
  ClubListResponse,
  ClubMeetupsResponse,
  IdentityDto,
  IdentityListResponse,
  TableDetailDto,
} from '@onboard/shared';
import { api } from './client';

export const clubsApi = {
  myClubs: () => api<ClubListResponse>('/clubs').then((r) => r.items),
  meetups: (clubId: string, range: { from?: string; to?: string } = {}) =>
    api<ClubMeetupsResponse>(`/clubs/${clubId}/meetups`, { query: range }).then((r) => r.items),
  identities: (clubId: string, q?: string) =>
    api<IdentityListResponse>(`/clubs/${clubId}/identities`, { query: { q, limit: 100 } }).then(
      (r) => r.items,
    ),
  table: (tableId: string) => api<TableDetailDto>(`/tables/${tableId}`),
  addGuest: (tableId: string, input: { displayName: string; birthYear?: number }) =>
    api<IdentityDto>(`/tables/${tableId}/guests`, { body: input }),
  removeGuest: (tableId: string, identityId: string) =>
    api<unknown>(`/tables/${tableId}/guests/${identityId}`, { method: 'DELETE' }),
  redeemClaim: (token: string) =>
    api<ClaimRedeemResponse>('/identities/claim', { body: { token } }),
  requestClaim: (identityId: string, tableId: string, note?: string) =>
    api<unknown>(`/identities/${identityId}/claim-requests`, { body: { tableId, note } }),
  claimLink: (identityId: string) =>
    api<{ token: string; url: string; expiresAt: string }>(
      `/identities/${identityId}/claim-links`,
      {
        body: {},
      },
    ),
};
