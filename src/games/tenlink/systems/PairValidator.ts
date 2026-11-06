import {
  valueAt,
  type BoardShape,
  type CellPosition,
  type CellValue,
  type PairCheck,
} from "../types/GameTypes.ts";

/** Comprueba la geometría: 8 vecinos directos o continuidad entre filas. */
export function positionsConnected(
  shape: BoardShape,
  a: CellPosition,
  b: CellPosition,
): boolean {
  if (a.row === b.row && a.col === b.col) return false;

  const dr = Math.abs(a.row - b.row);
  const dc = Math.abs(a.col - b.col);
  if (dr <= 1 && dc <= 1) return true;

  // Continuidad de lectura: último de una fila con el primero de la siguiente.
  if (a.row + 1 === b.row && a.col === shape.width - 1 && b.col === 0) {
    return true;
  }
  if (b.row + 1 === a.row && b.col === shape.width - 1 && a.col === 0) {
    return true;
  }

  return false;
}

export function isInside(shape: BoardShape, cell: CellPosition): boolean {
  return (
    cell.row >= 0 &&
    cell.row < shape.height &&
    cell.col >= 0 &&
    cell.col < shape.width
  );
}

export function checkPair(
  shape: BoardShape,
  board: readonly (readonly CellValue[])[],
  a: CellPosition,
  b: CellPosition,
): PairCheck {
  const sum =
    (valueAt(board, a.row, a.col) ?? 0) +
    (valueAt(board, b.row, b.col) ?? 0);

  if (a.row === b.row && a.col === b.col) {
    return { valid: false, reason: "same-cell", sum, connected: false };
  }
  if (!isInside(shape, a) || !isInside(shape, b)) {
    return { valid: false, reason: "out-of-bounds", sum, connected: false };
  }
  const valueA = valueAt(board, a.row, a.col);
  const valueB = valueAt(board, b.row, b.col);
  if (valueA === null || valueB === null) {
    return { valid: false, reason: "empty", sum, connected: false };
  }

  const connected = positionsConnected(shape, a, b);
  if (sum !== 10) {
    return { valid: false, reason: "sum", sum, connected };
  }
  if (!connected) {
    return { valid: false, reason: "not-connected", sum, connected };
  }

  return { valid: true, reason: null, sum, connected };
}

export function isValidPair(
  shape: BoardShape,
  board: readonly (readonly CellValue[])[],
  a: CellPosition,
  b: CellPosition,
): boolean {
  return checkPair(shape, board, a, b).valid;
}

/** Parejas válidas de una casilla concreta, en orden de lectura. */
export function validPartners(
  shape: BoardShape,
  board: readonly (readonly CellValue[])[],
  cell: CellPosition,
): CellPosition[] {
  const value = valueAt(board, cell.row, cell.col);
  if (value === null) return [];

  const partners: CellPosition[] = [];
  for (let row = 0; row < shape.height; row += 1) {
    for (let col = 0; col < shape.width; col += 1) {
      if (row === cell.row && col === cell.col) continue;
      const other = valueAt(board, row, col);
      if (other === null || value + other !== 10) continue;
      if (positionsConnected(shape, cell, { row, col })) {
        partners.push({ row, col });
      }
    }
  }
  return partners;
}

/** Todas las parejas válidas del tablero, sin duplicados. */
export function allValidPairs(
  shape: BoardShape,
  board: readonly (readonly CellValue[])[],
): Array<[CellPosition, CellPosition]> {
  const pairs: Array<[CellPosition, CellPosition]> = [];
  const cells: CellPosition[] = [];

  for (let row = 0; row < shape.height; row += 1) {
    for (let col = 0; col < shape.width; col += 1) {
      if (valueAt(board, row, col) !== null) cells.push({ row, col });
    }
  }

  for (let i = 0; i < cells.length; i += 1) {
    for (let j = i + 1; j < cells.length; j += 1) {
      const a = cells[i]!;
      const b = cells[j]!;
      if (isValidPair(shape, board, a, b)) pairs.push([a, b]);
    }
  }

  return pairs;
}

export function hasValidPair(
  shape: BoardShape,
  board: readonly (readonly CellValue[])[],
): boolean {
  for (let row = 0; row < shape.height; row += 1) {
    for (let col = 0; col < shape.width; col += 1) {
      const cell = { row, col };
      if (validPartners(shape, board, cell).length > 0) return true;
    }
  }
  return false;
}
