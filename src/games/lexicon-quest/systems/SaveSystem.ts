import { SAVE_KEY, SAVE_VERSION } from "../config.ts";
import type { GameState } from "../types.ts";

export interface LexiconProgress {
  version: typeof SAVE_VERSION;
  runs: number;
  victories: number;
  bestEnemiesDefeated: number;
  bestEnemyIndex: number;
  bestWord: string;
  bestWordLength: number;
  totalDamage: number;
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function defaultStorage(): StorageLike | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

export function defaultLexiconProgress(): LexiconProgress {
  return {
    version: SAVE_VERSION,
    runs: 0,
    victories: 0,
    bestEnemiesDefeated: 0,
    bestEnemyIndex: 0,
    bestWord: "",
    bestWordLength: 0,
    totalDamage: 0,
  };
}

function numberOr(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : fallback;
}

function normalize(value: unknown): LexiconProgress {
  const base = defaultLexiconProgress();
  if (!value || typeof value !== "object") return base;
  const candidate = value as Partial<LexiconProgress>;

  return {
    version: SAVE_VERSION,
    runs: numberOr(candidate.runs, base.runs),
    victories: numberOr(candidate.victories, base.victories),
    bestEnemiesDefeated: numberOr(
      candidate.bestEnemiesDefeated,
      base.bestEnemiesDefeated,
    ),
    bestEnemyIndex: numberOr(candidate.bestEnemyIndex, base.bestEnemyIndex),
    bestWord:
      typeof candidate.bestWord === "string" ? candidate.bestWord : "",
    bestWordLength: numberOr(
      candidate.bestWordLength,
      base.bestWordLength,
    ),
    totalDamage: numberOr(candidate.totalDamage, base.totalDamage),
  };
}

export function loadLexiconProgress(
  storage: StorageLike | null = defaultStorage(),
): LexiconProgress {
  if (!storage) return defaultLexiconProgress();
  try {
    const raw = storage.getItem(SAVE_KEY);
    if (!raw) return defaultLexiconProgress();
    return normalize(JSON.parse(raw));
  } catch {
    return defaultLexiconProgress();
  }
}

export function saveLexiconProgress(
  progress: LexiconProgress,
  storage: StorageLike | null = defaultStorage(),
): void {
  if (!storage) return;

  try {
    storage.setItem(SAVE_KEY, JSON.stringify(progress));

    if (typeof window !== "undefined" && storage === window.localStorage) {
      void import("../../../lib/game-progress")
        .then(({ queueGameProgress }) =>
          queueGameProgress("lexicon-quest", progress),
        )
        .catch(() => {
          // Offline: the local save still works.
        });
    }
  } catch {
    // Private mode or quota exceeded: keep playing without persistence.
  }
}

/**
 * Records the end of a run and keeps the best result seen so far. A defeat on
 * enemy index N means N enemies were cleared; defeating the final enemy counts
 * as `enemyIndex + 1`.
 */
export function recordRunResult(
  state: GameState,
  victory: boolean,
  storage: StorageLike | null = defaultStorage(),
): LexiconProgress {
  const previous = loadLexiconProgress(storage);
  const cleared = victory
    ? state.enemyIndex + 1
    : Math.max(0, state.enemyIndex);
  const bestWordLength = Math.max(
    previous.bestWordLength,
    state.stats.bestWordLength,
  );
  const bestWord =
    state.stats.bestWordLength >= previous.bestWordLength
      ? state.stats.bestWord || previous.bestWord
      : previous.bestWord;

  const next: LexiconProgress = {
    version: SAVE_VERSION,
    runs: previous.runs + 1,
    victories: previous.victories + (victory ? 1 : 0),
    bestEnemiesDefeated: Math.max(previous.bestEnemiesDefeated, cleared),
    bestEnemyIndex: Math.max(previous.bestEnemyIndex, state.enemyIndex),
    bestWord,
    bestWordLength,
    totalDamage: previous.totalDamage + Math.max(0, state.stats.damageDealt),
  };

  saveLexiconProgress(next, storage);
  return next;
}
