import type { BottleState, PourMove } from "../types/puzzle.ts";
import { applyMove, cloneBottles } from "./MoveValidator.ts";

/**
 * Historial de estados de CHROMA.
 *
 * Cada movimiento guarda una instantánea completa de las botellas. Los niveles
 * tienen pocas unidades, así que el coste es pequeño y deshacer es exacto.
 */
export class MoveHistory {
  private states: BottleState[][];
  private moves: PourMove[] = [];

  constructor(initial: readonly BottleState[]) {
    this.states = [cloneBottles(initial)];
  }

  get bottles(): BottleState[] {
    return this.states[this.states.length - 1] ?? [];
  }

  get canUndo(): boolean {
    return this.states.length > 1;
  }

  get moveCount(): number {
    return this.states.length - 1;
  }

  get lastMove(): PourMove | null {
    return this.moves[this.moves.length - 1] ?? null;
  }

  get moveList(): readonly PourMove[] {
    return this.moves;
  }

  /**
   * Aplica un movimiento ya validado y guarda la instantánea resultante.
   * Devuelve el nuevo estado.
   */
  apply(move: PourMove): BottleState[] {
    const next = applyMove(this.bottles, move.from, move.to);
    this.states.push(next);
    this.moves.push({ ...move });
    return this.bottles;
  }

  undo(): BottleState[] | null {
    if (!this.canUndo) return null;
    this.states.pop();
    this.moves.pop();
    return this.bottles;
  }

  reset(): BottleState[] {
    const initial = this.states[0] ?? [];
    this.states = [cloneBottles(initial)];
    this.moves = [];
    return this.bottles;
  }

  snapshot(): BottleState[] {
    return cloneBottles(this.bottles);
  }
}
