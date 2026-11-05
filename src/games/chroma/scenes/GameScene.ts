import Phaser from "phaser";
import { ANIMATION, BOTTLE, BOARD_AREA } from "../config.ts";
import { LEVEL_COUNT, getLevel } from "../data/levels.ts";
import { Bottle } from "../entities/Bottle.ts";
import { createBackdrop } from "../render/backdrop.ts";
import { COLORS, DEPTH } from "../render/theme.ts";
import { createPanel, floatingText } from "../render/ui.ts";
import { MoveHistory } from "../systems/MoveHistory.ts";
import {
  describeInvalidReason,
  isBottleComplete,
  isSolved,
  topColor,
  validateMove,
} from "../systems/MoveValidator.ts";
import {
  applyLevelCompletion,
  getSolutionTier,
  loadProgress,
  saveProgress,
  withSettings,
} from "../systems/ProgressionSystem.ts";
import { Sfx } from "../systems/Sfx.ts";
import {
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

interface BottlePosition {
  x: number;
  y: number;
}

/**
 * Escena principal de CHROMA. La lógica (movimientos, historial, progreso) vive
 * en sistemas puros; esta escena coordina botellas, entrada y animaciones.
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
  private bottles: Bottle[] = [];
  private selected: number | null = null;
  private animating = false;
  private pendingVictoryCheck = false;
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
    this.history = new MoveHistory(this.level.bottles);
    this.bottles = [];
    this.selected = null;
    this.animating = false;
    this.pendingVictoryCheck = false;
    this.running = true;
    this.solved = false;

    createBackdrop(this, { bubbles: 30 });
    this.cameras.main.fadeIn(160, 11, 18, 38);

    this.buildBoard();
    this.sfx = new Sfx(this.settings.soundEnabled);

    this.hud = new GameHUD(this, this.level, this.levelIndex, LEVEL_COUNT, {
      onUndo: () => this.handleUndo(),
      onReset: () => this.handleReset(),
      onPause: () => this.togglePause(),
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

  // --- Construcción del tablero -------------------------------------------

  private buildBoard(): void {
    const frame = createPanel(
      this,
      BOARD_AREA.x - 12,
      BOARD_AREA.y - 12,
      BOARD_AREA.width + 24,
      BOARD_AREA.height + 24,
      { radius: 26, fillAlpha: 0.9 },
    );
    frame.setDepth(DEPTH.board);

    const inner = this.add.graphics().setDepth(DEPTH.board + 1);
    inner.fillStyle(COLORS.bgDeep, 0.35);
    inner.fillRoundedRect(
      BOARD_AREA.x,
      BOARD_AREA.y,
      BOARD_AREA.width,
      BOARD_AREA.height,
      18,
    );
    inner.lineStyle(1, COLORS.white, 0.04);
    inner.strokeRoundedRect(
      BOARD_AREA.x + 2,
      BOARD_AREA.y + 2,
      BOARD_AREA.width - 4,
      BOARD_AREA.height - 4,
      16,
    );

    const positions = this.computeBottlePositions(this.level.bottles.length);
    const bench = this.add.graphics().setDepth(DEPTH.board + 2);
    const rowYs = [...new Set(positions.map((position) => position.y))];
    for (const y of rowYs) {
      bench.fillStyle(COLORS.glass, 0.04);
      bench.fillRoundedRect(
        BOARD_AREA.x + 60,
        y + BOTTLE.height / 2 - 14,
        BOARD_AREA.width - 120,
        16,
        8,
      );
      bench.lineStyle(1, COLORS.glass, 0.08);
      bench.strokeRoundedRect(
        BOARD_AREA.x + 60,
        y + BOTTLE.height / 2 - 14,
        BOARD_AREA.width - 120,
        16,
        8,
      );
    }

    const initial = this.history.bottles;
    this.bottles = positions.map((position, index) => {
      const state = initial[index]!;
      return new Bottle(
        this,
        index,
        position.x,
        position.y,
        state,
        {
          onClick: (bottle) => this.handleBottleClick(bottle.index),
          reducedMotion: this.settings.reducedMotion,
          patterns: this.settings.colorPatternsEnabled,
        },
      );
    });
  }

  private computeBottlePositions(count: number): BottlePosition[] {
    let columns: number;
    if (count <= 5) columns = Math.max(1, count);
    else if (count === 6) columns = 3;
    else if (count <= 8) columns = 4;
    else columns = 5;

    const rows = Math.ceil(count / columns);
    const horizontalGap = columns > 1 ? 28 : 0;
    const verticalGap = 30;

    const totalHeight =
      rows * BOTTLE.height + (rows - 1) * verticalGap;
    const firstRowY =
      BOARD_AREA.y + (BOARD_AREA.height - totalHeight) / 2 + BOTTLE.height / 2;

    const positions: BottlePosition[] = [];
    for (let index = 0; index < count; index += 1) {
      const row = Math.floor(index / columns);
      const column = index % columns;
      const rowCount = Math.min(columns, count - row * columns);
      const rowWidth =
        rowCount * BOTTLE.width + (rowCount - 1) * horizontalGap;
      const startX =
        BOARD_AREA.x + (BOARD_AREA.width - rowWidth) / 2 + BOTTLE.width / 2;
      positions.push({
        x: startX + column * (BOTTLE.width + horizontalGap),
        y: firstRowY + row * (BOTTLE.height + verticalGap),
      });
    }
    return positions;
  }

  // --- Entrada del jugador -------------------------------------------------

  private handleBottleClick(index: number): void {
    if (
      !this.running ||
      this.solved ||
      this.animating ||
      this.pauseMenu.isOpen ||
      this.completePanel.isOpen
    ) {
      return;
    }

    const bottles = this.history.bottles;
    const clicked = bottles[index];
    if (!clicked) return;

    if (this.selected === null) {
      if (clicked.segments.length === 0) {
        this.invalid(index, "Esa botella está vacía. Elige una que tenga líquido.");
        return;
      }
      this.selectBottle(index);
      return;
    }

    if (this.selected === index) {
      this.deselectBottle();
      this.sfx.click();
      return;
    }

    const from = this.selected;
    const result = validateMove(bottles, from, index);
    if (!result.valid) {
      if (clicked.segments.length > 0) {
        this.selectBottle(index);
        this.hud.showMessage(
          `Botella ${index + 1} seleccionada. Elige el destino.`,
          "info",
        );
        this.sfx.select();
      } else {
        this.invalid(
          index,
          result.reason
            ? describeInvalidReason(result.reason)
            : "Ese movimiento no es válido.",
        );
      }
      return;
    }

    this.performMove(from, index, result.count);
  }

  private selectBottle(index: number): void {
    if (this.selected !== null) {
      this.bottles[this.selected]?.setSelected(false);
    }
    this.selected = index;
    this.bottles[index]?.setSelected(true);
    this.sfx.select();
    const color = topColor(this.history.bottles[index]!);
    this.hud.showMessage(
      color
        ? `Botella ${index + 1} seleccionada. Elige el destino.`
        : `Botella ${index + 1} seleccionada.`,
      "info",
    );
    this.updateHud();
  }

  private deselectBottle(): void {
    if (this.selected === null) return;
    this.bottles[this.selected]?.setSelected(false);
    this.selected = null;
    this.updateHud();
  }

  private invalid(index: number, message: string): void {
    this.bottles[index]?.flashInvalid();
    this.sfx.invalid();
    this.hud.showMessage(message, "danger");
  }

  private performMove(from: number, to: number, count: number): void {
    const before = this.history.bottles;
    const sourceColor = topColor(before[from]);
    if (!sourceColor) return;

    const sourceView = this.bottles[from];
    const targetView = this.bottles[to];
    const completedBefore = this.countCompleted(before);

    this.animating = true;
    this.selected = null;
    sourceView?.setSelected(false);
    this.bottles[to]?.setSelected(false);

    this.history.apply({ from, to, count });
    const after = this.history.bottles;

    sourceView?.playPourOut(count, sourceColor);
    targetView?.applyState(after[to]!);
    targetView?.playPourIn(count, sourceColor);
    sourceView?.applyState(after[from]!);

    const direction = Math.sign((targetView?.x ?? 0) - (sourceView?.x ?? 0)) || 1;
    sourceView?.playTilt(direction);
    this.sfx.pour();

    const completedAfter = this.countCompleted(after);
    if (completedAfter > completedBefore && targetView) {
      this.sfx.complete();
      floatingText(
        this,
        targetView.centerX,
        targetView.centerY - BOTTLE.height / 2 - 16,
        "¡Lista!",
        COLORS.mint,
        18,
      );
    }

    this.refresh();

    const delay = this.settings.reducedMotion ? 0 : ANIMATION.pourMs;
    this.time.delayedCall(delay, () => {
      this.animating = false;
      if (this.pauseMenu.isOpen) {
        this.pendingVictoryCheck = true;
      } else {
        this.checkVictory();
      }
    });
  }

  private handleUndo(): void {
    if (
      !this.running ||
      this.animating ||
      this.pauseMenu.isOpen ||
      this.completePanel.isOpen
    ) {
      return;
    }
    if (!this.history.canUndo) {
      this.hud.showMessage("No hay movimientos que deshacer.", "info");
      return;
    }

    this.history.undo();
    this.selected = null;
    this.sfx.undo();
    this.refresh();
    this.hud.showMessage("Movimiento deshecho.", "info");
  }

  private handleReset(): void {
    if (
      this.solved ||
      this.animating ||
      this.pauseMenu.isOpen ||
      this.completePanel.isOpen
    ) {
      return;
    }

    this.history.reset();
    this.selected = null;
    this.solved = false;
    this.running = true;
    this.pendingVictoryCheck = false;
    this.animating = false;
    this.sfx.click();
    this.refresh();
    this.hud.showMessage(
      "Nivel reiniciado. Todas las botellas vuelven a su mezcla inicial.",
      "info",
    );
  }

  // --- Estado y sincronización --------------------------------------------

  private countCompleted(
    bottles = this.history.bottles,
  ): number {
    return bottles.filter((bottle) => isBottleComplete(bottle)).length;
  }

  private refresh(): void {
    const bottles = this.history.bottles;
    this.bottles.forEach((view, index) => {
      const state = bottles[index];
      if (!state) return;
      view.applyState(state);
      view.setSelected(index === this.selected);
      view.setCompleted(isBottleComplete(state));
    });
    this.updateHud();
  }

  private updateHud(): void {
    this.hud.update({
      moves: this.history.moveCount,
      completedBottles: this.countCompleted(),
      totalColors: this.level.colorCount,
      canUndo: this.history.canUndo,
      selected: this.selected,
      bestMoves: this.progress.bestMoveCounts[this.level.id] ?? null,
    });
  }

  private checkVictory(): void {
    if (this.solved) return;
    if (!isSolved(this.history.bottles)) return;

    this.solved = true;
    this.running = false;
    this.selected = null;

    const previousBest = this.progress.bestMoveCounts[this.level.id];
    const isNewBest =
      previousBest === undefined || this.history.moveCount < previousBest;

    this.progress = applyLevelCompletion(
      this.progress,
      this.level.id,
      this.levelIndex,
      this.history.moveCount,
    );
    saveProgress(this.progress);

    const bestMoves = this.progress.bestMoveCounts[this.level.id] ?? null;
    this.refresh();
    this.sfx.victory();
    this.hud.showMessage("¡Cada color en su botella!", "success");

    this.bottles.forEach((bottle, index) => {
      bottle.setSelected(false);
      bottle.celebrate(index * 70);
    });

    const delay = this.settings.reducedMotion ? 0 : 900;
    this.time.delayedCall(delay, () => {
      this.completePanel.show({
        levelName: this.level.name,
        moves: this.history.moveCount,
        parMoves: this.level.parMoves,
        bestMoves,
        tier: getSolutionTier(this.history.moveCount, this.level.parMoves),
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
    if (this.pendingVictoryCheck) {
      this.pendingVictoryCheck = false;
      this.checkVictory();
    }
  }

  private applySettings(patch: Partial<PlayerSettings>): void {
    this.progress = withSettings(this.progress, patch);
    saveProgress(this.progress);
    this.settings = this.progress.settings;

    this.sfx.setEnabled(this.settings.soundEnabled);
    for (const bottle of this.bottles) {
      bottle.setReducedMotion(this.settings.reducedMotion);
      bottle.setPatterns(this.settings.colorPatternsEnabled);
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

  private togglePatterns(): void {
    const enabled = !this.settings.colorPatternsEnabled;
    this.applySettings({ colorPatternsEnabled: enabled });
    this.hud.showMessage(
      enabled
        ? "Patrones activados: cada color muestra un símbolo."
        : "Patrones desactivados.",
      "info",
    );
  }

  private startLevel(index: number): void {
    if (index < 0 || index >= LEVEL_COUNT) return;

    this.running = false;
    this.completePanel.hide();
    this.pauseMenu.hide();
    this.cameras.main.fadeOut(140, 11, 18, 38);
    this.time.delayedCall(150, () => {
      this.scene.restart({ levelIndex: index } satisfies GameSceneData);
    });
  }

  private goToMenu(): void {
    this.running = false;
    this.pauseMenu.hide();
    this.completePanel.hide();
    this.cameras.main.fadeOut(140, 11, 18, 38);
    this.time.delayedCall(150, () => {
      this.scene.start("MenuScene");
    });
  }

  private bindKeyboard(): void {
    const keyboard = this.input.keyboard;
    if (!keyboard) return;

    keyboard.on("keydown-Z", () => this.handleUndo());
    keyboard.on("keydown-R", () => this.handleReset());
    keyboard.on("keydown-ESC", () => this.togglePause());
    keyboard.on("keydown-M", () => this.toggleSound());
    keyboard.on("keydown-P", () => this.togglePatterns());
  }
}
