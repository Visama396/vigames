import Phaser from "phaser";
import { GAME_WIDTH } from "../config.ts";
import { LEVELS, LEVEL_COUNT } from "../data/levels.ts";
import {
  formatTime,
  isLevelCompleted,
  isLevelUnlocked,
  loadProgress,
  nextPlayableLevel,
} from "../systems/ProgressionSystem.ts";
import {
  DIFFICULTY_LABELS,
  type PlayerProgress,
  type PuzzleLevel,
} from "../types/puzzle.ts";
import { createBackdrop } from "../render/backdrop.ts";
import { COLORS, DEPTH, FONTS, hex } from "../render/theme.ts";
import { createButton, createPanel, smallCaps } from "../render/ui.ts";
import { CatToken } from "../entities/CatToken.ts";

interface LevelCardOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  level: PuzzleLevel;
  index: number;
  unlocked: boolean;
  completed: boolean;
  bestMs: number | null;
  onClick: () => void;
}

function createLevelCard(
  scene: Phaser.Scene,
  options: LevelCardOptions,
): Phaser.GameObjects.Container {
  const { x, y, width, height, level, index, unlocked, completed, bestMs } =
    options;
  const container = scene.add.container(x + width / 2, y + height / 2).setDepth(DEPTH.hud);
  const background = scene.add.graphics();
  const number = scene.add
    .text(0, -height / 2 + 14, String(index + 1).padStart(2, "0"), {
      fontFamily: FONTS.display,
      fontSize: "26px",
      fontStyle: "bold",
      color: hex(unlocked ? COLORS.goldBright : COLORS.mutedDark),
    })
    .setOrigin(0.5, 0);
  const name = scene.add
    .text(0, -height / 2 + 44, level.name, {
      fontFamily: FONTS.sans,
      fontSize: "10px",
      color: hex(unlocked ? COLORS.creamDark : COLORS.mutedDark),
      align: "center",
      wordWrap: { width: width - 20 },
    })
    .setOrigin(0.5, 0);
  const meta = scene.add
    .text(
      0,
      height / 2 - 40,
      `${level.size}×${level.size} · ${DIFFICULTY_LABELS[level.difficulty]}`,
      {
        fontFamily: FONTS.sans,
        fontSize: "9px",
        color: hex(unlocked ? COLORS.muted : COLORS.mutedDark),
      },
    )
    .setOrigin(0.5, 0);
  const status = scene.add
    .text(
      0,
      height / 2 - 22,
      completed
        ? bestMs !== null
          ? `✓ ${formatTime(bestMs)}`
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
        letterSpacing: 0.5,
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
      background.fillRoundedRect(-width / 2 + 2, -height / 2 + 2, width - 4, 24, 8);
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
    createBackdrop(this, { stars: 56 });

    // Gatos decorativos.
    const leftGlow = this.add
      .image(144, 250, "soft-glow")
      .setScale(1.15)
      .setTint(COLORS.pink)
      .setAlpha(0.16)
      .setDepth(DEPTH.backdrop + 1);
    const rightGlow = this.add
      .image(880, 250, "soft-glow")
      .setScale(1.05)
      .setTint(COLORS.sky)
      .setAlpha(0.14)
      .setDepth(DEPTH.backdrop + 1);
    leftGlow.setBlendMode(Phaser.BlendModes.ADD);
    rightGlow.setBlendMode(Phaser.BlendModes.ADD);

    const leftCat = new CatToken(this, 144, 244, 120);
    leftCat.setAngle(-7);
    const rightCat = new CatToken(this, 880, 248, 110);
    rightCat.setAngle(6);
    rightCat.scaleX = -1;

    this.add
      .text(GAME_WIDTH / 2, 82, "PURRGRID", {
        fontFamily: FONTS.display,
        fontSize: "78px",
        fontStyle: "bold",
        color: hex(COLORS.goldBright),
        stroke: hex(COLORS.bgDeep),
        strokeThickness: 7,
        letterSpacing: 7,
      })
      .setOrigin(0.5, 0);
    this.add
      .text(
        GAME_WIDTH / 2,
        166,
        "Un gato por región, fila y columna. Sin contacto, ni en diagonal.",
        {
          fontFamily: FONTS.sans,
          fontSize: "17px",
          color: hex(COLORS.cream),
        },
      )
      .setOrigin(0.5, 0);

    const rulesPanel = createPanel(this, 224, 214, 576, 206, {
      radius: 22,
      fillAlpha: 0.9,
    });
    const rulesTag = smallCaps(this, 258, 236, "Cómo jugar", COLORS.pink, 10);
    const rules = [
      "• Cada región de color debe tener exactamente un gato.",
      "• Cada fila y cada columna deben tener exactamente un gato.",
      "• Dos gatos no pueden tocarse, tampoco en diagonal.",
      "• Toca una celda para colocar o retirar. Deshaz sin miedo.",
    ];
    const ruleTexts = rules.map((rule, index) =>
      this.add.text(258, 268 + index * 30, rule, {
        fontFamily: FONTS.sans,
        fontSize: "15px",
        color: hex(COLORS.creamDark),
      }),
    );
    const tip = this.add.text(
      258,
      388,
      "El modo relajado te deja experimentar: los conflictos se marcan, no se castigan.",
      {
        fontFamily: FONTS.sans,
        fontSize: "11px",
        fontStyle: "italic",
        color: hex(COLORS.muted),
      },
    );

    const selectPanel = createPanel(this, 120, 452, 784, 372, {
      radius: 24,
      fillAlpha: 0.93,
    });
    const selectTag = smallCaps(
      this,
      152,
      474,
      `Elige un nivel · ${this.progress.completedLevels.length} de ${LEVEL_COUNT} completados`,
      COLORS.goldBright,
      10,
    );

    const cardWidth = 134;
    const cardHeight = 118;
    const gapX = 12;
    const gapY = 14;
    const startX = 152;
    const startY = 506;
    LEVELS.forEach((level, index) => {
      const column = index % 5;
      const rowIndex = Math.floor(index / 5);
      createLevelCard(this, {
        x: startX + column * (cardWidth + gapX),
        y: startY + rowIndex * (cardHeight + gapY),
        width: cardWidth,
        height: cardHeight,
        level,
        index,
        unlocked: isLevelUnlocked(this.progress, index),
        completed: isLevelCompleted(this.progress, level.id),
        bestMs: this.progress.bestTimes[level.id] ?? null,
        onClick: () => this.startLevel(index),
      });
    });

    const allCompleted =
      LEVELS.length > 0 &&
      LEVELS.every((level) =>
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
      y: 856,
      width: 340,
      height: 58,
      label: startLabel,
      sublabel: allCompleted
        ? "Vuelve a empezar la aventura"
        : `Nivel ${startIndex + 1} · ${LEVELS[startIndex]?.name ?? ""}`,
      primary: true,
      onClick: () => this.startLevel(startIndex),
    });

    const footer = this.add
      .text(
        GAME_WIDTH / 2,
        948,
        "Progreso guardado en este navegador · Sin límite de tiempo · Sin penalización por probar",
        {
          fontFamily: FONTS.sans,
          fontSize: "11px",
          color: hex(COLORS.mutedDark),
        },
      )
      .setOrigin(0.5);

    // Entrada de teclado para empezar.
    this.input.keyboard?.on("keydown-ENTER", () => this.startLevel(startIndex));
    this.input.keyboard?.on("keydown-SPACE", () => this.startLevel(startIndex));

    void leftCat;
    void rightCat;
    void rulesPanel;
    void rulesTag;
    void ruleTexts;
    void tip;
    void selectPanel;
    void selectTag;
    void startButton;
    void footer;
  }

  private startLevel(index: number): void {
    this.cameras.main.fadeOut(140, 16, 20, 42);
    this.time.delayedCall(150, () => {
      this.scene.start("GameScene", { levelIndex: index });
    });
  }
}
