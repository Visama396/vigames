import {
  createPuzzleLevel,
  type Difficulty,
  type GeneratorOptions,
  type PuzzleLevel,
  type RegionId,
} from "../types/puzzle.ts";
import { isRegionConnected, validateLevel } from "./BoardValidator.ts";
import { solve } from "./PuzzleSolver.ts";
import { createRng, randomInt, shuffle, type Rng } from "./random.ts";

const ORTHOGONAL = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
] as const;

export interface GenerateResult {
  level: PuzzleLevel | null;
  attempts: number;
  uniqueCandidates: number;
}

/**
 * Genera una permutación de columnas en la que dos filas consecutivas nunca
 * están en columnas adyacentes. Es una solución válida antes de crear regiones.
 */
export function generateSolutionColumns(
  size: number,
  rng: Rng,
): number[] | null {
  if (size < 4) return null;

  const columns = Array.from({ length: size }, (_, index) => index);
  const result: number[] = [];
  const used = new Set<number>();

  const search = (row: number): boolean => {
    if (row === size) return true;
    for (const col of shuffle(columns, rng)) {
      if (used.has(col)) continue;
      if (row > 0 && Math.abs((result[row - 1] ?? 0) - col) < 2) continue;
      used.add(col);
      result.push(col);
      if (search(row + 1)) return true;
      result.pop();
      used.delete(col);
    }
    return false;
  };

  return search(0) ? result.slice() : null;
}

/**
 * Reparte todas las celdas en `size` regiones conexas.
 *
 * Se parte de las celdas de la solución y se crece desde todas ellas a la vez.
 * La prioridad favorece a las regiones más grandes (con un tope) porque las
 * regiones muy equilibradas suelen admitir demasiadas soluciones. El tope evita
 * que una sola región se coma el tablero.
 */
export function growRegions(
  size: number,
  solutionColumns: readonly number[],
  rng: Rng,
  maxRegionSize = Math.ceil(size * 2.4),
): RegionId[][] | null {
  const regions: RegionId[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => -1),
  );
  const frontiers: Array<Array<[number, number]>> = [];
  const sizes: number[] = [];

  for (let row = 0; row < size; row += 1) {
    const col = solutionColumns[row];
    if (col === undefined) return null;
    regions[row]![col] = row;
    sizes.push(1);
  }

  const addFrontier = (region: number, row: number, col: number): void => {
    const frontier = frontiers[region];
    if (!frontier) return;
    if (frontier.some(([r, c]) => r === row && c === col)) return;
    frontier.push([row, col]);
  };

  for (let row = 0; row < size; row += 1) {
    const col = solutionColumns[row] ?? 0;
    const frontier: Array<[number, number]> = [];
    frontiers.push(frontier);
    for (const [dr, dc] of ORTHOGONAL) {
      const nextRow = row + dr;
      const nextCol = col + dc;
      if (
        nextRow >= 0 &&
        nextRow < size &&
        nextCol >= 0 &&
        nextCol < size &&
        regions[nextRow]?.[nextCol] === -1
      ) {
        addFrontier(row, nextRow, nextCol);
      }
    }
  }

  let remaining = size * size - size;
  let guard = 0;

  while (remaining > 0 && guard < size * size * 100) {
    guard += 1;
    const order = shuffle(
      Array.from({ length: size }, (_, index) => index),
      rng,
    );

    let chosen = -1;
    let bestSize = -1;
    for (const region of order) {
      const frontier = frontiers[region];
      if (!frontier || frontier.length === 0) continue;
      if (sizes[region]! < maxRegionSize && sizes[region]! > bestSize) {
        bestSize = sizes[region]!;
        chosen = region;
      }
    }
    if (chosen === -1) {
      // Todas las regiones alcanzaron el tope: se ignora para no dejar huecos.
      for (const region of order) {
        if (frontiers[region]?.length) {
          chosen = region;
          break;
        }
      }
    }
    if (chosen === -1) break;

    const frontier = frontiers[chosen]!;
    for (let index = frontier.length - 1; index >= 0; index -= 1) {
      const [row, col] = frontier[index]!;
      if (regions[row]?.[col] !== -1) frontier.splice(index, 1);
    }
    if (frontier.length === 0) continue;

    const [row, col] = frontier[randomInt(rng, frontier.length)]!;
    regions[row]![col] = chosen;
    sizes[chosen] = (sizes[chosen] ?? 0) + 1;
    frontier.splice(frontier.findIndex(([r, c]) => r === row && c === col), 1);
    remaining -= 1;

    for (const [dr, dc] of ORTHOGONAL) {
      const nextRow = row + dr;
      const nextCol = col + dc;
      if (
        nextRow >= 0 &&
        nextRow < size &&
        nextCol >= 0 &&
        nextCol < size &&
        regions[nextRow]?.[nextCol] === -1
      ) {
        addFrontier(chosen, nextRow, nextCol);
      }
    }
  }

  return remaining === 0 ? regions : null;
}

