import type { CellId } from "../types/puzzle.ts";

export interface ToggleResult {
  added: boolean;
  cats: ReadonlySet<CellId>;
}

/**
 * Historial de colocaciones basado en instantáneas.
 *
 * El tablero tiene como máximo 81 celdas, así que guardar un conjunto por
 * jugada es barato y evita errores al deshacer reinicios o acciones mezcladas.
 */
export class MoveHistory {
  private states: Array<Set<CellId>> = [new Set()];

  get cats(): ReadonlySet<CellId> {
    return this.states[this.states.length - 1] ?? new Set();
  }

  get canUndo(): boolean {
    return this.states.length > 1;
  }

  get moves(): number {
    return this.states.length - 1;
  }

  has(id: CellId): boolean {
    return this.cats.has(id);
  }

  toggle(id: CellId): ToggleResult {
    const current = this.states[this.states.length - 1] ?? new Set();
    const next = new Set(current);
    let added = false;
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
      added = true;
    }
    this.states.push(next);
    return { added, cats: next };
  }

  undo(): ReadonlySet<CellId> | null {
    if (this.states.length <= 1) return null;
    this.states.pop();
    return this.cats;
  }

  reset(): ReadonlySet<CellId> {
    this.states = [new Set()];
    return this.cats;
  }

  snapshot(): CellId[] {
    return [...this.cats];
  }
}
