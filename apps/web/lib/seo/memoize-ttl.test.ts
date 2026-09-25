import { afterEach, describe, expect, it, vi } from 'vitest';
import { memoizeTtl } from './memoize-ttl';

afterEach(() => vi.useRealTimers());

describe('memoizeTtl', () => {
  it('shares concurrent calls and reuses the value until the TTL expires', async () => {
    vi.useFakeTimers();
    const load = vi.fn(async () => 'v');
    const get = memoizeTtl(load, 1000);
    await Promise.all([get(), get()]);
    expect(load).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1001);
    await get();
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('does not cache failures', async () => {
    const load = vi.fn().mockRejectedValueOnce(new Error('down')).mockResolvedValueOnce('ok');
    const get = memoizeTtl(load, 60_000);
    await expect(get()).rejects.toThrow('down');
    await expect(get()).resolves.toBe('ok');
  });
});