function regionSizes(level: PuzzleLevel): number[] {
  const sizes = Array.from({ length: level.size }, () => 0);
  for (let row = 0; row < level.size; row += 1) {
    for (let col = 0; col < level.size; col += 1) {
      const region = level.cells[row]?.[col]?.regionId ?? 0;
      sizes[region] = (sizes[region] ?? 0) + 1;
    }
  }
  return sizes;
}

/**
 * Puntúa un nivel ya único. Se prefieren regiones variadas, sin extremos de
 * tamaño, con bordes irregulares y al menos dos celdas por región.
 */
export function scorePuzzle(level: PuzzleLevel): number {
  const sizes = regionSizes(level);
  const average = level.size;
  let variance = 0;
  for (const count of sizes) {
    variance += (count - average) ** 2;
  }
  variance /= Math.max(1, sizes.length);

  const minimum = Math.min(...sizes);
  const maximum = Math.max(...sizes);
  const minBonus = minimum >= 2 ? 40 : 0;
  const maxPenalty = Math.max(0, maximum - Math.ceil(level.size * 2.4)) * 12;

  // Perímetro total de las regiones: más bordes implica formas menos
  // rectangulares y, normalmente, más deducción.
  let perimeter = 0;
  for (let row = 0; row < level.size; row += 1) {
    for (let col = 0; col < level.size; col += 1) {
      const region = level.cells[row]?.[col]?.regionId;
      for (const [dr, dc] of ORTHOGONAL) {
        const nextRow = row + dr;
        const nextCol = col + dc;
        if (
          nextRow < 0 ||
          nextRow >= level.size ||
          nextCol < 0 ||
          nextCol >= level.size ||
          level.cells[nextRow]?.[nextCol]?.regionId !== region
        ) {
          perimeter += 1;
        }
      }
    }
  }

  return minBonus - variance * 4 - maxPenalty + (perimeter / level.size) * 2;
}

function cloneLevel(level: PuzzleLevel): PuzzleLevel {
  return createPuzzleLevel({
    id: level.id,
    name: level.name,
    size: level.size,
    regions: level.cells.map((row) => row.map((cell) => cell.regionId)),
    solutionColumns: level.solution.map((id) => id % level.size),
    difficulty: level.difficulty,
    seed: level.seed,
  });
}

/**
 * Refina un nivel único moviendo celdas de las regiones grandes a las pequeñas
 * sin romper la conexidad ni la unicidad. Mejora el aspecto y la variedad de
 * tamaños de un nivel que ya es válido.
 */
