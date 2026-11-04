/** Identificador de una celda: `row * size + col`. */
export type CellId = number;

/** Identificador de una región (0..size-1). */
export type RegionId = number;

export type Difficulty = "tutorial" | "easy" | "normal" | "hard" | "expert";

export interface Cell {
  row: number;
  col: number;
  regionId: RegionId;
}

/**
 * Nivel de PURRGRID.
 *
 * `cells` describe la cuadrícula y sus regiones. `solution` es una solución
 * conocida (una celda por fila, en orden de fila). En el MVP local se incluye
 * para poder validar los niveles y mostrar pistas en el futuro.
 */
export interface PuzzleLevel {
  id: string;
  name: string;
  size: number;
  cells: Cell[][];
  solution: CellId[];
  difficulty: Difficulty;
  seed?: number;
}

export type ConflictKind = "row" | "column" | "region" | "adjacent";

export interface ConflictReport {
  /** Celdas implicadas en al menos un conflicto, con los motivos. */
  cells: Map<CellId, ConflictKind[]>;
  hasConflicts: boolean;
  rowConflicts: number[];
  columnConflicts: number[];
  regionConflicts: RegionId[];
  adjacentPairs: Array<[CellId, CellId]>;
}

export interface PlacementResult {
  allowed: boolean;
  reasons: ConflictKind[];
}

export interface SolveResult {
  /** Número de soluciones encontradas, limitado por `maxSolutions`. */
  count: number;
  solutions: CellId[][];
  /** Nodos explorados por el backtracking (útil para medir dificultad). */
  nodes: number;
}

export interface ValidationResult {
  ok: boolean;
  issues: string[];
}

export interface PlayerSettings {
  soundEnabled: boolean;
  reducedMotion: boolean;
  conflictHintsEnabled: boolean;
  strictMode: boolean;
}

export interface PlayerProgress {
  /** Índice del nivel más alto desbloqueado (0-based). */
  unlockedLevel: number;
  completedLevels: string[];
  bestTimes: Record<string, number>;
  settings: PlayerSettings;
}

export interface LevelStats {
  timeMs: number;
  moves: number;
  undos: number;
  resets: number;
}

export interface GeneratorOptions {
  size: number;
  id?: string;
  name?: string;
  difficulty?: Difficulty;
  seed?: number;
  /** Intentos máximos antes de rendirse. */
  attempts?: number;
}

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  tutorial: "Tutorial",
  easy: "Fácil",
  normal: "Normal",
  hard: "Difícil",
  expert: "Experto",
};

export const DIFFICULTY_ORDER: Difficulty[] = [
  "tutorial",
  "easy",
  "normal",
  "hard",
  "expert",
];

export function cellId(size: number, row: number, col: number): CellId {
  return row * size + col;
}

export function rowOf(size: number, id: CellId): number {
  return Math.floor(id / size);
}

export function colOf(size: number, id: CellId): number {
  return id % size;
}

/** Distancia de Chebyshev: 1 significa que las celdas se tocan (incl. diagonal). */
export function chebyshevDistance(
  size: number,
  a: CellId,
  b: CellId,
): number {
  return Math.max(
    Math.abs(rowOf(size, a) - rowOf(size, b)),
    Math.abs(colOf(size, a) - colOf(size, b)),
  );
}

export function isTouching(size: number, a: CellId, b: CellId): boolean {
  return a !== b && chebyshevDistance(size, a, b) === 1;
}

/**
 * Construye un nivel a partir de una matriz de regiones y las columnas de la
 * solución (una por fila). Es la forma cómoda de escribir niveles a mano.
 */
export function createPuzzleLevel(params: {
  id: string;
  name: string;
  size: number;
  regions: RegionId[][];
  solutionColumns: number[];
  difficulty: Difficulty;
  seed?: number;
}): PuzzleLevel {
  const { id, name, size, regions, solutionColumns, difficulty, seed } = params;
  const cells: Cell[][] = [];
  for (let row = 0; row < size; row += 1) {
    const line: Cell[] = [];
    for (let col = 0; col < size; col += 1) {
      line.push({ row, col, regionId: regions[row]?.[col] ?? 0 });
    }
    cells.push(line);
  }

  const solution = solutionColumns.map((col, row) => cellId(size, row, col));

  return {
    id,
    name,
    size,
    cells,
    solution,
    difficulty,
    ...(seed === undefined ? {} : { seed }),
  };
}
