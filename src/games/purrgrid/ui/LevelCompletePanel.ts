import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "../config.ts";
import { formatTime } from "../systems/ProgressionSystem.ts";
import { COLORS, DEPTH, FONTS, hex } from "../render/theme.ts";
import { createButton, createPanel } from "../render/ui.ts";
import { drawPaw } from "../render/backdrop.ts";

export interface LevelCompleteCallbacks {
  onNext: () => void;
  onReplay: () => void;
  onMenu: () => void;
}

export interface LevelCompleteData {
  levelName: string;
  timeMs: number;
  moves: number;
  bestMs: number | null;
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
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, COLORS.black, 0.64)
      .setOrigin(0)
      .setInteractive();
    root.add(dim);

    const width = 540;
    const height = 440;
    const x = (GAME_WIDTH - width) / 2;
    const y = (GAME_HEIGHT - height) / 2;
    root.add(createPanel(scene, x, y, width, height, { radius: 26, fillAlpha: 0.98 }));

    // Huellas decorativas.
    const paws = scene.add.graphics();
    drawPaw(paws, x + 54, y + 54, 22, COLORS.pink, 0.28);
    drawPaw(paws, x + width - 54, y + 54, 22, COLORS.sky, 0.28);
    drawPaw(paws, x + 54, y + height - 54, 18, COLORS.mint, 0.22);
    drawPaw(paws, x + width - 54, y + height - 54, 18, COLORS.lavender, 0.22);
    root.add(paws);

    const title = scene.add
      .text(GAME_WIDTH / 2, y + 62, "¡Nivel completado!", {
        fontFamily: FONTS.display,
        fontSize: "40px",
        fontStyle: "bold",
        color: hex(COLORS.goldBright),
        stroke: hex(COLORS.bgDeep),
        strokeThickness: 5,
      })
      .setOrigin(0.5);
    const levelName = scene.add
      .text(GAME_WIDTH / 2, y + 112, data.levelName, {
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

    const timeLabel = scene.add
      .text(x + 110, y + 172, "TIEMPO", {
        fontFamily: FONTS.sans,
        fontSize: "10px",
        fontStyle: "bold",
        color: hex(COLORS.muted),
        letterSpacing: 1.5,
      })
      .setOrigin(0, 0);
    const timeValue = scene.add
      .text(x + 110, y + 192, formatTime(data.timeMs), {
        fontFamily: FONTS.mono,
        fontSize: "28px",
        fontStyle: "bold",
        color: hex(COLORS.text),
      })
      .setOrigin(0, 0);

    const movesLabel = scene.add
      .text(x + 300, y + 172, "JUGADAS", {
        fontFamily: FONTS.sans,
        fontSize: "10px",
        fontStyle: "bold",
        color: hex(COLORS.muted),
        letterSpacing: 1.5,
      })
      .setOrigin(0, 0);
    const movesValue = scene.add
      .text(x + 300, y + 192, String(data.moves), {
        fontFamily: FONTS.mono,
        fontSize: "28px",
        fontStyle: "bold",
        color: hex(COLORS.text),
      })
      .setOrigin(0, 0);

    const bestLabel = scene.add
      .text(x + 410, y + 172, "MEJOR", {
        fontFamily: FONTS.sans,
        fontSize: "10px",
        fontStyle: "bold",
        color: hex(COLORS.muted),
        letterSpacing: 1.5,
      })
      .setOrigin(0, 0);
    const bestValue = scene.add
      .text(
        x + 410,
        y + 192,
        data.bestMs === null ? "—" : formatTime(data.bestMs),
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
      timeLabel,
      timeValue,
      movesLabel,
      movesValue,
      bestLabel,
      bestValue,
    ]);

    if (data.isNewBest) {
      const record = scene.add
        .text(GAME_WIDTH / 2, y + 286, "¡Nuevo récord personal!", {
          fontFamily: FONTS.sans,
          fontSize: "15px",
          fontStyle: "bold",
          color: hex(COLORS.goldBright),
        })
        .setOrigin(0.5);
      root.add(record);
    } else {
      const message = scene.add
        .text(
          GAME_WIDTH / 2,
          y + 286,
          data.hasNext
            ? "El siguiente nivel ya está desbloqueado."
            : "Has completado todos los niveles de este paquete.",
          {
            fontFamily: FONTS.sans,
            fontSize: "14px",
            color: hex(COLORS.muted),
          },
        )
        .setOrigin(0.5);
      root.add(message);
    }

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

    const paw = scene.add.graphics();
    drawPaw(paw, GAME_WIDTH / 2, y + 12, 26, COLORS.goldBright, 0.5);
    root.add(paw);
  }

  hide(): void {
    this.root?.destroy(true);
    this.root = null;
  }

  destroy(): void {
    this.hide();
  }
}
