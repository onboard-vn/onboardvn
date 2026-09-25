import { describe, expect, it } from 'vitest';
import nextConfig from './next.config';

describe('redirects', () => {
  it('permanently redirects every retired Vietnamese path to its English route', async () => {
    const redirects = await nextConfig.redirects!();
    const bySource = Object.fromEntries(redirects.map((r) => [r.source, r]));

    expect(bySource['/dang-ky']).toMatchObject({ destination: '/signup', permanent: true });
    expect(bySource['/kiem-tra-email']).toMatchObject({
      destination: '/check-email',
      permanent: true,
    });
    expect(bySource['/quen-mat-khau']).toMatchObject({
      destination: '/forgot-password',
      permanent: true,
    });
    expect(bySource['/dat-lai-mat-khau']).toMatchObject({
      destination: '/reset-password',
      permanent: true,
    });
    expect(bySource['/tai-khoan']).toMatchObject({ destination: '/account', permanent: true });
    expect(bySource['/ban-be']).toMatchObject({ destination: '/friends', permanent: true });
    expect(bySource['/ket-ban/:code']).toMatchObject({
      destination: '/invite/:code',
      permanent: true,
    });
    expect(bySource['/tu-game']).toMatchObject({ destination: '/shelf', permanent: true });
    expect(bySource['/nguon-tham-khao']).toMatchObject({
      destination: '/credits',
      permanent: true,
    });
  });
});
