import Phaser from "phaser";
import { BOARD_AREA, PANEL, TOP_BAR } from "../config.ts";
import { DIFFICULTY_LABELS, type PuzzleLevel } from "../types/puzzle.ts";
import { formatTime } from "../systems/ProgressionSystem.ts";
import { COLORS, DEPTH, FONTS, hex } from "../render/theme.ts";
import { createButton, createPanel, smallCaps, type ButtonHandle } from "../render/ui.ts";

export interface HUDCallbacks {
  onUndo: () => void;
  onReset: () => void;
  onPause: () => void;
  onMenu: () => void;
  onToggleMarkMode: () => void;
}

export interface HUDState {
  cats: number;
  total: number;
  timeMs: number;
  moves: number;
  conflicts: number;
  canUndo: boolean;
  strictMode: boolean;
  conflictHintsEnabled: boolean;
  markMode: boolean;
}

type MessageTone = "info" | "success" | "danger";

/**
 * Barra superior, panel lateral y mensajes. Mantiene una lectura clara del
 * tablero: la información importante está fuera de la cuadrícula.
 */
export class GameHUD {
  private readonly scene: Phaser.Scene;
  private readonly root: Phaser.GameObjects.Container;
  private readonly level: PuzzleLevel;
  private readonly levelIndex: number;
  private readonly levelCount: number;
  private readonly timerText: Phaser.GameObjects.Text;
  private readonly countText: Phaser.GameObjects.Text;
  private readonly movesText: Phaser.GameObjects.Text;
  private readonly conflictText: Phaser.GameObjects.Text;
  private readonly strictText: Phaser.GameObjects.Text;
  private readonly progressBar: Phaser.GameObjects.Graphics;
  private readonly undoButton: ButtonHandle;
  private readonly resetButton: ButtonHandle;
  private readonly markButton: ButtonHandle;
  private markMode = false;
  private message: Phaser.GameObjects.Text | null = null;
  private messageTween: Phaser.Tweens.Tween | null = null;

