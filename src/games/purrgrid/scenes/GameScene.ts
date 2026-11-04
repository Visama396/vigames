import Phaser from "phaser";
import { BOARD_AREA, TIMER_TICK_MS } from "../config.ts";
import { LEVEL_COUNT, getLevel } from "../data/levels.ts";
import { CatToken } from "../entities/CatToken.ts";
import { GridCell } from "../entities/GridCell.ts";
import { createBackdrop } from "../render/backdrop.ts";
import { COLORS, DEPTH } from "../render/theme.ts";
import { createPanel } from "../render/ui.ts";
import {
  canPlace,
  describeConflict,
  findConflicts,
  isSolved,
} from "../systems/ConstraintChecker.ts";
import { MoveHistory } from "../systems/MoveHistory.ts";
import {
  applyLevelCompletion,
  loadProgress,
  saveProgress,
  withSettings,
} from "../systems/ProgressionSystem.ts";
import { Sfx } from "../systems/Sfx.ts";
import {
  colOf,
  rowOf,
  type CellId,
  type ConflictReport,
  type PlayerProgress,
  type PlayerSettings,
  type PuzzleLevel,
} from "../types/puzzle.ts";
import { GameHUD } from "../ui/GameHUD.ts";
import { LevelCompletePanel } from "../ui/LevelCompletePanel.ts";
import { PauseMenu } from "../ui/PauseMenu.ts";

export interface GameSceneData {
  levelIndex?: number;
}

/**
 * Escena principal del puzle. La lógica (reglas, historial, progreso) vive en
 * sistemas puros; esta escena solo coordina el tablero, la entrada y la interfaz.
 */
export class GameScene extends Phaser.Scene {
  private levelIndex = 0;
  private level!: PuzzleLevel;
  private progress!: PlayerProgress;
  private settings!: PlayerSettings;
  private history!: MoveHistory;
  private hud!: GameHUD;
  private pauseMenu!: PauseMenu;
  private completePanel!: LevelCompletePanel;
  private sfx!: Sfx;
  private cells: GridCell[][] = [];
  private catViews = new Map<CellId, CatToken>();
  private marks = new Set<CellId>();
  private markMode = false;
  private cellSize = 0;
  private elapsedMs = 0;
  private timerAccumulator = 0;
  private conflictCount = 0;
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
    this.history = new MoveHistory();
    this.cells = [];
    this.catViews = new Map();
    this.marks = new Set();
    this.markMode = false;
    this.elapsedMs = 0;
    this.timerAccumulator = 0;
    this.conflictCount = 0;
    this.running = true;
    this.solved = false;

    createBackdrop(this, { stars: 36 });
    this.cameras.main.fadeIn(160, 16, 20, 42);

    this.buildBoard();
    this.sfx = new Sfx(this.settings.soundEnabled);

