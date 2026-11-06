import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "../config.ts";
import { COLORS, DEPTH, FONTS, hex } from "../render/theme.ts";
import { createButton, createPanel } from "../render/ui.ts";
import { formatTime } from "../systems/ProgressionSystem.ts";

export interface RunEndCallbacks {
  onRestart: () => void;
  onMenu: () => void;
}

export interface RunEndData {
  pairs: number;
  timeMs: number;
  bestPairs: number;
  bestTimeMs: number | null;
  isNewBest: boolean;
}

/** Panel que aparece cuando ya no quedan parejas ni huecos para más números. */
export class RunEndPanel {
  private readonly scene: Phaser.Scene;
  private readonly callbacks: RunEndCallbacks;
  private root: Phaser.GameObjects.Container | null = null;

  constructor(scene: Phaser.Scene, callbacks: RunEndCallbacks) {
    this.scene = scene;
    this.callbacks = callbacks;
  }

  get isOpen(): boolean {
    return this.root !== null;
  }

  show(data: RunEndData): void {
    if (this.root) return;
    const scene = this.scene;
    const root = scene.add.container(0, 0).setDepth(DEPTH.overlay);
    this.root = root;

    const dim = scene.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, COLORS.black, 0.66)
      .setOrigin(0)
      .setInteractive();
    root.add(dim);

    const width = 560;
    const height = 470;
    const x = (GAME_WIDTH - width) / 2;
    const y = (GAME_HEIGHT - height) / 2;
    root.add(
      createPanel(scene, x, y, width, height, { radius: 26, fillAlpha: 0.98 }),
    );

    const title = scene.add
      .text(GAME_WIDTH / 2, y + 48, "SIN PAREJAS", {
        fontFamily: FONTS.display,
        fontSize: "38px",
        fontStyle: "bold",
        color: hex(COLORS.danger),
        stroke: hex(COLORS.bgDeep),
        strokeThickness: 5,
      })
      .setOrigin(0.5);
    const subtitle = scene.add
      .text(
        GAME_WIDTH / 2,
        y + 96,
        "El tablero está lleno y no quedan sumas posibles.",
        {
          fontFamily: FONTS.sans,
          fontSize: "14px",
          color: hex(COLORS.muted),
        },
      )
      .setOrigin(0.5);

    const statsPanel = scene.add.graphics();
    statsPanel.fillStyle(COLORS.bgDeep, 0.45);
    statsPanel.fillRoundedRect(x + 52, y + 132, width - 104, 104, 14);
    statsPanel.lineStyle(1, COLORS.border, 0.7);
    statsPanel.strokeRoundedRect(x + 52, y + 132, width - 104, 104, 14);

    const columns = [
      { label: "PAREJAS", value: String(data.pairs) },
      { label: "TIEMPO", value: formatTime(data.timeMs) },
      { label: "RÉCORD", value: String(data.bestPairs) },
    ];
    const columnWidth = (width - 104) / columns.length;
    const stats: Phaser.GameObjects.Text[] = [];
    columns.forEach((column, index) => {
      const center = x + 52 + columnWidth * index + columnWidth / 2;
      const label = scene.add
        .text(center, y + 154, column.label, {
          fontFamily: FONTS.sans,
          fontSize: "10px",
          fontStyle: "bold",
          color: hex(COLORS.muted),
          letterSpacing: 1.4,
        })
        .setOrigin(0.5, 0);
      const value = scene.add
        .text(center, y + 176, column.value, {
          fontFamily: FONTS.mono,
          fontSize: "28px",
          fontStyle: "bold",
          color: hex(COLORS.text),
        })
        .setOrigin(0.5, 0);
      stats.push(label, value);
    });

    const bestLine = scene.add
      .text(
        GAME_WIDTH / 2,
        y + 262,
        data.bestPairs > 0
          ? `Mejor partida: ${data.bestPairs} parejas${
              data.bestTimeMs === null ? "" : ` · ${formatTime(data.bestTimeMs)}`
            }`
          : "Aún no hay una partida registrada.",
        {
          fontFamily: FONTS.sans,
          fontSize: "15px",
          fontStyle: data.isNewBest ? "bold" : "normal",
          color: hex(data.isNewBest ? COLORS.goldBright : COLORS.muted),
        },
      )
      .setOrigin(0.5);

    const record = scene.add
      .text(
        GAME_WIDTH / 2,
        y + 290,
        data.isNewBest ? "¡Nuevo récord personal!" : "Pide más números antes de llegar aquí.",
        {
          fontFamily: FONTS.sans,
          fontSize: "12px",
          fontStyle: data.isNewBest ? "bold" : "normal",
          color: hex(data.isNewBest ? COLORS.mint : COLORS.mutedDark),
        },
      )
      .setOrigin(0.5);

    root.add([title, subtitle, statsPanel, ...stats, bestLine, record]);

    const restart = createButton(scene, {
      x: x + 60,
      y: y + 330,
      width: width - 120,
      height: 50,
      label: "NUEVA PARTIDA",
      primary: true,
      onClick: this.callbacks.onRestart,
    });
    const menu = createButton(scene, {
      x: x + 60,
      y: y + 394,
      width: width - 120,
      height: 42,
      label: "VOLVER AL MENÚ",
      onClick: this.callbacks.onMenu,
    });
    root.add([restart.container, menu.container]);
  }

  hide(): void {
    this.root?.destroy(true);
    this.root = null;
  }

  destroy(): void {
    this.hide();
  }
}