  constructor(
    scene: Phaser.Scene,
    level: PuzzleLevel,
    levelIndex: number,
    levelCount: number,
    callbacks: HUDCallbacks,
  ) {
    this.scene = scene;
    this.level = level;
    this.levelIndex = levelIndex;
    this.levelCount = levelCount;
    this.root = scene.add.container(0, 0).setDepth(DEPTH.hud);

    const topPanel = createPanel(
      scene,
      TOP_BAR.x,
      TOP_BAR.y,
      TOP_BAR.width,
      TOP_BAR.height,
      { radius: 20, fillAlpha: 0.92 },
    );
    const sidePanel = createPanel(
      scene,
      PANEL.x,
      PANEL.y,
      PANEL.width,
      PANEL.height,
      { radius: 22, fillAlpha: 0.93 },
    );
    this.root.add([topPanel, sidePanel]);

    const title = scene.add.text(TOP_BAR.x + 26, TOP_BAR.y + 16, "PURRGRID", {
      fontFamily: FONTS.display,
      fontSize: "34px",
      fontStyle: "bold",
      color: hex(COLORS.goldBright),
      letterSpacing: 3,
    });
    const subtitle = scene.add.text(
      TOP_BAR.x + 28,
      TOP_BAR.y + 58,
      "Un gato por región. Ni uno más.",
      {
        fontFamily: FONTS.sans,
        fontSize: "13px",
        color: hex(COLORS.muted),
      },
    );

    const levelTag = smallCaps(
      scene,
      420,
      TOP_BAR.y + 18,
      `Nivel ${levelIndex + 1} de ${levelCount}`,
      COLORS.pink,
      10,
    );
    const levelName = scene.add.text(
      420,
      TOP_BAR.y + 36,
      level.name,
      {
        fontFamily: FONTS.sans,
        fontSize: "23px",
        fontStyle: "bold",
        color: hex(COLORS.text),
      },
    );
    const difficulty = smallCaps(
      scene,
      422,
      TOP_BAR.y + 68,
      `${DIFFICULTY_LABELS[level.difficulty]} · ${level.size}×${level.size}`,
      COLORS.muted,
      9,
    );

    const timerLabel = smallCaps(
      scene,
      TOP_BAR.x + TOP_BAR.width - 26,
      TOP_BAR.y + 18,
      "Tiempo",
      COLORS.muted,
      9,
    ).setOrigin(1, 0);
    this.timerText = scene.add
      .text(TOP_BAR.x + TOP_BAR.width - 26, TOP_BAR.y + 38, "00:00", {
        fontFamily: FONTS.mono,
        fontSize: "26px",
        fontStyle: "bold",
        color: hex(COLORS.cream),
      })
      .setOrigin(1, 0);

    this.root.add([
      title,
      subtitle,
      levelTag,
      levelName,
      difficulty,
      timerLabel,
      this.timerText,
    ]);

    // --- Panel lateral -----------------------------------------------------
    const sideX = PANEL.x + 22;
    const sideWidth = PANEL.width - 44;

    const sideTag = smallCaps(
      scene,
      sideX,
      PANEL.y + 24,
      "Objetivo",
      COLORS.goldBright,
      10,
    );
    const sideName = scene.add.text(sideX, PANEL.y + 44, level.name, {
      fontFamily: FONTS.sans,
      fontSize: "22px",
      fontStyle: "bold",
      color: hex(COLORS.text),
      wordWrap: { width: sideWidth },
    });
    const sideDiff = smallCaps(
      scene,
      sideX,
      PANEL.y + 78,
      `${DIFFICULTY_LABELS[level.difficulty]} · ${level.size} gatos`,
      COLORS.muted,
      9,
    );
    const separator = scene.add.graphics();
    separator.lineStyle(1, COLORS.border, 0.8);
    separator.lineBetween(sideX, PANEL.y + 108, sideX + sideWidth, PANEL.y + 108);

    const catsLabel = smallCaps(scene, sideX, PANEL.y + 126, "Gatos", COLORS.muted, 9);
    this.countText = scene.add
      .text(sideX + sideWidth, PANEL.y + 118, `0 / ${level.size}`, {
        fontFamily: FONTS.mono,
        fontSize: "22px",
        fontStyle: "bold",
        color: hex(COLORS.goldBright),
      })
      .setOrigin(1, 0);
    this.progressBar = scene.add.graphics();
    this.movesText = scene.add.text(
      sideX,
      PANEL.y + 164,
      "0 jugadas",
      {
        fontFamily: FONTS.sans,
        fontSize: "11px",
        color: hex(COLORS.muted),
      },
    );

    this.conflictText = scene.add.text(sideX, PANEL.y + 196, "", {
      fontFamily: FONTS.sans,
      fontSize: "13px",
      fontStyle: "bold",
      color: hex(COLORS.success),
      wordWrap: { width: sideWidth },
    });

    const rulesTag = smallCaps(
      scene,
      sideX,
      PANEL.y + 240,
      "Reglas",
      COLORS.pink,
      9,
    );
    const rules = [
      "• 1 gato por cada región de color.",
      "• 1 gato por fila y por columna.",
      "• Sin contacto, tampoco en diagonal.",
    ];
    const ruleTexts = rules.map((rule, index) =>
      scene.add.text(sideX, PANEL.y + 262 + index * 24, rule, {
        fontFamily: FONTS.sans,
        fontSize: "12px",
        color: hex(COLORS.creamDark),
        wordWrap: { width: sideWidth },
      }),
    );

    this.root.add([
      sideTag,
      sideName,
      sideDiff,
      separator,
      catsLabel,
      this.countText,
      this.progressBar,
      this.movesText,
      this.conflictText,
      rulesTag,
      ...ruleTexts,
    ]);

    const buttonY = PANEL.y + 362;
    this.undoButton = createButton(scene, {
      x: sideX,
      y: buttonY,
      width: 122,
      height: 44,
      label: "DESHACER",
      sublabel: "Z",
      onClick: callbacks.onUndo,
    });
    this.resetButton = createButton(scene, {
      x: sideX + 134,
      y: buttonY,
      width: 122,
      height: 44,
      label: "REINICIAR",
      sublabel: "R",
      onClick: callbacks.onReset,
    });
    const pauseButton = createButton(scene, {
      x: sideX,
      y: buttonY + 58,
      width: 122,
      height: 44,
      label: "PAUSA",
      sublabel: "Esc",
      onClick: callbacks.onPause,
    });
    const menuButton = createButton(scene, {
      x: sideX + 134,
      y: buttonY + 58,
      width: 122,
      height: 44,
      label: "MENÚ",
      onClick: callbacks.onMenu,
    });

    this.root.add([
      this.undoButton.container,
      this.resetButton.container,
      pauseButton.container,
      menuButton.container,
    ]);

    this.strictText = scene.add.text(sideX, PANEL.y + 512, "", {
      fontFamily: FONTS.sans,
      fontSize: "11px",
      color: hex(COLORS.muted),
      wordWrap: { width: sideWidth },
    });
    this.markButton = createButton(scene, {
      x: sideX,
      y: PANEL.y + 548,
      width: sideWidth,
      height: 44,
      label: "MODO MARCA",
      sublabel: "Click derecho / X",
      onClick: callbacks.onToggleMarkMode,
    });
    this.root.add([this.strictText, this.markButton.container]);

    // --- Pie ---------------------------------------------------------------
    const footer = scene.add.text(
      BOARD_AREA.x,
      BOARD_AREA.y + BOARD_AREA.size + 28,
      "Toca para colocar un gato. Marca celdas con ✕ para descartarlas.",
      {
        fontFamily: FONTS.sans,
        fontSize: "15px",
        color: hex(COLORS.creamDark),
      },
    );
    const shortcuts = scene.add.text(
      BOARD_AREA.x,
      BOARD_AREA.y + BOARD_AREA.size + 56,
      "Z deshacer  ·  X marcar  ·  R reiniciar  ·  Esc pausa  ·  M silenciar",
      {
        fontFamily: FONTS.sans,
        fontSize: "12px",
        color: hex(COLORS.muted),
      },
    );
    const legend = scene.add.text(
      BOARD_AREA.x,
      BOARD_AREA.y + BOARD_AREA.size + 82,
      "Rojo = conflicto directo. El juego no te castiga por probar.",
      {
        fontFamily: FONTS.sans,
        fontSize: "12px",
        color: hex(COLORS.mutedDark),
      },
    );
    this.root.add([footer, shortcuts, legend]);

    this.update({
      cats: 0,
      total: level.size,
      timeMs: 0,
      moves: 0,
      conflicts: 0,
      canUndo: false,
      strictMode: false,
      conflictHintsEnabled: true,
      markMode: false,
    });
  }

