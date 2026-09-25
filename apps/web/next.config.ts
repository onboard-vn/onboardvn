import path from 'node:path';
import type { NextConfig } from 'next';

const apiUrl = process.env.API_INTERNAL_URL ?? 'http://localhost:8787';

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.join(import.meta.dirname, '../../'),
  transpilePackages: ['@onboard/shared'],
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${apiUrl}/api/:path*` }];
  },
  async redirects() {
    return [
      { source: '/dang-ky', destination: '/signup', permanent: true },
      { source: '/kiem-tra-email', destination: '/check-email', permanent: true },
      { source: '/quen-mat-khau', destination: '/forgot-password', permanent: true },
      { source: '/dat-lai-mat-khau', destination: '/reset-password', permanent: true },
      { source: '/tai-khoan', destination: '/account', permanent: true },
      { source: '/ban-be', destination: '/friends', permanent: true },
      { source: '/ket-ban/:code', destination: '/invite/:code', permanent: true },
      { source: '/tu-game', destination: '/shelf', permanent: true },
      { source: '/nguon-tham-khao', destination: '/credits', permanent: true },
    ];
  },
};

export default nextConfig;
