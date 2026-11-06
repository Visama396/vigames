import Phaser from "phaser";
import { BOARD_AREA, SIDE_PANEL, STAR_MARGIN, TOP_BAR } from "../config.ts";
import { colorDefinition } from "../data/palette.ts";
import { COLORS, DEPTH, FONTS, hex } from "../render/theme.ts";
import {
  createButton,
  createPanel,
  smallCaps,
  type ButtonHandle,
} from "../render/ui.ts";
import {
  formatMoves,
  getStars,
  starString,
} from "../systems/ProgressionSystem.ts";
import {
  DIFFICULTY_LABELS,
  type LevelDefinition,
} from "../types/GameTypes.ts";

export interface HUDCallbacks {
  onUndo: () => void;
  onReset: () => void;
  onPause: () => void;
  onMenu: () => void;
  onToggleSymbols: () => void;
  onHint: () => void;
}

export interface HUDState {
  moves: number;
  remaining: number;
  total: number;
  canUndo: boolean;
  selected: {
    id: string;
    color: string;
    symbol: string;
    exitReady: boolean;
  } | null;
  showSymbols: boolean;
  bestMoves: number | null;
}

type MessageTone = "info" | "success" | "danger";

/** Barra superior, panel lateral y mensajes de EXIT JAM. */
export class GameHUD {
  private readonly scene: Phaser.Scene;
  private readonly root: Phaser.GameObjects.Container;
  private readonly level: LevelDefinition;
  private readonly movesText: Phaser.GameObjects.Text;
  private readonly remainingText: Phaser.GameObjects.Text;
  private readonly bestText: Phaser.GameObjects.Text;
  private readonly starsText: Phaser.GameObjects.Text;
  private readonly progressBar: Phaser.GameObjects.Graphics;
  private readonly selectedText: Phaser.GameObjects.Text;
  private readonly undoButton: ButtonHandle;
  private readonly resetButton: ButtonHandle;
  private readonly symbolsButton: ButtonHandle;
  private message: Phaser.GameObjects.Text | null = null;
  private messageTween: Phaser.Tweens.Tween | null = null;

