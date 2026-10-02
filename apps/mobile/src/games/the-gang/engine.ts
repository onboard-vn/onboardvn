import { byCodeNumber, codesOf, gangCards } from './cards';

export type Mode = 'basic' | 'advanced' | 'professional' | 'master' | 'homebrew';
export type HeistResult = 'success' | 'fail';
export type Rng = () => number;

export interface ActiveCard {
  code: string;
  scope: 'game' | 'heist';
}

export interface GameConfig {
  mode: Mode;
  shuffled: boolean;
  includeBaseInHomebrew: boolean;
}

export interface GangState {
  config: GameConfig;
  heist: number;
  vaults: number;
  alarms: number;
  maxAlarms: number;
  status: 'playing' | 'won' | 'lost';
  /** "bad" holds challenge/detrimental cards, "good" specialist/beneficial; index 0 is the top. */
  stacks: { bad: string[]; good: string[] };
  active: ActiveCard[];
  history: { heist: number; result: HeistResult; cards: string[] }[];
}

export const VAULTS_TO_WIN = 3;
const QUICK_ACCESS = 'C1';

export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

function buildStacks(config: GameConfig, rng: Rng) {
  const order = (codes: string[]) => (config.shuffled ? shuffle(codes, rng) : codes);
  if (config.mode === 'homebrew') {
    const withBase = (hb: string[], base: string[]) =>
      config.includeBaseInHomebrew ? [...hb, ...base] : hb;
    return {
      bad: shuffle(withBase(codesOf('hbBad'), codesOf('challenge')), rng),
      good: shuffle(withBase(codesOf('hbGood'), codesOf('specialist')), rng),
    };
  }
  const dropQuickAccess = config.mode === 'professional' || config.mode === 'master';
  const challenges = codesOf('challenge').filter((c) => !(dropQuickAccess && c === QUICK_ACCESS));
  return {
    bad: order(challenges),
    good: config.mode === 'master' ? [] : order(codesOf('specialist')),
  };
}

const takeTop = (stack: string[]) => {
  const [top, ...rest] = stack;
  return { top, rest };
};

function takeRandom(stack: string[], rng: Rng) {
  const i = Math.floor(rng() * stack.length);
  return { card: stack[i], rest: stack.filter((_, k) => k !== i) };
}

function reveal(s: GangState, pile: 'bad' | 'good', scope: ActiveCard['scope']): GangState {
  const { top, rest } = takeTop(s.stacks[pile]);
  if (!top) return s;
  return {
    ...s,
    stacks: { ...s.stacks, [pile]: rest },
    active: [...s.active, { code: top, scope }],
  };
}

const pileOf = (code: string): 'bad' | 'good' => {
  const kind = gangCards[code]?.kind;
  return kind === 'specialist' || kind === 'hbGood' ? 'good' : 'bad';
};

function returnToBottom(s: GangState, codes: string[]): GangState {
  const stacks = { bad: [...s.stacks.bad], good: [...s.stacks.good] };
  for (const code of codes) stacks[pileOf(code)].push(code);
  return { ...s, stacks, active: s.active.filter((a) => !codes.includes(a.code)) };
}

export function startGame(config: GameConfig, rng: Rng = Math.random): GangState {
  let s: GangState = {
    config,
    heist: 1,
    vaults: 0,
    alarms: 0,
    maxAlarms: config.mode === 'master' ? 2 : 3,
    status: 'playing',
    stacks: buildStacks(config, rng),
    active: [],
    history: [],
  };
  if (config.mode === 'professional' || config.mode === 'master') {
    const count = config.mode === 'master' ? 2 : 1;
    const scope = config.mode === 'master' ? 'heist' : 'game';
    for (let i = 0; i < count; i++) {
      const { card, rest } = takeRandom(s.stacks.bad, rng);
      if (!card) break;
      s = {
        ...s,
        stacks: { ...s.stacks, bad: rest },
        active: [...s.active, { code: card, scope }],
      };
    }
  }
  if (config.mode === 'homebrew') {
    s = reveal(s, 'bad', 'game');
    s = reveal(reveal(s, 'bad', 'heist'), 'good', 'heist');
  }
  return s;
}

export function resolveHeist(prev: GangState, result: HeistResult): GangState {
  if (prev.status !== 'playing') return prev;
  let s: GangState = {
    ...prev,
    vaults: prev.vaults + (result === 'success' ? 1 : 0),
    alarms: prev.alarms + (result === 'fail' ? 1 : 0),
    history: [
      ...prev.history,
      { heist: prev.heist, result, cards: prev.active.map((a) => a.code) },
    ],
  };
  if (s.vaults >= VAULTS_TO_WIN) return { ...s, status: 'won' };
  if (s.alarms >= s.maxAlarms) return { ...s, status: 'lost' };

  s = { ...s, heist: s.heist + 1 };
  const heistScoped = s.active.filter((a) => a.scope === 'heist').map((a) => a.code);

  switch (s.config.mode) {
    case 'basic':
      return s;
    case 'advanced':
    case 'professional':
      s = returnToBottom(s, heistScoped);
      return reveal(s, result === 'success' ? 'bad' : 'good', 'heist');
    case 'master': {
      const lowest = [...heistScoped].sort(byCodeNumber)[0];
      s = returnToBottom(s, lowest ? [lowest] : []);
      return reveal(s, 'bad', 'heist');
    }
    case 'homebrew':
      s = returnToBottom(s, heistScoped);
      return reveal(reveal(s, 'bad', 'heist'), 'good', 'heist');
  }
}

/** Homebrew difficulty tuning: add one more temporary card from either pile. */
export const drawExtra = (s: GangState, pile: 'bad' | 'good') =>
  s.status === 'playing' ? reveal(s, pile, 'heist') : s;

export const discardActive = (s: GangState, code: string) => returnToBottom(s, [code]);

export const totalDifficulty = (s: GangState) =>
  s.active.reduce((sum, a) => sum + (gangCards[a.code]?.difficulty ?? 0), 0);