export function refineLevel(
  level: PuzzleLevel,
  rng: Rng,
  iterations = 1500,
): PuzzleLevel {
  let current = cloneLevel(level);
  let currentScore = scorePuzzle(current);

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const size = current.size;
    const row = randomInt(rng, size);
    const col = randomInt(rng, size);
    const id = row * size + col;
    if (current.solution.includes(id)) continue;

    const from = current.cells[row]?.[col]?.regionId;
    if (from === undefined) continue;

    const targets = new Set<RegionId>();
    for (const [dr, dc] of ORTHOGONAL) {
      const nextRow = row + dr;
      const nextCol = col + dc;
      if (
        nextRow < 0 ||
        nextRow >= size ||
        nextCol < 0 ||
        nextCol >= size
      ) {
        continue;
      }
      const target = current.cells[nextRow]?.[nextCol]?.regionId;
      if (target !== undefined && target !== from) targets.add(target);
    }
    if (targets.size === 0) continue;

    const fromSize = current.cells
      .flat()
      .filter((cell) => cell.regionId === from).length;
    if (fromSize <= 1) continue;

    for (const target of shuffle([...targets], rng)) {
      const targetSize = current.cells
        .flat()
        .filter((cell) => cell.regionId === target).length;
      if (targetSize >= fromSize) continue;
      if (!isRegionConnected(size, from, current.cells)) continue;

      const next = cloneLevel(current);
      const nextCell = next.cells[row]?.[col];
      if (!nextCell) continue;
      nextCell.regionId = target;

      if (!isRegionConnected(size, from, next.cells)) continue;
      if (!isRegionConnected(size, target, next.cells)) continue;

      const nextScore = scorePuzzle(next);
      if (nextScore <= currentScore) continue;

      const solutions = solve(next, { maxSolutions: 2 });
      if (solutions.count !== 1) continue;

      current = next;
      currentScore = nextScore;
      break;
    }
  }

  return current;
}

function defaultDifficulty(size: number): Difficulty {
  if (size <= 4) return "tutorial";
  if (size === 5) return "easy";
  if (size === 6) return "normal";
  if (size === 7) return "hard";
  return "expert";
}

/**
 * Genera un nivel con solución única. Devuelve el mejor candidato encontrado
 * según `scorePuzzle`, o `null` si se agotan los intentos.
 */
export function generatePuzzle(options: GeneratorOptions): GenerateResult {
  const {
    size,
    id = `purrgrid-${size}`,
    name = `Nivel ${size}×${size}`,
    difficulty = defaultDifficulty(size),
    seed = Math.floor(Math.random() * 0xffffffff),
    attempts = 5000,
  } = options;

  const rng = createRng(seed);
  const candidates: Array<{ level: PuzzleLevel; score: number }> = [];
  let uniqueCandidates = 0;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const solutionColumns = generateSolutionColumns(size, rng);
    if (!solutionColumns) continue;
    const regions = growRegions(size, solutionColumns, rng);
    if (!regions) continue;

    const level = createPuzzleLevel({
      id,
      name,
      size,
      regions,
      solutionColumns,
      difficulty,
      seed,
    });

    if (!validateLevel(level).ok) continue;

    const solutions = solve(level, { maxSolutions: 2 });
    if (solutions.count !== 1) continue;
    uniqueCandidates += 1;

    const score = scorePuzzle(level);
    candidates.push({ level, score });
    candidates.sort((a, b) => b.score - a.score);
    if (candidates.length > 5) candidates.length = 5;
  }

  if (candidates.length === 0) {
    return { level: null, attempts, uniqueCandidates };
  }

  // Refinar los mejores candidatos da regiones más equilibradas sin perder la
  // solución única. Se prueban varios porque el refinado no siempre mejora.
  const refineRng = createRng(seed ^ 0x9e3779b9);
  let best: PuzzleLevel | null = null;
  let bestScore = -Infinity;
  for (const candidate of candidates) {
    const refined = refineLevel(candidate.level, refineRng, 1800);
    const score = scorePuzzle(refined);
    if (score > bestScore) {
      bestScore = score;
      best = refined;
    }
  }

  return { level: best, attempts, uniqueCandidates };
}

/** Variante que devuelve solo el nivel, útil para scripts y pruebas. */
export function generateLevel(options: GeneratorOptions): PuzzleLevel | null {
  return generatePuzzle(options).level;
}
