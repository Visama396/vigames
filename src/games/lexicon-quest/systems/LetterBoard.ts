import {
  BOARD_CONFIG,
  BOARD_SIZE,
  LETTER_BAG,
  MIN_WORD_LENGTH,
  PLAYABLE_ATTEMPTS,
} from "../config.ts";
import type {
  Board,
  BoardCheck,
  CellIndex,
  PlayableWord,
  SelectionResult,
} from "../types.ts";
import type { Rng } from "./random.ts";
import { shuffled } from "./random.ts";
import type { WordValidator } from "./WordValidator.ts";

const { cols, rows } = BOARD_CONFIG;

export function randomLetter(rng: Rng): string {
  return LETTER_BAG[Math.floor(rng() * LETTER_BAG.length)] as string;
}

export function createEmptyBoard(): Board {
  return Array.from({ length: BOARD_SIZE }, () => "");
}

export function cellToPoint(index: CellIndex): { col: number; row: number } {
  return { col: index % cols, row: Math.floor(index / cols) };
}

export function pointToCell(col: number, row: number): CellIndex {
  return row * cols + col;
}

export function neighborsOf(index: CellIndex): CellIndex[] {
  const { col, row } = cellToPoint(index);
  const result: CellIndex[] = [];
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (dx === 0 && dy === 0) continue;
      const x = col + dx;
      const y = row + dy;
      if (x >= 0 && x < cols && y >= 0 && y < rows) {
        result.push(pointToCell(x, y));
      }
    }
  }
  return result;
}

export function isAdjacent(a: CellIndex, b: CellIndex): boolean {
  if (a === b) return false;
  const pa = cellToPoint(a);
  const pb = cellToPoint(b);
  return Math.abs(pa.col - pb.col) <= 1 && Math.abs(pa.row - pb.row) <= 1;
}

export function wordFromSelection(board: Board, selection: CellIndex[]): string {
  return selection.map((index) => board[index] ?? "").join("");
}

/**
 * Gestiona un clic o toque sobre una casilla.
 * - Si la casilla ya forma parte de la selección, se retrocede hasta ella.
 * - Si es adyacente a la última, se añade.
 * - Si no es adyacente, se empieza una palabra nueva (reinicio opcional).
 */
export function applySelection(
  selection: CellIndex[],
  index: CellIndex,
  restartOnInvalid = true,
): SelectionResult {
  const existing = selection.indexOf(index);
  if (existing !== -1) {
    if (existing === selection.length - 1) {
      return { selection: selection.slice(0, -1), action: "removed" };
    }
    return { selection: selection.slice(0, existing + 1), action: "truncated" };
  }

  if (selection.length === 0) {
    return { selection: [index], action: "added" };
  }

  const last = selection[selection.length - 1] as CellIndex;
  if (isAdjacent(last, index)) {
    return { selection: [...selection, index], action: "added" };
  }

  if (restartOnInvalid) {
    return { selection: [index], action: "restarted" };
  }
  return { selection, action: "invalid" };
}

/** Extiende la selección solo si la casilla es adyacente (para arrastrar). */
export function extendSelection(
  selection: CellIndex[],
  index: CellIndex,
): SelectionResult {
  if (selection.includes(index)) {
    return { selection, action: "invalid" };
  }
  if (selection.length === 0) {
    return { selection: [index], action: "added" };
  }
  const last = selection[selection.length - 1] as CellIndex;
  if (!isAdjacent(last, index)) {
    return { selection, action: "invalid" };
  }
  return { selection: [...selection, index], action: "added" };
}

function randomPath(length: number, rng: Rng): CellIndex[] | null {
  if (length <= 0) return [];
  for (let attempt = 0; attempt < 250; attempt += 1) {
    let current = Math.floor(rng() * BOARD_SIZE);
    const used = new Set<CellIndex>([current]);
    const path: CellIndex[] = [current];

    while (path.length < length) {
      const candidates = neighborsOf(current).filter(
        (next) => !used.has(next),
      );
      if (candidates.length === 0) break;
      current = candidates[Math.floor(rng() * candidates.length)] as CellIndex;
      used.add(current);
      path.push(current);
    }

    if (path.length === length) return path;
  }
  return null;
}

