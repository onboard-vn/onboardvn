export type PlayerKind = 'member' | 'guest' | 'external';

export interface SeatedPlayer {
  identityId: string;
  displayName: string;
  kind: PlayerKind;
  avatarColor: string;
}

export interface MockTable {
  id: string;
  gameSlug: string;
  gameName: string;
  hostIdentityId: string;
  players: SeatedPlayer[];
}

export interface MockMeetup {
  id: string;
  title: string;
  date: string;
  venue: string;
  status: 'upcoming' | 'done';
  tables: MockTable[];
}

export interface MockClub {
  id: string;
  name: string;
  members: SeatedPlayer[];
}

const member = (n: number, displayName: string, avatarColor: string): SeatedPlayer => ({
  identityId: `mem-${n}`,
  displayName,
  kind: 'member',
  avatarColor,
});

const members: SeatedPlayer[] = [
  member(1, 'Long Nguyễn', '#2563eb'),
  member(2, 'Minh Anh', '#db2777'),
  member(3, 'Quang Huy', '#16a34a'),
  member(4, 'Thảo Vy', '#d97706'),
  member(5, 'Đức Mạnh', '#7c3aed'),
  member(6, 'Hải Yến', '#0891b2'),
  member(7, 'Gia Bảo', '#dc2626'),
  member(8, 'Tuấn Kiệt', '#4b5563'),
];

const by = (...ids: number[]): SeatedPlayer[] =>
  ids.map((i) => members.find((m) => m.identityId === `mem-${i}`) as SeatedPlayer);

const guest: SeatedPlayer = {
  identityId: 'guest-lan',
  displayName: 'Lan (khách)',
  kind: 'guest',
  avatarColor: '#9333ea',
};
const external: SeatedPlayer = {
  identityId: 'ext-tung',
  displayName: 'Tùng (CLB Hà Nội)',
  kind: 'external',
  avatarColor: '#0f766e',
};

const club: MockClub = { id: 'club-saigon-boardgame', name: 'Saigon Boardgame Club', members };

const meetups: MockMeetup[] = [
  {
    id: 'meetup-2026-10-04',
    title: 'Kèo thứ Bảy',
    date: '2026-10-04T18:30:00+07:00',
    venue: 'Dice & Dragons Café, Q.1',
    status: 'upcoming',
    tables: [
      {
        id: 'table-1004-gang',
        gameSlug: 'the-gang-2024',
        gameName: 'The Gang',
        hostIdentityId: 'mem-1',
        players: [...by(1, 2, 3, 5), guest],
      },
      {
        id: 'table-1004-gah',
        gameSlug: 'grand-austria-hotel-deluxe',
        gameName: 'Grand Austria Hotel',
        hostIdentityId: 'mem-4',
        players: by(4, 6, 7),
      },
      {
        id: 'table-1004-flip7',
        gameSlug: 'flip-7',
        gameName: 'Flip 7',
        hostIdentityId: 'mem-8',
        players: [...by(8, 2, 5), external],
      },
    ],
  },
  {
    id: 'meetup-2026-09-25',
    title: 'Kèo tối thứ Sáu',
    date: '2026-09-25T19:00:00+07:00',
    venue: 'Meeple Station, Q.3',
    status: 'done',
    tables: [
      {
        id: 'table-0925-acquire',
        gameSlug: 'acquire-1963',
        gameName: 'Acquire',
        hostIdentityId: 'mem-3',
        players: by(3, 1, 6, 7),
      },
      {
        id: 'table-0925-scout',
        gameSlug: 'scout-2019',
        gameName: 'Scout',
        hostIdentityId: 'mem-2',
        players: by(2, 4, 8),
      },
    ],
  },
];

export const CURRENT_IDENTITY_ID = 'mem-1';

export const getClub = (): MockClub => club;
export const listClubMembers = (): SeatedPlayer[] => club.members;
export const listMeetups = (): MockMeetup[] => meetups;
export const getMeetup = (id: string): MockMeetup | undefined => meetups.find((m) => m.id === id);

export function getTable(tableId: string): { table: MockTable; meetup: MockMeetup } | undefined {
  for (const meetup of meetups) {
    const table = meetup.tables.find((t) => t.id === tableId);
    if (table) return { table, meetup };
  }
  return undefined;
}

const PALETTE = ['#2563eb', '#db2777', '#16a34a', '#d97706', '#7c3aed', '#0891b2', '#dc2626'];

export const avatarColorFor = (seed: string): string => {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length] as string;
};
