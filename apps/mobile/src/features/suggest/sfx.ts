import { Platform } from 'react-native';

export type SfxName = 'riffle' | 'deal' | 'burn' | 'suspense' | 'flip' | 'reveal';

const NAMES: SfxName[] = ['riffle', 'deal', 'burn', 'suspense', 'flip', 'reveal'];
/** Used for timing until the files are decoded (and on native, which has no player yet). */
const FALLBACK_SECONDS: Record<SfxName, number> = {
  riffle: 0.4,
  deal: 0.3,
  burn: 0.35,
  suspense: 2.6,
  flip: 0.4,
  reveal: 3.3,
};

let ctx: AudioContext | null = null;
let loading: Promise<void> | null = null;
const buffers = new Map<SfxName, AudioBuffer>();

function audioContext(): AudioContext | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx ??= new Ctor();
  return ctx;
}

export function preloadSfx(): Promise<void> {
  const ac = audioContext();
  if (!ac) return Promise.resolve();
  loading ??= Promise.all(
    NAMES.map(async (name) => {
      try {
        const res = await fetch(`/sfx/${name}.mp3`);
        buffers.set(name, await ac.decodeAudioData(await res.arrayBuffer()));
      } catch {
        // a missing sound only silences that event
      }
    }),
  ).then(() => undefined);
  return loading;
}

/** Plays a sound unless muted and returns its length in seconds either way, for pacing. */
export function playSfx(
  name: SfxName,
  { muted = false, gain = 1, rate = 1 }: { muted?: boolean; gain?: number; rate?: number } = {},
): number {
  const buffer = buffers.get(name);
  const seconds = (buffer?.duration ?? FALLBACK_SECONDS[name]) / rate;
  const ac = ctx;
  if (muted || !buffer || !ac) return seconds;
  if (ac.state === 'suspended') void ac.resume();
  const src = ac.createBufferSource();
  const volume = ac.createGain();
  src.buffer = buffer;
  src.playbackRate.value = rate;
  volume.gain.value = gain;
  src.connect(volume).connect(ac.destination);
  src.start();
  return seconds;
}
