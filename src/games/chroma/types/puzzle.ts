/** Identificador de un color de líquido. */
export type ColorId = string;

export type Difficulty = "tutorial" | "easy" | "normal" | "hard" | "expert";

/** Botella con segmentos ordenados de fondo a superficie. */
export interface BottleState {
  capacity: number;
  segments: ColorId[];
}

export interface PourMove {
  from: number;
  to: number;
  count: number;
}

export interface PuzzleLevel {
  id: string;
  name: string;
  capacity: number;
  bottles: BottleState[];
  colorCount: number;
  emptyBottleCount: number;
  difficulty: Difficulty;
  seed?: number;
  /**
   * Ruta conocida de vuelta a la solución. Se incluye en los niveles locales
   * para validar que el puzle es resoluble sin ejecutar un solucionador pesado.
   */
  solution?: PourMove[];
}

export type InvalidMoveReason =
  | "invalid-index"
  | "same-bottle"
  | "empty-source"
  | "full-destination"
  | "color-mismatch"
  | "no-space";

export interface MoveResult {
  valid: boolean;
  reason?: InvalidMoveReason;
  from: number;
  to: number;
  count: number;
}

export interface ValidationResult {
  ok: boolean;
  issues: string[];
}

export interface SolveOptions {
  maxNodes?: number;
  maxDepth?: number;
}

export interface SolverResult {
  solved: boolean;
  /** Ruta de movimientos si se encontró solución. */
  moves: PourMove[] | null;
  nodes: number;
  /** true si se agotó el presupuesto de búsqueda sin demostrar nada. */
  exhausted: boolean;
}

export interface PlayerSettings {
  soundEnabled: boolean;
  reducedMotion: boolean;
  colorPatternsEnabled: boolean;
}

export interface PlayerProgress {
  unlockedLevel: number;
  completedLevels: string[];
  bestMoveCounts: Record<string, number>;
  settings: PlayerSettings;
}

export interface GeneratorOptions {
  colorCount: number;
  emptyBottleCount?: number;
  capacity?: number;
  id?: string;
  name?: string;
  difficulty?: Difficulty;
  seed?: number;
  scrambleMoves?: number;
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

export function createBottle(capacity: number, segments: ColorId[] = []): BottleState {
  return { capacity, segments: [...segments] };
}
