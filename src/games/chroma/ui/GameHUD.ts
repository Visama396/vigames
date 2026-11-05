import Phaser from "phaser";
import { BOTTOM_BAR, BOARD_AREA, TOP_BAR } from "../config.ts";
import type { PuzzleLevel } from "../types/puzzle.ts";
import { DIFFICULTY_LABELS } from "../types/puzzle.ts";
import {
  formatShortMoves,
  getSolutionTier,
  SOLUTION_TIER_LABELS,
} from "../systems/ProgressionSystem.ts";
import { COLORS, DEPTH, FONTS, hex } from "../render/theme.ts";
import {
  createButton,
  createPanel,
  smallCaps,
  type ButtonHandle,
} from "../render/ui.ts";

export interface HUDCallbacks {
  onUndo: () => void;
  onReset: () => void;
  onPause: () => void;
}

export interface HUDState {
  moves: number;
  completedBottles: number;
  totalColors: number;
  canUndo: boolean;
  selected: number | null;
  bestMoves: number | null;
}

type MessageTone = "info" | "success" | "danger";

/** Barra superior, controles inferiores y mensajes de CHROMA. */
export class GameHUD {
  private readonly scene: Phaser.Scene;
  private readonly root: Phaser.GameObjects.Container;
  private readonly level: PuzzleLevel;
  private readonly levelIndex: number;
  private readonly levelCount: number;
  private readonly movesText: Phaser.GameObjects.Text;
  private readonly completedText: Phaser.GameObjects.Text;
  private readonly bestText: Phaser.GameObjects.Text;
  private readonly tierText: Phaser.GameObjects.Text;
  private readonly progressBar: Phaser.GameObjects.Graphics;
  private readonly undoButton: ButtonHandle;
  private readonly resetButton: ButtonHandle;
  private readonly hintText: Phaser.GameObjects.Text;
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
    const bottomPanel = createPanel(
      scene,
      BOTTOM_BAR.x,
      BOTTOM_BAR.y,
      BOTTOM_BAR.width,
      BOTTOM_BAR.height,
      { radius: 18, fillAlpha: 0.92 },
    );
    this.root.add([topPanel, bottomPanel]);

    const title = scene.add.text(TOP_BAR.x + 26, TOP_BAR.y + 12, "CHROMA", {
      fontFamily: FONTS.display,
      fontSize: "34px",
      fontStyle: "bold",
      color: hex(COLORS.goldBright),
      letterSpacing: 4,
    });
    const subtitle = scene.add.text(
      TOP_BAR.x + 28,
      TOP_BAR.y + 56,
      "Ordena cada color en su propia botella.",
      {
        fontFamily: FONTS.sans,
        fontSize: "12px",
        color: hex(COLORS.muted),
      },
    );

    const levelTag = smallCaps(
      scene,
      360,
      TOP_BAR.y + 18,
      `Nivel ${levelIndex + 1} de ${levelCount}`,
      COLORS.sky,
      10,
    );
    const levelName = scene.add.text(360, TOP_BAR.y + 36, level.name, {
      fontFamily: FONTS.sans,
      fontSize: "21px",
      fontStyle: "bold",
      color: hex(COLORS.text),
    });
    const difficulty = smallCaps(
      scene,
      362,
      TOP_BAR.y + 68,
      `${DIFFICULTY_LABELS[level.difficulty]} · ${level.colorCount} colores`,
      COLORS.muted,
      9,
    );

    const movesLabel = smallCaps(
      scene,
      692,
      TOP_BAR.y + 16,
      "Movimientos",
      COLORS.muted,
      9,
    );
    this.movesText = scene.add.text(692, TOP_BAR.y + 32, "0", {
      fontFamily: FONTS.mono,
      fontSize: "26px",
      fontStyle: "bold",
      color: hex(COLORS.text),
    });
    this.bestText = scene.add.text(692, TOP_BAR.y + 62, "Mejor: —", {
      fontFamily: FONTS.sans,
      fontSize: "10px",
      color: hex(COLORS.mutedDark),
    });
    this.tierText = scene.add.text(850, TOP_BAR.y + 62, "", {
      fontFamily: FONTS.sans,
      fontSize: "10px",
      fontStyle: "bold",
      color: hex(COLORS.muted),
    });

    const completedLabel = smallCaps(
      scene,
      850,
      TOP_BAR.y + 16,
      "Botellas",
      COLORS.muted,
      9,
    );
    this.completedText = scene.add
      .text(TOP_BAR.x + TOP_BAR.width - 26, TOP_BAR.y + 32, `0 / ${level.colorCount}`, {
        fontFamily: FONTS.mono,
        fontSize: "26px",
        fontStyle: "bold",
        color: hex(COLORS.mint),
      })
      .setOrigin(1, 0);
    this.progressBar = scene.add.graphics();

