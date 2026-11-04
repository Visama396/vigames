/**
 * Paquete de niveles de PURRGRID.
 *
 * Los niveles se generaron con `PuzzleGenerator` y se validaron para tener una
 * solución única. Se guardan como datos estáticos para que el MVP no dependa de
 * generar puzles en el navegador. Para rehacer el paquete, usa el generador y
 * vuelve a validar cada nivel con `validateLevel(level, { requireUnique: true })`.
 */
import { createPuzzleLevel, type PuzzleLevel } from "../types/puzzle.ts";

export const LEVELS: PuzzleLevel[] = [
  createPuzzleLevel({
    id: "purrgrid-01",
    name: "Primeras huellas",
    size: 4,
    difficulty: "tutorial",
    seed: 4101,
    regions: [
      [0, 0, 0, 2],
      [1, 1, 0, 2],
      [3, 1, 1, 2],
      [3, 3, 3, 2],
    ],
    solutionColumns: [2, 0, 3, 1],
  }),
  createPuzzleLevel({
    id: "purrgrid-02",
    name: "Siestas de sol",
    size: 5,
    difficulty: "easy",
    seed: 5101,
    regions: [
      [2, 0, 0, 0, 1],
      [2, 2, 0, 1, 1],
      [2, 2, 0, 1, 3],
      [4, 2, 0, 1, 3],
      [4, 4, 4, 3, 3],
    ],
    solutionColumns: [1, 3, 0, 4, 2],
  }),
  createPuzzleLevel({
    id: "purrgrid-03",
    name: "Cajas de cartón",
    size: 5,
    difficulty: "easy",
    seed: 5102,
    regions: [
      [0, 0, 0, 1, 1],
      [0, 3, 0, 0, 1],
      [3, 3, 2, 1, 1],
      [3, 3, 2, 2, 4],
      [3, 2, 2, 4, 4],
    ],
    solutionColumns: [1, 4, 2, 0, 3],
  }),
  createPuzzleLevel({
    id: "purrgrid-04",
    name: "Tejados al anochecer",
    size: 5,
    difficulty: "normal",
    seed: 5103,
    regions: [
      [0, 0, 0, 0, 1],
      [0, 3, 2, 2, 1],
      [3, 3, 2, 1, 1],
      [3, 2, 2, 1, 4],
      [3, 4, 4, 4, 4],
    ],
    solutionColumns: [1, 4, 2, 0, 3],
  }),
  createPuzzleLevel({
    id: "purrgrid-05",
    name: "El rincón de las plantas",
    size: 5,
    difficulty: "normal",
    seed: 5104,
    regions: [
      [0, 0, 1, 1, 1],
      [3, 0, 0, 0, 1],
      [3, 3, 2, 4, 4],
      [3, 2, 2, 2, 4],
      [2, 2, 4, 4, 4],
    ],
    solutionColumns: [1, 4, 2, 0, 3],
  }),
  createPuzzleLevel({
    id: "purrgrid-06",
    name: "Callejón de las sardinas",
    size: 6,
    difficulty: "normal",
    seed: 6101,
    regions: [
      [0, 2, 2, 2, 1, 1],
      [0, 2, 1, 1, 1, 1],
      [2, 2, 4, 4, 4, 3],
      [2, 4, 4, 3, 3, 3],
      [5, 4, 4, 5, 3, 3],
      [5, 5, 5, 5, 5, 3],
    ],
    solutionColumns: [0, 3, 1, 5, 2, 4],
  }),
  createPuzzleLevel({
    id: "purrgrid-07",
    name: "La biblioteca del gato",
    size: 6,
    difficulty: "hard",
    seed: 6102,
    regions: [
      [5, 0, 0, 0, 1, 1],
      [5, 3, 3, 0, 0, 1],
      [5, 3, 2, 2, 0, 1],
      [5, 3, 3, 2, 2, 4],
      [5, 3, 3, 2, 4, 4],
      [5, 5, 5, 2, 2, 4],
    ],
    solutionColumns: [2, 5, 3, 1, 4, 0],
  }),
  createPuzzleLevel({
    id: "purrgrid-08",
    name: "Luna sobre el tejado",
    size: 7,
    difficulty: "hard",
    seed: 7101,
    regions: [
      [1, 1, 1, 1, 0, 0, 0],
      [1, 1, 3, 0, 0, 2, 2],
      [4, 3, 3, 0, 0, 0, 2],
      [4, 4, 3, 3, 0, 2, 2],
      [4, 4, 4, 3, 6, 2, 2],
      [5, 5, 5, 5, 6, 2, 2],
      [5, 6, 6, 6, 6, 2, 2],
    ],
    solutionColumns: [5, 1, 6, 3, 0, 2, 4],
  }),
  createPuzzleLevel({
    id: "purrgrid-09",
    name: "Jardín de lavanda",
    size: 7,
    difficulty: "expert",
    seed: 7102,
    regions: [
      [0, 0, 0, 0, 0, 0, 1],
      [3, 2, 2, 2, 0, 1, 1],
      [3, 4, 4, 2, 0, 0, 1],
      [3, 4, 4, 4, 4, 1, 1],
      [3, 5, 5, 5, 4, 4, 1],
      [3, 3, 5, 5, 5, 4, 6],
      [3, 3, 3, 5, 5, 5, 6],
    ],
    solutionColumns: [1, 5, 3, 0, 4, 2, 6],
  }),
  createPuzzleLevel({
    id: "purrgrid-10",
    name: "El gran ronroneo",
    size: 8,
    difficulty: "expert",
    seed: 8101,
    regions: [
      [1, 1, 1, 1, 2, 0, 0, 0],
      [1, 4, 4, 4, 2, 3, 3, 0],
      [1, 4, 7, 4, 2, 2, 3, 3],
      [1, 4, 7, 4, 2, 2, 2, 3],
      [5, 4, 7, 4, 4, 7, 6, 6],
      [5, 5, 7, 4, 7, 7, 6, 6],
      [5, 5, 7, 7, 7, 7, 6, 6],
      [5, 5, 7, 6, 6, 6, 6, 6],
    ],
    solutionColumns: [5, 0, 4, 7, 3, 1, 6, 2],
  }),
];

export const LEVEL_COUNT = LEVELS.length;

export function getLevel(index: number): PuzzleLevel {
  const safeIndex = Math.max(0, Math.min(LEVELS.length - 1, Math.floor(index)));
  return LEVELS[safeIndex] ?? LEVELS[0]!;
}

export function getLevelById(id: string): PuzzleLevel | null {
  return LEVELS.find((level) => level.id === id) ?? null;
}

export function getLevelIndex(id: string): number {
  return LEVELS.findIndex((level) => level.id === id);
}
