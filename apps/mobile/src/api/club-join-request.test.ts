import { describe, expect, it } from 'vitest';
import { buildClubJoinRequest } from './club-join-request';

describe('buildClubJoinRequest', () => {
  it('keeps the club ID in the body and encodes only the invite code in the path', () => {
    const request = buildClubJoinRequest('invite/code', '  private-id  ');

    expect(request.path).toBe('/clubs/join/invite%2Fcode');
    expect(request.path).not.toContain('private-id');
    expect(request.body).toEqual({ externalId: 'private-id' });
  });

  it('omits an empty optional club ID from the request body', () => {
    expect(buildClubJoinRequest('invite-code', '  ').body).toEqual({});
    expect(buildClubJoinRequest('invite-code').body).toEqual({});
  });
});
