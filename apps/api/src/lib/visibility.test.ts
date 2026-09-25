import { describe, expect, it } from 'vitest';
import { canView } from './visibility.js';

describe('canView', () => {
  const base = { isSelf: false, isFriend: false, blocked: false };

  it('always denies a blocked relation, even for the owner', () => {
    expect(canView('public', { ...base, blocked: true })).toBe(false);
    expect(canView('public', { ...base, isSelf: true, blocked: true })).toBe(false);
  });

  it.each(['public', 'friends', 'private'] as const)(
    'denies a blocked viewer at %s level even if also a friend',
    (level) => {
      expect(canView(level, { ...base, blocked: true })).toBe(false);
      expect(canView(level, { ...base, isFriend: true, blocked: true })).toBe(false);
    },
  );

  it('always allows the owner when not blocked', () => {
    expect(canView('private', { ...base, isSelf: true })).toBe(true);
  });

  it.each([
    ['public', 'stranger', base, true],
    ['public', 'friend', { ...base, isFriend: true }, true],
    ['friends', 'stranger', base, false],
    ['friends', 'friend', { ...base, isFriend: true }, true],
    ['private', 'stranger', base, false],
    ['private', 'friend', { ...base, isFriend: true }, false],
  ] as const)('%s level, %s viewer -> %s', (level, _label, relation, expected) => {
    expect(canView(level, relation)).toBe(expected);
  });

  it('anonymous viewer (no relation loaded) behaves like a stranger', () => {
    expect(canView('public', base)).toBe(true);
    expect(canView('friends', base)).toBe(false);
    expect(canView('private', base)).toBe(false);
  });
});
