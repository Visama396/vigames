import type {
  BottleState,
  ColorId,
  InvalidMoveReason,
  MoveResult,
  PourMove,
} from "../types/puzzle.ts";

/** Copia profunda de una lista de botellas para no mutar el estado original. */
export function cloneBottles(
  bottles: readonly BottleState[],
): BottleState[] {
  return bottles.map((bottle) => ({
    capacity: bottle.capacity,
    segments: [...bottle.segments],
  }));
}

/** Color del segmento superior, o null si la botella está vacía. */
export function topColor(bottle: BottleState): ColorId | null {
  return bottle.segments[bottle.segments.length - 1] ?? null;
}

/** Número de segmentos consecutivos del mismo color en la superficie. */
export function topRunLength(bottle: BottleState): number {
  const color = topColor(bottle);
  if (color === null) return 0;
  let run = 0;
  for (let index = bottle.segments.length - 1; index >= 0; index -= 1) {
    if (bottle.segments[index] !== color) break;
    run += 1;
  }
  return run;
}

export function freeSpace(bottle: BottleState): number {
  return Math.max(0, bottle.capacity - bottle.segments.length);
}

export function isBottleComplete(bottle: BottleState): boolean {
  if (bottle.segments.length === 0) return false;
  if (bottle.segments.length !== bottle.capacity) return false;
  return bottle.segments.every(
    (segment) => segment === bottle.segments[0],
  );
}

/**
 * Una botella está resuelta si está vacía o si está llena de un único color.
 * Las botellas vacías no impiden completar el nivel.
 */
export function isSolved(bottles: readonly BottleState[]): boolean {
  return bottles.every(
    (bottle) =>
      bottle.segments.length === 0 || isBottleComplete(bottle),
  );
}

export function describeInvalidReason(reason: InvalidMoveReason): string {
  switch (reason) {
    case "invalid-index":
      return "Esa botella no existe";
    case "same-bottle":
      return "Elige una botella distinta";
    case "empty-source":
      return "La botella de origen está vacía";
    case "full-destination":
      return "La botella de destino está llena";
    case "color-mismatch":
      return "Los colores de la superficie no coinciden";
    case "no-space":
      return "No hay espacio suficiente";
  }
}

/**
 * Valida un movimiento y calcula cuántos segmentos se verterían.
 * No modifica el estado.
 */
export function validateMove(
  bottles: readonly BottleState[],
  from: number,
  to: number,
): MoveResult {
  const fail = (reason: InvalidMoveReason): MoveResult => ({
    valid: false,
    reason,
    from,
    to,
    count: 0,
  });

  if (
    !Number.isInteger(from) ||
    !Number.isInteger(to) ||
    from < 0 ||
    to < 0 ||
    from >= bottles.length ||
    to >= bottles.length
  ) {
    return fail("invalid-index");
  }

  if (from === to) return fail("same-bottle");

  const source = bottles[from]!;
  const destination = bottles[to]!;

  if (source.segments.length === 0) return fail("empty-source");
  if (destination.segments.length >= destination.capacity) {
    return fail("full-destination");
  }

  const sourceColor = topColor(source);
  const destinationColor = topColor(destination);
  if (
    destinationColor !== null &&
    sourceColor !== null &&
    destinationColor !== sourceColor
  ) {
    return fail("color-mismatch");
  }

  const count = Math.min(topRunLength(source), freeSpace(destination));
  if (count <= 0) return fail("no-space");

  return { valid: true, from, to, count };
}

export function pourAmount(
  bottles: readonly BottleState[],
  from: number,
  to: number,
): number {
  const result = validateMove(bottles, from, to);
  return result.valid ? result.count : 0;
}

/**
 * Aplica un movimiento válido vertiendo el máximo posible. Si el movimiento no
 * es válido devuelve una copia intacta del estado.
 */
export function applyMove(
  bottles: readonly BottleState[],
  from: number,
  to: number,
): BottleState[] {
  const result = validateMove(bottles, from, to);
  const next = cloneBottles(bottles);
  if (!result.valid) return next;

  const source = next[from]!;
  const destination = next[to]!;
  const moved = source.segments.splice(
    source.segments.length - result.count,
    result.count,
  );
  destination.segments.push(...moved);
  return next;
}

export function applyPourMove(
  bottles: readonly BottleState[],
  move: PourMove,
): BottleState[] {
  return applyMove(bottles, move.from, move.to);
}

/**
 * Enumeración de movimientos legales. Útil para el solucionador y las pruebas.
 */
export function legalMoves(bottles: readonly BottleState[]): PourMove[] {
  const moves: PourMove[] = [];
  for (let from = 0; from < bottles.length; from += 1) {
    for (let to = 0; to < bottles.length; to += 1) {
      if (from === to) continue;
      const result = validateMove(bottles, from, to);
      if (result.valid) {
        moves.push({ from, to, count: result.count });
      }
    }
  }
  return moves;
}

/**
 * Ejecuta una ruta de solución conocida. Devuelve null si algún paso deja de
 * ser legal o si la cantidad indicada no coincide con el vertido máximo.
 */
export function simulateSolution(
  bottles: readonly BottleState[],
  moves: readonly PourMove[],
): BottleState[] | null {
  let state = cloneBottles(bottles);
  for (const move of moves) {
    const result = validateMove(state, move.from, move.to);
    if (!result.valid || result.count !== move.count) return null;
    state = applyMove(state, move.from, move.to);
  }
  return state;
}
