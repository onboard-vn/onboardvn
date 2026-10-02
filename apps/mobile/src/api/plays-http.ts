import type { PlayDto, PlayPollResponse, PlayValuesResponse, ScoreTemplate } from '@onboard/shared';
import { avatarColorFor } from '../ui/avatar-color';
import { api } from './client';
import { clubsApi } from './clubs';
import { cellMapFor, diffPlays, fromServerCell, toServerOp } from './play-mapping';
import { QUICK_KEY, type PlayEvent, type PlaysApi, type RosterPlayer } from './plays-types';

const POLL_MS = 2000;
const MAX_OPS = 100;

export interface HttpPlaysOptions {
  play: PlayDto;
  template: ScoreTemplate | null;
  templateId: string | null;
  myUserId: string;
  clubId: string | null;
  tableId: string | null;
}

const patchPlay = (id: string, body: object) =>
  api<PlayDto>(`/plays/${id}`, { method: 'PATCH', body });

export function createHttpPlaysApi(opts: HttpPlaysOptions): PlaysApi {
  let snap = opts.play;
  const map = () => cellMapFor(opts.template, snap);

  const syncTemplateMode = async (quick: boolean) => {
    if (quick && snap.template) snap = await patchPlay(snap.id, { scoreTemplateId: null });
    else if (!quick && !snap.template && opts.templateId) {
      snap = await patchPlay(snap.id, { scoreTemplateId: opts.templateId });
    }
  };

  const toRoster = (i: {
    id: string;
    displayName: string;
    kind: RosterPlayer['kind'];
    birthYear?: number | null;
  }): RosterPlayer => ({
    id: i.id,
    name: i.displayName,
    kind: i.kind,
    avatarColor: avatarColorFor(i.id),
    ...(i.birthYear ? { birthYear: i.birthYear } : {}),
  });

  return {
    async sendOps(playId, ops) {
      if (ops.length === 0) return { appliedOpIds: [] };
      await syncTemplateMode(ops.some((o) => o.categoryKey === QUICK_KEY));
      const mapped = ops.flatMap((o) => toServerOp(o, map()) ?? []);
      for (let i = 0; i < mapped.length; i += MAX_OPS) {
        const res = await api<PlayValuesResponse>(`/plays/${playId}/values`, {
          method: 'PATCH',
          body: { ops: mapped.slice(i, i + MAX_OPS) },
        });
        snap = res.play;
      }
      return { appliedOpIds: ops.map((o) => o.opId) };
    },

    subscribe(playId, handler) {
      let live = true;
      let typing = new Set<string>();
      let timer: ReturnType<typeof setTimeout> | undefined;
      const emit = (e: PlayEvent) => live && handler(e);

      const tick = async () => {
        try {
          const res = await api<PlayPollResponse>(`/plays/${playId}`, {
            query: { sinceRev: snap.rev },
          });
          if (res.play) {
            const changed = diffPlays(snap, res.play);
            snap = res.play;
            const m = map();
            changed.forEach((c, i) =>
              emit({
                type: 'op',
                op: {
                  opId: `remote-${res.rev}-${i}`,
                  actorId: 'remote',
                  ...fromServerCell(c, m),
                  value: c.value,
                },
              }),
            );
          }
          const now = new Set(
            res.presence.filter((p) => p.userId !== opts.myUserId).map((p) => p.identityId),
          );
          for (const id of now)
            if (!typing.has(id)) emit({ type: 'presence', identityId: id, typing: true });
          for (const id of typing)
            if (!now.has(id)) emit({ type: 'presence', identityId: id, typing: false });
          typing = now;
        } catch {
          // keep polling; transient network errors are expected on mobile
        } finally {
          if (live) timer = setTimeout(tick, POLL_MS);
        }
      };
      timer = setTimeout(tick, POLL_MS);
      return () => {
        live = false;
        if (timer) clearTimeout(timer);
      };
    },

    async finish(playId, payload) {
      if (payload.outcome !== undefined)
        snap = await patchPlay(playId, { outcome: payload.outcome });
      const winners = new Set(payload.winners);
      snap = await patchPlay(playId, {
        players: payload.players.map((p) => ({
          identityId: p.identityId,
          isWinnerOverride: winners.has(p.identityId) ? true : null,
        })),
      });
      snap = await api<PlayDto>(`/plays/${playId}/finalize`, { body: {} });
      const kinds = snap.players.map((p) => p.identity.kind);
      return {
        memberCount: kinds.filter((k) => k === 'member').length,
        guestCount: kinds.filter((k) => k !== 'member').length,
      };
    },

    roster: {
      async search(query) {
        if (!opts.clubId) return [];
        return (await clubsApi.identities(opts.clubId, query || undefined)).map(toRoster);
      },
      async createGuest(input) {
        if (!opts.tableId) throw new Error('Chỉ thêm khách được khi chơi theo bàn');
        return toRoster(await clubsApi.addGuest(opts.tableId, input));
      },
      async add(identityId) {
        snap = await patchPlay(snap.id, { addPlayers: [identityId] });
      },
      async remove(identityId) {
        snap = await patchPlay(snap.id, { removePlayers: [identityId] });
      },
    },
  };
}
