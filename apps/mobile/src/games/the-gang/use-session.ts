import { useCallback, useEffect, useState } from 'react';
import type { Lang } from './cards';
import type { GangState } from './engine';
import { loadSession, saveSession } from './storage';

const MAX_UNDO = 30;

export function useGangSession() {
  const [loaded, setLoaded] = useState(false);
  const [lang, setLang] = useState<Lang>('vi');
  const [states, setStates] = useState<GangState[]>([]);

  useEffect(() => {
    void loadSession().then((s) => {
      if (s) {
        setLang(s.lang);
        setStates(s.states);
      }
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (loaded) void saveSession({ lang, states });
  }, [loaded, lang, states]);

  const apply = useCallback((next: (s: GangState) => GangState) => {
    setStates((all) => {
      const current = all.at(-1);
      if (!current) return all;
      const updated = next(current);
      return updated === current ? all : [...all, updated].slice(-MAX_UNDO);
    });
  }, []);

  return {
    loaded,
    lang,
    setLang,
    state: states.at(-1) ?? null,
    canUndo: states.length > 1,
    start: (s: GangState) => setStates([s]),
    apply,
    undo: () => setStates((all) => all.slice(0, -1)),
    reset: () => setStates([]),
  };
}
