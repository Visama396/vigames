export type CellValue = number | null;

/** Coordenada `[fila, columna]` usada por las soluciones y las parejas. */
export type Coord = readonly [row: number, col: number];

/** Pareja de coordenadas que suma 10 y está conectada. */
export type PairCoords = readonly [Coord, Coord];

export interface CellPosition {
  row: number;
  col: number;
}

/** Dimensiones de un tablero rectangular. */
export interface BoardShape {
  width: number;
  height: number;
}

export type PairInvalidReason =
  | "same-cell"
  | "empty"
  | "out-of-bounds"
  | "sum"
  | "not-connected";

export interface PairCheck {
  valid: boolean;
  reason: PairInvalidReason | null;
  sum: number;
  connected: boolean;
}

export interface PlayerSettings {
  soundEnabled: boolean;
  reducedMotion: boolean;
}

/** Progreso del modo infinito: solo importa la mejor partida. */
export interface PlayerProgress {
  /** Mayor número de parejas eliminadas en una sola partida. */
  bestPairs: number;
  /** Tiempo de la partida que logró `bestPairs`, en milisegundos. */
  bestTimeMs: number | null;
  /** Número total de partidas jugadas (incluye las abandonadas). */
  runs: number;
  settings: PlayerSettings;
}

export interface ValidationResult {
  ok: boolean;
  issues: string[];
}

export function valueAt(
  board: readonly (readonly CellValue[])[],
  row: number,
  col: number,
): CellValue {
  return board[row]?.[col] ?? null;
}

export function samePosition(a: CellPosition, b: CellPosition): boolean {
  return a.row === b.row && a.col === b.col;
}

export function cellKey(row: number, col: number): string {
  return `${row},${col}`;
}

export function positionOf(coord: Coord): CellPosition {
  return { row: coord[0], col: coord[1] };
}

export function coordOf(position: CellPosition): Coord {
  return [position.row, position.col];
}
