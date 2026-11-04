import {
  cellId,
  type CellId,
  type PuzzleLevel,
  type SolveResult,
} from "../types/puzzle.ts";

export interface SolverOptions {
  /** Número máximo de soluciones a buscar. Por defecto 2 (unicidad). */
  maxSolutions?: number;
  /** Orden aleatorio de candidatos para generar variedad. */
  random?: () => number;
}

interface Candidate {
  col: number;
  regionId: number;
}

/**
 * Solucionador por backtracking para el problema de los gatos.
 *
 * Se asigna un gato por fila (así la restricción de fila se cumple siempre) y
 * se podan columnas, regiones y contactos con las filas vecinas ya asignadas.
 * La heurística MRV elige primero la fila con menos candidatas.
 */
export function solve(
  level: PuzzleLevel,
  options: SolverOptions = {},
): SolveResult {
  const maxSolutions = options.maxSolutions ?? 2;
  const random = options.random;
  const size = level.size;

  const rowCandidates: Candidate[][] = [];
  for (let row = 0; row < size; row += 1) {
    const candidates: Candidate[] = [];
    for (let col = 0; col < size; col += 1) {
      candidates.push({
        col,
        regionId: level.cells[row]?.[col]?.regionId ?? -1,
      });
    }
    rowCandidates.push(candidates);
  }

  const assigned: number[] = Array.from({ length: size }, () => -1);
  const usedColumns = new Set<number>();
  const usedRegions = new Set<number>();
  const solutions: CellId[][] = [];
  let nodes = 0;

  const optionsForRow = (row: number): Candidate[] => {
    const previous = row > 0 ? assigned[row - 1] : -1;
    const next = row + 1 < size ? assigned[row + 1] : -1;
    const result: Candidate[] = [];
    for (const candidate of rowCandidates[row] ?? []) {
      if (usedColumns.has(candidate.col)) continue;
      if (usedRegions.has(candidate.regionId)) continue;
      if (previous >= 0 && Math.abs(previous - candidate.col) < 2) continue;
      if (next >= 0 && Math.abs(next - candidate.col) < 2) continue;
      result.push(candidate);
    }
    if (random) {
      for (let i = result.length - 1; i > 0; i -= 1) {
        const j = Math.floor(random() * (i + 1));
        [result[i], result[j]] = [result[j]!, result[i]!];
      }
    }
    return result;
  };

  const search = (): void => {
    if (solutions.length >= maxSolutions) return;
    nodes += 1;

    let bestRow = -1;
    let bestOptions: Candidate[] | null = null;

    for (let row = 0; row < size; row += 1) {
      if (assigned[row] !== -1) continue;
      const candidates = optionsForRow(row);
      if (!bestOptions || candidates.length < bestOptions.length) {
        bestRow = row;
        bestOptions = candidates;
        if (candidates.length === 0) break;
      }
    }

    if (bestRow === -1) {
      solutions.push(
        Array.from({ length: size }, (_, row) =>
          cellId(size, row, assigned[row] ?? 0),
        ),
      );
      return;
    }

    if (!bestOptions || bestOptions.length === 0) return;

    for (const candidate of bestOptions) {
      assigned[bestRow] = candidate.col;
      usedColumns.add(candidate.col);
      usedRegions.add(candidate.regionId);
      search();
      assigned[bestRow] = -1;
      usedColumns.delete(candidate.col);
      usedRegions.delete(candidate.regionId);
      if (solutions.length >= maxSolutions) return;
    }
  };

  search();

  return { count: solutions.length, solutions, nodes };
}

/** Devuelve la primera solución encontrada, o `null` si no hay ninguna. */
export function findSolution(level: PuzzleLevel): CellId[] | null {
  const result = solve(level, { maxSolutions: 1 });
  return result.solutions[0] ?? null;
}

/** Comprueba si el nivel tiene exactamente una solución. */
export function hasUniqueSolution(level: PuzzleLevel): boolean {
  return solve(level, { maxSolutions: 2 }).count === 1;
}
