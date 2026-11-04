import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "../config.ts";
import { formatShortMoves } from "../systems/ProgressionSystem.ts";
import { COLORS, DEPTH, FONTS, hex } from "../render/theme.ts";
import { createButton, createPanel } from "../render/ui.ts";
import { drawDrop } from "../render/backdrop.ts";

export interface LevelCompleteCallbacks {
  onNext: () => void;
  onReplay: () => void;
  onMenu: () => void;
}

export interface LevelCompleteData {
  levelName: string;
  moves: number;
  bestMoves: number | null;
  hasNext: boolean;
  isNewBest: boolean;
}

/** Panel de victoria con estadísticas y navegación. */
export class LevelCompletePanel {
  private readonly scene: Phaser.Scene;
  private readonly callbacks: LevelCompleteCallbacks;
  private root: Phaser.GameObjects.Container | null = null;

  constructor(scene: Phaser.Scene, callbacks: LevelCompleteCallbacks) {
    this.scene = scene;
    this.callbacks = callbacks;
  }

  get isOpen(): boolean {
    return this.root !== null;
  }

  show(data: LevelCompleteData): void {
    if (this.root) return;
    const scene = this.scene;
    const root = scene.add.container(0, 0).setDepth(DEPTH.overlay);
    this.root = root;

    const dim = scene.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, COLORS.black, 0.66)
      .setOrigin(0)
      .setInteractive();
    root.add(dim);

    const width = 540;
    const height = 440;
    const x = (GAME_WIDTH - width) / 2;
    const y = (GAME_HEIGHT - height) / 2;
    root.add(
      createPanel(scene, x, y, width, height, {
        radius: 26,
        fillAlpha: 0.98,
      }),
    );

    const drops = scene.add.graphics();
    drawDrop(drops, x + 56, y + 58, 26, COLORS.coral, 0.3);
    drawDrop(drops, x + width - 56, y + 58, 24, COLORS.aqua, 0.28);
    drawDrop(drops, x + 56, y + height - 58, 20, COLORS.mint, 0.24);
    drawDrop(drops, x + width - 56, y + height - 58, 22, COLORS.lavender, 0.24);
    root.add(drops);

    const title = scene.add
      .text(GAME_WIDTH / 2, y + 62, "¡Colores en orden!", {
        fontFamily: FONTS.display,
        fontSize: "38px",
        fontStyle: "bold",
        color: hex(COLORS.goldBright),
        stroke: hex(COLORS.bgDeep),
        strokeThickness: 5,
      })
      .setOrigin(0.5);
    const levelName = scene.add
      .text(GAME_WIDTH / 2, y + 110, data.levelName, {
        fontFamily: FONTS.sans,
        fontSize: "19px",
        color: hex(COLORS.cream),
      })
      .setOrigin(0.5);

    const statsPanel = scene.add.graphics();
    statsPanel.fillStyle(COLORS.bgDeep, 0.45);
    statsPanel.fillRoundedRect(x + 60, y + 148, width - 120, 116, 14);
    statsPanel.lineStyle(1, COLORS.border, 0.7);
    statsPanel.strokeRoundedRect(x + 60, y + 148, width - 120, 116, 14);

    const movesLabel = scene.add
      .text(x + 108, y + 172, "MOVIMIENTOS", {
        fontFamily: FONTS.sans,
        fontSize: "10px",
        fontStyle: "bold",
        color: hex(COLORS.muted),
        letterSpacing: 1.5,
      })
      .setOrigin(0, 0);
    const movesValue = scene.add
      .text(x + 108, y + 192, String(data.moves), {
        fontFamily: FONTS.mono,
        fontSize: "28px",
        fontStyle: "bold",
        color: hex(COLORS.text),
      })
      .setOrigin(0, 0);

    const bestLabel = scene.add
      .text(x + 300, y + 172, "MEJOR MARCA", {
        fontFamily: FONTS.sans,
        fontSize: "10px",
        fontStyle: "bold",
        color: hex(COLORS.muted),
        letterSpacing: 1.5,
      })
      .setOrigin(0, 0);
    const bestValue = scene.add
      .text(
        x + 300,
        y + 192,
        data.bestMoves === null ? "—" : formatShortMoves(data.bestMoves),
        {
          fontFamily: FONTS.mono,
          fontSize: "28px",
          fontStyle: "bold",
          color: hex(data.isNewBest ? COLORS.goldBright : COLORS.text),
        },
      )
      .setOrigin(0, 0);

    root.add([
      title,
      levelName,
      statsPanel,
      movesLabel,
      movesValue,
      bestLabel,
      bestValue,
    ]);

    const message = scene.add
      .text(
        GAME_WIDTH / 2,
        y + 286,
        data.isNewBest
          ? "¡Nuevo récord personal!"
          : data.hasNext
            ? "El siguiente nivel ya está desbloqueado."
            : "Has completado todos los niveles de este paquete.",
        {
          fontFamily: FONTS.sans,
          fontSize: "15px",
          fontStyle: data.isNewBest ? "bold" : "normal",
          color: hex(data.isNewBest ? COLORS.goldBright : COLORS.muted),
        },
      )
      .setOrigin(0.5);
    root.add(message);

    const primary = createButton(scene, {
      x: x + 58,
      y: y + 326,
      width: width - 116,
      height: 52,
      label: data.hasNext ? "SIGUIENTE NIVEL" : "VOLVER AL MENÚ",
      primary: true,
      onClick: data.hasNext ? this.callbacks.onNext : this.callbacks.onMenu,
    });
    const replay = createButton(scene, {
      x: x + 58,
      y: y + 390,
      width: (width - 128) / 2,
      height: 42,
      label: "REPETIR",
      onClick: this.callbacks.onReplay,
    });
    const menu = createButton(scene, {
      x: x + 70 + (width - 128) / 2,
      y: y + 390,
      width: (width - 128) / 2,
      height: 42,
      label: "MENÚ",
      onClick: this.callbacks.onMenu,
    });
    root.add([primary.container, replay.container, menu.container]);
  }

  hide(): void {
    this.root?.destroy(true);
    this.root = null;
  }

  destroy(): void {
    this.hide();
  }
}
