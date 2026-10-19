import { describe, expect, it } from 'vitest';
import { defaultCritterPriorities } from './critter-kitchen-priority';

describe('default Critter Kitchen priority', () => {
  it('uses roster order rather than seat ids as the 1-based priority', () => {
    expect(
      defaultCritterPriorities([
        { identityId: 'second', seat: 2 },
        { identityId: 'first', seat: 1 },
      ]),
    ).toEqual({ first: 1, second: 2 });
  });
});
