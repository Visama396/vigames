import type {
  BottleState,
  ColorId,
  PourMove,
  SolveOptions,
  SolverResult,
} from "../types/puzzle.ts";

interface NumericMove {
  from: number;
  to: number;
  count: number;
  score: number;
}

function encode(
  bottles: readonly BottleState[],
): { state: number[][]; capacity: number } {
  const colorIndex = new Map<ColorId, number>();
  const state = bottles.map((bottle) =>
    bottle.segments.map((color) => {
      let index = colorIndex.get(color);
      if (index === undefined) {
        index = colorIndex.size;
        colorIndex.set(color, index);
      }
      return index;
    }),
  );
  const capacity = bottles[0]?.capacity ?? 4;
  return { state, capacity };
}

function isSolvedState(state: readonly number[][], capacity: number): boolean {
  return state.every((bottle) => {
    if (bottle.length === 0) return true;
    if (bottle.length !== capacity) return false;
    return bottle.every((color) => color === bottle[0]);
  });
}

function canonical(state: readonly number[][]): string {
  return state
    .map((bottle) => bottle.join(","))
    .sort()
    .join("|");
}

function movesFor(
  state: readonly number[][],
  capacity: number,
): NumericMove[] {
  const moves: NumericMove[] = [];

  for (let from = 0; from < state.length; from += 1) {
    const source = state[from]!;
    if (source.length === 0) continue;

    const sourceColor = source[source.length - 1]!;
    const sourceComplete =
      source.length === capacity &&
      source.every((color) => color === sourceColor);
    if (sourceComplete) continue;

    let run = 0;
    for (let index = source.length - 1; index >= 0; index -= 1) {
      if (source[index] !== sourceColor) break;
      run += 1;
    }

    for (let to = 0; to < state.length; to += 1) {
      if (from === to) continue;
      const destination = state[to]!;
      if (destination.length >= capacity) continue;

      const destinationColor = destination[destination.length - 1];
      if (
        destinationColor !== undefined &&
        destinationColor !== sourceColor
      ) {
        continue;
      }

      const count = Math.min(run, capacity - destination.length);
      if (count <= 0) continue;

      // Mover una botella entera a una botella vacía solo cambia su posición.
      if (destination.length === 0 && count === source.length) continue;

      const sourceRemaining = source.length - count;
      const sourceEmpty = sourceRemaining === 0;
      const destinationComplete =
        destination.length + count === capacity &&
        (destination.length === 0 ||
          destination.every((color) => color === sourceColor));

      let score = 0;
      if (destinationComplete) score += 100;
      if (sourceEmpty) score += 60;
      if (destinationColor === sourceColor) score += 30;
      if (destination.length === 0) score += 5;

      moves.push({ from, to, count, score });
    }
  }

  moves.sort((a, b) => b.score - a.score);
  return moves;
}

function applyMove(
  state: readonly number[][],
  move: NumericMove,
): number[][] {
  const next = state.map((bottle) => bottle.slice());
  const moved = next[move.from]!.splice(
    next[move.from]!.length - move.count,
    move.count,
  );
  next[move.to]!.push(...moved);
  return next;
}

/**
 * Solucionador acotado por número de nodos. Se usa para validar niveles
 * generados y para pruebas; el juego nunca lo ejecuta durante una partida.
 */
export function solve(
  bottles: readonly BottleState[],
  options: SolveOptions = {},
): SolverResult {
  const { maxNodes = 250_000, maxDepth = 250 } = options;
  const { state, capacity } = encode(bottles);

  if (isSolvedState(state, capacity)) {
    return { solved: true, moves: [], nodes: 0, exhausted: false };
  }

  const visited = new Set<string>();
  const path: PourMove[] = [];
  let nodes = 0;
  let exhausted = false;

  const search = (current: number[][]): boolean => {
    nodes += 1;
    if (nodes > maxNodes) {
      exhausted = true;
      return false;
    }

    const key = canonical(current);
    if (visited.has(key)) return false;
    visited.add(key);

    if (isSolvedState(current, capacity)) return true;
    if (path.length >= maxDepth) return false;

    for (const move of movesFor(current, capacity)) {
      path.push({ from: move.from, to: move.to, count: move.count });
      if (search(applyMove(current, move))) return true;
      path.pop();
    }

    return false;
  };

  const solved = search(state);
  return {
    solved,
    moves: solved ? path.map((move) => ({ ...move })) : null,
    nodes,
    exhausted,
  };
}
