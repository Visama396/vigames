import {
  cellId,
  colOf,
  rowOf,
  type CellId,
  type ConflictKind,
  type ConflictReport,
  type PlacementResult,
  type PuzzleLevel,
  type RegionId,
} from "../types/puzzle.ts";

export interface CatPosition {
  id: CellId;
  row: number;
  col: number;
  regionId: RegionId;
}

/** Convierte el conjunto de gatos en posiciones ordenadas por fila. */
export function getCatPositions(
  level: PuzzleLevel,
  cats: ReadonlySet<CellId>,
): CatPosition[] {
  const positions: CatPosition[] = [];
  for (const id of cats) {
    const row = rowOf(level.size, id);
    const col = colOf(level.size, id);
    positions.push({
      id,
      row,
      col,
      regionId: level.cells[row]?.[col]?.regionId ?? -1,
    });
  }
  positions.sort((a, b) => a.row - b.row || a.col - b.col);
  return positions;
}

function addReason(
  map: Map<CellId, ConflictKind[]>,
  id: CellId,
  kind: ConflictKind,
): void {
  const current = map.get(id);
  if (!current) {
    map.set(id, [kind]);
    return;
  }
  if (!current.includes(kind)) current.push(kind);
}

/**
 * Detecta los conflictos directos entre los gatos colocados.
 *
 * No intenta adivinar si una colocación lleva a un callejón sin salida: solo
 * comprueba las cuatro reglas contra el estado actual. Esto es importante para
 * no marcar como incorrecta una jugada localmente válida.
 */
export function findConflicts(
  level: PuzzleLevel,
  cats: ReadonlySet<CellId>,
): ConflictReport {
  const positions = getCatPositions(level, cats);
  const byRow = new Map<number, CellId[]>();
  const byColumn = new Map<number, CellId[]>();
  const byRegion = new Map<RegionId, CellId[]>();

  for (const cat of positions) {
    const row = byRow.get(cat.row);
    if (row) row.push(cat.id);
    else byRow.set(cat.row, [cat.id]);

    const column = byColumn.get(cat.col);
    if (column) column.push(cat.id);
    else byColumn.set(cat.col, [cat.id]);

    const region = byRegion.get(cat.regionId);
    if (region) region.push(cat.id);
    else byRegion.set(cat.regionId, [cat.id]);
  }

  const cells = new Map<CellId, ConflictKind[]>();
  const rowConflicts: number[] = [];
  const columnConflicts: number[] = [];
  const regionConflicts: RegionId[] = [];

  for (const [row, ids] of byRow) {
    if (ids.length > 1) {
      rowConflicts.push(row);
      for (const id of ids) addReason(cells, id, "row");
    }
  }
  for (const [column, ids] of byColumn) {
    if (ids.length > 1) {
      columnConflicts.push(column);
      for (const id of ids) addReason(cells, id, "column");
    }
  }
  for (const [region, ids] of byRegion) {
    if (ids.length > 1) {
      regionConflicts.push(region);
      for (const id of ids) addReason(cells, id, "region");
    }
  }

  const adjacentPairs: Array<[CellId, CellId]> = [];
  for (let i = 0; i < positions.length; i += 1) {
    for (let j = i + 1; j < positions.length; j += 1) {
      const a = positions[i];
      const b = positions[j];
      const touches =
        Math.abs(a.row - b.row) <= 1 && Math.abs(a.col - b.col) <= 1;
      if (touches) {
        adjacentPairs.push([a.id, b.id]);
        addReason(cells, a.id, "adjacent");
        addReason(cells, b.id, "adjacent");
      }
    }
  }

  return {
    cells,
    hasConflicts: cells.size > 0,
    rowConflicts: rowConflicts.sort((a, b) => a - b),
    columnConflicts: columnConflicts.sort((a, b) => a - b),
    regionConflicts: regionConflicts.sort((a, b) => a - b),
    adjacentPairs,
  };
}

/**
 * Comprueba si se puede colocar un gato en una celda vacía sin incumplir
 * directamente una regla con los gatos actuales. Es la base del modo estricto.
 */
export function canPlace(
  level: PuzzleLevel,
  cats: ReadonlySet<CellId>,
  row: number,
  col: number,
): PlacementResult {
  const reasons: ConflictKind[] = [];
  const regionId = level.cells[row]?.[col]?.regionId;

  for (const id of cats) {
    const otherRow = rowOf(level.size, id);
    const otherCol = colOf(level.size, id);
    if (otherRow === row && !reasons.includes("row")) reasons.push("row");
    if (otherCol === col && !reasons.includes("column")) reasons.push("column");
    if (
      level.cells[otherRow]?.[otherCol]?.regionId === regionId &&
      !reasons.includes("region")
    ) {
      reasons.push("region");
    }
    if (
      Math.abs(otherRow - row) <= 1 &&
      Math.abs(otherCol - col) <= 1 &&
      !reasons.includes("adjacent")
    ) {
      reasons.push("adjacent");
    }
  }

  return { allowed: reasons.length === 0, reasons };
}

/**
 * Un nivel está resuelto cuando hay exactamente un gato por fila, columna y
 * región, sin contactos. Con `size` gatos y cero conflictos, las tres primeras
 * condiciones se cumplen necesariamente.
 */
export function isSolved(
  level: PuzzleLevel,
  cats: ReadonlySet<CellId>,
): boolean {
  if (cats.size !== level.size) return false;
  return !findConflicts(level, cats).hasConflicts;
}

/** Número de gatos en cada región (útil para el HUD y las pistas). */
export function countByRegion(
  level: PuzzleLevel,
  cats: ReadonlySet<CellId>,
): number[] {
  const counts = Array.from({ length: level.size }, () => 0);
  for (const id of cats) {
    const row = rowOf(level.size, id);
    const col = colOf(level.size, id);
    const region = level.cells[row]?.[col]?.regionId ?? 0;
    counts[region] = (counts[region] ?? 0) + 1;
  }
  return counts;
}

/** Describe un conflicto para mostrarlo en la interfaz. */
export function describeConflict(kind: ConflictKind): string {
  switch (kind) {
    case "row":
      return "dos gatos comparten fila";
    case "column":
      return "dos gatos comparten columna";
    case "region":
      return "dos gatos comparten región";
    case "adjacent":
      return "dos gatos se tocan";
  }
}

/** Celda de la solución correspondiente a una fila. */
export function solutionCellAt(level: PuzzleLevel, row: number): CellId {
  const col = level.solution[row] ?? 0;
  return cellId(level.size, row, col);
}
