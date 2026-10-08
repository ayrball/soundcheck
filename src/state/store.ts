// Settings and progress, kept in this browser only.

import { useSyncExternalStore } from "react";

export interface Saved {
  /** first-language id, "other", or null before onboarding */
  lang: string | null;
  /** practise words inside "Say ___ again." (more reliable scoring) */
  carrier: boolean;
  /** contrast id → recent scores (0..1) for its focus sound, newest last */
  scores: Record<string, number[]>;
}

const KEY = "soundcheck:v1";
const KEEP = 20;
const DEFAULTS: Saved = { lang: null, carrier: true, scores: {} };

function read(): Saved {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

let state = read();
const listeners = new Set<() => void>();

export function update(patch: Partial<Saved> | ((s: Saved) => Partial<Saved>)) {
  state = { ...state, ...(typeof patch === "function" ? patch(state) : patch) };
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // private mode or storage full: keep working in memory
  }
  listeners.forEach((l) => l());
}

export function recordScore(contrastId: string, score: number) {
  update((s) => ({ scores: { ...s.scores, [contrastId]: [...(s.scores[contrastId] ?? []), score].slice(-KEEP) } }));
}

export function useSaved(): Saved {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );
}

export function mastery(scores: number[] | undefined): number | null {
  if (!scores?.length) return null;
  const recent = scores.slice(-10);
  return recent.reduce((a, b) => a + b, 0) / recent.length;
}
