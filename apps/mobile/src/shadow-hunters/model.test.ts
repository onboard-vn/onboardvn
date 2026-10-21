import { describe, expect, it } from 'vitest';
import {
  requiredDecisions,
  restoreSession,
  selectedCards,
  setupErrors,
  setupFor,
  startSession,
  type Setup,
} from './model';

const approved = (setup: Setup) => ({
  ...setup,
  decisions: Object.fromEntries(
    requiredDecisions(setup).map((d) => [d.id, 'Đã chốt theo thẻ và bàn đang dùng.']),
  ),
});
const draws = (setup: Setup) =>
  selectedCards(setup).filter((c) => ['white', 'black', 'green'].includes(c.deck));

describe('Shadow Hunters companion configuration', () => {
  it('requires individual unresolved character decisions and clears them after exclusion', () => {
    const setup = {
      ...setupFor('hunters-remastered'),
      playerCount: 7,
      characterSetIds: ['sh-official-base', 'muttstain'],
    };
    expect(requiredDecisions(setup).some((d) => d.id === 'character:muttstain-deckhand')).toBe(
      true,
    );
    expect(
      selectedCards(setup)
        .find((c) => c.id === 'muttstain-deckhand')
        ?.notes.join(' '),
    ).toContain('7 người');
    const decisions = approved(setup).decisions;
    delete decisions['character:muttstain-deckhand'];
    expect(setupErrors({ ...setup, decisions }).some((e) => e.startsWith('Deckhand:'))).toBe(true);
    expect(
      requiredDecisions({ ...setup, excludedCharacterIds: ['muttstain-deckhand'] }).some(
        (d) => d.id === 'character:muttstain-deckhand',
      ),
    ).toBe(false);
    expect(
      requiredDecisions({ ...setup, playerCount: 6 }).some(
        (d) => d.id === 'character:muttstain-deckhand',
      ),
    ).toBe(false);
  });
  it('keeps fixed Jenemai quantities and snapshots card-specific source labels', () => {
    const setup = approved(setupFor('hunters-remastered-jenemai'));
    expect(requiredDecisions(setup).find((d) => d.id === 'jenemai')?.text).toContain(
      'cố định mỗi mẫu Jenemai 1 lá',
    );
    expect(
      selectedCards(setup)
        .filter((c) => c.setId === 'jenemai-items')
        .every((c) => c.quantity === 1),
    ).toBe(true);
    const session = startSession(setup);
    expect(
      session.cards.every(
        (c) => c.sources.length > 0 && c.sources.every((s) => s.title.length > 0),
      ),
    ).toBe(true);
    expect(restoreSession(JSON.stringify(session))?.cards[0]!.sources).toEqual(
      session.cards[0]!.sources,
    );
  });
  it('starts Hunters with base pool, 48 source copies and an explicit physical-board confirmation', () => {
    const setup = setupFor('hunters-remastered');
    expect(setupErrors(setup)).toContain(requiredDecisions(setup)[0]!.text);
    expect(draws(setup).reduce((n, c) => n + c.quantity, 0)).toBe(48);
    expect(setupErrors(approved(setup))).toEqual([]);
    expect(selectedCards(setup).filter((c) => c.deck === 'character')).toHaveLength(10);
  });
  it('uses base replacement versions only when the expansion is absent', () => {
    const setup = {
      ...setupFor('custom-mix'),
      ruleset: 'shadow-raiders' as const,
      drawSetIds: ['sr-base'],
    };
    expect(draws(setup).reduce((n, c) => n + c.quantity, 0)).toBe(48);
    expect(draws(setup).find((c) => c.id === 'sr-white-happy-cookie')?.effect).toContain(
      'Alice hoặc Ulrich',
    );
    const expanded = { ...setup, drawSetIds: ['sr-base', 'sr-airship'] };
    expect(draws(expanded).reduce((n, c) => n + c.quantity, 0)).toBe(60);
    expect(draws(expanded).find((c) => c.id === 'sr-white-happy-cookie')?.effect).toContain(
      'Agatha',
    );
    expect(draws(expanded).some((c) => c.version === 'base')).toBe(false);
    expect(new Set(draws(expanded).map((c) => c.key)).size).toBe(draws(expanded).length);
  });
  it('requires a Raider character pool and leaves Fangs blocked even with decisions', () => {
    expect(
      setupErrors(approved(setupFor('raiders-airship'))).some((e) => e.includes('Kho tướng')),
    ).toBe(true);
    expect(setupErrors(approved(setupFor('fangs-native'))).some((e) => e.includes('Fangs'))).toBe(
      true,
    );
    expect(() => startSession(approved(setupFor('fangs-native')))).toThrow();
  });
  it('limits decisions to selected modules and rejects missing dependencies and invalid players', () => {
    const base = setupFor('hunters-remastered');
    expect(requiredDecisions(base).some((d) => d.id === 'jenemai')).toBe(false);
    expect(
      requiredDecisions(setupFor('hunters-remastered-jenemai')).some((d) => d.id === 'jenemai'),
    ).toBe(true);
    expect(setupErrors(approved({ ...base, playerCount: 9 }))).toContain(
      'Luật đã có hỗ trợ 4–8 người.',
    );
    expect(setupErrors(approved({ ...base, drawSetIds: ['sr-airship'] }))).toContain(
      'Mở rộng Khí cầu cần bộ Raiders gốc.',
    );
    expect(
      requiredDecisions({ ...base, drawSetIds: ['sr-base'] }).some((d) => d.id === 'cross-set'),
    ).toBe(true);
  });
  it('excludes characters from the actual pool and checks required faction counts', () => {
    const setup = {
      ...setupFor('hunters-remastered'),
      excludedCharacterIds: ['sh-emi', 'sh-franklin'],
    };
    expect(selectedCards(setup).some((c) => c.id === 'sh-emi')).toBe(false);
    expect(setupErrors(approved(setup)).some((e) => e.includes('hunter'))).toBe(true);
  });
  it('snapshots rules, quantities and decisions without retaining mutable setup references', () => {
    const setup = approved(setupFor('hunters-remastered'));
    const session = startSession(setup, '2026-10-08T05:00:00Z');
    setup.decisions['hunters-board'] = 'changed';
    setup.drawSetIds.push('jenemai-items');
    expect(session.setup.drawSetIds).toEqual(['shadow-hunters-remastered-original']);
    expect(session.decisions[0]!.text).not.toBe('changed');
    expect(restoreSession(JSON.stringify(session))).toEqual(session);
    expect(restoreSession('{broken')).toBeNull();
    expect(restoreSession(JSON.stringify({ ...session, cards: [{ id: 'bad' }] }))).toBeNull();
  });
  it('selects exactly the reviewed 50-character pool across sets', () => {
    const setup = setupFor('hunters-remastered');
    setup.characterSelection = 'selected50';
    setup.characterSetIds = [
      'sh-official-base',
      'sh-official-expansion',
      'muttstain',
      'muttstain-star-wars',
      'election-2020',
      'romantic-mushroom',
    ];
    expect(selectedCards(setup).filter((c) => c.deck === 'character')).toHaveLength(50);
  });
});
