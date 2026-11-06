import { emptyCells } from "./BoardManager.ts";
import { positionsConnected } from "./PairValidator.ts";
import type {
  BoardShape,
  CellPosition,
  CellValue,
} from "../types/GameTypes.ts";

export type RandomSource = () => number;

export function createEmptyBoard(shape: BoardShape): CellValue[][] {
  return Array.from({ length: shape.height }, () =>
    new Array<CellValue>(shape.width).fill(null),
  );
}

export function randomValue(rng: RandomSource = Math.random): number {
  return 1 + Math.floor(Math.max(0, Math.min(0.999999, rng())) * 9);
}

function shuffle<T>(items: T[], rng: RandomSource): T[] {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.max(0, Math.min(0.999999, rng())) * (index + 1));
    [items[index], items[swap]] = [items[swap]!, items[index]!];
  }
  return items;
}

function pickConnectedPair(
  shape: BoardShape,
  positions: readonly CellPosition[],
  rng: RandomSource,
): [CellPosition, CellPosition] | null {
  const candidates: Array<[CellPosition, CellPosition]> = [];

  for (let i = 0; i < positions.length; i += 1) {
    for (let j = i + 1; j < positions.length; j += 1) {
      const a = positions[i]!;
      const b = positions[j]!;
      if (positionsConnected(shape, a, b)) candidates.push([a, b]);
    }
  }

  if (candidates.length === 0) return null;
  const index = Math.floor(
    Math.max(0, Math.min(0.999999, rng())) * candidates.length,
  );
  return candidates[index]!;
}

function setValue(
  board: CellValue[][],
  position: CellPosition,
  value: CellValue,
): void {
  board[position.row]![position.col] = value;
}

/**
 * Rellena hasta `count` casillas vacías con números aleatorios. Si hay espacio
 * para al menos dos números, una pareja conectada recibe valores complementarios
 * para garantizar que la partida pueda continuar.
 */
export function fillRandomCells(
  shape: BoardShape,
  board: readonly (readonly CellValue[])[],
  count: number,
  rng: RandomSource = Math.random,
): CellValue[][] {
  const next = board.map((row) => [...row]);
  const available = emptyCells(next);
  const target = Math.max(0, Math.min(Math.floor(count), available.length));
  if (target === 0) return next;

  const chosen: CellPosition[] = [];

  if (target >= 2) {
    const pair = pickConnectedPair(shape, available, rng);
    if (pair) {
      const [a, b] = pair;
      const first = randomValue(rng);
      setValue(next, a, first);
      setValue(next, b, 10 - first);
      chosen.push(a, b);
    }
  }

  const remaining = available.filter(
    (position) =>
      !chosen.some(
        (picked) =>
          picked.row === position.row && picked.col === position.col,
      ),
  );
  shuffle(remaining, rng);

  const needed = target - chosen.length;
  for (let index = 0; index < needed; index += 1) {
    const position = remaining[index]!;
    setValue(next, position, randomValue(rng));
  }

  return next;
}

/** Crea un tablero nuevo con exactamente `count` números aleatorios. */
export function generateBoard(
  shape: BoardShape,
  count: number,
  rng: RandomSource = Math.random,
): CellValue[][] {
  return fillRandomCells(shape, createEmptyBoard(shape), count, rng);
}
