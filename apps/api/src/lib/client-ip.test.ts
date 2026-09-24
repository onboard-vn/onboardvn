import type { Context } from 'hono';
import { describe, expect, it } from 'vitest';
import { getClientIp, pickForwardedIp } from './client-ip.js';
import type { AppEnv } from '../types.js';

function fakeContext(headers: Record<string, string>, remoteAddress: string): Context<AppEnv> {
  return {
    req: { header: (name: string) => headers[name] },
    env: { incoming: { socket: { remoteAddress, remotePort: 1, remoteFamily: 'IPv4' } } },
  } as unknown as Context<AppEnv>;
}

describe('pickForwardedIp', () => {
  it('picks the leftmost entry and trims whitespace', () => {
    expect(pickForwardedIp('203.0.113.1, 10.0.0.2, 10.0.0.3')).toBe('203.0.113.1');
  });

  it('returns undefined for an empty or missing header', () => {
    expect(pickForwardedIp('')).toBeUndefined();
    expect(pickForwardedIp(undefined)).toBeUndefined();
  });
});

describe('getClientIp', () => {
  it('ignores a spoofed X-Forwarded-For header and uses the socket address when TRUST_PROXY is false (default)', () => {
    const c = fakeContext({ 'x-forwarded-for': '1.2.3.4' }, '198.51.100.9');
    expect(getClientIp(c)).toBe('198.51.100.9');
  });
});