  constructor(
    scene: Phaser.Scene,
    level: LevelDefinition,
    levelIndex: number,
    levelCount: number,
    callbacks: HUDCallbacks,
  ) {
    this.scene = scene;
    this.level = level;
    this.root = scene.add.container(0, 0).setDepth(DEPTH.hud);

    const topPanel = createPanel(
      scene,
      TOP_BAR.x,
      TOP_BAR.y,
      TOP_BAR.width,
      TOP_BAR.height,
      { radius: 20, fillAlpha: 0.93 },
    );
    const sidePanel = createPanel(
      scene,
      SIDE_PANEL.x,
      SIDE_PANEL.y,
      SIDE_PANEL.width,
      SIDE_PANEL.height,
      { radius: 22, fillAlpha: 0.93 },
    );
    this.root.add([topPanel, sidePanel]);

    const title = scene.add.text(TOP_BAR.x + 26, TOP_BAR.y + 12, "EXIT JAM", {
      fontFamily: FONTS.display,
      fontSize: "34px",
      fontStyle: "bold",
      color: hex(COLORS.goldBright),
      letterSpacing: 4,
    });
    const subtitle = scene.add.text(
      TOP_BAR.x + 28,
      TOP_BAR.y + 56,
      "Despeja el tablero por las puertas correctas.",
      {
        fontFamily: FONTS.sans,
        fontSize: "12px",
        color: hex(COLORS.muted),
      },
    );

    const levelTag = smallCaps(
      scene,
      388,
      TOP_BAR.y + 16,
      `Nivel ${levelIndex + 1} de ${levelCount}`,
      COLORS.coral,
      10,
    );
    const levelName = scene.add.text(388, TOP_BAR.y + 34, level.name, {
      fontFamily: FONTS.sans,
      fontSize: "21px",
      fontStyle: "bold",
      color: hex(COLORS.text),
    });
    const difficulty = smallCaps(
      scene,
      390,
      TOP_BAR.y + 68,
      `${DIFFICULTY_LABELS[level.difficulty]} · ${level.width}×${level.height}`,
      COLORS.muted,
      9,
    );

    const movesLabel = smallCaps(
      scene,
      700,
      TOP_BAR.y + 14,
      "Movimientos",
      COLORS.muted,
      9,
    );
    this.movesText = scene.add.text(700, TOP_BAR.y + 30, "0", {
      fontFamily: FONTS.mono,
      fontSize: "26px",
      fontStyle: "bold",
      color: hex(COLORS.text),
    });
    this.bestText = scene.add.text(700, TOP_BAR.y + 62, "Objetivo 0 · Mejor —", {
      fontFamily: FONTS.sans,
      fontSize: "10px",
      color: hex(COLORS.mutedDark),
    });

    const remainingLabel = smallCaps(
      scene,
      TOP_BAR.x + TOP_BAR.width - 26,
      TOP_BAR.y + 14,
      "Bloques",
      COLORS.muted,
      9,
    ).setOrigin(1, 0);
    this.remainingText = scene.add
      .text(TOP_BAR.x + TOP_BAR.width - 26, TOP_BAR.y + 30, "0 / 0", {
        fontFamily: FONTS.mono,
        fontSize: "26px",
        fontStyle: "bold",
        color: hex(COLORS.goldBright),
      })
      .setOrigin(1, 0);

    this.root.add([
      title,
      subtitle,
      levelTag,
      levelName,
      difficulty,
      movesLabel,
      this.movesText,
      this.bestText,
      remainingLabel,
      this.remainingText,
    ]);

    // --- Panel lateral -----------------------------------------------------
    const sideX = SIDE_PANEL.x + 20;
    const sideWidth = SIDE_PANEL.width - 40;

    const objectiveTag = smallCaps(
      scene,
      sideX,
      SIDE_PANEL.y + 22,
      "Objetivo",
      COLORS.goldBright,
      10,
    );
    const objective = scene.add.text(sideX, SIDE_PANEL.y + 42, "Saca todos\nlos bloques", {
      fontFamily: FONTS.sans,
      fontSize: "17px",
      fontStyle: "bold",
      color: hex(COLORS.text),
      lineSpacing: 2,
    });
    const target = scene.add.text(
      sideX,
      SIDE_PANEL.y + 92,
      `3 estrellas en ${level.targetMoves} mov.`,
      {
        fontFamily: FONTS.sans,
        fontSize: "10px",
        color: hex(COLORS.muted),
      },
    );
    const separator = scene.add.graphics();
    separator.lineStyle(1, COLORS.border, 0.8);
    separator.lineBetween(
      sideX,
      SIDE_PANEL.y + 116,
      sideX + sideWidth,
      SIDE_PANEL.y + 116,
    );

    this.starsText = scene.add.text(sideX, SIDE_PANEL.y + 128, "★★★", {
      fontFamily: FONTS.sans,
      fontSize: "24px",
      fontStyle: "bold",
      color: hex(COLORS.gold),
      letterSpacing: 2,
    });
    const starHint = scene.add.text(
      sideX,
      SIDE_PANEL.y + 158,
      "La eficiencia se mide en celdas.",
      {
        fontFamily: FONTS.sans,
        fontSize: "9px",
        color: hex(COLORS.mutedDark),
        wordWrap: { width: sideWidth },
      },
    );

    this.progressBar = scene.add.graphics();
    this.selectedText = scene.add.text(
      sideX,
      SIDE_PANEL.y + 196,
      "Toca o arrastra un bloque.",
      {
        fontFamily: FONTS.sans,
        fontSize: "11px",
        color: hex(COLORS.creamDark),
        wordWrap: { width: sideWidth },
      },
    );

    this.root.add([
      objectiveTag,
      objective,
      target,
      separator,
      this.starsText,
      starHint,
      this.progressBar,
      this.selectedText,
    ]);

    this.undoButton = createButton(scene, {
      x: sideX,
      y: SIDE_PANEL.y + 252,
      width: (sideWidth - 8) / 2,
      height: 42,
      label: "DESHACER",
      sublabel: "Z",
      onClick: callbacks.onUndo,
    });
    this.resetButton = createButton(scene, {
      x: sideX + (sideWidth - 8) / 2 + 8,
      y: SIDE_PANEL.y + 252,
      width: (sideWidth - 8) / 2,
      height: 42,
      label: "REINICIAR",
      sublabel: "R",
      onClick: callbacks.onReset,
    });
    const pauseButton = createButton(scene, {
      x: sideX,
      y: SIDE_PANEL.y + 304,
      width: (sideWidth - 8) / 2,
      height: 42,
      label: "PAUSA",
      sublabel: "Esc",
      onClick: callbacks.onPause,
    });
    const menuButton = createButton(scene, {
      x: sideX + (sideWidth - 8) / 2 + 8,
      y: SIDE_PANEL.y + 304,
      width: (sideWidth - 8) / 2,
      height: 42,
      label: "MENÚ",
      onClick: callbacks.onMenu,
    });
    const hintButton = createButton(scene, {
      x: sideX,
      y: SIDE_PANEL.y + 356,
      width: sideWidth,
      height: 40,
      label: "PISTA",
      sublabel: "H",
      onClick: callbacks.onHint,
    });
    this.symbolsButton = createButton(scene, {
      x: sideX,
      y: SIDE_PANEL.y + 406,
      width: sideWidth,
      height: 40,
      label: "SÍMBOLOS · SÍ",
      sublabel: "S",
      onClick: callbacks.onToggleSymbols,
    });
    this.root.add([
      this.undoButton.container,
      this.resetButton.container,
      pauseButton.container,
      menuButton.container,
      hintButton.container,
      this.symbolsButton.container,
    ]);

    const legendTag = smallCaps(
      scene,
      sideX,
      SIDE_PANEL.y + 468,
      "Cómo se juega",
      COLORS.mint,
      9,
    );
    const legend = scene.add.text(
      sideX,
      SIDE_PANEL.y + 488,
      "• Mueve bloques en las 4 direcciones.\n• La marca y el color deben coincidir con la puerta.\n• Desliza o arrastra hacia la puerta para salir.\n• Las piezas grandes necesitan puertas anchas.",
      {
        fontFamily: FONTS.sans,
        fontSize: "10px",
        color: hex(COLORS.creamDark),
        wordWrap: { width: sideWidth },
        lineSpacing: 4,
      },
    );
    this.root.add([legendTag, legend]);

    // --- Pie de tablero ---------------------------------------------------
    const footer = scene.add.text(
      BOARD_AREA.x,
      BOARD_AREA.y + BOARD_AREA.size + 18,
      "Selecciona un bloque y muévelo con las flechas, o arrástralo hasta su puerta.",
      {
        fontFamily: FONTS.sans,
        fontSize: "13px",
        color: hex(COLORS.creamDark),
      },
    );
    const shortcuts = scene.add.text(
      BOARD_AREA.x,
      BOARD_AREA.y + BOARD_AREA.size + 44,
      "Desliza o arrastra el bloque hacia su puerta  ·  Flechas mover  ·  Z deshacer  ·  R reiniciar  ·  Esc pausa",
      {
        fontFamily: FONTS.sans,
        fontSize: "11px",
        color: hex(COLORS.muted),
      },
    );
    this.root.add([footer, shortcuts]);

    this.update({
      moves: 0,
      remaining: level.blocks.length,
      total: level.blocks.length,
      canUndo: false,
      selected: null,
      showSymbols: true,
      bestMoves: null,
    });
  }

