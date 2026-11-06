import {
  cloneBlocks,
  exitBlock,
  initialState,
  moveBlock,
} from "./BoardManager.ts";
import type {
  BlockState,
  LevelDefinition,
  Move,
} from "../types/GameTypes.ts";

/**
 * Historial de EXIT JAM.
 *
 * Cada paso de celda y cada salida guardan una instantánea. Los niveles tienen
 * pocos bloques, así que deshacer es exacto y barato. Un arrastre que mueve
 * varias celdas se deshace paso a paso, igual que se ejecutó.
 */
export class MoveHistory {
  private states: BlockState[][];
  private moves: Move[] = [];

  constructor(level: LevelDefinition) {
    this.states = [initialState(level)];
  }

  get blocks(): BlockState[] {
    return this.states[this.states.length - 1] ?? [];
  }

  get canUndo(): boolean {
    return this.states.length > 1;
  }

  get moveCount(): number {
    return this.states.length - 1;
  }

  get lastMove(): Move | null {
    return this.moves[this.moves.length - 1] ?? null;
  }

  get moveList(): readonly Move[] {
    return this.moves;
  }

  applyStep(
    level: LevelDefinition,
    blockId: string,
    dx: number,
    dy: number,
  ): BlockState[] | null {
    const next = moveBlock(level, this.blocks, blockId, dx, dy);
    if (!next) return null;
    this.states.push(next);
    this.moves.push({ blockId, dx, dy });
    return this.blocks;
  }

  applyExit(level: LevelDefinition, blockId: string): BlockState[] | null {
    const next = exitBlock(level, this.blocks, blockId);
    if (!next) return null;
    this.states.push(next);
    this.moves.push({ blockId, dx: 0, dy: 0, exit: true });
    return this.blocks;
  }

  undo(): BlockState[] | null {
    if (!this.canUndo) return null;
    this.states.pop();
    this.moves.pop();
    return this.blocks;
  }

  reset(): BlockState[] {
    const initial = this.states[0] ?? [];
    this.states = [cloneBlocks(initial)];
    this.moves = [];
    return this.blocks;
  }

  snapshot(): BlockState[] {
    return cloneBlocks(this.blocks);
  }
}
