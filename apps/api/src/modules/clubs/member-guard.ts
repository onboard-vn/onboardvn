import { ApiError } from '../../lib/errors.js';
import { isClubMember } from './repo.js';

export async function requireClubMemberOr404(
  clubId: string,
  userId: string | null | undefined,
): Promise<void> {
  if (!userId || !(await isClubMember(clubId, userId))) {
    throw new ApiError('NOT_FOUND', 404, 'Không tìm thấy club');
  }
}
