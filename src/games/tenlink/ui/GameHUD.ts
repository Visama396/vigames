import Phaser from "phaser";
import {
  BOARD_AREA,
  BOARD_SIZE,
  INITIAL_NUMBERS,
  SIDE_PANEL,
  TOP_BAR,
} from "../config.ts";
import { COLORS, DEPTH, FONTS, hex } from "../render/theme.ts";
import {
  createButton,
  createPanel,
  smallCaps,
  type ButtonHandle,
} from "../render/ui.ts";
import { formatTime } from "../systems/ProgressionSystem.ts";

export interface HUDCallbacks {
  onMoreNumbers: () => void;
  onReset: () => void;
  onPause: () => void;
  onMenu: () => void;
  onHint: () => void;
}

export interface HUDState {
  pairs: number;
  numbers: number;
  capacity: number;
  elapsedMs: number;
  bestPairs: number;
  bestTimeMs: number | null;
  selected: { value: number; partners: number } | null;
  canRefill: boolean;
}

type MessageTone = "info" | "success" | "danger";

/** Barra superior, panel lateral y mensajes de TENLINK. */
export class GameHUD {
  private readonly scene: Phaser.Scene;
  private readonly root: Phaser.GameObjects.Container;
  private readonly pairsText: Phaser.GameObjects.Text;
  private readonly timeText: Phaser.GameObjects.Text;
  private readonly numbersText: Phaser.GameObjects.Text;
  private readonly bestText: Phaser.GameObjects.Text;
  private readonly progressBar: Phaser.GameObjects.Graphics;
  private readonly progressText: Phaser.GameObjects.Text;
  private readonly selectedText: Phaser.GameObjects.Text;
  private readonly moreNumbersButton: ButtonHandle;
  private readonly resetButton: ButtonHandle;
  private message: Phaser.GameObjects.Text | null = null;
  private messageTween: Phaser.Tweens.Tween | null = null;

