import { SAVE_KEY } from "../config.ts";
import type { PlayerProgress, PlayerSettings } from "../types/puzzle.ts";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const DEFAULT_SETTINGS: PlayerSettings = {
  soundEnabled: true,
  reducedMotion: prefersReducedMotion(),
  conflictHintsEnabled: true,
  strictMode: false,
};

/** Respeta la preferencia del sistema cuando está disponible. */
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
    unlockedLevel: 0,
    completedLevels: [],
    bestTimes: {},
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

  return {
    unlockedLevel:
      typeof candidate.unlockedLevel === "number" &&
      Number.isFinite(candidate.unlockedLevel)
        ? Math.max(0, Math.floor(candidate.unlockedLevel))
        : 0,
    completedLevels: Array.isArray(candidate.completedLevels)
      ? candidate.completedLevels.filter(
          (id): id is string => typeof id === "string",
        )
      : [],
    bestTimes:
      candidate.bestTimes && typeof candidate.bestTimes === "object"
        ? Object.fromEntries(
            Object.entries(candidate.bestTimes).filter(
              ([, time]) => typeof time === "number" && Number.isFinite(time),
            ),
          )
        : {},
    settings: {
      soundEnabled:
        typeof settings.soundEnabled === "boolean"
          ? settings.soundEnabled
          : DEFAULT_SETTINGS.soundEnabled,
      reducedMotion:
        typeof settings.reducedMotion === "boolean"
          ? settings.reducedMotion
          : DEFAULT_SETTINGS.reducedMotion,
      conflictHintsEnabled:
        typeof settings.conflictHintsEnabled === "boolean"
          ? settings.conflictHintsEnabled
          : DEFAULT_SETTINGS.conflictHintsEnabled,
      strictMode:
        typeof settings.strictMode === "boolean"
          ? settings.strictMode
          : DEFAULT_SETTINGS.strictMode,
    },
  };
}

export function loadProgress(storage: StorageLike | null = getStorage()): PlayerProgress {
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
  } catch {
    // El juego sigue funcionando sin persistencia (modo privado, cuota, etc.).
  }
}

export function isLevelUnlocked(
  progress: PlayerProgress,
  levelIndex: number,
): boolean {
  return levelIndex <= progress.unlockedLevel;
}

export function isLevelCompleted(
  progress: PlayerProgress,
  levelId: string,
): boolean {
  return progress.completedLevels.includes(levelId);
}

/** Aplica una victoria sin tocar el almacenamiento (función pura). */
export function applyLevelCompletion(
  progress: PlayerProgress,
  levelId: string,
  levelIndex: number,
  timeMs: number,
): PlayerProgress {
  const completed = progress.completedLevels.includes(levelId)
    ? progress.completedLevels
    : [...progress.completedLevels, levelId];
  const previousBest = progress.bestTimes[levelId];
  const bestTimes = {
    ...progress.bestTimes,
    [levelId]:
      typeof previousBest === "number"
        ? Math.min(previousBest, timeMs)
        : timeMs,
  };

  return {
    ...progress,
    unlockedLevel: Math.max(progress.unlockedLevel, levelIndex + 1),
    completedLevels: completed,
    bestTimes,
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

export function nextPlayableLevel(
  progress: PlayerProgress,
  levelCount: number,
): number {
  const next = progress.unlockedLevel;
  return Math.min(Math.max(0, next), Math.max(0, levelCount - 1));
}

export function formatTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