    this.hud = new GameHUD(this, this.level, this.levelIndex, LEVEL_COUNT, {
      onUndo: () => this.handleUndo(),
      onReset: () => this.handleReset(),
      onPause: () => this.togglePause(),
      onMenu: () => this.goToMenu(),
      onToggleMarkMode: () => this.toggleMarkMode(),
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
    this.refresh();

    // El audio solo puede arrancar tras una interacción del jugador.
    this.input.once("pointerdown", () => this.sfx.unlock());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.sfx.destroy();
    });
  }

  update(_time: number, delta: number): void {
    if (!this.running || this.solved || this.pauseMenu.isOpen) return;

    this.elapsedMs += delta;
    this.timerAccumulator += delta;
    if (this.timerAccumulator >= TIMER_TICK_MS) {
      this.timerAccumulator = 0;
      this.updateHud();
    }
  }

  // --- Construcción del tablero -------------------------------------------

  private buildBoard(): void {
    const { x, y, size: boardSize } = BOARD_AREA;
    const size = this.level.size;
    this.cellSize = boardSize / size;

    const frame = createPanel(
      this,
      x - 14,
      y - 14,
      boardSize + 28,
      boardSize + 28,
      { radius: 24, fillAlpha: 0.96 },
    );
    frame.setDepth(DEPTH.board);

    const base = this.add.graphics().setDepth(DEPTH.board + 1);
    base.fillStyle(COLORS.bgDeep, 0.9);
    base.fillRoundedRect(x, y, boardSize, boardSize, 10);

    this.drawRegionBorders(x, y, boardSize);

    for (let row = 0; row < size; row += 1) {
      const line: GridCell[] = [];
      for (let col = 0; col < size; col += 1) {
        const id = row * size + col;
        const cell = new GridCell(
          this,
          x + col * this.cellSize + this.cellSize / 2,
          y + row * this.cellSize + this.cellSize / 2,
          {
            row,
            col,
            id,
            regionId: this.level.cells[row]?.[col]?.regionId ?? 0,
            cellSize: this.cellSize,
            onClick: (clicked) => this.handleCellClick(clicked),
            onRightClick: (clicked) => this.handleCellRightClick(clicked),
          },
        );
        line.push(cell);
      }
      this.cells.push(line);
    }

    const outer = this.add.graphics().setDepth(DEPTH.regionBorder + 1);
    outer.lineStyle(3, COLORS.goldDark, 0.75);
    outer.strokeRoundedRect(x - 1, y - 1, boardSize + 2, boardSize + 2, 11);
  }

  /**
   * Dibuja solo los bordes entre regiones distintas (y el marco exterior).
   * Así cada frontera se pinta una vez, sin duplicar trazos.
   */
  private drawRegionBorders(x: number, y: number, boardSize: number): void {
    const size = this.level.size;
    const graphics = this.add.graphics().setDepth(DEPTH.regionBorder);
    graphics.lineStyle(
      Math.max(2, this.cellSize * 0.038),
      COLORS.bgDeep,
      0.5,
    );

    const regionAt = (row: number, col: number): number =>
      this.level.cells[row]?.[col]?.regionId ?? -1;

    for (let row = 0; row < size; row += 1) {
      for (let col = 0; col < size; col += 1) {
        const region = regionAt(row, col);
        const left = x + col * this.cellSize;
        const top = y + row * this.cellSize;
        const right = left + this.cellSize;
        const bottom = top + this.cellSize;

        if (col === 0 || regionAt(row, col - 1) !== region) {
          graphics.lineBetween(left, top, left, bottom);
        }
        if (row === 0 || regionAt(row - 1, col) !== region) {
          graphics.lineBetween(left, top, right, top);
        }
        if (col === size - 1) {
          graphics.lineBetween(right, top, right, bottom);
        }
        if (row === size - 1) {
          graphics.lineBetween(left, bottom, right, bottom);
        }
      }
    }

    const glow = this.add.graphics().setDepth(DEPTH.regionBorder + 1);
    glow.lineStyle(1.5, COLORS.cream, 0.16);
    glow.strokeRoundedRect(x + 2, y + 2, boardSize - 4, boardSize - 4, 9);
  }

  // --- Entrada del jugador -------------------------------------------------

  private handleCellClick(cell: GridCell): void {
    if (
      !this.running ||
      this.solved ||
      this.pauseMenu.isOpen ||
      this.completePanel.isOpen
    ) {
      return;
    }

    if (this.markMode) {
      this.toggleMark(cell);
      return;
    }

    const occupied = this.history.has(cell.id);
    if (!occupied) {
      const placement = canPlace(
        this.level,
        this.history.cats,
        cell.row,
        cell.col,
      );
      if (this.settings.strictMode && !placement.allowed) {
        if (!this.settings.reducedMotion) cell.flashInvalid();
        this.sfx.invalid();
        const first = placement.reasons[0];
        this.hud.showMessage(
          first
            ? `Modo estricto: ${describeConflict(first)}.`
            : "Modo estricto: jugada no permitida.",
          "danger",
        );
        return;
      }
    }

    if (!occupied) this.clearMark(cell);

    const { added } = this.history.toggle(cell.id);
    if (added) this.sfx.place();
    else this.sfx.remove();

    this.syncCatViews(true);
    const report = this.refresh();

    if (
      added &&
      report.hasConflicts &&
      this.settings.conflictHintsEnabled
    ) {
      this.sfx.conflict();
    }

    this.checkVictory();
  }

  private handleCellRightClick(cell: GridCell): void {
    if (
      !this.running ||
      this.solved ||
      this.pauseMenu.isOpen ||
      this.completePanel.isOpen
    ) {
      return;
    }
    this.toggleMark(cell);
  }

  private toggleMark(cell: GridCell): void {
    if (this.history.has(cell.id)) return;

    if (this.marks.has(cell.id)) {
      this.marks.delete(cell.id);
      cell.setMarked(false);
    } else {
      this.marks.add(cell.id);
      cell.setMarked(true);
    }
    this.sfx.click();
  }

  private clearMark(cell: GridCell): void {
    if (!this.marks.has(cell.id)) return;
    this.marks.delete(cell.id);
    cell.setMarked(false);
  }

  private toggleMarkMode(): void {
    if (this.solved || this.pauseMenu.isOpen || this.completePanel.isOpen) return;
    this.markMode = !this.markMode;
    this.sfx.click();
    this.updateHud();
    this.hud.showMessage(
      this.markMode
        ? "Modo marca: toca celdas para descartarlas con ✕."
        : "Modo marca desactivado.",
      "info",
    );
  }

  private handleUndo(): void {
    if (
      !this.running ||
      this.pauseMenu.isOpen ||
      this.completePanel.isOpen
    ) {
      return;
    }
    if (!this.history.canUndo) {
      this.hud.showMessage("No hay jugadas que deshacer.", "info");
      return;
    }

    this.history.undo();
    this.sfx.undo();
    this.syncCatViews(true);
    this.refresh();
  }

  private handleReset(): void {
    if (this.solved || this.pauseMenu.isOpen || this.completePanel.isOpen) return;

    this.history.reset();
    this.elapsedMs = 0;
    this.timerAccumulator = 0;
    this.conflictCount = 0;
    this.solved = false;
    this.running = true;

    for (const token of this.catViews.values()) token.playRemove();
    this.catViews.clear();

    for (const line of this.cells) {
      for (const cell of line) cell.setMarked(false);
    }
    this.marks.clear();

    this.sfx.remove();
    this.refresh();
    this.hud.showMessage("Nivel reiniciado. Los gatos vuelven a sus cajas.", "info");
  }

  // --- Estado y sincronización --------------------------------------------

  private syncCatViews(animate: boolean): void {
    const cats = this.history.cats;

    for (const [id, token] of [...this.catViews]) {
      if (!cats.has(id)) {
        token.playRemove();
        this.catViews.delete(id);
      }
    }

    for (const id of cats) {
      if (this.catViews.has(id)) continue;
      const row = rowOf(this.level.size, id);
      const col = colOf(this.level.size, id);
      const cell = this.cells[row]?.[col];
      if (!cell) continue;

      const token = new CatToken(this, cell.centerX, cell.centerY, this.cellSize * 0.94, {
        reducedMotion: this.settings.reducedMotion,
      });
      if (animate) token.playPlace();
      this.catViews.set(id, token);
    }
  }

  private refresh(): ConflictReport {
    const report = findConflicts(this.level, this.history.cats);
    this.conflictCount = report.cells.size;
    const showConflicts = this.settings.conflictHintsEnabled;

    for (const line of this.cells) {
      for (const cell of line) {
        const kinds = report.cells.get(cell.id);
        const active = showConflicts && Boolean(kinds && kinds.length > 0);
        cell.setConflict(active, kinds ?? []);
      }
    }

    for (const [id, token] of this.catViews) {
      token.setConflict(showConflicts && report.cells.has(id));
    }

    this.updateHud();
    return report;
  }

  private updateHud(): void {
    this.hud.update({
      cats: this.history.cats.size,
      total: this.level.size,
      timeMs: this.elapsedMs,
      moves: this.history.moves,
      conflicts: this.conflictCount,
      canUndo: this.history.canUndo,
      strictMode: this.settings.strictMode,
      conflictHintsEnabled: this.settings.conflictHintsEnabled,
      markMode: this.markMode,
    });
  }

  private checkVictory(): void {
    if (this.solved) return;
    if (!isSolved(this.level, this.history.cats)) return;

    this.solved = true;
    this.running = false;

    const previousBest = this.progress.bestTimes[this.level.id];
    const isNewBest =
      previousBest === undefined || this.elapsedMs < previousBest;

    this.progress = applyLevelCompletion(
      this.progress,
      this.level.id,
      this.levelIndex,
      this.elapsedMs,
    );
    saveProgress(this.progress);

    const bestMs = this.progress.bestTimes[this.level.id] ?? null;
    this.updateHud();
    this.sfx.victory();
    this.hud.showMessage("¡Todos los gatos están en su sitio!", "success");

    let index = 0;
    for (const token of this.catViews.values()) {
      token.celebrate(index * 60);
      index += 1;
    }

    const delay = this.settings.reducedMotion ? 0 : 700;
    this.time.delayedCall(delay, () => {
      this.completePanel.show({
        levelName: this.level.name,
        timeMs: this.elapsedMs,
        moves: this.history.moves,
        bestMs,
        hasNext: this.levelIndex < LEVEL_COUNT - 1,
        isNewBest,
      });
    });
  }

  // --- Pausa, ajustes y navegación ----------------------------------------

  private togglePause(): void {
    if (this.pauseMenu.isOpen) {
      this.resumeGame();
      return;
    }
    if (this.solved || this.completePanel.isOpen) return;

    this.running = false;
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
    for (const token of this.catViews.values()) {
      token.setReducedMotion(this.settings.reducedMotion);
    }
    this.pauseMenu.setSettings(this.settings);
    this.refresh();
  }

  private toggleSound(): void {
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
    this.completePanel.hide();
    this.pauseMenu.hide();
    this.cameras.main.fadeOut(140, 16, 20, 42);
    this.time.delayedCall(150, () => {
      this.scene.restart({ levelIndex: index } satisfies GameSceneData);
    });
  }

  private goToMenu(): void {
    this.running = false;
    this.pauseMenu.hide();
    this.completePanel.hide();
    this.cameras.main.fadeOut(140, 16, 20, 42);
    this.time.delayedCall(150, () => {
      this.scene.start("MenuScene");
    });
  }

  private bindKeyboard(): void {
    const keyboard = this.input.keyboard;
    if (!keyboard) return;

    keyboard.on("keydown-Z", () => this.handleUndo());
    keyboard.on("keydown-X", () => this.toggleMarkMode());
    keyboard.on("keydown-R", () => this.handleReset());
    keyboard.on("keydown-ESC", () => this.togglePause());
    keyboard.on("keydown-M", () => this.toggleSound());
  }
}
