import { COLOR_ORDER } from "../data/colors.ts";
import type {
  BottleState,
  ColorId,
  GeneratorOptions,
  PuzzleLevel,
} from "../types/puzzle.ts";
import { isSolved } from "./MoveValidator.ts";
import { validateLevel } from "./PuzzleValidator.ts";
import { solveOptimal } from "./PuzzleSolver.ts";
import { createRng, shuffle, type Rng } from "./random.ts";

const DEFAULT_NAMES = [
  "Primeras gotas",
  "Mezcla suave",
  "Colores en calma",
  "El matraz inquieto",
  "Destilación",
  "Alquimia",
  "Cristal líquido",
  "Elixir",
];

function buildBottles(
  colors: readonly ColorId[],
  capacity: number,
  emptyBottleCount: number,
  rng: Rng,
): BottleState[] {
  const segments: ColorId[] = [];
  for (const color of colors) {
    for (let unit = 0; unit < capacity; unit += 1) {
      segments.push(color);
    }
  }

  const shuffled = shuffle(segments, rng);
  const bottles: BottleState[] = [];
  for (let index = 0; index < colors.length; index += 1) {
    bottles.push({
      capacity,
      segments: shuffled.slice(index * capacity, (index + 1) * capacity),
    });
  }
  for (let index = 0; index < emptyBottleCount; index += 1) {
    bottles.push({ capacity, segments: [] });
  }
  return bottles;
}

function mixedBottleCount(bottles: readonly BottleState[]): number {
  return bottles.filter(
    (bottle) =>
      bottle.segments.length > 0 &&
      new Set(bottle.segments).size > 1,
  ).length;
}

/**
 * Genera un nivel mezclando los segmentos y validándolo con un solucionador.
 *
 * No se parte de un estado resuelto porque, con la regla de verter siempre el
 * máximo posible, una botella llena de un color solo puede volcarse entera en
 * una botella vacía: nunca se crearían mezclas. El solucionador demuestra que
 * la configuración aleatoria tiene salida.
 */
export function generateLevel(options: GeneratorOptions): PuzzleLevel {
  const {
    colorCount,
    emptyBottleCount = 2,
    capacity = 4,
    id = `chroma-${colorCount}-${options.seed ?? 1}`,
    name = DEFAULT_NAMES[Math.min(colorCount - 2, DEFAULT_NAMES.length - 1)] ??
      "CHROMA",
    difficulty = "normal",
    seed = 1,
    attempts = 80,
  } = options;

  if (colorCount < 2 || colorCount > COLOR_ORDER.length) {
    throw new Error(
      `colorCount debe estar entre 2 y ${COLOR_ORDER.length}.`,
    );
  }

  const colors = COLOR_ORDER.slice(0, colorCount);
  const rng = createRng(seed);
  const minimumMixed = Math.min(2, colorCount);

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const bottles = buildBottles(
      colors,
      capacity,
      emptyBottleCount,
      rng,
    );

    if (isSolved(bottles)) continue;
    if (mixedBottleCount(bottles) < minimumMixed) continue;

    const solver = solveOptimal(bottles, {
      maxNodes: 500_000,
    });
    if (!solver.solved || !solver.moves) continue;

    const level: PuzzleLevel = {
      id,
      name,
      capacity,
      bottles,
      colorCount,
      emptyBottleCount,
      difficulty,
      parMoves: solver.moves.length,
      seed: seed + attempt,
      solution: solver.moves,
    };

    if (validateLevel(level).ok) return level;
  }

  throw new Error(
    `No se pudo generar un nivel resoluble (${id}, ${colorCount} colores, semilla ${seed}).`,
  );
}
