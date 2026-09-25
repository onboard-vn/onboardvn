import { bggProfileUrl, type PublicProfile } from '@onboard/shared';
import { ApiError } from '../../lib/errors.js';
import * as repo from './repo.js';

export async function getPublicProfileService(username: string): Promise<PublicProfile> {
  const row = await repo.findPublicUserByUsername(username.toLowerCase());
  if (!row?.username) throw new ApiError('NOT_FOUND', 404, 'Không tìm thấy người dùng');
  return {
    username: row.username,
    displayUsername: row.displayUsername,
    name: row.name,
    image: row.image,
    bggUsername: row.bggUsername,
    bggUrl: row.bggUsername ? bggProfileUrl(row.bggUsername) : null,
  };
}
