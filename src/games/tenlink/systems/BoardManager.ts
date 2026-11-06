import { isValidPair } from "./PairValidator.ts";
import {
  valueAt,
  type BoardShape,
  type CellPosition,
  type CellValue,
  type PairCoords,
} from "../types/GameTypes.ts";

export interface CollapseResult {
  board: CellValue[][];
  /** Índices (en el tablero anterior) de las filas completamente vacías. */
  removedRows: number[];
}

export function cloneBoard(
  board: readonly (readonly CellValue[])[],
): CellValue[][] {
  return board.map((row) => [...row]);
}

export function remainingCells(
  board: readonly (readonly CellValue[])[],
): number {
  let total = 0;
  for (const row of board) {
    for (const value of row) {
      if (value !== null) total += 1;
    }
  }
  return total;
}

export function isCleared(board: readonly (readonly CellValue[])[]): boolean {
  return remainingCells(board) === 0;
}

export function occupiedCells(
  board: readonly (readonly CellValue[])[],
): CellPosition[] {
  const cells: CellPosition[] = [];
  for (let row = 0; row < board.length; row += 1) {
    const line = board[row];
    if (!line) continue;
    for (let col = 0; col < line.length; col += 1) {
      if (line[col] !== null) cells.push({ row, col });
    }
  }
  return cells;
}

export function emptyCells(
  board: readonly (readonly CellValue[])[],
): CellPosition[] {
  const cells: CellPosition[] = [];
  for (let row = 0; row < board.length; row += 1) {
    const line = board[row];
    if (!line) continue;
    for (let col = 0; col < line.length; col += 1) {
      if (line[col] === null) cells.push({ row, col });
    }
  }
  return cells;
}

/** Elimina una pareja sin compactar las filas. */
export function removePair(
  shape: BoardShape,
  board: readonly (readonly CellValue[])[],
  a: CellPosition,
  b: CellPosition,
): CellValue[][] | null {
  if (!isValidPair(shape, board, a, b)) return null;
  if (valueAt(board, a.row, a.col) === null) return null;
  if (valueAt(board, b.row, b.col) === null) return null;

  const next = cloneBoard(board);
  next[a.row]![a.col] = null;
  next[b.row]![b.col] = null;
  return next;
}

/**
 * Elimina las filas completamente vacías y las coloca al final. Las filas que
 * conservan algún número mantienen su contenido y su orden relativo, de modo
 * que las filas inferiores suben y pueden quedar conectadas con las superiores.
 */
export function collapseRows(
  board: readonly (readonly CellValue[])[],
): CollapseResult {
  const height = board.length;
  const width = board[0]?.length ?? 0;
  const removedRows: number[] = [];
  const kept: CellValue[][] = [];

  let lastOccupied = -1;
  for (let row = 0; row < height; row += 1) {
    const line = board[row] ?? [];
    if (line.some((value) => value !== null)) lastOccupied = row;
  }

  for (let row = 0; row <= lastOccupied; row += 1) {
    const line = board[row] ?? [];
    if (line.every((value) => value === null)) {
      removedRows.push(row);
    } else {
      kept.push([...line]);
    }
  }

  while (kept.length < height) {
    kept.push(new Array<CellValue>(width).fill(null));
  }

  return { board: kept, removedRows };
}

/** Aplica una pareja válida, elimina la pareja y compacta las filas vacías. */
export function applyPair(
  shape: BoardShape,
  board: readonly (readonly CellValue[])[],
  a: CellPosition,
  b: CellPosition,
): CellValue[][] | null {
  const removed = removePair(shape, board, a, b);
  if (!removed) return null;
  return collapseRows(removed).board;
}

export function applyCoords(
  shape: BoardShape,
  board: readonly (readonly CellValue[])[],
  pair: PairCoords,
): CellValue[][] | null {
  return applyPair(
    shape,
    board,
    { row: pair[0][0], col: pair[0][1] },
    { row: pair[1][0], col: pair[1][1] },
  );
}