  update(state: HUDState): void {
    this.timerText.setText(formatTime(state.timeMs));
    this.countText.setText(`${state.cats} / ${state.total}`);
    this.movesText.setText(
      `${state.moves} ${state.moves === 1 ? "jugada" : "jugadas"}`,
    );
    this.undoButton.setEnabled(state.canUndo);
    this.resetButton.setEnabled(state.moves > 0);

    const ratio = state.total > 0 ? Math.min(1, state.cats / state.total) : 0;
    this.drawProgress(ratio, state.conflicts > 0);

    if (!state.conflictHintsEnabled) {
      this.conflictText.setText("Avisos de conflicto desactivados");
      this.conflictText.setColor(hex(COLORS.muted));
    } else if (state.conflicts > 0) {
      this.conflictText.setText(
        `${state.conflicts} ${state.conflicts === 1 ? "gato en conflicto" : "gatos en conflicto"}`,
      );
      this.conflictText.setColor(hex(COLORS.danger));
    } else if (state.cats === state.total) {
      this.conflictText.setText("Todo en orden. ¡Buen trabajo!");
      this.conflictText.setColor(hex(COLORS.success));
    } else {
      this.conflictText.setText("Sin conflictos");
      this.conflictText.setColor(hex(COLORS.success));
    }

    this.strictText.setText(
      state.strictMode
        ? "Modo estricto: las jugadas imposibles se bloquean."
        : "Modo relajado: puedes probar sin penalización.",
    );

    if (state.markMode !== this.markMode) {
      this.markMode = state.markMode;
      this.markButton.setLabels(
        state.markMode ? "MODO MARCA · ACTIVO" : "MODO MARCA",
        state.markMode ? "Toca celdas para marcar" : "Click derecho / X",
      );
    }
  }

  private drawProgress(ratio: number, hasConflicts: boolean): void {
    const x = PANEL.x + 22;
    const y = PANEL.y + 146;
    const width = PANEL.width - 44;
    const height = 9;
    this.progressBar.clear();
    this.progressBar.fillStyle(COLORS.bgDeep, 0.8);
    this.progressBar.fillRoundedRect(x, y, width, height, height / 2);
    this.progressBar.lineStyle(1, COLORS.white, 0.08);
    this.progressBar.strokeRoundedRect(x, y, width, height, height / 2);
    if (ratio > 0) {
      const inner = Math.max(height, (width - 4) * ratio);
      this.progressBar.fillStyle(hasConflicts ? COLORS.danger : COLORS.mint, 1);
      this.progressBar.fillRoundedRect(
        x + 2,
        y + 2,
        inner,
        height - 4,
        (height - 4) / 2,
      );
    }
  }

  showMessage(text: string, tone: MessageTone = "info"): void {
    this.messageTween?.stop();
    this.message?.destroy();
    const color =
      tone === "danger"
        ? COLORS.danger
        : tone === "success"
          ? COLORS.success
          : COLORS.goldBright;
    const label = this.scene.add
      .text(
        BOARD_AREA.x + BOARD_AREA.size / 2,
        BOARD_AREA.y - 20,
        text,
        {
          fontFamily: FONTS.sans,
          fontSize: "15px",
          fontStyle: "bold",
          color: hex(color),
          stroke: hex(COLORS.bgDeep),
          strokeThickness: 4,
          align: "center",
          wordWrap: { width: BOARD_AREA.size },
        },
      )
      .setOrigin(0.5)
      .setDepth(DEPTH.toast);
    this.root.add(label);
    this.message = label;
    label.setAlpha(0);
    this.messageTween = this.scene.tweens.add({
      targets: label,
      alpha: { from: 0, to: 1 },
      duration: 140,
      yoyo: true,
      hold: 1400,
      onComplete: () => {
        label.destroy();
        if (this.message === label) this.message = null;
      },
    });
  }

  get levelNumber(): number {
    return this.levelIndex + 1;
  }

  get levelName(): string {
    return this.level.name;
  }

  get levelCountValue(): number {
    return this.levelCount;
  }

  destroy(): void {
    this.messageTween?.stop();
    this.root.destroy(true);
  }
}
