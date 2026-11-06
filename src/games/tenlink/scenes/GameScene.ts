import Phaser from "phaser";
import {
  ANIMATION,
  BOARD_AREA,
  BOARD_SHAPE,
  INITIAL_NUMBERS,
  REFILL_NUMBERS,
  TIMER_TICK_MS,
} from "../config.ts";
import { NumberCell } from "../entities/NumberCell.ts";
import { createBackdrop } from "../render/backdrop.ts";
import { COLORS, DEPTH } from "../render/theme.ts";
import { createPanel, floatingText } from "../render/ui.ts";
import {
  collapseRows,
  remainingCells,
  removePair,
} from "../systems/BoardManager.ts";
import { fillRandomCells, generateBoard } from "../systems/BoardGenerator.ts";
import {
  allValidPairs,
  checkPair,
  hasValidPair,
  validPartners,
} from "../systems/PairValidator.ts";
import {
  applyRunResult,
  loadProgress,
  saveProgress,
  withSettings,
} from "../systems/ProgressionSystem.ts";
import { Sfx } from "../systems/Sfx.ts";
import {
  cellKey,
  valueAt,
  type CellPosition,
  type CellValue,
  type PairCheck,
  type PlayerProgress,
  type PlayerSettings,
} from "../types/GameTypes.ts";
import { GameHUD } from "../ui/GameHUD.ts";
import { PauseMenu } from "../ui/PauseMenu.ts";
import { RunEndPanel } from "../ui/RunEndPanel.ts";

/**
 * Escena principal de TENLINK en modo infinito. La lógica de validación,
 * generación y compactación vive en módulos puros; esta escena coordina la
 * cuadrícula, la entrada, las animaciones y la interfaz.
 */
export class GameScene extends Phaser.Scene {
  private progress!: PlayerProgress;
  private settings!: PlayerSettings;
  private hud!: GameHUD;
  private pauseMenu!: PauseMenu;
  private runEndPanel!: RunEndPanel;
  private sfx!: Sfx;

  private board: CellValue[][] = [];
  private cells: NumberCell[][] = [];
  private cellSize = 0;
  private boardX: number = BOARD_AREA.x;
  private boardY: number = BOARD_AREA.y;
  private boardPixelWidth: number = BOARD_AREA.size;
  private boardPixelHeight: number = BOARD_AREA.size;

  private selected: CellPosition | null = null;
  private partnerCells: CellPosition[] = [];
  private hintCells = new Set<string>();
  private cursor: CellPosition = { row: 0, col: 0 };

  private elapsedMs = 0;
  private timerAccumulator = 0;
  private pairsCleared = 0;
  private animating = false;
  private stuckAnnounced = false;
  private running = true;
  private runEnded = false;
  private runRecorded = false;

  constructor() {
    super("GameScene");
  }

