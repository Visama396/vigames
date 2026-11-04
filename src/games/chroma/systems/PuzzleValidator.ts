import type {
  BottleState,
  ColorId,
  PuzzleLevel,
  ValidationResult,
} from "../types/puzzle.ts";
import { isSolved, simulateSolution } from "./MoveValidator.ts";

export interface ValidateLevelOptions {
  /** Exige que el nivel incluya una ruta de solución verificable. */
  requireSolution?: boolean;
  /** Permite que un nivel empiece ya resuelto (por ejemplo, un tutorial). */
  allowSolved?: boolean;
}

export function countColors(
  bottles: readonly BottleState[],
): Map<ColorId, number> {
  const counts = new Map<ColorId, number>();
  for (const bottle of bottles) {
    for (const color of bottle.segments) {
      counts.set(color, (counts.get(color) ?? 0) + 1);
    }
  }
  return counts;
}

/**
 * Comprueba que un nivel es coherente y que su solución conocida funciona.
 * No ejecuta un solucionador pesado: valida la ruta incluida en los datos.
 */
export function validateLevel(
  level: PuzzleLevel,
  options: ValidateLevelOptions = {},
): ValidationResult {
  const issues: string[] = [];
  const { requireSolution = true, allowSolved = false } = options;

  if (!level.id) issues.push("El nivel no tiene identificador.");
  if (!Number.isInteger(level.capacity) || level.capacity < 2) {
    issues.push("La capacidad debe ser un entero mayor o igual que 2.");
  }
  if (!Number.isInteger(level.colorCount) || level.colorCount < 1) {
    issues.push("El número de colores debe ser positivo.");
  }
  if (
    !Number.isInteger(level.emptyBottleCount) ||
    level.emptyBottleCount < 0
  ) {
    issues.push("El número de botellas extra no puede ser negativo.");
  }

  const expectedBottles = level.colorCount + level.emptyBottleCount;
  if (level.bottles.length !== expectedBottles) {
    issues.push(
      `Se esperaban ${expectedBottles} botellas y hay ${level.bottles.length}.`,
    );
  }

  for (const [index, bottle] of level.bottles.entries()) {
    if (bottle.capacity !== level.capacity) {
      issues.push(`La botella ${index + 1} no usa la capacidad del nivel.`);
    }
    if (bottle.segments.length > bottle.capacity) {
      issues.push(`La botella ${index + 1} supera su capacidad.`);
    }
    if (bottle.segments.some((color) => typeof color !== "string" || !color)) {
      issues.push(`La botella ${index + 1} contiene un color inválido.`);
    }
  }

  const counts = countColors(level.bottles);
  if (counts.size !== level.colorCount) {
    issues.push(
      `Se esperaban ${level.colorCount} colores y aparecen ${counts.size}.`,
    );
  }
  for (const [color, count] of counts) {
    if (count !== level.capacity) {
      issues.push(
        `El color ${color} tiene ${count} unidades; se esperaban ${level.capacity}.`,
      );
    }
  }

  if (!allowSolved && isSolved(level.bottles)) {
    issues.push("El nivel ya está resuelto al empezar.");
  }

  if (level.solution) {
    if (level.solution.length === 0) {
      issues.push("La solución incluida está vacía.");
    }
    const finalState = simulateSolution(level.bottles, level.solution);
    if (!finalState) {
      issues.push("La ruta de solución incluida contiene un movimiento ilegal.");
    } else if (!isSolved(finalState)) {
      issues.push("La ruta de solución no termina con el puzle resuelto.");
    }
  } else if (requireSolution) {
    issues.push("El nivel no incluye una ruta de solución.");
  }

  return { ok: issues.length === 0, issues };
}
