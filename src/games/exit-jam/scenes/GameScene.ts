import Phaser from "phaser";
import { ANIMATION, BOARD_AREA } from "../config.ts";
import { colorDefinition } from "../data/palette.ts";
import { LEVEL_COUNT, getLevel } from "../data/levels.ts";
import { BlockPiece } from "../entities/Block.ts";
import { ExitDoorView } from "../entities/ExitDoor.ts";
import { createBackdrop } from "../render/backdrop.ts";
import { COLORS, DEPTH } from "../render/theme.ts";
import { createPanel } from "../render/ui.ts";
import {
  blockDefinition,
  blockState,
  canExit,
  canMove,
  distanceToDoor,
  exitDoorFor,
  moveBlock,
} from "../systems/BoardManager.ts";
import { MoveHistory } from "../systems/MoveHistory.ts";
import {
  applyLevelCompletion,
  getStars,
  loadProgress,
  saveProgress,
  withSettings,
} from "../systems/ProgressionSystem.ts";
import { Sfx } from "../systems/Sfx.ts";
import {
  DIRECTIONS,
  type BlockState,
  type Direction,
  type LevelDefinition,
  type PlayerProgress,
  type PlayerSettings,
} from "../types/GameTypes.ts";
import { GameHUD } from "../ui/GameHUD.ts";
import { LevelCompletePanel } from "../ui/LevelCompletePanel.ts";
import { PauseMenu } from "../ui/PauseMenu.ts";

export interface GameSceneData {
  levelIndex?: number;
}

interface DragState {
  blockId: string;
  startX: number;
  startY: number;
  blocked: boolean;
}

interface HintMove {
  blockId: string;
  dx: number;
  dy: number;
  score: number;
}

const STEP_LABELS: Record<string, string> = {
  "0,-1": "arriba",
  "0,1": "abajo",
  "-1,0": "a la izquierda",
  "1,0": "a la derecha",
};

/**
 * Escena de juego de EXIT JAM. Las reglas viven en `BoardManager` y el
 * historial en `MoveHistory`; aquí solo se coordinan entrada, animaciones e
 * interfaz.
 */
export class GameScene extends Phaser.Scene {
  private levelIndex = 0;
  private level!: LevelDefinition;
  private progress!: PlayerProgress;
  private settings!: PlayerSettings;
  private history!: MoveHistory;
  private hud!: GameHUD;
  private pauseMenu!: PauseMenu;
  private completePanel!: LevelCompletePanel;
  private sfx!: Sfx;

  private blockViews = new Map<string, BlockPiece>();
  private exitingViews = new Map<string, BlockPiece>();
  private doorViews = new Map<string, ExitDoorView>();
  private selectedId: string | null = null;
  private drag: DragState | null = null;

  private boardX: number = BOARD_AREA.x;
  private boardY: number = BOARD_AREA.y;
  private boardPixelWidth: number = BOARD_AREA.size;
  private boardPixelHeight: number = BOARD_AREA.size;
  private cellSize = 0;

  private running = true;
  private solved = false;

  constructor() {
    super("GameScene");
  }

