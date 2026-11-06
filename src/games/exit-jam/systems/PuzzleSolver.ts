import {
  canExit,
  canMove,
  cloneBlocks,
  exitBlock,
  initialState,
  isSolved,
  moveBlock,
  stateSignature,
} from "./BoardManager.ts";
import {
  DIRECTIONS,
  type BlockState,
  type LevelDefinition,
  type Move,
  type SolveResult,
} from "../types/GameTypes.ts";

export interface SolverOptions {
  maxNodes?: number;
  maxDepth?: number;
}

interface QueueEntry {
  state: BlockState[];
  path: Move[];
}

/**
 * Búsqueda en anchura sobre posiciones de bloques. Las salidas se prueban
 * antes que los desplazamientos para que el camino encontrado priorice
 * despejar el tablero.
 */
export function solve(
  level: LevelDefinition,
  options: SolverOptions = {},
): SolveResult {
  const maxNodes = options.maxNodes ?? 120_000;
  const maxDepth = options.maxDepth ?? 80;

  const start = initialState(level);
  const queue: QueueEntry[] = [{ state: start, path: [] }];
  const visited = new Set<string>([stateSignature(start)]);
  let nodes = 0;
  let head = 0;

  while (head < queue.length) {
    const current = queue[head];
    head += 1;
    if (!current) continue;

    nodes += 1;
    if (nodes > maxNodes) {
      return { solved: false, moves: null, nodes, exhausted: true };
    }

    if (isSolved(current.state)) {
      return { solved: true, moves: current.path, nodes, exhausted: false };
    }

    if (current.path.length >= maxDepth) continue;

    // 1. Salidas disponibles.
    for (const block of current.state) {
      if (!canExit(level, current.state, block.id)) continue;
      const next = exitBlock(level, current.state, block.id);
      if (!next) continue;
      const path = [
        ...current.path,
        { blockId: block.id, dx: 0, dy: 0, exit: true },
      ];
      if (isSolved(next)) {
        return { solved: true, moves: path, nodes, exhausted: false };
      }
      const signature = stateSignature(next);
      if (visited.has(signature)) continue;
      visited.add(signature);
      queue.push({ state: next, path });
    }

    // 2. Desplazamientos de una celda.
    for (const block of current.state) {
      for (const { dx, dy } of DIRECTIONS) {
        if (!canMove(level, current.state, block.id, dx, dy)) continue;
        const next = moveBlock(level, current.state, block.id, dx, dy);
        if (!next) continue;
        const signature = stateSignature(next);
        if (visited.has(signature)) continue;
        visited.add(signature);
        queue.push({
          state: next,
          path: [...current.path, { blockId: block.id, dx, dy }],
        });
      }
    }
  }

  return { solved: false, moves: null, nodes, exhausted: false };
}

/** Comprueba una ruta conocida y devuelve el primer error, si lo hay. */
export function verifySolution(
  level: LevelDefinition,
  moves: readonly Move[],
): string | null {
  let state = initialState(level);

  for (let index = 0; index < moves.length; index += 1) {
    const move = moves[index]!;
    const next = move.exit
      ? exitBlock(level, state, move.blockId)
      : moveBlock(level, state, move.blockId, move.dx, move.dy);
    if (!next) {
      return `Movimiento ${index + 1} no válido (${move.blockId}).`;
    }
    state = cloneBlocks(next);
  }

  return isSolved(state) ? null : "La ruta termina con bloques en el tablero.";
}
