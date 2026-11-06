import {
  LEVEL_COUNT as CHROMA_LEVEL_COUNT,
  LEVELS as CHROMA_LEVELS,
} from "../games/chroma/data/levels.ts";
import {
  LEVEL_COUNT as EXIT_JAM_LEVEL_COUNT,
  LEVELS as EXIT_JAM_LEVELS,
} from "../games/exit-jam/data/levels.ts";
import { ENEMY_ORDER } from "../games/lexicon-quest/data/enemies.ts";
import { LEVEL_COUNT as PURRGRID_LEVEL_COUNT } from "../games/purrgrid/data/levels.ts";

export interface GameScore {
  /** Always "higher is better" so the database can rank all games the same way. */
  score: number;
  /** Human-readable breakdown shown on the leaderboard. */
  detail: Record<string, unknown>;
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function toFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function sumNumericRecord(value: unknown): number {
  if (!isRecord(value)) return 0;
  let total = 0;
  for (const item of Object.values(value)) {
    const number = toFiniteNumber(item);
    if (number !== null && number >= 0) total += number;
  }
  return total;
}

function countStrings(value: unknown): number {
  return Array.isArray(value)
    ? value.filter((item) => typeof item === "string").length
    : 0;
}

function progressOf(progress: unknown): UnknownRecord {
  return isRecord(progress) ? progress : {};
}

function purrgridScore(progress: unknown): GameScore | null {
  const data = progressOf(progress);
  const completed = countStrings(data.completedLevels);
  const totalMs = sumNumericRecord(data.bestTimes);

  if (completed === 0) return null;

  return {
    // Completion count is the primary key; lower total time breaks ties.
    score: completed * 1_000_000_000_000 - totalMs,
    detail: {
      completed,
      levelCount: PURRGRID_LEVEL_COUNT,
      totalMs,
    },
  };
}

function chromaScore(progress: unknown): GameScore | null {
  const data = progressOf(progress);
  const completed = countStrings(data.completedLevels);
  const totalMoves = sumNumericRecord(data.bestMoveCounts);

  if (completed === 0) return null;

  const completedIds = new Set(
    Array.isArray(data.completedLevels)
      ? data.completedLevels.filter(
          (item): item is string => typeof item === "string",
        )
      : [],
  );
  const bestMoveCounts = isRecord(data.bestMoveCounts)
    ? data.bestMoveCounts
    : {};
  const optimalSolutions = CHROMA_LEVELS.reduce((total, level) => {
    if (!completedIds.has(level.id)) return total;
    const best = toFiniteNumber(bestMoveCounts[level.id]);
    return total + (best !== null && best === level.parMoves ? 1 : 0);
  }, 0);

  return {
    // Completed levels dominate, then optimal solutions, then fewer moves.
    score:
      completed * 1_000_000_000_000 +
      optimalSolutions * 1_000_000_000 -
      Math.min(totalMoves, 999_999_999),
    detail: {
      completed,
      levelCount: CHROMA_LEVEL_COUNT,
      optimalSolutions,
      totalMoves,
    },
  };
}

function exitJamScore(progress: unknown): GameScore | null {
  const data = progressOf(progress);
  const completed = countStrings(data.completedLevels);
  const totalMoves = sumNumericRecord(data.bestMoveCounts);

  if (completed === 0) return null;

  const completedIds = new Set(
    Array.isArray(data.completedLevels)
      ? data.completedLevels.filter(
          (item): item is string => typeof item === "string",
        )
      : [],
  );
  const bestMoveCounts = isRecord(data.bestMoveCounts)
    ? data.bestMoveCounts
    : {};
  const perfectLevels = EXIT_JAM_LEVELS.reduce((total, level) => {
    if (!completedIds.has(level.id)) return total;
    const best = toFiniteNumber(bestMoveCounts[level.id]);
    return total + (best !== null && best <= level.targetMoves ? 1 : 0);
  }, 0);

  return {
    // Niveles completados, luego objetivos de tres estrellas y menos movimientos.
    score:
      completed * 1_000_000_000_000 +
      perfectLevels * 1_000_000_000 -
      Math.min(totalMoves, 999_999_999),
    detail: {
      completed,
      levelCount: EXIT_JAM_LEVEL_COUNT,
      perfectLevels,
      totalMoves,
    },
  };
}

function tenlinkScore(progress: unknown): GameScore | null {
  const data = progressOf(progress);
  const bestPairs = Math.max(
    0,
    Math.floor(toFiniteNumber(data.bestPairs) ?? 0),
  );
  if (bestPairs === 0) return null;

  const bestTimeRaw = toFiniteNumber(data.bestTimeMs);
  const bestTimeMs =
    bestTimeRaw === null ? null : Math.max(0, Math.floor(bestTimeRaw));
  const runs = Math.max(0, Math.floor(toFiniteNumber(data.runs) ?? 0));
  const timePenalty =
    bestTimeMs === null ? 0 : Math.min(999_999_999, bestTimeMs);

  return {
    // Más parejas siempre gana; a igualdad, una partida más rápida puntúa más.
    score: bestPairs * 1_000_000_000 - timePenalty,
    detail: {
      bestPairs,
      bestTimeMs,
      runs,
    },
  };
}

function undermineScore(progress: unknown): GameScore | null {
  const data = progressOf(progress);
  const components = toFiniteNumber(data.componentsProduced) ?? 0;
  const credits = toFiniteNumber(data.credits) ?? 0;
  const elapsedSeconds = toFiniteNumber(data.elapsedSeconds) ?? 0;
  const pickaxeLevel = toFiniteNumber(data.pickaxeLevel) ?? 1;
  const boardCols = toFiniteNumber(data.boardCols) ?? 2;
  const boardRows = toFiniteNumber(data.boardRows) ?? 2;

  if (components === 0 && credits === 0 && elapsedSeconds === 0) return null;

  return {
    // Components first, then liquid credits and tooling.
    score:
      Math.max(0, Math.floor(components)) * 1_000_000_000 +
      Math.min(999_999_999, Math.max(0, Math.floor(credits))) * 1_000 +
      Math.max(0, Math.floor(pickaxeLevel)),
    detail: {
      components: Math.max(0, Math.floor(components)),
      credits: Math.max(0, Math.floor(credits)),
      elapsedSeconds: Math.max(0, Math.floor(elapsedSeconds)),
      pickaxeLevel: Math.max(1, Math.floor(pickaxeLevel)),
      board: `${Math.max(2, Math.floor(boardCols))}x${Math.max(2, Math.floor(boardRows))}`,
    },
  };
}

function lexiconScore(progress: unknown): GameScore | null {
  const data = progressOf(progress);
  const runs = toFiniteNumber(data.runs) ?? 0;
  const victories = toFiniteNumber(data.victories) ?? 0;
  const bestEnemiesDefeated =
    toFiniteNumber(data.bestEnemiesDefeated) ?? 0;
  const bestWord =
    typeof data.bestWord === "string" ? data.bestWord : "";
  const bestWordLength = toFiniteNumber(data.bestWordLength) ?? 0;
  const totalDamage = toFiniteNumber(data.totalDamage) ?? 0;

  if (runs === 0 && bestEnemiesDefeated === 0) return null;

  return {
    score:
      Math.max(0, Math.floor(victories)) * 1_000_000_000_000 +
      Math.max(0, Math.floor(bestEnemiesDefeated)) * 1_000_000_000 +
      Math.max(0, Math.floor(bestWordLength)) * 1_000_000 +
      Math.min(999_999, Math.max(0, Math.floor(totalDamage))),
    detail: {
      runs: Math.max(0, Math.floor(runs)),
      victories: Math.max(0, Math.floor(victories)),
      bestEnemiesDefeated: Math.max(0, Math.floor(bestEnemiesDefeated)),
      bestWord,
      bestWordLength: Math.max(0, Math.floor(bestWordLength)),
      totalDamage: Math.max(0, Math.floor(totalDamage)),
      enemyCount: ENEMY_ORDER.length,
    },
  };
}

export function computeGameScore(
  gameSlug: string,
  progress: unknown,
): GameScore | null {
  switch (gameSlug) {
    case "purrgrid":
      return purrgridScore(progress);
    case "chroma":
      return chromaScore(progress);
    case "exit-jam":
      return exitJamScore(progress);
    case "tenlink":
      return tenlinkScore(progress);
    case "undermine":
      return undermineScore(progress);
    case "lexicon-quest":
      return lexiconScore(progress);
    default:
      return null;
  }
}

function formatDurationMs(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function detailNumber(
  detail: UnknownRecord,
  key: string,
  fallback = 0,
): number {
  return toFiniteNumber(detail[key]) ?? fallback;
}

export function formatScoreDetail(
  gameSlug: string,
  detailValue: unknown,
  fallbackScore = 0,
): string {
  const detail = isRecord(detailValue) ? detailValue : {};

  switch (gameSlug) {
    case "purrgrid": {
      const completed = detailNumber(detail, "completed");
      const levelCount = detailNumber(
        detail,
        "levelCount",
        PURRGRID_LEVEL_COUNT,
      );
      const totalMs = detailNumber(detail, "totalMs");
      return `${completed}/${levelCount} niveles · ${formatDurationMs(totalMs)}`;
    }
    case "chroma": {
      const completed = detailNumber(detail, "completed");
      const levelCount = detailNumber(
        detail,
        "levelCount",
        CHROMA_LEVEL_COUNT,
      );
      const optimalSolutions = detailNumber(detail, "optimalSolutions");
      const totalMoves = detailNumber(detail, "totalMoves");
      return `${completed}/${levelCount} niveles · ${optimalSolutions} óptimas · ${totalMoves} mov.`;
    }
    case "exit-jam": {
      const completed = detailNumber(detail, "completed");
      const levelCount = detailNumber(
        detail,
        "levelCount",
        EXIT_JAM_LEVEL_COUNT,
      );
      const perfectLevels = detailNumber(detail, "perfectLevels");
      const totalMoves = detailNumber(detail, "totalMoves");
      return `${completed}/${levelCount} niveles · ${perfectLevels} perfectos · ${totalMoves} mov.`;
    }
    case "tenlink": {
      const bestPairs = detailNumber(detail, "bestPairs");
      const bestTimeMs = detailNumber(detail, "bestTimeMs");
      const runs = detailNumber(detail, "runs");
      return `${bestPairs} parejas · ${
        bestTimeMs > 0 ? formatDurationMs(bestTimeMs) : "—"
      } · ${runs} ${runs === 1 ? "partida" : "partidas"}`;
    }
    case "undermine": {
      const components = detailNumber(detail, "components");
      const credits = detailNumber(detail, "credits");
      const elapsedSeconds = detailNumber(detail, "elapsedSeconds");
      return `${components} componentes · €${credits} · ${formatDurationMs(elapsedSeconds * 1000)}`;
    }
    case "lexicon-quest": {
      const victories = detailNumber(detail, "victories");
      const enemies = detailNumber(detail, "bestEnemiesDefeated");
      const bestWord =
        typeof detail.bestWord === "string" && detail.bestWord
          ? ` · «${detail.bestWord}»`
          : "";
      return `${victories} victorias · ${enemies} enemigos${bestWord}`;
    }
    default:
      return fallbackScore > 0 ? `${fallbackScore} puntos` : "Sin datos";
  }
}
