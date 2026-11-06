import Phaser from "phaser";
import { GAME_WIDTH } from "../config.ts";
import { COLOR_ORDER, colorDefinition } from "../data/palette.ts";
import { LEVELS, LEVEL_COUNT } from "../data/levels.ts";
import { createBackdrop } from "../render/backdrop.ts";
import { COLORS, DEPTH, FONTS, hex } from "../render/theme.ts";
import {
  createButton,
  createPanel,
  createToggle,
  smallCaps,
} from "../render/ui.ts";
import {
  getStars,
  isLevelCompleted,
  isLevelUnlocked,
  loadProgress,
  nextPlayableLevel,
  saveProgress,
  starString,
  withSettings,
} from "../systems/ProgressionSystem.ts";
import {
  DIFFICULTY_LABELS,
  type LevelDefinition,
  type PlayerProgress,
  type PlayerSettings,
} from "../types/GameTypes.ts";

interface LevelCardOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  level: LevelDefinition;
  index: number;
  unlocked: boolean;
  completed: boolean;
  stars: number;
  bestMoves: number | null;
  onClick: () => void;
}

function createLevelCard(
  scene: Phaser.Scene,
  options: LevelCardOptions,
): Phaser.GameObjects.Container {
  const {
    x,
    y,
    width,
    height,
    level,
    index,
    unlocked,
    completed,
    stars,
    bestMoves,
  } = options;
  const container = scene.add
    .container(x + width / 2, y + height / 2)
    .setDepth(DEPTH.hud);
  const background = scene.add.graphics();
  const number = scene.add
    .text(0, -height / 2 + 12, String(index + 1).padStart(2, "0"), {
      fontFamily: FONTS.display,
      fontSize: "24px",
      fontStyle: "bold",
      color: hex(unlocked ? COLORS.goldBright : COLORS.mutedDark),
    })
    .setOrigin(0.5, 0);
  const name = scene.add
    .text(0, -height / 2 + 42, level.name, {
      fontFamily: FONTS.sans,
      fontSize: "10px",
      color: hex(unlocked ? COLORS.creamDark : COLORS.mutedDark),
      align: "center",
      wordWrap: { width: width - 18 },
    })
    .setOrigin(0.5, 0);
  const meta = scene.add
    .text(
      0,
      height / 2 - 44,
      `${level.width}×${level.height} · ${DIFFICULTY_LABELS[level.difficulty]}`,
      {
        fontFamily: FONTS.sans,
        fontSize: "8px",
        color: hex(unlocked ? COLORS.muted : COLORS.mutedDark),
      },
    )
    .setOrigin(0.5, 0);
  const status = scene.add
    .text(
      0,
      height / 2 - 24,
      completed
        ? bestMoves !== null
          ? `${starString(stars)} ${bestMoves} mov.`
          : "✓ COMPLETADO"
        : unlocked
          ? "DISPONIBLE"
          : "BLOQUEADO",
      {
        fontFamily: FONTS.sans,
        fontSize: "9px",
        fontStyle: "bold",
        color: hex(
          completed
            ? COLORS.mint
            : unlocked
              ? COLORS.gold
              : COLORS.mutedDark,
        ),
        letterSpacing: 0.3,
      },
    )
    .setOrigin(0.5, 0);

  const hit = scene.add
    .rectangle(0, 0, width, height, 0xffffff, 0.001)
    .setInteractive({ useHandCursor: unlocked });
  if (!unlocked) hit.disableInteractive();

  container.add([background, number, name, meta, status, hit]);

  let hovered = false;
  const draw = (): void => {
    background.clear();
    const fill = hovered && unlocked ? COLORS.panelSoft : COLORS.panelLight;
    background.fillStyle(fill, unlocked ? 0.96 : 0.42);
    background.fillRoundedRect(-width / 2, -height / 2, width, height, 12);
    background.lineStyle(
      hovered && unlocked ? 2 : 1.2,
      hovered && unlocked
        ? COLORS.goldBright
        : completed
          ? COLORS.mintDark
          : COLORS.border,
      unlocked ? 0.95 : 0.35,
    );
    background.strokeRoundedRect(-width / 2, -height / 2, width, height, 12);
    if (completed) {
      background.fillStyle(COLORS.mint, 0.08);
      background.fillRoundedRect(
        -width / 2 + 2,
        -height / 2 + 2,
        width - 4,
        22,
        8,
      );
    }
    container.setAlpha(unlocked ? 1 : 0.72);
  };

  hit.on("pointerover", () => {
    hovered = true;
    draw();
  });
  hit.on("pointerout", () => {
    hovered = false;
    draw();
  });
  hit.on("pointerup", () => {
    if (unlocked) options.onClick();
  });

  draw();
  return container;
}