/**
 * Genera un tablero aleatorio con una palabra semilla incrustada. Así el
 * tablero siempre contiene al menos una palabra interesante al empezar.
 */
export function createBoard(validator: WordValidator, rng: Rng): Board {
  const board = Array.from({ length: BOARD_SIZE }, () => randomLetter(rng));
  const seed = validator.getSeedWord(rng);
  if (!seed) return board;

  const path = randomPath(seed.length, rng);
  if (!path) return board;

  for (let i = 0; i < seed.length; i += 1) {
    board[path[i] as CellIndex] = seed[i] as string;
  }
  return board;
}

export interface FindWordOptions {
  minLength?: number;
  maxLength?: number;
  /** Devuelve la primera palabra encontrada en lugar de la más larga. */
  firstOnly?: boolean;
}

/** Busca una palabra válida formada por un camino de casillas adyacentes. */
export function findPlayableWord(
  board: Board,
  validator: WordValidator,
  options: FindWordOptions = {},
): PlayableWord | null {
  const minLength = options.minLength ?? MIN_WORD_LENGTH;
  const maxLength = options.maxLength ?? board.length;
  const firstOnly = options.firstOnly ?? false;

  let best: PlayableWord | null = null;
  const used = new Set<CellIndex>();
  const path: CellIndex[] = [];

  const visit = (index: CellIndex, prefix: string): boolean => {
    const letter = board[index];
    if (!letter) return false;
    const nextPrefix = prefix + letter;
    if (!validator.hasPrefix(nextPrefix)) return false;

    path.push(index);
    used.add(index);

    if (path.length >= minLength && validator.isWord(nextPrefix)) {
      if (!best || path.length > best.path.length) {
        best = { word: nextPrefix, path: path.slice() };
      }
      if (firstOnly) return true;
    }

    if (path.length < maxLength) {
      for (const next of neighborsOf(index)) {
        if (used.has(next)) continue;
        if (visit(next, nextPrefix)) return true;
      }
    }

    path.pop();
    used.delete(index);
    return false;
  };

  for (let index = 0; index < board.length; index += 1) {
    if (visit(index, "")) break;
  }

  return best;
}

/** Repone con letras nuevas las casillas consumidas por un ataque. */
export function refillBoard(
  board: Board,
  used: readonly CellIndex[],
  rng: Rng,
): Board {
  const next = board.slice();
  for (const index of used) {
    next[index] = randomLetter(rng);
  }
  return next;
}

/** Baraja las letras existentes sin cambiar su distribución. */
export function shuffleBoard(board: Board, rng: Rng): Board {
  return shuffled(board, rng);
}

/**
 * Garantiza que el tablero tenga al menos una palabra de `minLength` letras.
 * Primero mezcla las letras; si no lo consigue, genera un tablero nuevo con
 * una palabra semilla. Nunca bloquea la partida.
 */
export function ensurePlayableBoard(
  board: Board,
  validator: WordValidator,
  rng: Rng,
  minLength = 3,
  attempts = PLAYABLE_ATTEMPTS,
): BoardCheck {
  let current = board.slice();
  let changed = false;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const word = findPlayableWord(current, validator, {
      minLength,
      firstOnly: true,
    });
    if (word) {
      return { board: current, changed, regenerated: false, word };
    }
    current = shuffleBoard(current, rng);
    changed = true;
  }

  const regenerated = createBoard(validator, rng);
  return {
    board: regenerated,
    changed: true,
    regenerated: true,
    word: findPlayableWord(regenerated, validator, {
      minLength,
      firstOnly: true,
    }),
  };
}
