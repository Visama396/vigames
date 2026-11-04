import {
  colOf,
  rowOf,
  type CellId,
  type PuzzleLevel,
  type ValidationResult,
} from "../types/puzzle.ts";
import { findConflicts } from "./ConstraintChecker.ts";
import { solve } from "./PuzzleSolver.ts";

export interface ValidateOptions {
  /** Ejecuta el solucionador para comprobar que hay solución. */
  checkSolutions?: boolean;
  /** Exige que la solución sea única (recomendado en el modo estándar). */
  requireUnique?: boolean;
}

const ORTHOGONAL = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
] as const;

export function isRegionConnected(
  size: number,
  regionId: number,
  cells: PuzzleLevel["cells"],
): boolean {
  const members: Array<[number, number]> = [];
  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      if (cells[row]?.[col]?.regionId === regionId) members.push([row, col]);
    }
  }
  if (members.length === 0) return false;

  const key = (row: number, col: number) => `${row},${col}`;
  const memberSet = new Set(members.map(([row, col]) => key(row, col)));
  const seen = new Set<string>();
  const queue: Array<[number, number]> = [members[0]!];
  seen.add(key(members[0]![0], members[0]![1]));

  while (queue.length > 0) {
    const [row, col] = queue.shift()!;
    for (const [dr, dc] of ORTHOGONAL) {
      const nextRow = row + dr;
      const nextCol = col + dc;
      const nextKey = key(nextRow, nextCol);
      if (!memberSet.has(nextKey) || seen.has(nextKey)) continue;
      seen.add(nextKey);
      queue.push([nextRow, nextCol]);
    }
  }

  return seen.size === members.length;
}

/**
 * Valida la estructura de un nivel y, opcionalmente, que tenga solución única.
 * Es la red de seguridad para los niveles escritos a mano y generados.
 */
export function validateLevel(
  level: PuzzleLevel,
  options: ValidateOptions = {},
): ValidationResult {
  const issues: string[] = [];
  const { size } = level;

  if (!Number.isInteger(size) || size < 2) {
    issues.push("El tamaño del tablero debe ser un entero mayor o igual que 2.");
  }
  if (level.cells.length !== size) {
    issues.push(`Se esperaban ${size} filas y hay ${level.cells.length}.`);
  }

  const regionIds = new Set<number>();
  for (let row = 0; row < size; row += 1) {
    const line = level.cells[row];
    if (!line || line.length !== size) {
      issues.push(`La fila ${row} no tiene ${size} celdas.`);
      continue;
    }
    for (let col = 0; col < size; col += 1) {
      const cell = line[col];
      if (!cell) {
        issues.push(`Falta la celda (${row}, ${col}).`);
        continue;
      }
      if (cell.row !== row || cell.col !== col) {
        issues.push(`La celda (${row}, ${col}) tiene coordenadas incoherentes.`);
      }
      if (!Number.isInteger(cell.regionId) || cell.regionId < 0 || cell.regionId >= size) {
        issues.push(`La celda (${row}, ${col}) tiene una región inválida.`);
      }
      regionIds.add(cell.regionId);
    }
  }

  if (regionIds.size !== size) {
    issues.push(`Se esperaban ${size} regiones y hay ${regionIds.size}.`);
  }

  for (const regionId of regionIds) {
    if (!isRegionConnected(size, regionId, level.cells)) {
      issues.push(`La región ${regionId} no es conexa ortogonalmente.`);
    }
  }

  const solutionIds = new Set<CellId>();
  const solutionRows = new Set<number>();
  const solutionColumns = new Set<number>();
  const solutionRegions = new Set<number>();
  if (level.solution.length !== size) {
    issues.push(`La solución debe tener ${size} celdas.`);
  }
  for (const id of level.solution) {
    if (!Number.isInteger(id) || id < 0 || id >= size * size) {
      issues.push(`La solución contiene una celda fuera del tablero (${id}).`);
      continue;
    }
    if (solutionIds.has(id)) issues.push(`La solución repite la celda ${id}.`);
    solutionIds.add(id);
    const row = rowOf(size, id);
    const col = colOf(size, id);
    if (solutionRows.has(row)) issues.push(`La solución repite la fila ${row}.`);
    if (solutionColumns.has(col)) {
      issues.push(`La solución repite la columna ${col}.`);
    }
    solutionRows.add(row);
    solutionColumns.add(col);
    const regionId = level.cells[row]?.[col]?.regionId;
    if (regionId === undefined) {
      issues.push(`La solución usa una celda inexistente (${row}, ${col}).`);
    } else if (solutionRegions.has(regionId)) {
      issues.push(`La solución repite la región ${regionId}.`);
    } else {
      solutionRegions.add(regionId);
    }
  }

  if (solutionIds.size === size) {
    const conflicts = findConflicts(level, solutionIds);
    if (conflicts.hasConflicts) {
      issues.push("La solución conocida incumple alguna restricción.");
    }
  }

  if (options.checkSolutions || options.requireUnique) {
    const result = solve(level, { maxSolutions: 2 });
    if (result.count === 0) {
      issues.push("El nivel no tiene ninguna solución.");
    } else if (options.requireUnique && result.count > 1) {
      issues.push("El nivel tiene más de una solución.");
    }
  }

  return { ok: issues.length === 0, issues };
}

/** Comprueba que una configuración concreta sea una solución válida. */
export function validateConfiguration(
  level: PuzzleLevel,
  cats: ReadonlySet<CellId>,
): ValidationResult {
  const issues: string[] = [];
  if (cats.size !== level.size) {
    issues.push(`Hay ${cats.size} gatos y se esperaban ${level.size}.`);
  }
  const conflicts = findConflicts(level, cats);
  if (conflicts.rowConflicts.length > 0) issues.push("Hay filas con más de un gato.");
  if (conflicts.columnConflicts.length > 0) {
    issues.push("Hay columnas con más de un gato.");
  }
  if (conflicts.regionConflicts.length > 0) {
    issues.push("Hay regiones con más de un gato.");
  }
  if (conflicts.adjacentPairs.length > 0) {
    issues.push("Hay gatos que se tocan.");
  }
  return { ok: issues.length === 0, issues };
}

/** Atajo: solución conocida como conjunto de celdas. */
export function solutionSet(level: PuzzleLevel): Set<CellId> {
  return new Set(level.solution);
}
