import { SAVE_KEY, SAVE_VERSION } from "../config";
import type { GameState } from "../types";
import { createInitialState } from "./game-state";

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function toInteger(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : fallback;
}

/** Reads the local save, falling back to a fresh factory if it is invalid. */
export function loadGameState(
  storage: StorageLike | null = defaultStorage(),
): GameState {
  const base = createInitialState();
  if (!storage) return base;

  try {
    const raw = storage.getItem(SAVE_KEY);
    if (!raw) return base;

    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed) || parsed.version !== SAVE_VERSION) return base;

    const boardCols = toInteger(parsed.boardCols, base.boardCols);
    const boardRows = toInteger(parsed.boardRows, base.boardRows);
    const cells = Array.isArray(parsed.cells) ? parsed.cells : null;

    if (
      boardCols < 2 ||
      boardRows < 2 ||
      !cells ||
      cells.length !== boardRows ||
      !cells.every((row) => Array.isArray(row) && row.length === boardCols)
    ) {
      return base;
    }

    return {
      ...base,
      ...(parsed as Partial<GameState>),
      version: 1,
      credits: toInteger(parsed.credits, base.credits),
      elapsedSeconds:
        typeof parsed.elapsedSeconds === "number" &&
        Number.isFinite(parsed.elapsedSeconds)
          ? Math.max(0, parsed.elapsedSeconds)
          : base.elapsedSeconds,
      machines: Array.isArray(parsed.machines) ? parsed.machines : [],
      connections: Array.isArray(parsed.connections) ? parsed.connections : [],
      inventory: isRecord(parsed.inventory) ? parsed.inventory : {},
      componentsProduced: toInteger(
        parsed.componentsProduced,
        base.componentsProduced,
      ),
      nextMachineId: Math.max(1, toInteger(parsed.nextMachineId, 1)),
      nextConnectionId: Math.max(1, toInteger(parsed.nextConnectionId, 1)),
      boardCols,
      boardRows,
      cells: cells as GameState["cells"],
      pickaxePower: Math.max(
        1,
        toInteger(parsed.pickaxePower, base.pickaxePower),
      ),
      pickaxeLevel: Math.max(
        1,
        toInteger(parsed.pickaxeLevel, base.pickaxeLevel),
      ),
    };
  } catch {
    return base;
  }
}

/** Writes the local save and schedules a cloud sync for signed-in players. */
export function saveGameState(
  state: GameState,
  storage: StorageLike | null = defaultStorage(),
): void {
  if (!storage) return;

  try {
    storage.setItem(SAVE_KEY, JSON.stringify(state));

    if (typeof window !== "undefined" && storage === window.localStorage) {
      void import("../../../lib/game-progress")
        .then(({ queueGameProgress }) =>
          queueGameProgress("undermine", state),
        )
        .catch(() => {
          // Offline: the local save still works.
        });
    }
  } catch {
    // Private mode or quota exceeded: keep playing without persistence.
  }
}
