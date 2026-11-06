import { SAVE_KEY } from "../config.ts";
import type { PlayerProgress, PlayerSettings } from "../types/GameTypes.ts";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const DEFAULT_SETTINGS: PlayerSettings = {
  soundEnabled: true,
  reducedMotion: prefersReducedMotion(),
};

function prefersReducedMotion(): boolean {
  try {
    if (typeof window === "undefined") return false;
    if (typeof window.matchMedia !== "function") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

export function defaultProgress(): PlayerProgress {
  return {
    bestPairs: 0,
    bestTimeMs: null,
    runs: 0,
    settings: { ...DEFAULT_SETTINGS },
  };
}

function getStorage(): StorageLike | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

function normalizeProgress(value: unknown): PlayerProgress {
  const base = defaultProgress();
  if (!value || typeof value !== "object") return base;
  const candidate = value as Partial<PlayerProgress>;
  const settings = (candidate.settings ?? {}) as Partial<PlayerSettings>;

  const bestPairs =
    typeof candidate.bestPairs === "number" &&
    Number.isFinite(candidate.bestPairs) &&
    candidate.bestPairs > 0
      ? Math.floor(candidate.bestPairs)
      : 0;
  const bestTimeMs =
    typeof candidate.bestTimeMs === "number" &&
    Number.isFinite(candidate.bestTimeMs) &&
    candidate.bestTimeMs >= 0
      ? Math.floor(candidate.bestTimeMs)
      : null;
  const runs =
    typeof candidate.runs === "number" &&
    Number.isFinite(candidate.runs) &&
    candidate.runs >= 0
      ? Math.floor(candidate.runs)
      : 0;

  return {
    bestPairs,
    bestTimeMs: bestPairs > 0 ? bestTimeMs : null,
    runs,
    settings: {
      soundEnabled:
        typeof settings.soundEnabled === "boolean"
          ? settings.soundEnabled
          : DEFAULT_SETTINGS.soundEnabled,
      reducedMotion:
        typeof settings.reducedMotion === "boolean"
          ? settings.reducedMotion
          : DEFAULT_SETTINGS.reducedMotion,
    },
  };
}

export function loadProgress(
  storage: StorageLike | null = getStorage(),
): PlayerProgress {
  if (!storage) return defaultProgress();
  try {
    const raw = storage.getItem(SAVE_KEY);
    if (!raw) return defaultProgress();
    return normalizeProgress(JSON.parse(raw));
  } catch {
    return defaultProgress();
  }
}

export function saveProgress(
  progress: PlayerProgress,
  storage: StorageLike | null = getStorage(),
): void {
  if (!storage) return;
  try {
    storage.setItem(SAVE_KEY, JSON.stringify(progress));

    if (typeof window !== "undefined" && storage === window.localStorage) {
      void import("../../../lib/game-progress")
        .then(({ queueGameProgress }) => queueGameProgress("tenlink", progress))
        .catch(() => {
          // Sin conexión el guardado local sigue funcionando.
        });
    }
  } catch {
    // El juego sigue funcionando sin persistencia.
  }
}

/**
 * Registra una partida terminada. Más parejas siempre es mejor; el tiempo solo
 * desempata entre partidas con el mismo número de parejas.
 */
export function applyRunResult(
  progress: PlayerProgress,
  pairs: number,
  timeMs: number,
): PlayerProgress {
  const safePairs = Math.max(0, Math.floor(pairs));
  const safeTime = Math.max(0, Math.floor(timeMs));
  const improves =
    safePairs > progress.bestPairs ||
    (safePairs > 0 &&
      safePairs === progress.bestPairs &&
      (progress.bestTimeMs === null || safeTime < progress.bestTimeMs));

  return {
    ...progress,
    bestPairs: improves ? safePairs : progress.bestPairs,
    bestTimeMs: improves ? safeTime : progress.bestTimeMs,
    runs: progress.runs + 1,
  };
}

export function withSettings(
  progress: PlayerProgress,
  patch: Partial<PlayerSettings>,
): PlayerProgress {
  return {
    ...progress,
    settings: { ...progress.settings, ...patch },
  };
}

export function formatTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
