import type {
  BlockDefinition,
  BlockState,
  Cell,
  DoorDefinition,
  LevelDefinition,
} from "../types/GameTypes.ts";

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export function cellKey(x: number, y: number): string {
  return `${x},${y}`;
}

export function cloneBlocks(state: readonly BlockState[]): BlockState[] {
  return state.map((block) => ({ ...block }));
}

export function initialState(level: LevelDefinition): BlockState[] {
  return level.blocks.map((block) => ({
    id: block.id,
    x: block.x,
    y: block.y,
  }));
}

export function blockDefinition(
  level: LevelDefinition,
  id: string,
): BlockDefinition | null {
  return level.blocks.find((block) => block.id === id) ?? null;
}

export function blockState(
  state: readonly BlockState[],
  id: string,
): BlockState | null {
  return state.find((block) => block.id === id) ?? null;
}

/** Celdas absolutas del bloque en su posición actual. */
export function absoluteCells(
  definition: BlockDefinition,
  block: Pick<BlockState, "x" | "y">,
): Cell[] {
  return definition.cells.map((cell) => ({
    x: block.x + cell.x,
    y: block.y + cell.y,
  }));
}

export function blockCells(
  level: LevelDefinition,
  state: readonly BlockState[],
  id: string,
): Cell[] {
  const definition = blockDefinition(level, id);
  const block = blockState(state, id);
  if (!definition || !block) return [];
  return absoluteCells(definition, block);
}

export function boundsOf(cells: readonly Cell[]): Bounds {
  if (cells.length === 0) {
    return { minX: 0, minY: 0, maxX: -1, maxY: -1 };
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const cell of cells) {
    minX = Math.min(minX, cell.x);
    minY = Math.min(minY, cell.y);
    maxX = Math.max(maxX, cell.x);
    maxY = Math.max(maxY, cell.y);
  }
  return { minX, minY, maxX, maxY };
}

export function occupiedCells(
  level: LevelDefinition,
  state: readonly BlockState[],
  ignoreBlockId?: string,
): Map<string, string> {
  const occupied = new Map<string, string>();
  for (const block of state) {
    if (block.id === ignoreBlockId) continue;
    const definition = blockDefinition(level, block.id);
    if (!definition) continue;
    for (const cell of absoluteCells(definition, block)) {
      occupied.set(cellKey(cell.x, cell.y), block.id);
    }
  }
  return occupied;
}

export function isInside(
  level: LevelDefinition,
  cells: readonly Cell[],
): boolean {
  return cells.every(
    (cell) =>
      cell.x >= 0 &&
      cell.y >= 0 &&
      cell.x < level.width &&
      cell.y < level.height,
  );
}

/**
 * Comprueba si el bloque puede desplazarse una celda. No permite salir del
 * tablero: las salidas se gestionan aparte con `exitDoorFor`.
 */
export function canMove(
  level: LevelDefinition,
  state: readonly BlockState[],
  id: string,
  dx: number,
  dy: number,
): boolean {
  if (dx === 0 && dy === 0) return false;
  if (Math.abs(dx) + Math.abs(dy) !== 1) return false;

  const definition = blockDefinition(level, id);
  const block = blockState(state, id);
  if (!definition || !block) return false;

  const target = absoluteCells(definition, {
    x: block.x + dx,
    y: block.y + dy,
  });
  if (!isInside(level, target)) return false;

  const occupied = occupiedCells(level, state, id);
  return target.every((cell) => !occupied.has(cellKey(cell.x, cell.y)));
}

/** Devuelve una copia del estado con el bloque desplazado, o `null`. */
export function moveBlock(
  level: LevelDefinition,
  state: readonly BlockState[],
  id: string,
  dx: number,
  dy: number,
): BlockState[] | null {
  if (!canMove(level, state, id, dx, dy)) return null;
  return state.map((block) =>
    block.id === id
      ? { ...block, x: block.x + dx, y: block.y + dy }
      : { ...block },
  );
}

/**
 * Una puerta acepta un bloque cuando:
 * 1. el color coincide,
 * 2. el bloque toca ese borde,
 * 3. todas las celdas que tocan el borde caben en el hueco de la puerta.
 *
 * Las celdas interiores no tienen que caber: solo la sección que atraviesa el
 * marco. Así una pieza en L puede salir por una puerta estrecha si su borde
 * encaja, y una línea de tres necesita una puerta de tres celdas.
 */
export function doorAcceptsBlock(
  level: LevelDefinition,
  block: BlockDefinition,
  cells: readonly Cell[],
  door: DoorDefinition,
): boolean {
  if (block.color !== door.color) return false;

  const edgeCells = cells.filter((cell) => {
    switch (door.side) {
      case "left":
        return cell.x === 0;
      case "right":
        return cell.x === level.width - 1;
      case "up":
        return cell.y === 0;
      case "down":
        return cell.y === level.height - 1;
    }
  });

  if (edgeCells.length === 0) return false;

  const start = door.start;
  const end = door.start + door.length - 1;

  return edgeCells.every((cell) =>
    door.side === "left" || door.side === "right"
      ? cell.y >= start && cell.y <= end
      : cell.x >= start && cell.x <= end,
  );
}

export function exitDoorFor(
  level: LevelDefinition,
  state: readonly BlockState[],
  id: string,
): DoorDefinition | null {
  const definition = blockDefinition(level, id);
  const block = blockState(state, id);
  if (!definition || !block) return null;
  const cells = absoluteCells(definition, block);
  return (
    level.doors.find((door) => doorAcceptsBlock(level, definition, cells, door)) ??
    null
  );
}

export function canExit(
  level: LevelDefinition,
  state: readonly BlockState[],
  id: string,
): boolean {
  return exitDoorFor(level, state, id) !== null;
}

/** Saca el bloque del tablero. */
export function exitBlock(
  level: LevelDefinition,
  state: readonly BlockState[],
  id: string,
): BlockState[] | null {
  if (!canExit(level, state, id)) return null;
  return state.filter((block) => block.id !== id).map((block) => ({ ...block }));
}

export function isSolved(state: readonly BlockState[]): boolean {
  return state.length === 0;
}

/** Firma estable del estado para visitados del solucionador. */
export function stateSignature(state: readonly BlockState[]): string {
  return [...state]
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .map((block) => `${block.id}@${block.x},${block.y}`)
    .join("|");
}

/** Distancia Manhattan mínima desde el bloque hasta una puerta compatible. */
export function distanceToDoor(
  level: LevelDefinition,
  state: readonly BlockState[],
  id: string,
): number | null {
  const definition = blockDefinition(level, id);
  const block = blockState(state, id);
  if (!definition || !block) return null;
  const cells = absoluteCells(definition, block);
  const bounds = boundsOf(cells);
  let best: number | null = null;

  for (const door of level.doors) {
    if (door.color !== definition.color) continue;
    const spanStart = door.start;
    const spanEnd = door.start + door.length - 1;

    for (const cell of cells) {
      let distance: number;
      switch (door.side) {
        case "left":
          distance = cell.x + Math.max(0, spanStart - cell.y, cell.y - spanEnd);
          break;
        case "right":
          distance =
            level.width - 1 - cell.x +
            Math.max(0, spanStart - cell.y, cell.y - spanEnd);
          break;
        case "up":
          distance = cell.y + Math.max(0, spanStart - cell.x, cell.x - spanEnd);
          break;
        case "down":
          distance =
            level.height - 1 - cell.y +
            Math.max(0, spanStart - cell.x, cell.x - spanEnd);
          break;
      }
      if (best === null || distance < best) best = distance;
    }
  }

  void bounds;
  return best;
}
