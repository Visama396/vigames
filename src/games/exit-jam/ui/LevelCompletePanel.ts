import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "../config.ts";
import { COLORS, DEPTH, FONTS, hex } from "../render/theme.ts";
import { createButton, createPanel } from "../render/ui.ts";
import { starString } from "../systems/ProgressionSystem.ts";

export interface LevelCompleteCallbacks {
  onNext: () => void;
  onReplay: () => void;
  onMenu: () => void;
}

export interface LevelCompleteData {
  levelName: string;
  moves: number;
  targetMoves: number;
  stars: number;
  bestMoves: number | null;
  hasNext: boolean;
  isNewBest: boolean;
}

/** Panel de victoria con estrellas, estadísticas y navegación. */
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

    const width = 560;
    const height = 470;
    const x = (GAME_WIDTH - width) / 2;
    const y = (GAME_HEIGHT - height) / 2;
    root.add(
      createPanel(scene, x, y, width, height, { radius: 26, fillAlpha: 0.98 }),
    );

    const title = scene.add
      .text(GAME_WIDTH / 2, y + 50, "¡Tablero despejado!", {
        fontFamily: FONTS.display,
        fontSize: "38px",
        fontStyle: "bold",
        color: hex(COLORS.goldBright),
        stroke: hex(COLORS.bgDeep),
        strokeThickness: 5,
      })
      .setOrigin(0.5);
    const levelName = scene.add
      .text(GAME_WIDTH / 2, y + 98, data.levelName, {
        fontFamily: FONTS.sans,
        fontSize: "18px",
        color: hex(COLORS.cream),
      })
      .setOrigin(0.5);

    const stars = scene.add
      .text(GAME_WIDTH / 2, y + 136, starString(data.stars), {
        fontFamily: FONTS.sans,
        fontSize: "48px",
        fontStyle: "bold",
        color: hex(COLORS.goldBright),
        letterSpacing: 8,
      })
      .setOrigin(0.5);
    const starMessage =
      data.stars === 3
        ? "Solución de tres estrellas."
        : data.stars === 2
          ? "Muy cerca del objetivo."
          : "Nivel resuelto. Prueba a optimizar.";
    const starHint = scene.add
      .text(GAME_WIDTH / 2, y + 186, starMessage, {
        fontFamily: FONTS.sans,
        fontSize: "13px",
        color: hex(COLORS.muted),
      })
      .setOrigin(0.5);

    const statsPanel = scene.add.graphics();
    statsPanel.fillStyle(COLORS.bgDeep, 0.45);
    statsPanel.fillRoundedRect(x + 60, y + 214, width - 120, 104, 14);
    statsPanel.lineStyle(1, COLORS.border, 0.7);
    statsPanel.strokeRoundedRect(x + 60, y + 214, width - 120, 104, 14);

    const movesLabel = scene.add.text(x + 108, y + 236, "MOVIMIENTOS", {
      fontFamily: FONTS.sans,
      fontSize: "10px",
      fontStyle: "bold",
      color: hex(COLORS.muted),
      letterSpacing: 1.4,
    });
    const movesValue = scene.add.text(x + 108, y + 258, String(data.moves), {
      fontFamily: FONTS.mono,
      fontSize: "30px",
      fontStyle: "bold",
      color: hex(COLORS.text),
    });
    const targetLabel = scene.add.text(x + 260, y + 236, "OBJETIVO", {
      fontFamily: FONTS.sans,
      fontSize: "10px",
      fontStyle: "bold",
      color: hex(COLORS.muted),
      letterSpacing: 1.4,
    });
    const targetValue = scene.add.text(
      x + 260,
      y + 258,
      String(data.targetMoves),
      {
        fontFamily: FONTS.mono,
        fontSize: "30px",
        fontStyle: "bold",
        color: hex(COLORS.text),
      },
    );
    const bestLabel = scene.add.text(x + 392, y + 236, "MEJOR", {
      fontFamily: FONTS.sans,
      fontSize: "10px",
      fontStyle: "bold",
      color: hex(COLORS.muted),
      letterSpacing: 1.4,
    });
    const bestValue = scene.add.text(
      x + 392,
      y + 258,
      data.bestMoves === null ? "—" : String(data.bestMoves),
      {
        fontFamily: FONTS.mono,
        fontSize: "30px",
        fontStyle: "bold",
        color: hex(data.isNewBest ? COLORS.goldBright : COLORS.text),
      },
    );

    const record = scene.add
      .text(
        GAME_WIDTH / 2,
        y + 340,
        data.isNewBest
          ? "¡Nuevo récord personal!"
          : data.hasNext
            ? "El siguiente nivel ya está desbloqueado."
            : "Has completado todos los niveles.",
        {
          fontFamily: FONTS.sans,
          fontSize: "14px",
          fontStyle: data.isNewBest ? "bold" : "normal",
          color: hex(data.isNewBest ? COLORS.goldBright : COLORS.muted),
        },
      )
      .setOrigin(0.5);

    root.add([
      title,
      levelName,
      stars,
      starHint,
      statsPanel,
      movesLabel,
      movesValue,
      targetLabel,
      targetValue,
      bestLabel,
      bestValue,
      record,
    ]);

    const primary = createButton(scene, {
      x: x + 60,
      y: y + 372,
      width: width - 120,
      height: 52,
      label: data.hasNext ? "SIGUIENTE NIVEL" : "VOLVER AL MENÚ",
      primary: true,
      onClick: data.hasNext ? this.callbacks.onNext : this.callbacks.onMenu,
    });
    const replay = createButton(scene, {
      x: x + 60,
      y: y + 430,
      width: (width - 132) / 2,
      height: 40,
      label: "REPETIR",
      onClick: this.callbacks.onReplay,
    });
    const menu = createButton(scene, {
      x: x + 72 + (width - 132) / 2,
      y: y + 430,
      width: (width - 132) / 2,
      height: 40,
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
