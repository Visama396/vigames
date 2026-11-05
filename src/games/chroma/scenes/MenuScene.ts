import Phaser from "phaser";
import { GAME_WIDTH } from "../config.ts";
import { LEVELS, LEVEL_COUNT } from "../data/levels.ts";
import { Bottle } from "../entities/Bottle.ts";
import { createBackdrop } from "../render/backdrop.ts";
import { COLORS, DEPTH, FONTS, hex } from "../render/theme.ts";
import { createButton, createPanel, smallCaps } from "../render/ui.ts";
import {
  formatShortMoves,
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

interface LevelCardOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  level: PuzzleLevel;
  index: number;
  unlocked: boolean;
  completed: boolean;
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
    bestMoves,
  } = options;
  const container = scene.add
    .container(x + width / 2, y + height / 2)
    .setDepth(DEPTH.hud);
  const background = scene.add.graphics();
  const number = scene.add
    .text(0, -height / 2 + 10, String(index + 1).padStart(2, "0"), {
      fontFamily: FONTS.display,
      fontSize: "22px",
      fontStyle: "bold",
      color: hex(unlocked ? COLORS.goldBright : COLORS.mutedDark),
    })
    .setOrigin(0.5, 0);
  const name = scene.add
    .text(0, -height / 2 + 36, level.name, {
      fontFamily: FONTS.sans,
      fontSize: "9px",
      color: hex(unlocked ? COLORS.creamDark : COLORS.mutedDark),
      align: "center",
      wordWrap: { width: width - 16 },
    })
    .setOrigin(0.5, 0);
  const meta = scene.add
    .text(
      0,
      height / 2 - 34,
      `${level.colorCount} colores · ${DIFFICULTY_LABELS[level.difficulty]} · Par ${level.parMoves}`,
      {
        fontFamily: FONTS.sans,
        fontSize: "8px",
        color: hex(unlocked ? COLORS.muted : COLORS.mutedDark),
        align: "center",
        wordWrap: { width: width - 14 },
      },
    )
    .setOrigin(0.5, 0);
  const status = scene.add
    .text(
      0,
      height / 2 - 16,
      completed
        ? bestMoves !== null
          ? bestMoves === level.parMoves
            ? `✓ ÓPTIMA · ${bestMoves}`
            : `✓ ${formatShortMoves(bestMoves)}`
          : "✓ COMPLETADO"
        : unlocked
          ? "DISPONIBLE"
          : "BLOQUEADO",
      {
        fontFamily: FONTS.sans,
        fontSize: "8px",
        fontStyle: "bold",
        color: hex(
          completed
            ? COLORS.mint
            : unlocked
              ? COLORS.gold
              : COLORS.mutedDark,
        ),
        letterSpacing: 0.4,
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
    createBackdrop(this, { bubbles: 48 });

    const leftGlow = this.add
      .image(148, 260, "soft-glow")
      .setScale(1.2)
      .setTint(COLORS.sky)
      .setAlpha(0.16)
      .setDepth(DEPTH.backdrop + 1);
    const rightGlow = this.add
      .image(876, 260, "soft-glow")
      .setScale(1.1)
      .setTint(COLORS.lavender)
      .setAlpha(0.14)
      .setDepth(DEPTH.backdrop + 1);
    leftGlow.setBlendMode(Phaser.BlendModes.ADD);
    rightGlow.setBlendMode(Phaser.BlendModes.ADD);

    new Bottle(this, 0, 148, 260, {
      capacity: 4,
      segments: ["coral", "amber", "coral", "amber"],
    }, { interactive: false });
    new Bottle(this, 1, 876, 260, {
      capacity: 4,
      segments: ["mint", "aqua", "mint", "aqua"],
    }, { interactive: false });

    this.add
      .text(GAME_WIDTH / 2, 60, "CHROMA", {
        fontFamily: FONTS.display,
        fontSize: "78px",
        fontStyle: "bold",
        color: hex(COLORS.goldBright),
        stroke: hex(COLORS.bgDeep),
        strokeThickness: 7,
        letterSpacing: 8,
      })
      .setOrigin(0.5, 0);
    this.add
      .text(
        GAME_WIDTH / 2,
        146,
        "Vierte, mezcla y ordena cada color en su botella.",
        {
          fontFamily: FONTS.sans,
          fontSize: "17px",
          color: hex(COLORS.cream),
        },
      )
      .setOrigin(0.5, 0);

    const rulesPanel = createPanel(this, 224, 196, 576, 196, {
      radius: 22,
      fillAlpha: 0.9,
    });
    const rulesTag = smallCaps(this, 258, 216, "Cómo jugar", COLORS.sky, 10);
    const rules = [
      "• Toca una botella para seleccionarla como origen.",
      "• Toca otra para verter el color superior.",
      "• Solo puedes verter sobre un color igual o una botella vacía.",
      "• Gana cuando cada botella con líquido tenga un único color.",
    ];
    const ruleTexts = rules.map((rule, index) =>
      this.add.text(258, 246 + index * 28, rule, {
        fontFamily: FONTS.sans,
        fontSize: "14px",
        color: hex(COLORS.creamDark),
        wordWrap: { width: 508 },
      }),
    );
    const tip = this.add.text(
      258,
      360,
      "Deshacer y reiniciar están siempre disponibles. Probar no cuesta movimientos extra.",
      {
        fontFamily: FONTS.sans,
        fontSize: "11px",
        fontStyle: "italic",
        color: hex(COLORS.muted),
      },
    );

    const selectPanel = createPanel(this, 96, 424, 832, 408, {
      radius: 24,
      fillAlpha: 0.93,
    });
    const selectTag = smallCaps(
      this,
      128,
      446,
      `Elige un nivel · ${this.progress.completedLevels.length} de ${LEVEL_COUNT} completados`,
      COLORS.goldBright,
      10,
    );

    const cardWidth = 156;
    const cardHeight = 106;
    const gapX = 14;
    const gapY = 14;
    const startX = 179;
    const startY = 480;
    LEVELS.forEach((level, index) => {
      const column = index % 4;
      const rowIndex = Math.floor(index / 4);
      createLevelCard(this, {
        x: startX + column * (cardWidth + gapX),
        y: startY + rowIndex * (cardHeight + gapY),
        width: cardWidth,
        height: cardHeight,
        level,
        index,
        unlocked: isLevelUnlocked(this.progress, index),
        completed: isLevelCompleted(this.progress, level.id),
        bestMoves: this.progress.bestMoveCounts[level.id] ?? null,
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
      y: 858,
      width: 340,
      height: 58,
      label: startLabel,
      sublabel: allCompleted
        ? "Vuelve a empezar el laboratorio"
        : `Nivel ${startIndex + 1} · ${LEVELS[startIndex]?.name ?? ""}`,
      primary: true,
      onClick: () => this.startLevel(startIndex),
    });

    const footer = this.add
      .text(
        GAME_WIDTH / 2,
        952,
        "Progreso guardado en este navegador · Sin límite de movimientos · Patrones opcionales",
        {
          fontFamily: FONTS.sans,
          fontSize: "11px",
          color: hex(COLORS.mutedDark),
        },
      )
      .setOrigin(0.5);

    this.input.keyboard?.on("keydown-ENTER", () =>
      this.startLevel(startIndex),
    );
    this.input.keyboard?.on("keydown-SPACE", () =>
      this.startLevel(startIndex),
    );

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
    this.cameras.main.fadeOut(140, 11, 18, 38);
    this.time.delayedCall(150, () => {
      this.scene.start("GameScene", { levelIndex: index });
    });
  }
}