  update(state: HUDState): void {
    this.movesText.setText(String(state.moves));
    this.remainingText.setText(`${state.remaining} / ${state.total}`);
    this.undoButton.setEnabled(state.canUndo);
    this.resetButton.setEnabled(state.moves > 0);
    this.bestText.setText(
      `Objetivo ${this.level.targetMoves} · Mejor ${
        state.bestMoves === null ? "—" : formatMoves(state.bestMoves)
      }`,
    );

    const stars = getStars(state.moves, this.level.targetMoves);
    this.starsText.setText(starString(stars));
    this.starsText.setColor(
      hex(stars === 3 ? COLORS.goldBright : stars === 2 ? COLORS.gold : COLORS.muted),
    );
    this.symbolsButton.setLabels(
      state.showSymbols ? "SÍMBOLOS · SÍ" : "SÍMBOLOS · NO",
      "S",
    );

    if (state.selected) {
      const color = colorDefinition(
        state.selected.color as Parameters<typeof colorDefinition>[0],
      );
      this.selectedText.setText(
        state.selected.exitReady
          ? `${color.symbol} ${color.name}: ¡puede salir! Desliza o arrástralo hacia su puerta.`
          : `${color.symbol} ${color.name}: desliza o arrastra hacia su puerta.`,
      );
      this.selectedText.setColor(
        hex(state.selected.exitReady ? COLORS.success : COLORS.creamDark),
      );
    } else {
      this.selectedText.setText("Toca o arrastra un bloque para empezar.");
      this.selectedText.setColor(hex(COLORS.creamDark));
    }

    const ratio =
      state.total > 0 ? Math.min(1, (state.total - state.remaining) / state.total) : 0;
    this.drawProgress(ratio);
    void STAR_MARGIN;
  }

  private drawProgress(ratio: number): void {
    const x = SIDE_PANEL.x + 20;
    const y = SIDE_PANEL.y + 178;
    const width = SIDE_PANEL.width - 40;
    const height = 8;
    this.progressBar.clear();
    this.progressBar.fillStyle(COLORS.bgDeep, 0.85);
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
        BOARD_AREA.x + BOARD_AREA.size / 2,
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
      hold: 1500,
      onComplete: () => {
        label.destroy();
        if (this.message === label) this.message = null;
      },
    });
  }

  destroy(): void {
    this.messageTween?.stop();
    this.root.destroy(true);
  }
}
