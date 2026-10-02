import { ROUND_KEY, type PlayEvent, type PlayOp, type PlaysApi } from './plays-types';
import { avatarColorFor, CURRENT_IDENTITY_ID, getTable, listClubMembers } from '../mock/club';
import { isRoundsGame, isOutcomeDriven } from '../score/model';
import { scoreTemplates } from '../score/templates';

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const rand = (n: number) => Math.floor(Math.random() * n);

const newId = () => `mock-${Date.now().toString(36)}-${rand(1e9).toString(36)}`;

export const mockPlaysApi: PlaysApi = {
  roster: {
    async search() {
      return listClubMembers().map((m) => ({
        id: m.identityId,
        name: m.displayName,
        kind: m.kind,
        avatarColor: m.avatarColor,
      }));
    },
    async createGuest({ displayName, birthYear }) {
      return {
        id: `guest-${Date.now().toString(36)}`,
        name: displayName,
        kind: 'guest',
        avatarColor: avatarColorFor(displayName),
        ...(birthYear !== undefined ? { birthYear } : {}),
      };
    },
    async add() {},
    async remove() {},
  },

  async sendOps(_playId, ops) {
    await wait(300);
    return { appliedOpIds: ops.map((o) => o.opId) };
  },

  subscribe(playId, handler) {
    const found = getTable(playId);
    const template = found ? scoreTemplates[found.table.gameSlug] : undefined;
    if (!found || !template) return () => {};
    const others = found.table.players.filter((p) => p.identityId !== CURRENT_IDENTITY_ID);
    if (others.length === 0) return () => {};

    const cells = template.categories.filter(
      (c) =>
        c.scope === 'player' &&
        (c.input === 'number' || c.input === 'count') &&
        !isOutcomeDriven(template, c),
    );
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const later = (fn: () => void, ms: number) => {
      const t = setTimeout(() => {
        timers.delete(t);
        fn();
      }, ms);
      timers.add(t);
    };

    const tick = () => {
      const who = others[rand(others.length)];
      if (!who) return;
      const emit = (e: PlayEvent) => handler(e);
      let op: PlayOp | null = null;
      if (isRoundsGame(template)) {
        op = {
          opId: newId(),
          actorId: who.identityId,
          identityId: who.identityId,
          categoryKey: ROUND_KEY,
          roundIndex: 0,
          value: rand(25),
        };
      } else if (cells.length > 0) {
        const cat = cells[rand(cells.length)];
        if (cat) {
          const step = cat.key === 'cash' ? 100 : 1;
          const raw = rand(11) * step;
          op = {
            opId: newId(),
            actorId: who.identityId,
            identityId: who.identityId,
            categoryKey: cat.key,
            value: Math.min(cat.max ?? raw, Math.max(cat.min ?? 0, raw)),
          };
        }
      }
      if (!op) return;
      const sent = op;
      emit({ type: 'presence', identityId: who.identityId, typing: true });
      later(() => {
        emit({ type: 'op', op: sent });
        emit({ type: 'presence', identityId: who.identityId, typing: false });
      }, 1500);
    };

    const interval = setInterval(tick, 9000);
    later(tick, 4000);
    return () => {
      clearInterval(interval);
      timers.forEach(clearTimeout);
      timers.clear();
    };
  },

  async finish(_playId, payload) {
    await wait(400);
    return {
      memberCount: payload.players.filter((p) => p.kind !== 'guest').length,
      guestCount: payload.players.filter((p) => p.kind === 'guest').length,
    };
  },
};