  create(): void {
    this.progress = loadProgress();
    this.settings = this.progress.settings;
    this.resetState();

    createBackdrop(this, { specks: 54 });
    this.cameras.main.fadeIn(160, 5, 13, 19);

    this.buildBoard();
    this.sfx = new Sfx(this.settings.soundEnabled);

    this.hud = new GameHUD(this, {
      onMoreNumbers: () => this.handleMoreNumbers(),
      onReset: () => this.startNewRun(),
      onPause: () => this.togglePause(),
      onMenu: () => this.goToMenu(),
      onHint: () => this.handleHint(),
    });

    this.runEndPanel = new RunEndPanel(this, {
      onRestart: () => this.startNewRun(),
      onMenu: () => this.goToMenu(),
    });

    this.pauseMenu = new PauseMenu(this, this.settings, {
      onResume: () => this.resumeGame(),
      onRestart: () => {
        this.pauseMenu.hide();
        this.startNewRun();
      },
      onMenu: () => this.goToMenu(),
      onSettingsChange: (patch) => this.applySettings(patch),
    });

    this.bindKeyboard();
    this.refreshVisuals();
    this.updateHud();

    this.input.once("pointerdown", () => this.sfx.unlock());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.hud.destroy();
      this.pauseMenu.destroy();
      this.runEndPanel.destroy();
      this.sfx.destroy();
    });
  }

  update(_time: number, delta: number): void {
    if (
      !this.running ||
      this.runEnded ||
      this.pauseMenu.isOpen ||
      this.runEndPanel.isOpen
    ) {
      return;
    }
    this.elapsedMs += delta;
    this.timerAccumulator += delta;
    if (this.timerAccumulator >= TIMER_TICK_MS) {
      this.timerAccumulator = 0;
      this.updateHud();
    }
  }

  private resetState(): void {
    this.board = generateBoard(BOARD_SHAPE, INITIAL_NUMBERS);
    this.cells = [];
    this.selected = null;
    this.partnerCells = [];
    this.hintCells = new Set();
    this.cursor = { row: 0, col: 0 };
    this.elapsedMs = 0;
    this.timerAccumulator = 0;
    this.pairsCleared = 0;
    this.animating = false;
    this.stuckAnnounced = false;
    this.running = true;
    this.runEnded = false;
    this.runRecorded = false;
  }

  // --- Construcción del tablero -------------------------------------------

  private buildBoard(): void {
    this.cellSize =
      BOARD_AREA.size / Math.max(BOARD_SHAPE.width, BOARD_SHAPE.height);
    this.boardPixelWidth = BOARD_SHAPE.width * this.cellSize;
    this.boardPixelHeight = BOARD_SHAPE.height * this.cellSize;
    this.boardX = BOARD_AREA.x + (BOARD_AREA.size - this.boardPixelWidth) / 2;
    this.boardY = BOARD_AREA.y + (BOARD_AREA.size - this.boardPixelHeight) / 2;

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
    base.fillStyle(COLORS.bgDeep, 0.92);
    base.fillRoundedRect(
      this.boardX,
      this.boardY,
      this.boardPixelWidth,
      this.boardPixelHeight,
      14,
    );
    base.lineStyle(2.5, COLORS.border, 0.9);
    base.strokeRoundedRect(
      this.boardX,
      this.boardY,
      this.boardPixelWidth,
      this.boardPixelHeight,
      14,
    );

    this.cells = [];
    for (let row = 0; row < BOARD_SHAPE.height; row += 1) {
      const line: NumberCell[] = [];
      for (let col = 0; col < BOARD_SHAPE.width; col += 1) {
        line.push(this.createCell(row, col, valueAt(this.board, row, col)));
      }
      this.cells.push(line);
    }

    const outer = this.add.graphics().setDepth(DEPTH.board + 2);
    outer.lineStyle(1.5, COLORS.gold, 0.35);
    outer.strokeRoundedRect(
      this.boardX + 2,
      this.boardY + 2,
      this.boardPixelWidth - 4,
      this.boardPixelHeight - 4,
      12,
    );

    this.cursor = this.findInitialCursor();
  }

  private createCell(
    row: number,
    col: number,
    value: CellValue,
  ): NumberCell {
    return new NumberCell(
      this,
      row,
      col,
      this.slotX(col),
      this.slotY(row),
      {
        value,
        cellSize: this.cellSize,
        reducedMotion: this.settings.reducedMotion,
        onPointerDown: (clicked) => this.handleCellClick(clicked),
      },
    );
  }

  private slotX(col: number): number {
    return this.boardX + col * this.cellSize + this.cellSize / 2;
  }

  private slotY(row: number): number {
    return this.boardY + row * this.cellSize + this.cellSize / 2;
  }

  private findInitialCursor(): CellPosition {
    const preferred = {
      row: Math.floor(BOARD_SHAPE.height / 2),
      col: Math.floor(BOARD_SHAPE.width / 2),
    };
    if (valueAt(this.board, preferred.row, preferred.col) !== null) {
      return preferred;
    }
    for (let row = 0; row < BOARD_SHAPE.height; row += 1) {
      for (let col = 0; col < BOARD_SHAPE.width; col += 1) {
        if (valueAt(this.board, row, col) !== null) {
          return { row, col };
        }
      }
    }
    return preferred;
  }

  // --- Entrada del jugador -------------------------------------------------

  private handleCellClick(cell: NumberCell): void {
    if (!this.canInteract() || cell.isEmpty) return;

    this.cursor = { row: cell.row, col: cell.col };
    this.clearHintCells();

    if (!this.selected) {
      this.selectCell({ row: cell.row, col: cell.col });
      return;
    }

    if (this.selected.row === cell.row && this.selected.col === cell.col) {
      this.clearSelection(false);
      this.refreshVisuals();
      this.updateHud();
      return;
    }

    const selectedValue = valueAt(
      this.board,
      this.selected.row,
      this.selected.col,
    );
    const clickedValue = cell.value;
    if (selectedValue === null || clickedValue === null) {
      this.clearSelection(true);
      this.selectCell({ row: cell.row, col: cell.col });
      return;
    }

    const check = checkPair(
      BOARD_SHAPE,
      this.board,
      this.selected,
      { row: cell.row, col: cell.col },
    );

    if (check.valid) {
      this.removePairAt(this.selected, { row: cell.row, col: cell.col });
      return;
    }

    cell.flashInvalid();
    this.sfx.invalid();
    this.hud.showMessage(
      this.describeInvalidPair(selectedValue, clickedValue, check),
      "danger",
    );
    this.refreshVisuals();
  }

  private selectCell(position: CellPosition): void {
    this.selected = { ...position };
    this.updatePartners();
    this.sfx.select();
    this.refreshVisuals();
    this.updateHud();
  }

  private clearSelection(silent: boolean): void {
    this.selected = null;
    this.partnerCells = [];
    if (!silent) this.sfx.deselect();
  }

  private updatePartners(): void {
    this.partnerCells = this.selected
      ? validPartners(BOARD_SHAPE, this.board, this.selected)
      : [];
  }

  private removePairAt(a: CellPosition, b: CellPosition): void {
    const cellA = this.cells[a.row]?.[a.col];
    const cellB = this.cells[b.row]?.[b.col];
    if (!cellA || !cellB) return;

    const valueA = valueAt(this.board, a.row, a.col);
    const valueB = valueAt(this.board, b.row, b.col);
    const removed = removePair(BOARD_SHAPE, this.board, a, b);
    if (!removed) {
      this.sfx.invalid();
      return;
    }
    const collapsed = collapseRows(removed);

    this.animating = true;
    this.clearSelection(true);
    this.clearHintCells();
    this.refreshVisuals();

    this.sfx.match();
    if (valueA !== null && valueB !== null) {
      floatingText(
        this,
        (cellA.centerX + cellB.centerX) / 2,
        (cellA.centerY + cellB.centerY) / 2,
        `${valueA}+${valueB}=10`,
        COLORS.goldBright,
        18,
      );
    }

    let pending = 2;
    const finish = (): void => {
      pending -= 1;
      if (pending > 0) return;

      this.pairsCleared += 1;
      this.board = collapsed.board;
      const moved = collapsed.removedRows.length > 0;

      if (moved) {
        this.applyCollapsedBoard(collapsed);
      } else {
        this.syncBoard(true);
        this.refreshVisuals();
        this.updateHud();
        this.checkStuck();
        this.animating = false;
      }
    };

    cellA.playRemove(finish);
    cellB.playRemove(finish);
  }

  private describeInvalidPair(
    first: number,
    second: number,
    check: PairCheck,
  ): string {
    switch (check.reason) {
      case "sum":
        return `${first} + ${second} = ${check.sum}. Necesitas exactamente 10.`;
      case "not-connected":
        return `${first} + ${second} = 10, pero esas casillas no están conectadas.`;
      case "empty":
        return "Una de las casillas ya está vacía.";
      case "same-cell":
        return "Necesitas dos casillas distintas.";
      default:
        return "Esa pareja no es válida.";
    }
  }

  private moveCursor(dr: number, dc: number): void {
    if (!this.canInteract()) return;
    const row = Math.max(
      0,
      Math.min(BOARD_SHAPE.height - 1, this.cursor.row + dr),
    );
    const col = Math.max(
      0,
      Math.min(BOARD_SHAPE.width - 1, this.cursor.col + dc),
    );
    if (row === this.cursor.row && col === this.cursor.col) return;
    this.cursor = { row, col };
    this.sfx.click();
    this.refreshVisuals();
  }

  private activateCursor(): void {
    if (!this.canInteract()) return;
    const cell = this.cells[this.cursor.row]?.[this.cursor.col];
    if (!cell || cell.isEmpty) {
      this.hud.showMessage("Esa casilla está vacía.", "info");
      return;
    }
    this.handleCellClick(cell);
  }

  // --- Acciones ------------------------------------------------------------

  private handleMoreNumbers(): void {
    if (!this.canInteract()) return;

    if (!this.hasEmptyCells()) {
      this.hud.showMessage(
        "El tablero está lleno. Reinicia para empezar otra partida.",
        "info",
      );
      return;
    }

    const before = remainingCells(this.board);
    const next = fillRandomCells(BOARD_SHAPE, this.board, REFILL_NUMBERS);
    const added = remainingCells(next) - before;
    if (added <= 0) return;

    this.board = next;
    this.selected = null;
    this.partnerCells = [];
    this.clearHintCells();
    this.stuckAnnounced = false;
    this.syncBoard(true);
    this.refreshVisuals();
    this.updateHud();
    this.sfx.match();
    this.hud.showMessage(`+${added} números nuevos.`, "success");
    this.checkStuck();
  }

  private startNewRun(): void {
    if (!this.runRecorded) this.recordRun();
    this.runEnded = true;
    this.running = false;
    this.runEndPanel.hide();
    this.pauseMenu.hide();
    this.sfx.click();
    this.cameras.main.fadeOut(140, 5, 13, 19);
    this.time.delayedCall(150, () => {
      this.scene.restart();
    });
  }

  private handleHint(): void {
    if (!this.canInteract()) return;

    this.clearHintCells();
    const pair = allValidPairs(BOARD_SHAPE, this.board)[0];

    if (!pair) {
      this.stuckAnnounced = true;
      this.sfx.invalid();
      this.hud.showMessage(
        this.hasEmptyCells()
          ? "No quedan parejas. Pide más números o reinicia."
          : "No quedan parejas posibles. Reinicia la partida.",
        "danger",
      );
      return;
    }

    const a = pair[0];
    const b = pair[1];
    const valueA = valueAt(this.board, a.row, a.col);
    const valueB = valueAt(this.board, b.row, b.col);

    this.selected = { ...a };
    this.cursor = { ...a };
    this.updatePartners();
    this.hintCells = new Set([cellKey(a.row, a.col), cellKey(b.row, b.col)]);
    this.sfx.hint();
    this.refreshVisuals();
    this.updateHud();
    this.hud.showMessage(`Pista: ${valueA} + ${valueB} = 10.`, "info");
  }

  // --- Sincronización visual y HUD ----------------------------------------

  private refreshVisuals(): void {
    const selectedKey = this.selected
      ? cellKey(this.selected.row, this.selected.col)
      : null;
    const cursorKey = cellKey(this.cursor.row, this.cursor.col);

    for (const line of this.cells) {
      for (const cell of line) {
        const key = cellKey(cell.row, cell.col);
        cell.setSelected(key === selectedKey);
        cell.setHint(this.hintCells.has(key));
        cell.setCursor(key === cursorKey);
      }
    }
  }

  private clearHintCells(): void {
    if (this.hintCells.size === 0) return;
    this.hintCells.clear();
    for (const line of this.cells) {
      for (const cell of line) cell.setHint(false);
    }
  }

  private syncBoard(animate: boolean): void {
    for (let row = 0; row < BOARD_SHAPE.height; row += 1) {
      for (let col = 0; col < BOARD_SHAPE.width; col += 1) {
        const cell = this.cells[row]?.[col];
        if (!cell) continue;
        const value = valueAt(this.board, row, col);
        if (cell.value !== value) cell.setValue(value, animate);
      }
    }
  }

  private applyCollapsedBoard(collapsed: {
    board: CellValue[][];
    removedRows: number[];
  }): void {
    const oldCells = this.cells;
    const removed = new Set(collapsed.removedRows);
    const next: NumberCell[][] = [];

    for (let oldRow = 0; oldRow < oldCells.length; oldRow += 1) {
      const line = oldCells[oldRow] ?? [];
      if (removed.has(oldRow)) {
        for (const cell of line) cell.destroy();
        continue;
      }

      const newRow = next.length;
      for (let col = 0; col < line.length; col += 1) {
        line[col]!.moveToSlot(
          newRow,
          col,
          this.slotX(col),
          this.slotY(newRow),
          !this.settings.reducedMotion,
        );
      }
      next.push(line);
    }

    while (next.length < BOARD_SHAPE.height) {
      const row = next.length;
      const line: NumberCell[] = [];
      for (let col = 0; col < BOARD_SHAPE.width; col += 1) {
        line.push(this.createCell(row, col, null));
      }
      next.push(line);
    }

    this.cells = next;
    this.syncBoard(true);
    this.cursor = this.findInitialCursor();
    this.refreshVisuals();
    this.updateHud();

    const delay = this.settings.reducedMotion ? 0 : ANIMATION.collapseMs;
    this.time.delayedCall(delay, () => {
      this.animating = false;
      this.checkStuck();
    });
  }

  private updateHud(): void {
    const selectedValue = this.selected
      ? valueAt(this.board, this.selected.row, this.selected.col)
      : null;

    this.hud.update({
      pairs: this.pairsCleared,
      numbers: remainingCells(this.board),
      capacity: BOARD_SHAPE.width * BOARD_SHAPE.height,
      elapsedMs: this.elapsedMs,
      bestPairs: this.progress.bestPairs,
      bestTimeMs: this.progress.bestTimeMs,
      selected:
        selectedValue === null
          ? null
          : {
              value: selectedValue,
              partners: this.partnerCells.length,
            },
      canRefill: this.hasEmptyCells(),
    });
  }

  private hasEmptyCells(): boolean {
    return (
      remainingCells(this.board) < BOARD_SHAPE.width * BOARD_SHAPE.height
    );
  }

  private checkStuck(): void {
    if (this.runEnded || !this.running) return;
    if (hasValidPair(BOARD_SHAPE, this.board)) {
      this.stuckAnnounced = false;
      return;
    }

    if (remainingCells(this.board) === 0) {
      this.stuckAnnounced = false;
      this.hud.showMessage(
        "¡Tablero vacío! Pide más números para seguir.",
        "success",
      );
      return;
    }

    if (this.hasEmptyCells()) {
      if (!this.stuckAnnounced) {
        this.stuckAnnounced = true;
        this.sfx.invalid();
        this.hud.showMessage(
          "No quedan parejas. Pide más números o reinicia.",
          "danger",
        );
      }
      return;
    }

    this.endRun();
  }

  private recordRun(): boolean {
    if (this.runRecorded) return false;
    this.runRecorded = true;

    const previousPairs = this.progress.bestPairs;
    const previousTime = this.progress.bestTimeMs;
    this.progress = applyRunResult(
      this.progress,
      this.pairsCleared,
      this.elapsedMs,
    );
    saveProgress(this.progress);

    return (
      this.pairsCleared > 0 &&
      (this.pairsCleared > previousPairs ||
        (this.pairsCleared === previousPairs &&
          (previousTime === null || this.elapsedMs < previousTime)))
    );
  }

  private endRun(): void {
    if (this.runEnded) return;
    this.runEnded = true;
    this.running = false;
    this.animating = false;
    this.clearSelection(true);
    this.clearHintCells();

    const isNewBest = this.recordRun();
    this.updateHud();
    this.sfx.invalid();

    const delay = this.settings.reducedMotion ? 0 : 420;
    this.time.delayedCall(delay, () => {
      this.runEndPanel.show({
        pairs: this.pairsCleared,
        timeMs: this.elapsedMs,
        bestPairs: this.progress.bestPairs,
        bestTimeMs: this.progress.bestTimeMs,
        isNewBest,
      });
    });
  }

  // --- Pausa, ajustes y navegación ----------------------------------------

  private canInteract(): boolean {
    return (
      this.running &&
      !this.runEnded &&
      !this.animating &&
      !this.pauseMenu?.isOpen &&
      !this.runEndPanel?.isOpen
    );
  }

  private togglePause(): void {
    if (this.pauseMenu.isOpen) {
      this.resumeGame();
      return;
    }
    if (this.runEnded || this.runEndPanel.isOpen) return;

    this.running = false;
    this.sfx.click();
    this.pauseMenu.show();
  }

  private resumeGame(): void {
    if (!this.pauseMenu.isOpen) return;
    this.pauseMenu.hide();
    if (!this.runEnded) this.running = true;
    this.sfx.click();
    this.checkStuck();
  }

  private applySettings(patch: Partial<PlayerSettings>): void {
    this.progress = withSettings(this.progress, patch);
    saveProgress(this.progress);
    this.settings = this.progress.settings;

    this.sfx.setEnabled(this.settings.soundEnabled);
    for (const line of this.cells) {
      for (const cell of line) {
        cell.setReducedMotion(this.settings.reducedMotion);
      }
    }
    this.pauseMenu.setSettings(this.settings);
    this.refreshVisuals();
    this.updateHud();
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

  private goToMenu(): void {
    if (!this.runRecorded) this.recordRun();
    this.running = false;
    this.runEnded = true;
    this.pauseMenu.hide();
    this.runEndPanel.hide();
    this.cameras.main.fadeOut(140, 5, 13, 19);
    this.time.delayedCall(150, () => {
      this.scene.start("MenuScene");
    });
  }

  private bindKeyboard(): void {
    const keyboard = this.input.keyboard;
    if (!keyboard) return;

    keyboard.addCapture([
      Phaser.Input.Keyboard.KeyCodes.UP,
      Phaser.Input.Keyboard.KeyCodes.DOWN,
      Phaser.Input.Keyboard.KeyCodes.LEFT,
      Phaser.Input.Keyboard.KeyCodes.RIGHT,
      Phaser.Input.Keyboard.KeyCodes.SPACE,
    ]);

    keyboard.on("keydown-UP", () => this.moveCursor(-1, 0));
    keyboard.on("keydown-DOWN", () => this.moveCursor(1, 0));
    keyboard.on("keydown-LEFT", () => this.moveCursor(0, -1));
    keyboard.on("keydown-RIGHT", () => this.moveCursor(0, 1));
    keyboard.on("keydown-ENTER", () => this.activateCursor());
    keyboard.on("keydown-SPACE", () => this.activateCursor());
    keyboard.on("keydown-BACKSPACE", () => {
      if (!this.canInteract() || !this.selected) return;
      this.clearSelection(false);
      this.refreshVisuals();
      this.updateHud();
    });
    keyboard.on("keydown-N", () => this.handleMoreNumbers());
    keyboard.on("keydown-R", () => {
      if (this.running && !this.runEnded) this.startNewRun();
    });
    keyboard.on("keydown-H", () => this.handleHint());
    keyboard.on("keydown-M", () => this.toggleSound());
    keyboard.on("keydown-ESC", () => this.togglePause());
  }
}
