export type Direction = "up" | "down" | "left" | "right";

export type ColorId = "coral" | "sky" | "mint" | "amber" | "violet" | "rose";

export type Difficulty = "tutorial" | "easy" | "normal" | "hard" | "expert";

export interface Cell {
  x: number;
  y: number;
}

/** Forma y color de un bloque. `cells` son coordenadas relativas a `x`, `y`. */
export interface BlockDefinition {
  id: string;
  color: ColorId;
  x: number;
  y: number;
  cells: Cell[];
}

export interface DoorDefinition {
  id: string;
  color: ColorId;
  side: Direction;
  /** Fila (para left/right) o columna (para up/down) donde empieza la puerta. */
  start: number;
  length: number;
}

export interface BlockState {
  id: string;
  x: number;
  y: number;
}

export interface Move {
  blockId: string;
  dx: number;
  dy: number;
  /** `true` cuando el movimiento consiste en sacar el bloque. */
  exit?: boolean;
}

export interface LevelDefinition {
  id: string;
  name: string;
  width: number;
  height: number;
  difficulty: Difficulty;
  /** Movimientos de celda con los que se consiguen las tres estrellas. */
  targetMoves: number;
  blocks: BlockDefinition[];
  doors: DoorDefinition[];
  /** Ruta conocida para validar el nivel y ofrecer pistas. */
  solution?: Move[];
}

export type StarCount = 1 | 2 | 3;

export interface PlayerSettings {
  soundEnabled: boolean;
  reducedMotion: boolean;
  showSymbols: boolean;
}

export interface PlayerProgress {
  unlockedLevel: number;
  completedLevels: string[];
  bestMoveCounts: Record<string, number>;
  settings: PlayerSettings;
}

export interface SolveResult {
  solved: boolean;
  moves: Move[] | null;
  nodes: number;
  exhausted: boolean;
}

export interface ValidationResult {
  ok: boolean;
  issues: string[];
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

export const DIRECTIONS: Array<{ direction: Direction; dx: number; dy: number }> = [
  { direction: "up", dx: 0, dy: -1 },
  { direction: "down", dx: 0, dy: 1 },
  { direction: "left", dx: -1, dy: 0 },
  { direction: "right", dx: 1, dy: 0 },
];

export function directionFor(dx: number, dy: number): Direction {
  if (dx < 0) return "left";
  if (dx > 0) return "right";
  if (dy < 0) return "up";
  return "down";
}

export function oppositeDirection(side: Direction): Direction {
  switch (side) {
    case "left":
      return "right";
    case "right":
      return "left";
    case "up":
      return "down";
    case "down":
      return "up";
  }
}
