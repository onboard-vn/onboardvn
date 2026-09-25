import { bggProfileUrl, type PublicProfile } from '@onboard/shared';
import { ApiError } from '../../lib/errors.js';
import { canView, loadViewerRelation } from '../../lib/visibility.js';
import * as repo from './repo.js';

export async function getPublicProfileService(
  viewerId: string | null,
  username: string,
): Promise<PublicProfile> {
  const row = await repo.findPublicUserByUsername(username.toLowerCase());
  if (!row?.username) throw new ApiError('NOT_FOUND', 404, 'Không tìm thấy người dùng');

  const relation = await loadViewerRelation(viewerId, row.id);
  if (!canView(row.profileVisibility, relation)) {
    return {
      hidden: true,
      id: row.id,
      username: row.username,
      displayUsername: row.displayUsername,
    };
  }

  return {
    hidden: false,
    id: row.id,
    username: row.username,
    displayUsername: row.displayUsername,
    name: row.name,
    image: row.image,
    bggUsername: row.bggUsername,
    bggUrl: row.bggUsername ? bggProfileUrl(row.bggUsername) : null,
  };
}
