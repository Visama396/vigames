import { SAVE_KEY, STAR_MARGIN } from "../config.ts";
import type {
  PlayerProgress,
  PlayerSettings,
  StarCount,
} from "../types/GameTypes.ts";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const DEFAULT_SETTINGS: PlayerSettings = {
  soundEnabled: true,
  reducedMotion: prefersReducedMotion(),
  showSymbols: true,
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
    unlockedLevel: 0,
    completedLevels: [],
    bestMoveCounts: {},
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
    bestMoveCounts:
      candidate.bestMoveCounts && typeof candidate.bestMoveCounts === "object"
        ? Object.fromEntries(
            Object.entries(candidate.bestMoveCounts).filter(
              ([, moves]) =>
                typeof moves === "number" && Number.isFinite(moves),
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
      showSymbols:
        typeof settings.showSymbols === "boolean"
          ? settings.showSymbols
          : DEFAULT_SETTINGS.showSymbols,
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

    // La nube es opcional; el import dinámico mantiene el módulo puro.
    if (typeof window !== "undefined" && storage === window.localStorage) {
      void import("../../../lib/game-progress")
        .then(({ queueGameProgress }) =>
          queueGameProgress("exit-jam", progress),
        )
        .catch(() => {
          // Sin conexión el guardado local sigue funcionando.
        });
    }
  } catch {
    // El juego sigue funcionando sin persistencia.
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

export function applyLevelCompletion(
  progress: PlayerProgress,
  levelId: string,
  levelIndex: number,
  moves: number,
): PlayerProgress {
  const completed = progress.completedLevels.includes(levelId)
    ? progress.completedLevels
    : [...progress.completedLevels, levelId];
  const previousBest = progress.bestMoveCounts[levelId];
  const bestMoveCounts = {
    ...progress.bestMoveCounts,
    [levelId]:
      typeof previousBest === "number"
        ? Math.min(previousBest, moves)
        : moves,
  };

  return {
    ...progress,
    unlockedLevel: Math.max(progress.unlockedLevel, levelIndex + 1),
    completedLevels: completed,
    bestMoveCounts,
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
  return Math.min(
    Math.max(0, progress.unlockedLevel),
    Math.max(0, levelCount - 1),
  );
}

export function getStars(moves: number, targetMoves: number): StarCount {
  if (moves <= targetMoves) return 3;
  if (moves <= targetMoves + STAR_MARGIN) return 2;
  return 1;
}

export function starString(stars: number, max = 3): string {
  const filled = Math.max(0, Math.min(max, stars));
  return "★".repeat(filled) + "☆".repeat(max - filled);
}

export function formatMoves(moves: number): string {
  return `${moves} ${moves === 1 ? "movimiento" : "movimientos"}`;
}