export class MenuScene extends Phaser.Scene {
  private progress!: PlayerProgress;

  constructor() {
    super("MenuScene");
  }

  create(): void {
    this.progress = loadProgress();
    createBackdrop(this, { specks: 58 });

    // Muestra de bloques y puertas.
    const showcase = this.add.graphics().setDepth(DEPTH.backdrop + 2);
    COLOR_ORDER.slice(0, 4).forEach((colorId, index) => {
      const color = colorDefinition(colorId);
      const x = index < 2 ? 78 + index * 66 : 816 + (index - 2) * 66;
      showcase.fillStyle(color.dark, 1);
      showcase.fillRoundedRect(x, 236, 50, 50, 10);
      showcase.fillStyle(color.hex, 1);
      showcase.fillRoundedRect(x, 232, 50, 50, 10);
      showcase.lineStyle(1.5, color.light, 0.7);
      showcase.strokeRoundedRect(x, 232, 50, 50, 10);
      this.add
        .text(x + 25, 257, color.symbol, {
          fontFamily: FONTS.sans,
          fontSize: "20px",
          fontStyle: "bold",
          color: hex(COLORS.bgDeep),
        })
        .setOrigin(0.5)
        .setDepth(DEPTH.backdrop + 3);
      showcase.fillStyle(color.hex, 0.8);
      showcase.fillRoundedRect(x - 12, 232, 9, 50, 4);
    });

    this.add
      .text(GAME_WIDTH / 2, 70, "EXIT JAM", {
        fontFamily: FONTS.display,
        fontSize: "78px",
        fontStyle: "bold",
        color: hex(COLORS.goldBright),
        stroke: hex(COLORS.bgDeep),
        strokeThickness: 7,
        letterSpacing: 6,
      })
      .setOrigin(0.5, 0);
    this.add
      .text(
        GAME_WIDTH / 2,
        166,
        "Mueve cada bloque hasta la puerta de su color y despeja el tablero.",
        {
          fontFamily: FONTS.sans,
          fontSize: "17px",
          color: hex(COLORS.cream),
        },
      )
      .setOrigin(0.5, 0);

    const rulesPanel = createPanel(this, 224, 196, 576, 178, {
      radius: 22,
      fillAlpha: 0.9,
    });
    const rulesTag = smallCaps(this, 258, 216, "Cómo jugar", COLORS.coral, 10);
    const rules = [
      "• Desliza o arrastra un bloque para moverlo.",
      "• Solo puede salir por una puerta de su color y su forma.",
      "• Desliza hacia su puerta cuando encaje para sacarlo.",
      "• Deshaz sin miedo: cada movimiento se puede revertir.",
    ];
    const ruleTexts = rules.map((rule, index) =>
      this.add.text(258, 246 + index * 28, rule, {
        fontFamily: FONTS.sans,
        fontSize: "14px",
        color: hex(COLORS.creamDark),
      }),
    );
    const tip = this.add.text(
      258,
      360,
      "Desliza un bloque hacia su puerta para moverlo y sacarlo del tablero.",
      {
        fontFamily: FONTS.sans,
        fontSize: "11px",
        fontStyle: "italic",
        color: hex(COLORS.muted),
      },
    );

    const selectPanel = createPanel(this, 120, 404, 784, 424, {
      radius: 24,
      fillAlpha: 0.93,
    });
    const selectTag = smallCaps(
      this,
      152,
      426,
      `Elige un nivel · ${this.progress.completedLevels.length} de ${LEVEL_COUNT} completados`,
      COLORS.goldBright,
      10,
    );

    const cardWidth = 134;
    const cardHeight = 126;
    const gapX = 12;
    const gapY = 14;
    const startX = 152;
    const startY = 456;
    LEVELS.forEach((level, index) => {
      const column = index % 5;
      const rowIndex = Math.floor(index / 5);
      const bestMoves = this.progress.bestMoveCounts[level.id] ?? null;
      createLevelCard(this, {
        x: startX + column * (cardWidth + gapX),
        y: startY + rowIndex * (cardHeight + gapY),
        width: cardWidth,
        height: cardHeight,
        level,
        index,
        unlocked: isLevelUnlocked(this.progress, index),
        completed: isLevelCompleted(this.progress, level.id),
        stars:
          bestMoves === null
            ? 0
            : getStars(bestMoves, level.targetMoves),
        bestMoves,
        onClick: () => this.startLevel(index),
      });
    });

    const allCompleted = LEVELS.every((level) =>
      this.progress.completedLevels.includes(level.id),
    );
    const firstIncomplete = LEVELS.findIndex(
      (level, index) =>
        isLevelUnlocked(this.progress, index) &&
        !this.progress.completedLevels.includes(level.id),
    );
    const startIndex =
      firstIncomplete >= 0
        ? firstIncomplete
        : nextPlayableLevel(this.progress, LEVEL_COUNT);
    const startLabel = allCompleted
      ? "REJUGAR"
      : this.progress.completedLevels.length > 0
        ? "CONTINUAR"
        : "JUGAR";

    const startButton = createButton(this, {
      x: GAME_WIDTH / 2 - 170,
      y: 842,
      width: 340,
      height: 50,
      label: startLabel,
      sublabel: allCompleted
        ? "Vuelve a empezar la campaña"
        : `Nivel ${startIndex + 1} · ${LEVELS[startIndex]?.name ?? ""}`,
      primary: true,
      onClick: () => this.startLevel(startIndex),
    });

    const settingsTag = smallCaps(
      this,
      152,
      850,
      "Ajustes rápidos",
      COLORS.muted,
      9,
    );
    const soundToggle = createToggle(this, {
      x: 152,
      y: 910,
      width: 280,
      label: "Sonido",
      value: this.progress.settings.soundEnabled,
      onChange: (value) => this.applySettings({ soundEnabled: value }),
    });
    const motionToggle = createToggle(this, {
      x: 452,
      y: 910,
      width: 300,
      label: "Movimiento reducido",
      value: this.progress.settings.reducedMotion,
      onChange: (value) => this.applySettings({ reducedMotion: value }),
    });
    const footer = this.add
      .text(
        GAME_WIDTH / 2,
        956,
        "Progreso guardado en este navegador · Sin temporizador · Sin penalización por probar",
        {
          fontFamily: FONTS.sans,
          fontSize: "11px",
          color: hex(COLORS.mutedDark),
        },
      )
      .setOrigin(0.5);

    this.input.keyboard?.on("keydown-ENTER", () => this.startLevel(startIndex));
    this.input.keyboard?.on("keydown-SPACE", () => this.startLevel(startIndex));

    void rulesPanel;
    void rulesTag;
    void ruleTexts;
    void tip;
    void selectPanel;
    void selectTag;
    void startButton;
    void settingsTag;
    void soundToggle;
    void motionToggle;
    void footer;
  }

  private applySettings(patch: Partial<PlayerSettings>): void {
    this.progress = withSettings(this.progress, patch);
    saveProgress(this.progress);
  }

  private startLevel(index: number): void {
    this.cameras.main.fadeOut(140, 21, 18, 37);
    this.time.delayedCall(150, () => {
      this.scene.start("GameScene", { levelIndex: index });
    });
  }
}