  constructor(scene: Phaser.Scene, callbacks: HUDCallbacks) {
    this.scene = scene;
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

    const title = scene.add.text(TOP_BAR.x + 26, TOP_BAR.y + 12, "TENLINK", {
      fontFamily: FONTS.display,
      fontSize: "34px",
      fontStyle: "bold",
      color: hex(COLORS.mint),
      letterSpacing: 5,
    });
    const subtitle = scene.add.text(
      TOP_BAR.x + 28,
      TOP_BAR.y + 56,
      "Suma 10 sin límite. Compacta filas y pide más números.",
      {
        fontFamily: FONTS.sans,
        fontSize: "12px",
        color: hex(COLORS.muted),
      },
    );

    const modeTag = smallCaps(
      scene,
      370,
      TOP_BAR.y + 16,
      "Modo infinito",
      COLORS.mint,
      10,
    );
    const modeText = scene.add.text(370, TOP_BAR.y + 34, "9×9 · Sin niveles", {
      fontFamily: FONTS.sans,
      fontSize: "21px",
      fontStyle: "bold",
      color: hex(COLORS.text),
    });
    const modeHint = smallCaps(
      scene,
      372,
      TOP_BAR.y + 68,
      `${INITIAL_NUMBERS} números para empezar`,
      COLORS.muted,
      9,
    );

    const pairsLabel = smallCaps(
      scene,
      600,
      TOP_BAR.y + 14,
      "Parejas",
      COLORS.muted,
      9,
    );
    this.pairsText = scene.add.text(600, TOP_BAR.y + 30, "0", {
      fontFamily: FONTS.mono,
      fontSize: "24px",
      fontStyle: "bold",
      color: hex(COLORS.text),
    });

    const timeLabel = smallCaps(
      scene,
      720,
      TOP_BAR.y + 14,
      "Tiempo",
      COLORS.muted,
      9,
    );
    this.timeText = scene.add.text(720, TOP_BAR.y + 30, "00:00", {
      fontFamily: FONTS.mono,
      fontSize: "24px",
      fontStyle: "bold",
      color: hex(COLORS.goldBright),
    });

    const numbersLabel = smallCaps(
      scene,
      TOP_BAR.x + TOP_BAR.width - 24,
      TOP_BAR.y + 14,
      "Números",
      COLORS.muted,
      9,
    ).setOrigin(1, 0);
    this.numbersText = scene.add
      .text(TOP_BAR.x + TOP_BAR.width - 24, TOP_BAR.y + 30, "0 / 0", {
        fontFamily: FONTS.mono,
        fontSize: "24px",
        fontStyle: "bold",
        color: hex(COLORS.mint),
      })
      .setOrigin(1, 0);

    this.bestText = scene.add.text(600, TOP_BAR.y + 64, "Récord: —", {
      fontFamily: FONTS.sans,
      fontSize: "10px",
      color: hex(COLORS.mutedDark),
    });

    this.root.add([
      title,
      subtitle,
      modeTag,
      modeText,
      modeHint,
      pairsLabel,
      this.pairsText,
      timeLabel,
      this.timeText,
      numbersLabel,
      this.numbersText,
      this.bestText,
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
    const objective = scene.add.text(sideX, SIDE_PANEL.y + 42, "Suma 10\ny compacta", {
      fontFamily: FONTS.sans,
      fontSize: "17px",
      fontStyle: "bold",
      color: hex(COLORS.text),
      lineSpacing: 2,
    });
    const target = scene.add.text(
      sideX,
      SIDE_PANEL.y + 92,
      "Vacía filas para unir números.",
      {
        fontFamily: FONTS.sans,
        fontSize: "10px",
        color: hex(COLORS.muted),
        wordWrap: { width: sideWidth },
      },
    );
    const separator = scene.add.graphics();
    separator.lineStyle(1, COLORS.border, 0.8);
    separator.lineBetween(
      sideX,
      SIDE_PANEL.y + 114,
      sideX + sideWidth,
      SIDE_PANEL.y + 114,
    );

    this.progressBar = scene.add.graphics();
    this.progressText = scene.add.text(sideX, SIDE_PANEL.y + 142, "", {
      fontFamily: FONTS.sans,
      fontSize: "10px",
      color: hex(COLORS.mutedDark),
    });

    this.selectedText = scene.add.text(
      sideX,
      SIDE_PANEL.y + 168,
      "Toca un número para empezar.",
      {
        fontFamily: FONTS.sans,
        fontSize: "11px",
        color: hex(COLORS.creamDark),
        wordWrap: { width: sideWidth },
        lineSpacing: 3,
      },
    );

    this.root.add([
      objectiveTag,
      objective,
      target,
      separator,
      this.progressBar,
      this.progressText,
      this.selectedText,
    ]);

    this.moreNumbersButton = createButton(scene, {
      x: sideX,
      y: SIDE_PANEL.y + 236,
      width: sideWidth,
      height: 48,
      label: "MÁS NÚMEROS",
      sublabel: "N · añade hasta 35",
      primary: true,
      onClick: callbacks.onMoreNumbers,
    });
    const hintButton = createButton(scene, {
      x: sideX,
      y: SIDE_PANEL.y + 296,
      width: (sideWidth - 8) / 2,
      height: 42,
      label: "PISTA",
      sublabel: "H",
      onClick: callbacks.onHint,
    });
    this.resetButton = createButton(scene, {
      x: sideX + (sideWidth - 8) / 2 + 8,
      y: SIDE_PANEL.y + 296,
      width: (sideWidth - 8) / 2,
      height: 42,
      label: "REINICIAR",
      sublabel: "R",
      onClick: callbacks.onReset,
    });
    const pauseButton = createButton(scene, {
      x: sideX,
      y: SIDE_PANEL.y + 346,
      width: (sideWidth - 8) / 2,
      height: 42,
      label: "PAUSA",
      sublabel: "Esc",
      onClick: callbacks.onPause,
    });
    const menuButton = createButton(scene, {
      x: sideX + (sideWidth - 8) / 2 + 8,
      y: SIDE_PANEL.y + 346,
      width: (sideWidth - 8) / 2,
      height: 42,
      label: "MENÚ",
      onClick: callbacks.onMenu,
    });
    this.root.add([
      this.moreNumbersButton.container,
      hintButton.container,
      this.resetButton.container,
      pauseButton.container,
      menuButton.container,
    ]);

    const legendTag = smallCaps(
      scene,
      sideX,
      SIDE_PANEL.y + 414,
      "Cómo se conecta",
      COLORS.mint,
      9,
    );
    const legend = scene.add.text(
      sideX,
      SIDE_PANEL.y + 434,
      "• Horizontal, vertical y diagonal.\n• El último de una fila conecta con el primero de la siguiente.\n• Al vaciar una fila, las de abajo suben.\n• Pide números cuando te falten parejas.",
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
      "Selecciona dos números que sumen 10 y estén conectados.",
      {
        fontFamily: FONTS.sans,
        fontSize: "13px",
        color: hex(COLORS.creamDark),
      },
    );
    const shortcuts = scene.add.text(
      BOARD_AREA.x,
      BOARD_AREA.y + BOARD_AREA.size + 44,
      "Flechas mover cursor  ·  Enter seleccionar  ·  N más números  ·  H pista  ·  R reiniciar  ·  Esc pausa",
      {
        fontFamily: FONTS.sans,
        fontSize: "11px",
        color: hex(COLORS.muted),
      },
    );
    this.root.add([footer, shortcuts]);

    this.update({
      pairs: 0,
      numbers: INITIAL_NUMBERS,
      capacity: BOARD_SIZE * BOARD_SIZE,
      elapsedMs: 0,
      bestPairs: 0,
      bestTimeMs: null,
      selected: null,
      canRefill: true,
    });
  }

  update(state: HUDState): void {
    this.pairsText.setText(String(state.pairs));
    this.timeText.setText(formatTime(state.elapsedMs));
    this.numbersText.setText(`${state.numbers} / ${state.capacity}`);
    this.moreNumbersButton.setEnabled(state.canRefill);
    this.resetButton.setEnabled(state.pairs > 0);
    this.bestText.setText(
      state.bestPairs > 0
        ? `Récord: ${state.bestPairs} parejas${
            state.bestTimeMs === null ? "" : ` · ${formatTime(state.bestTimeMs)}`
          }`
        : "Récord: —",
    );

    if (state.selected) {
      const partnerText =
        state.selected.partners === 0
          ? "no tiene pareja conectada ahora mismo"
          : `tiene ${state.selected.partners} pareja${
              state.selected.partners === 1 ? "" : "s"
            } conectada${state.selected.partners === 1 ? "" : "s"}`;
      this.selectedText.setText(
        `${state.selected.value} seleccionado: ${partnerText}.`,
      );
      this.selectedText.setColor(
        hex(state.selected.partners > 0 ? COLORS.success : COLORS.danger),
      );
    } else {
      this.selectedText.setText(
        "Toca un número para ver qué parejas suman 10 a su alrededor.",
      );
      this.selectedText.setColor(hex(COLORS.creamDark));
    }

    const ratio =
      state.capacity > 0 ? Math.min(1, state.numbers / state.capacity) : 0;
    this.drawProgress(ratio);
    this.progressText.setText(
      `${state.numbers} de ${state.capacity} casillas ocupadas`,
    );
  }

  private drawProgress(ratio: number): void {
    const x = SIDE_PANEL.x + 20;
    const y = SIDE_PANEL.y + 128;
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
      hold: 1600,
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