  create(data: GameSceneData = {}): void {
    const requested = data.levelIndex ?? 0;
    this.levelIndex = Math.max(
      0,
      Math.min(LEVEL_COUNT - 1, Math.floor(requested)),
    );
    this.level = getLevel(this.levelIndex);
    this.progress = loadProgress();
    this.settings = this.progress.settings;
    this.history = new MoveHistory(this.level);
    this.blockViews = new Map();
    this.exitingViews = new Map();
    this.doorViews = new Map();
    this.selectedId = null;
    this.drag = null;
    this.running = true;
    this.solved = false;

    createBackdrop(this, { specks: 54 });
    this.cameras.main.fadeIn(160, 21, 18, 37);

    this.buildBoard();
    this.sfx = new Sfx(this.settings.soundEnabled);

    this.hud = new GameHUD(this, this.level, this.levelIndex, LEVEL_COUNT, {
      onUndo: () => this.handleUndo(),
      onReset: () => this.handleReset(),
      onPause: () => this.togglePause(),
      onMenu: () => this.goToMenu(),
      onToggleSymbols: () => this.toggleSymbols(),
      onHint: () => this.handleHint(),
    });

    this.completePanel = new LevelCompletePanel(this, {
      onNext: () => this.startLevel(this.levelIndex + 1),
      onReplay: () => this.startLevel(this.levelIndex),
      onMenu: () => this.goToMenu(),
    });

    this.pauseMenu = new PauseMenu(this, this.settings, {
      onResume: () => this.resumeGame(),
      onRestart: () => {
        this.pauseMenu.hide();
        this.handleReset();
      },
      onMenu: () => this.goToMenu(),
      onSettingsChange: (patch) => this.applySettings(patch),
    });

    this.bindKeyboard();
    this.bindPointer();
    this.refresh(false);

    this.input.once("pointerdown", () => this.sfx.unlock());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.sfx.destroy();
    });
  }

  // --- Construcción del tablero -------------------------------------------

  private buildBoard(): void {
    this.cellSize = BOARD_AREA.size / Math.max(this.level.width, this.level.height);
    this.boardPixelWidth = this.level.width * this.cellSize;
    this.boardPixelHeight = this.level.height * this.cellSize;
    this.boardX =
      BOARD_AREA.x + (BOARD_AREA.size - this.boardPixelWidth) / 2;
    this.boardY =
      BOARD_AREA.y + (BOARD_AREA.size - this.boardPixelHeight) / 2;

    const frame = createPanel(
      this,
      this.boardX - 16,
      this.boardY - 16,
      this.boardPixelWidth + 32,
      this.boardPixelHeight + 32,
      { radius: 22, fillAlpha: 0.95 },
    );
    frame.setDepth(DEPTH.board);

    const base = this.add.graphics().setDepth(DEPTH.board + 1);
    base.fillStyle(COLORS.bgDeep, 0.94);
    base.fillRoundedRect(
      this.boardX,
      this.boardY,
      this.boardPixelWidth,
      this.boardPixelHeight,
      12,
    );

    for (let row = 0; row < this.level.height; row += 1) {
      for (let col = 0; col < this.level.width; col += 1) {
        const x = this.boardX + col * this.cellSize;
        const y = this.boardY + row * this.cellSize;
        base.fillStyle(
          (row + col) % 2 === 0 ? COLORS.panel : COLORS.panelLight,
          0.26,
        );
        base.fillRoundedRect(
          x + 3,
          y + 3,
          this.cellSize - 6,
          this.cellSize - 6,
          Math.max(4, this.cellSize * 0.08),
        );
        base.lineStyle(1, COLORS.borderSoft, 0.55);
        base.strokeRoundedRect(
          x + 3,
          y + 3,
          this.cellSize - 6,
          this.cellSize - 6,
          Math.max(4, this.cellSize * 0.08),
        );
      }
    }

    const outer = this.add.graphics().setDepth(DEPTH.board + 2);
    outer.lineStyle(2.5, COLORS.goldDark, 0.8);
    outer.strokeRoundedRect(
      this.boardX - 1,
      this.boardY - 1,
      this.boardPixelWidth + 2,
      this.boardPixelHeight + 2,
      13,
    );

    for (const door of this.level.doors) {
      const view = new ExitDoorView(
        this,
        door,
        this.boardX,
        this.boardY,
        this.boardPixelWidth,
        this.cellSize,
      );
      view.setShowSymbol(this.settings.showSymbols);
      this.doorViews.set(door.id, view);
    }

    for (const block of this.history.blocks) {
      const view = this.createBlockView(block);
      if (view) this.blockViews.set(block.id, view);
    }
  }

  private createBlockView(state: BlockState): BlockPiece | null {
    const definition = blockDefinition(this.level, state.id);
    if (!definition) return null;

    return new BlockPiece(this, definition, state, {
      boardX: this.boardX,
      boardY: this.boardY,
      cellSize: this.cellSize,
      showSymbols: this.settings.showSymbols,
      reducedMotion: this.settings.reducedMotion,
      exitReady: canExit(this.level, this.history.blocks, state.id),
      onPointerDown: (block, pointer) =>
        this.handleBlockPointerDown(block, pointer),
    });
  }

  // --- Entrada del jugador -------------------------------------------------

  private bindPointer(): void {
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      this.handlePointerMove(pointer);
    });
    this.input.on("pointerup", (pointer: Phaser.Input.Pointer) => {
      this.finishDrag(pointer);
    });
    this.input.on("gameout", () => {
      this.drag = null;
    });
  }

  private handleBlockPointerDown(
    block: BlockPiece,
    pointer: Phaser.Input.Pointer,
  ): void {
    if (!this.canInteract()) return;
    this.selectBlock(block.blockId);
    this.drag = {
      blockId: block.blockId,
      startX: pointer.x,
      startY: pointer.y,
      blocked: false,
    };
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this.drag || !this.canInteract()) return;

    const drag = this.drag;
    const state = blockState(this.history.blocks, drag.blockId);
    if (!state) {
      this.drag = null;
      return;
    }

    const dx = pointer.x - drag.startX;
    const dy = pointer.y - drag.startY;
    const threshold = this.cellSize * 0.55;
    const exitThreshold = this.cellSize * 0.32;

    const door = exitDoorFor(this.level, this.history.blocks, drag.blockId);
    if (door) {
      const margin = this.cellSize * 0.22;
      const outside =
        door.side === "left"
          ? pointer.x < this.boardX - margin
          : door.side === "right"
            ? pointer.x > this.boardX + this.boardPixelWidth + margin
            : door.side === "up"
              ? pointer.y < this.boardY - margin
              : pointer.y > this.boardY + this.boardPixelHeight + margin;
      if (
        outside ||
        this.pointsTowardDoor(door.side, dx, dy, exitThreshold)
      ) {
        this.drag = null;
        this.handleExit();
        return;
      }
    }

    if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return;

    const horizontalFirst = Math.abs(dx) >= Math.abs(dy);
    const candidates: Array<{ dx: number; dy: number }> = [];
    if (horizontalFirst) {
      if (dx !== 0) candidates.push({ dx: Math.sign(dx), dy: 0 });
      if (dy !== 0) candidates.push({ dx: 0, dy: Math.sign(dy) });
    } else {
      if (dy !== 0) candidates.push({ dx: 0, dy: Math.sign(dy) });
      if (dx !== 0) candidates.push({ dx: Math.sign(dx), dy: 0 });
    }

    for (const candidate of candidates) {
      if (this.tryStep(drag.blockId, candidate.dx, candidate.dy)) {
        drag.startX = pointer.x;
        drag.startY = pointer.y;
        drag.blocked = false;

        // Si el paso deja el bloque en su puerta y seguimos empujando hacia
        // ella, se saca en el mismo gesto.
        const reachedDoor = exitDoorFor(
          this.level,
          this.history.blocks,
          drag.blockId,
        );
        if (
          reachedDoor &&
          this.pointsTowardDoor(
            reachedDoor.side,
            candidate.dx,
            candidate.dy,
            0,
          )
        ) {
          this.drag = null;
          this.handleExit();
        } else if (this.solved) {
          this.drag = null;
        }
        return;
      }
    }

    if (!drag.blocked) {
      drag.blocked = true;
      this.blockViews.get(drag.blockId)?.flashInvalid();
      this.sfx.blocked();
    }
  }

  /** Indica si el gesto apunta hacia el lado donde está la puerta. */
  private pointsTowardDoor(
    side: Direction,
    dx: number,
    dy: number,
    threshold: number,
  ): boolean {
    switch (side) {
      case "left":
        return dx <= -threshold;
      case "right":
        return dx >= threshold;
      case "up":
        return dy <= -threshold;
      case "down":
        return dy >= threshold;
    }
  }

  private finishDrag(pointer: Phaser.Input.Pointer): void {
    const drag = this.drag;
    this.drag = null;
    if (!drag || !this.canInteract()) return;

    const door = exitDoorFor(this.level, this.history.blocks, drag.blockId);
    if (!door) return;

    const dx = pointer.x - drag.startX;
    const dy = pointer.y - drag.startY;
    if (
      this.pointsTowardDoor(door.side, dx, dy, this.cellSize * 0.2)
    ) {
      this.handleExit();
    }
  }

  /**
   * Ejecuta un desplazamiento de una celda. Devuelve `true` si el movimiento
   * era legal. La animación la resuelve `refresh`.
   */
  private tryStep(blockId: string, dx: number, dy: number): boolean {
    if (!this.canInteract()) return false;
    const next = this.history.applyStep(this.level, blockId, dx, dy);
    if (!next) return false;

    this.sfx.slide();
    this.refresh(true);
    this.checkVictory();
    return true;
  }

  private selectBlock(blockId: string): void {
    if (!this.canInteract()) return;
    if (this.selectedId === blockId) {
      this.refresh(false);
      return;
    }
    this.selectedId = blockId;
    this.sfx.select();
    this.refresh(false);
  }

  private handleExit(): void {
    if (!this.canInteract()) return;
    const blockId = this.selectedId;
    if (!blockId) {
      this.hud.showMessage(
        "Selecciona un bloque antes de intentar sacarlo.",
        "info",
      );
      return;
    }

    const view = this.blockViews.get(blockId);
    const door = exitDoorFor(this.level, this.history.blocks, blockId);
    if (!view || !door) {
      view?.flashInvalid();
      this.sfx.invalid();
      const definition = blockDefinition(this.level, blockId);
      this.hud.showMessage(
        definition
          ? `${colorDefinition(definition.color).name}: todavía no está en su puerta.`
          : "Ese bloque no puede salir todavía.",
        "danger",
      );
      return;
    }

    const next = this.history.applyExit(this.level, blockId);
    if (!next) return;

    this.blockViews.delete(blockId);
    this.exitingViews.set(blockId, view);
    this.selectedId = null;
    this.sfx.exit();
    view.setSelected(false);
    view.setExitReady(false);
    view.playExit(door.side, () => {
      this.exitingViews.delete(blockId);
    });

    this.refresh(true);
    const definition = blockDefinition(this.level, blockId);
    if (definition) {
      this.hud.showMessage(
        `${colorDefinition(definition.color).name} ha salido del tablero.`,
        "success",
      );
    }
    this.checkVictory();
  }

  private handleUndo(): void {
    if (
      !this.running ||
      this.pauseMenu.isOpen ||
      this.completePanel.isOpen ||
      this.solved
    ) {
      return;
    }
    if (!this.history.canUndo) {
      this.hud.showMessage("No hay movimientos que deshacer.", "info");
      return;
    }

    this.cancelExitingViews();
    this.history.undo();
    if (this.selectedId && !blockState(this.history.blocks, this.selectedId)) {
      this.selectedId = null;
    }
    this.sfx.undo();
    this.refresh(true);
  }

  private handleReset(): void {
    if (this.pauseMenu.isOpen || this.completePanel.isOpen) return;

    this.cancelExitingViews();
    for (const view of this.blockViews.values()) view.destroy();
    this.blockViews.clear();
    this.history.reset();
    this.selectedId = null;
    this.drag = null;
    this.solved = false;
    this.running = true;

    for (const block of this.history.blocks) {
      const view = this.createBlockView(block);
      if (view) this.blockViews.set(block.id, view);
    }

    this.sfx.click();
    this.refresh(false);
    this.hud.showMessage("Nivel reiniciado. Todos los bloques vuelven a su sitio.", "info");
  }

  private handleHint(): void {
    if (!this.canInteract()) return;

    // Primera jugada de la solución conocida, útil para arrancar el nivel.
    if (this.history.moveCount === 0 && this.level.solution?.length) {
      const move = this.level.solution[0]!;
      this.selectedId = move.blockId;
      this.refresh(false);
      this.sfx.hint();
      const definition = blockDefinition(this.level, move.blockId);
      const color = definition ? colorDefinition(definition.color) : null;
      this.hud.showMessage(
        move.exit
          ? `Pista: el bloque ${color?.name ?? ""} puede salir ya.`
          : `Pista: mueve el bloque ${color?.name ?? ""} ${
              STEP_LABELS[`${move.dx},${move.dy}`] ?? "una celda"
            }.`,
        "info",
      );
      return;
    }

    const state = this.history.blocks;

    if (this.selectedId && canExit(this.level, state, this.selectedId)) {
      this.sfx.hint();
      this.highlightExit(this.selectedId);
      this.hud.showMessage(
        "¡Ese bloque ya encaja en su puerta! Desliza o arrástralo hacia ella.",
        "success",
      );
      return;
    }

    const ready = state.find((block) =>
      canExit(this.level, state, block.id),
    );
    if (ready) {
      this.selectedId = ready.id;
      this.refresh(false);
      this.sfx.hint();
      const definition = blockDefinition(this.level, ready.id);
      this.hud.showMessage(
        `${
          definition ? colorDefinition(definition.color).name : "Un bloque"
        } ya puede salir por su puerta.`,
        "success",
      );
      return;
    }

    const hint = this.findHelpfulMove(state);
    if (hint) {
      this.selectedId = hint.blockId;
      this.refresh(false);
      this.sfx.hint();
      const definition = blockDefinition(this.level, hint.blockId);
      this.hud.showMessage(
        `Prueba a mover ${
          definition ? colorDefinition(definition.color).name : "ese bloque"
        } ${STEP_LABELS[`${hint.dx},${hint.dy}`] ?? "una celda"}.`,
        "info",
      );
      return;
    }

    this.sfx.invalid();
    this.hud.showMessage(
      "No hay una pista clara ahora mismo. Deshaz algún movimiento y prueba otro orden.",
      "danger",
    );
  }

  private findHelpfulMove(state: readonly BlockState[]): HintMove | null {
    const currentScore = this.totalDoorDistance(state);
    let best: HintMove | null = null;

    for (const block of state) {
      for (const { dx, dy } of DIRECTIONS) {
        if (!canMove(this.level, state, block.id, dx, dy)) continue;
        const next = moveBlock(this.level, state, block.id, dx, dy);
        if (!next) continue;
        const score = this.totalDoorDistance(next);
        if (score >= currentScore) continue;
        if (!best || score < best.score) {
          best = { blockId: block.id, dx, dy, score };
        }
      }
    }

    return best;
  }

  private totalDoorDistance(state: readonly BlockState[]): number {
    let total = 0;
    for (const block of state) {
      total += distanceToDoor(this.level, state, block.id) ?? 0;
    }
    return total;
  }

  private highlightExit(blockId: string): void {
    const door = exitDoorFor(this.level, this.history.blocks, blockId);
    for (const [id, view] of this.doorViews) {
      view.setHighlight(Boolean(door && door.id === id));
    }
  }

  private toggleSymbols(): void {
    if (!this.canInteract()) return;
    const showSymbols = !this.settings.showSymbols;
    this.applySettings({ showSymbols });
    this.sfx.click();
    this.hud.showMessage(
      showSymbols
        ? "Símbolos visibles: el color y la marca coinciden."
        : "Símbolos ocultos: usa el color y la forma de cada puerta.",
      "info",
    );
  }

  // --- Sincronización visual y HUD ----------------------------------------

  private refresh(animate: boolean): void {
    this.syncBlockViews(animate);

    if (this.selectedId && !blockState(this.history.blocks, this.selectedId)) {
      this.selectedId = null;
    }

    for (const [id, view] of this.blockViews) {
      view.setSelected(id === this.selectedId);
      view.setExitReady(canExit(this.level, this.history.blocks, id));
    }

    const selectedDoor = this.selectedId
      ? exitDoorFor(this.level, this.history.blocks, this.selectedId)
      : null;
    for (const [id, view] of this.doorViews) {
      view.setHighlight(Boolean(selectedDoor && selectedDoor.id === id));
    }

    this.updateHud();
  }

  private syncBlockViews(animate: boolean): void {
    const state = this.history.blocks;
    const ids = new Set(state.map((block) => block.id));

    for (const [id, view] of [...this.blockViews]) {
      if (!ids.has(id)) {
        view.destroy();
        this.blockViews.delete(id);
      }
    }

    for (const block of state) {
      const existing = this.blockViews.get(block.id);
      if (existing) {
        const position = existing.cellPosition;
        if (position.x !== block.x || position.y !== block.y) {
          existing.syncPosition(block, animate);
        }
        continue;
      }
      if (this.exitingViews.has(block.id)) continue;
      const view = this.createBlockView(block);
      if (view) this.blockViews.set(block.id, view);
    }
  }

  private cancelExitingViews(): void {
    for (const view of this.exitingViews.values()) {
      if (view.active) view.destroy();
    }
    this.exitingViews.clear();
  }

  private updateHud(): void {
    const selectedState = this.selectedId
      ? blockState(this.history.blocks, this.selectedId)
      : null;
    const definition = selectedState
      ? blockDefinition(this.level, selectedState.id)
      : null;
    const color = definition ? colorDefinition(definition.color) : null;

    this.hud.update({
      moves: this.history.moveCount,
      remaining: this.history.blocks.length,
      total: this.level.blocks.length,
      canUndo: this.history.canUndo,
      selected:
        definition && color
          ? {
              id: definition.id,
              color: definition.color,
              symbol: color.symbol,
              exitReady: canExit(this.level, this.history.blocks, definition.id),
            }
          : null,
      showSymbols: this.settings.showSymbols,
      bestMoves: this.progress.bestMoveCounts[this.level.id] ?? null,
    });
  }

  private checkVictory(): void {
    if (this.solved || this.history.blocks.length > 0) return;

    this.solved = true;
    this.running = false;
    this.drag = null;

    const moves = this.history.moveCount;
    const previousBest = this.progress.bestMoveCounts[this.level.id];
    const isNewBest = previousBest === undefined || moves < previousBest;

    this.progress = applyLevelCompletion(
      this.progress,
      this.level.id,
      this.levelIndex,
      moves,
    );
    saveProgress(this.progress);

    const bestMoves = this.progress.bestMoveCounts[this.level.id] ?? null;
    this.updateHud();
    this.sfx.victory();
    this.hud.showMessage("¡Tablero despejado!", "success");

    const stars = getStars(moves, this.level.targetMoves);
    const delay = this.settings.reducedMotion ? 0 : ANIMATION.victoryMs;
    this.time.delayedCall(delay, () => {
      this.completePanel.show({
        levelName: this.level.name,
        moves,
        targetMoves: this.level.targetMoves,
        stars,
        bestMoves,
        hasNext: this.levelIndex < LEVEL_COUNT - 1,
        isNewBest,
      });
    });
  }

  // --- Pausa, ajustes y navegación ----------------------------------------

  private canInteract(): boolean {
    return (
      this.running &&
      !this.solved &&
      !this.pauseMenu?.isOpen &&
      !this.completePanel?.isOpen
    );
  }

  private togglePause(): void {
    if (this.pauseMenu.isOpen) {
      this.resumeGame();
      return;
    }
    if (this.solved || this.completePanel.isOpen) return;

    this.running = false;
    this.drag = null;
    this.sfx.click();
    this.pauseMenu.show();
  }

  private resumeGame(): void {
    if (!this.pauseMenu.isOpen) return;
    this.pauseMenu.hide();
    if (!this.solved) this.running = true;
    this.sfx.click();
  }

  private applySettings(patch: Partial<PlayerSettings>): void {
    this.progress = withSettings(this.progress, patch);
    saveProgress(this.progress);
    this.settings = this.progress.settings;

    this.sfx.setEnabled(this.settings.soundEnabled);
    for (const view of this.blockViews.values()) {
      view.setShowSymbols(this.settings.showSymbols);
      view.setReducedMotion(this.settings.reducedMotion);
    }
    for (const view of this.doorViews.values()) {
      view.setShowSymbol(this.settings.showSymbols);
    }
    this.pauseMenu.setSettings(this.settings);
    this.refresh(false);
  }

  private toggleSound(): void {
    if (!this.running) return;
    const enabled = !this.settings.soundEnabled;
    this.applySettings({ soundEnabled: enabled });
    if (enabled) this.sfx.click();
    this.hud.showMessage(
      enabled ? "Sonido activado." : "Sonido silenciado.",
      "info",
    );
  }

  private startLevel(index: number): void {
    if (index < 0 || index >= LEVEL_COUNT) return;

    this.running = false;
    this.drag = null;
    this.completePanel.hide();
    this.pauseMenu.hide();
    this.cameras.main.fadeOut(140, 21, 18, 37);
    this.time.delayedCall(150, () => {
      this.scene.restart({ levelIndex: index } satisfies GameSceneData);
    });
  }

  private goToMenu(): void {
    this.running = false;
    this.drag = null;
    this.pauseMenu.hide();
    this.completePanel.hide();
    this.cameras.main.fadeOut(140, 21, 18, 37);
    this.time.delayedCall(150, () => {
      this.scene.start("MenuScene");
    });
  }

  private bindKeyboard(): void {
    const keyboard = this.input.keyboard;
    if (!keyboard) return;

    keyboard.on("keydown-UP", () => this.moveSelected(0, -1));
    keyboard.on("keydown-DOWN", () => this.moveSelected(0, 1));
    keyboard.on("keydown-LEFT", () => this.moveSelected(-1, 0));
    keyboard.on("keydown-RIGHT", () => this.moveSelected(1, 0));
    keyboard.on("keydown-Z", () => this.handleUndo());
    keyboard.on("keydown-R", () => {
      if (this.canInteract()) this.handleReset();
    });
    keyboard.on("keydown-H", () => this.handleHint());
    keyboard.on("keydown-S", () => this.toggleSymbols());
    keyboard.on("keydown-M", () => this.toggleSound());
    keyboard.on("keydown-ESC", () => this.togglePause());
  }

  private moveSelected(dx: number, dy: number): void {
    if (!this.canInteract()) return;
    if (!this.selectedId) {
      this.hud.showMessage(
        "Selecciona primero un bloque con el ratón o el dedo.",
        "info",
      );
      return;
    }

    if (!this.tryStep(this.selectedId, dx, dy)) {
      this.blockViews.get(this.selectedId)?.flashInvalid();
      this.sfx.blocked();
    }
  }
}
