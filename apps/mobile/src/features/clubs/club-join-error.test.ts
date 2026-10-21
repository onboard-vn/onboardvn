import { describe, expect, it } from 'vitest';
import { clubJoinErrorMessage } from './club-join-error';

describe('clubJoinErrorMessage', () => {
  it('uses a generic retry message for lockout and rate limit responses', () => {
    expect(clubJoinErrorMessage(423)).toBe('Không thể liên kết lúc này. Vui lòng thử lại sau.');
    expect(clubJoinErrorMessage(429)).toBe('Không thể liên kết lúc này. Vui lòng thử lại sau.');
  });

  it('uses one generic message for every other failure', () => {
    const message = 'Không thể liên kết. Vui lòng thử lại hoặc hỏi admin CLB.';
    expect(clubJoinErrorMessage(400)).toBe(message);
    expect(clubJoinErrorMessage(500)).toBe(message);
    expect(clubJoinErrorMessage(null)).toBe(message);
  });
});