    this.root.add([
      title,
      subtitle,
      levelTag,
      levelName,
      difficulty,
      movesLabel,
      this.movesText,
      this.bestText,
      this.tierText,
      completedLabel,
      this.completedText,
      this.progressBar,
    ]);

    this.undoButton = createButton(scene, {
      x: BOTTOM_BAR.x + 32,
      y: BOTTOM_BAR.y + 12,
      width: 180,
      height: 48,
      label: "DESHACER",
      sublabel: "Z",
      onClick: callbacks.onUndo,
    });
    this.resetButton = createButton(scene, {
      x: BOTTOM_BAR.x + 232,
      y: BOTTOM_BAR.y + 12,
      width: 180,
      height: 48,
      label: "REINICIAR",
      sublabel: "R",
      onClick: callbacks.onReset,
    });
    const pauseButton = createButton(scene, {
      x: BOTTOM_BAR.x + 432,
      y: BOTTOM_BAR.y + 12,
      width: 180,
      height: 48,
      label: "PAUSA",
      sublabel: "Esc",
      onClick: callbacks.onPause,
    });

    this.hintText = scene.add.text(
      BOTTOM_BAR.x + 650,
      BOTTOM_BAR.y + 16,
      "Toca una botella y luego otra para verter.",
      {
        fontFamily: FONTS.sans,
        fontSize: "12px",
        color: hex(COLORS.creamDark),
        wordWrap: { width: BOTTOM_BAR.width - 670 },
      },
    );
    const shortcuts = scene.add.text(
      BOTTOM_BAR.x + 650,
      BOTTOM_BAR.y + 40,
      "Z deshacer · R reiniciar · Esc pausa · M sonido",
      {
        fontFamily: FONTS.sans,
        fontSize: "10px",
        color: hex(COLORS.mutedDark),
        wordWrap: { width: BOTTOM_BAR.width - 670 },
      },
    );

    this.root.add([
      this.undoButton.container,
      this.resetButton.container,
      pauseButton.container,
      this.hintText,
      shortcuts,
    ]);

    this.update({
      moves: 0,
      completedBottles: 0,
      totalColors: level.colorCount,
      canUndo: false,
      selected: null,
      bestMoves: null,
    });
  }

  update(state: HUDState): void {
    this.movesText.setText(String(state.moves));
    this.completedText.setText(
      `${state.completedBottles} / ${state.totalColors}`,
    );
    this.undoButton.setEnabled(state.canUndo);
    this.resetButton.setEnabled(state.moves > 0);
    this.bestText.setText(
      `Par ${this.level.parMoves} · Mejor: ${
        state.bestMoves === null
          ? "—"
          : formatShortMoves(state.bestMoves)
      }`,
    );

    const tier = getSolutionTier(state.moves, this.level.parMoves);
    this.tierText.setText(
      state.moves === 0 ? "" : SOLUTION_TIER_LABELS[tier],
    );
    this.tierText.setColor(
      hex(
        tier === "optimal"
          ? COLORS.goldBright
          : tier === "efficient"
            ? COLORS.mint
            : COLORS.muted,
      ),
    );

    if (state.selected !== null) {
      this.hintText.setText(
        `Botella ${state.selected + 1} seleccionada. Elige el destino.`,
      );
      this.hintText.setColor(hex(COLORS.goldBright));
    } else {
      this.hintText.setText("Toca una botella y luego otra para verter.");
      this.hintText.setColor(hex(COLORS.creamDark));
    }

    const ratio =
      state.totalColors > 0
        ? Math.min(1, state.completedBottles / state.totalColors)
        : 0;
    this.drawProgress(ratio);
  }

  private drawProgress(ratio: number): void {
    const x = 692;
    const y = TOP_BAR.y + 80;
    const width = TOP_BAR.x + TOP_BAR.width - 26 - x;
    const height = 7;
    this.progressBar.clear();
    this.progressBar.fillStyle(COLORS.bgDeep, 0.8);
    this.progressBar.fillRoundedRect(x, y, width, height, height / 2);
    this.progressBar.lineStyle(1, COLORS.white, 0.08);
    this.progressBar.strokeRoundedRect(x, y, width, height, height / 2);
    if (ratio > 0) {
      const inner = Math.max(height, (width - 4) * ratio);
      this.progressBar.fillStyle(COLORS.mint, 1);
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
        BOARD_AREA.x + BOARD_AREA.width / 2,
        BOARD_AREA.y - 22,
        text,
        {
          fontFamily: FONTS.sans,
          fontSize: "15px",
          fontStyle: "bold",
          color: hex(color),
          stroke: hex(COLORS.bgDeep),
          strokeThickness: 4,
          align: "center",
          wordWrap: { width: BOARD_AREA.width },
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
      hold: 1500,
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
