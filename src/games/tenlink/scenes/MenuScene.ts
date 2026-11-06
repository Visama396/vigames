import Phaser from "phaser";
import {
  BOARD_SIZE,
  GAME_WIDTH,
  INITIAL_NUMBERS,
  REFILL_NUMBERS,
} from "../config.ts";
import { createBackdrop } from "../render/backdrop.ts";
import { COLORS, DEPTH, FONTS, hex } from "../render/theme.ts";
import {
  createButton,
  createPanel,
  createToggle,
  smallCaps,
} from "../render/ui.ts";
import {
  formatTime,
  loadProgress,
  saveProgress,
  withSettings,
} from "../systems/ProgressionSystem.ts";
import type { PlayerProgress, PlayerSettings } from "../types/GameTypes.ts";

function createNumberChip(
  scene: Phaser.Scene,
  x: number,
  y: number,
  value: number,
  size = 44,
): void {
  const graphics = scene.add.graphics().setDepth(DEPTH.backdrop + 4);
  graphics.fillStyle(COLORS.bgDeep, 0.7);
  graphics.fillRoundedRect(x, y + 3, size, size, 10);
  graphics.fillStyle(COLORS.panelLight, 1);
  graphics.fillRoundedRect(x, y, size, size, 10);
  graphics.fillStyle(COLORS.mint, 0.13);
  graphics.fillRoundedRect(x + 2, y + 2, size - 4, size - 4, 8);
  graphics.lineStyle(1.5, COLORS.border, 0.9);
  graphics.strokeRoundedRect(x + 2, y + 2, size - 4, size - 4, 8);
  scene.add
    .text(x + size / 2, y + size / 2, String(value), {
      fontFamily: FONTS.display,
      fontSize: `${Math.round(size * 0.48)}px`,
      fontStyle: "bold",
      color: hex(COLORS.cream),
    })
    .setOrigin(0.5)
    .setDepth(DEPTH.backdrop + 5);
}

export class MenuScene extends Phaser.Scene {
  private progress!: PlayerProgress;

  constructor() {
    super("MenuScene");
  }

  create(): void {
    this.progress = loadProgress();
    createBackdrop(this, { specks: 58 });

    // Muestra de números: todos comparten estilo, sin grupos de color.
    createNumberChip(this, 56, 236, 1);
    createNumberChip(this, 110, 236, 5);
    createNumberChip(this, 164, 236, 9);
    createNumberChip(this, 816, 236, 2);
    createNumberChip(this, 870, 236, 6);
    createNumberChip(this, 924, 236, 8);

    this.add
      .text(GAME_WIDTH / 2, 70, "TENLINK", {
        fontFamily: FONTS.display,
        fontSize: "78px",
        fontStyle: "bold",
        color: hex(COLORS.mint),
        stroke: hex(COLORS.bgDeep),
        strokeThickness: 7,
        letterSpacing: 7,
      })
      .setOrigin(0.5, 0);
    this.add
      .text(
        GAME_WIDTH / 2,
        166,
        "Encuentra parejas conectadas que sumen exactamente 10.",
        {
          fontFamily: FONTS.sans,
          fontSize: "17px",
          color: hex(COLORS.cream),
        },
      )
      .setOrigin(0.5, 0);

    createPanel(this, 224, 196, 576, 220, {
      radius: 22,
      fillAlpha: 0.9,
    });
    smallCaps(this, 258, 216, "Cómo jugar", COLORS.mint, 10);
    const rules = [
      "• Selecciona dos números distintos que sumen exactamente 10.",
      "• Deben tocarse en horizontal, vertical o diagonal.",
      "• El último número de una fila conecta con el primero de la siguiente.",
      `• Empiezas con ${INITIAL_NUMBERS} números en una cuadrícula de ${BOARD_SIZE}×${BOARD_SIZE}.`,
      "• Al vaciar una fila, las de abajo suben y se compactan.",
    ];
    rules.forEach((rule, index) => {
      this.add.text(258, 246 + index * 28, rule, {
        fontFamily: FONTS.sans,
        fontSize: "14px",
        color: hex(COLORS.creamDark),
      });
    });
    this.add.text(
      258,
      386,
      `Sin niveles: juega hasta quedarte sin parejas. Pide hasta ${REFILL_NUMBERS} números más cuando los necesites.`,
      {
        fontFamily: FONTS.sans,
        fontSize: "11px",
        fontStyle: "italic",
        color: hex(COLORS.muted),
      },
    );

    createPanel(this, 272, 446, 480, 230, {
      radius: 24,
      fillAlpha: 0.93,
    });
    smallCaps(this, 304, 468, "Récord personal", COLORS.goldBright, 10);
    const record =
      this.progress.bestPairs > 0
        ? `${this.progress.bestPairs} parejas · ${
            this.progress.bestTimeMs === null
              ? "—"
              : formatTime(this.progress.bestTimeMs)
          }`
        : "Aún no hay una partida registrada";
    this.add.text(304, 492, record, {
      fontFamily: FONTS.display,
      fontSize: "30px",
      fontStyle: "bold",
      color: hex(this.progress.bestPairs > 0 ? COLORS.cream : COLORS.muted),
    });
    this.add.text(
      304,
      530,
      `${this.progress.runs} ${
        this.progress.runs === 1 ? "partida jugada" : "partidas jugadas"
      }`,
      {
        fontFamily: FONTS.sans,
        fontSize: "11px",
        color: hex(COLORS.mutedDark),
      },
    );
    createButton(this, {
      x: 304,
      y: 560,
      width: 416,
      height: 54,
      label: this.progress.runs > 0 ? "NUEVA PARTIDA" : "JUGAR",
      sublabel: "Sin límite · hasta quedarte sin parejas",
      primary: true,
      onClick: () => this.startGame(),
    });
    this.add
      .text(
        512,
        634,
        "Cada partida empieza de cero con un tablero nuevo.",
        {
          fontFamily: FONTS.sans,
          fontSize: "11px",
          color: hex(COLORS.mutedDark),
        },
      )
      .setOrigin(0.5, 0);

    smallCaps(this, 304, 704, "Ajustes rápidos", COLORS.muted, 9);
    createToggle(this, {
      x: 304,
      y: 748,
      width: 280,
      label: "Sonido",
      value: this.progress.settings.soundEnabled,
      onChange: (value) => this.applySettings({ soundEnabled: value }),
    });
    createToggle(this, {
      x: 604,
      y: 748,
      width: 300,
      label: "Movimiento reducido",
      value: this.progress.settings.reducedMotion,
      onChange: (value) => this.applySettings({ reducedMotion: value }),
    });

    this.add
      .text(
        GAME_WIDTH / 2,
        798,
        "Progreso guardado en este navegador · El récord se actualiza al terminar una partida",
        {
          fontFamily: FONTS.sans,
          fontSize: "11px",
          color: hex(COLORS.mutedDark),
        },
      )
      .setOrigin(0.5);

    const keyboard = this.input.keyboard;
    keyboard?.addCapture([Phaser.Input.Keyboard.KeyCodes.SPACE]);
    keyboard?.on("keydown-ENTER", () => this.startGame());
    keyboard?.on("keydown-SPACE", () => this.startGame());
  }

  private applySettings(patch: Partial<PlayerSettings>): void {
    this.progress = withSettings(this.progress, patch);
    saveProgress(this.progress);
  }

  private startGame(): void {
    this.cameras.main.fadeOut(140, 5, 13, 19);
    this.time.delayedCall(150, () => {
      this.scene.start("GameScene");
    });
  }
}
