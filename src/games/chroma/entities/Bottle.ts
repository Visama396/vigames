import Phaser from "phaser";
import { BOTTLE } from "../config.ts";
import { colorDefinition } from "../data/colors.ts";
import { COLORS, DEPTH, FONTS, hex } from "../render/theme.ts";
import { isBottleComplete } from "../systems/MoveValidator.ts";
import type { BottleState, ColorId } from "../types/puzzle.ts";

export interface BottleOptions {
  onClick?: (bottle: Bottle) => void;
  onHover?: (bottle: Bottle | null) => void;
  interactive?: boolean;
  reducedMotion?: boolean;
  patterns?: boolean;
}

const TOTAL_HEIGHT = BOTTLE.bodyHeight + BOTTLE.neckHeight;
const TOP = -TOTAL_HEIGHT / 2;
const BODY_TOP = TOP + BOTTLE.neckHeight;
const BODY_BOTTOM = BODY_TOP + BOTTLE.bodyHeight;
const BODY_HALF = BOTTLE.bodyWidth / 2;
const NECK_HALF = BOTTLE.neckWidth / 2;
const INNER_LEFT = -BODY_HALF + 6;
const INNER_WIDTH = BOTTLE.bodyWidth - 12;
const INNER_BOTTOM = BODY_BOTTOM - 6;
const INNER_TOP = BODY_TOP + 6;
const INNER_HEIGHT = INNER_BOTTOM - INNER_TOP;

function contrastColor(color: number): string {
  const red = (color >> 16) & 0xff;
  const green = (color >> 8) & 0xff;
  const blue = color & 0xff;
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;
  return luminance > 0.62 ? hex(COLORS.bgDeep) : hex(COLORS.white);
}

/**
 * Botella de vidrio con segmentos de líquido. Solo dibuja y recibe punteros:
 * el estado lógico vive en `MoveHistory` y en los sistemas puros.
 */
export class Bottle extends Phaser.GameObjects.Container {
  readonly index: number;
  private bottleState: BottleState;
  private readonly shadow: Phaser.GameObjects.Graphics;
  private readonly liquid: Phaser.GameObjects.Graphics;
  private readonly glass: Phaser.GameObjects.Graphics;
  private readonly glow: Phaser.GameObjects.Graphics;
  private readonly patternsLayer: Phaser.GameObjects.Container;
  private readonly hit: Phaser.GameObjects.Rectangle;
  private readonly baseX: number;
  private readonly baseY: number;
  private readonly onClick?: (bottle: Bottle) => void;
  private readonly onHover?: (bottle: Bottle | null) => void;
  private reducedMotion: boolean;
  private patterns: boolean;
  private selected = false;
  private hovered = false;
  private completed = false;

  constructor(
    scene: Phaser.Scene,
    index: number,
    x: number,
    y: number,
    state: BottleState,
    options: BottleOptions = {},
  ) {
    super(scene, x, y);
    this.index = index;
    this.bottleState = {
      capacity: state.capacity,
      segments: [...state.segments],
    };
    this.baseX = x;
    this.baseY = y;
    this.onClick = options.onClick;
    this.onHover = options.onHover;
    this.reducedMotion = options.reducedMotion ?? false;
    this.patterns = options.patterns ?? false;

    this.shadow = scene.add.graphics();
    this.liquid = scene.add.graphics();
    this.glass = scene.add.graphics();
    this.glow = scene.add.graphics();
    this.patternsLayer = scene.add.container(0, 0);
    this.hit = scene.add
      .rectangle(0, 0, BOTTLE.width, BOTTLE.height, 0xffffff, 0.001)
      .setInteractive({ useHandCursor: options.interactive !== false });

    if (options.interactive === false) this.hit.disableInteractive();

    this.add([
      this.shadow,
      this.liquid,
      this.patternsLayer,
      this.glass,
      this.glow,
      this.hit,
    ]);
    this.setDepth(DEPTH.bottles);
    scene.add.existing(this);

    this.hit.on("pointerover", () => {
      this.hovered = true;
      this.drawGlow();
      this.onHover?.(this);
    });
    this.hit.on("pointerout", () => {
      this.hovered = false;
      this.drawGlow();
      this.onHover?.(null);
    });
    this.hit.on("pointerup", () => {
      this.onClick?.(this);
    });

    this.drawBase();
    this.render();
  }

  get centerX(): number {
    return this.x;
  }

  get centerY(): number {
    return this.y;
  }

  get topSegmentColor(): ColorId | null {
    return (
      this.bottleState.segments[this.bottleState.segments.length - 1] ?? null
    );
  }

  applyState(state: BottleState): void {
    this.bottleState = {
      capacity: state.capacity,
      segments: [...state.segments],
    };
    this.render();
  }

  setSelected(selected: boolean): void {
    if (this.selected === selected) return;
    this.selected = selected;
    const targetY = selected ? this.baseY - BOTTLE.selectedLift : this.baseY;

    this.scene.tweens.killTweensOf(this);
    if (this.reducedMotion) {
      this.setY(targetY);
      this.setScale(1);
    } else {
      this.scene.tweens.add({
        targets: this,
        y: targetY,
        scale: selected ? 1.025 : 1,
        duration: 130,
        ease: "Cubic.out",
      });
    }
    this.drawGlow();
  }

  setCompleted(completed: boolean): void {
    if (this.completed === completed) return;
    this.completed = completed;
    this.drawGlow();
    if (completed && !this.reducedMotion) {
      this.scene.tweens.add({
        targets: this.glow,
        alpha: { from: 0.35, to: 1 },
        duration: 420,
        yoyo: true,
        repeat: 1,
      });
    }
  }

  setReducedMotion(reducedMotion: boolean): void {
    this.reducedMotion = reducedMotion;
    if (reducedMotion) {
      this.setAngle(0);
      this.setY(this.selected ? this.baseY - BOTTLE.selectedLift : this.baseY);
      this.setScale(this.selected ? 1.025 : 1);
    }
  }

  setPatterns(patterns: boolean): void {
    if (this.patterns === patterns) return;
    this.patterns = patterns;
    this.renderPatterns();
  }

  flashInvalid(): void {
    if (this.reducedMotion) return;
    this.scene.tweens.killTweensOf(this);
    const x = this.baseX;
    this.scene.tweens.add({
      targets: this,
      x: { from: x - 6, to: x + 6 },
      duration: 45,
      yoyo: true,
      repeat: 2,
      onComplete: () => this.setX(x),
    });
  }

  playTilt(direction: number): void {
    if (this.reducedMotion) return;
    this.scene.tweens.add({
      targets: this,
      angle: direction * 12,
      duration: 110,
      yoyo: true,
      hold: 30,
      ease: "Sine.inOut",
    });
  }

  playPourIn(count: number, color: ColorId): void {
    if (count <= 0 || this.reducedMotion) return;
    const definition = colorDefinition(color);
    const unit = INNER_HEIGHT / Math.max(1, this.bottleState.capacity);
    const topY =
      INNER_BOTTOM - this.bottleState.segments.length * unit;
    for (let index = 0; index < count; index += 1) {
      const drop = this.scene.add
        .circle(
          Phaser.Math.Between(-INNER_WIDTH * 0.24, INNER_WIDTH * 0.24),
          topY + unit * 0.5,
          Math.max(3, unit * 0.09),
          definition.hex,
          0.95,
        )
        .setDepth(DEPTH.liquid);
      this.add(drop);
      this.scene.tweens.add({
        targets: drop,
        y: topY + unit * (0.9 + index * 0.15),
        alpha: 0,
        scale: 0.5,
        duration: 260 + index * 20,
        ease: "Cubic.in",
        onComplete: () => drop.destroy(),
      });
    }
  }

  playPourOut(count: number, color: ColorId): void {
    if (count <= 0 || this.reducedMotion) return;
    const definition = colorDefinition(color);
    const unit = INNER_HEIGHT / Math.max(1, this.bottleState.capacity);
    const topY =
      INNER_BOTTOM - this.bottleState.segments.length * unit;
    for (let index = 0; index < count; index += 1) {
      const drop = this.scene.add
        .circle(
          Phaser.Math.Between(-INNER_WIDTH * 0.24, INNER_WIDTH * 0.24),
          topY + unit * 0.4,
          Math.max(3, unit * 0.09),
          definition.hex,
          0.9,
        )
        .setDepth(DEPTH.liquid);
      this.add(drop);
      this.scene.tweens.add({
        targets: drop,
        y: topY - unit * (0.5 + index * 0.2),
        alpha: 0,
        scale: 0.4,
        duration: 220 + index * 20,
        ease: "Cubic.out",
        onComplete: () => drop.destroy(),
      });
    }
  }

  celebrate(delay = 0): void {
    if (this.reducedMotion) {
      this.scene.time.delayedCall(delay, () => this.setCompleted(true));
      return;
    }
    this.scene.tweens.add({
      targets: this,
      y: this.baseY - 18,
      duration: 260,
      delay,
      yoyo: true,
      ease: "Quad.out",
    });
    this.scene.tweens.add({
      targets: this,
      angle: { from: -3, to: 3 },
      duration: 180,
      delay,
      yoyo: true,
      repeat: 2,
      onComplete: () => this.setAngle(0),
    });
  }

  private render(): void {
    this.renderLiquid();
    this.renderPatterns();
    this.drawGlow();
    this.setCompleted(isBottleComplete(this.bottleState));
  }

  private drawBase(): void {
    this.shadow.clear();
    this.shadow.fillStyle(COLORS.black, 0.28);
    this.shadow.fillEllipse(0, BODY_BOTTOM + 8, BOTTLE.bodyWidth * 0.86, 16);

    this.glass.clear();
    this.glass.fillStyle(COLORS.glass, 0.08);
    this.glass.fillRoundedRect(
      -BODY_HALF,
      BODY_TOP,
      BOTTLE.bodyWidth,
      BOTTLE.bodyHeight,
      20,
    );
    this.glass.lineStyle(2, COLORS.glass, 0.48);
    this.glass.strokeRoundedRect(
      -BODY_HALF,
      BODY_TOP,
      BOTTLE.bodyWidth,
      BOTTLE.bodyHeight,
      20,
    );

    this.glass.fillStyle(COLORS.glass, 0.08);
    this.glass.fillRoundedRect(
      -NECK_HALF,
      TOP,
      BOTTLE.neckWidth,
      BOTTLE.neckHeight + 8,
      6,
    );
    this.glass.lineStyle(2, COLORS.glass, 0.48);
    this.glass.strokeRoundedRect(
      -NECK_HALF,
      TOP,
      BOTTLE.neckWidth,
      BOTTLE.neckHeight + 8,
      6,
    );

    this.glass.lineStyle(2.5, COLORS.gold, 0.75);
    this.glass.strokeRoundedRect(
      -NECK_HALF - 4,
      TOP - 4,
      BOTTLE.neckWidth + 8,
      10,
      5,
    );

    this.glass.fillStyle(COLORS.white, 0.16);
    this.glass.fillRoundedRect(
      -BODY_HALF + 11,
      BODY_TOP + 14,
      7,
      BOTTLE.bodyHeight - 30,
      4,
    );
    this.glass.fillStyle(COLORS.white, 0.08);
    this.glass.fillRoundedRect(
      BODY_HALF - 18,
      BODY_TOP + 20,
      4,
      BOTTLE.bodyHeight - 42,
      2,
    );
  }

  private renderLiquid(): void {
    this.liquid.clear();
    const capacity = Math.max(1, this.bottleState.capacity);
    const unit = INNER_HEIGHT / capacity;
    const segments = this.bottleState.segments;

    for (let index = 0; index < segments.length; index += 1) {
      const color = segments[index]!;
      const definition = colorDefinition(color);
      const y = INNER_BOTTOM - (index + 1) * unit;
      const height = Math.max(2, unit - 1);

      this.liquid.fillStyle(definition.hex, 1);
      this.liquid.fillRoundedRect(INNER_LEFT, y, INNER_WIDTH, height, 4);
      this.liquid.fillStyle(definition.light, 0.24);
      this.liquid.fillRoundedRect(
        INNER_LEFT + 4,
        y + 4,
        INNER_WIDTH - 8,
        Math.max(2, height * 0.18),
        2,
      );
      this.liquid.fillStyle(definition.dark, 0.2);
      this.liquid.fillRoundedRect(
        INNER_LEFT + 4,
        y + height - 5,
        INNER_WIDTH - 8,
        2,
        1,
      );
    }

    if (segments.length > 0) {
      const top = INNER_BOTTOM - segments.length * unit;
      const color = colorDefinition(segments[segments.length - 1]!);
      this.liquid.fillStyle(color.light, 0.4);
      this.liquid.fillRoundedRect(INNER_LEFT + 2, top + 1, INNER_WIDTH - 4, 3, 2);
    }
  }

  private renderPatterns(): void {
    this.patternsLayer.removeAll(true);
    if (!this.patterns) return;

    const capacity = Math.max(1, this.bottleState.capacity);
    const unit = INNER_HEIGHT / capacity;
    const segments = this.bottleState.segments;

    for (let index = 0; index < segments.length; index += 1) {
      const color = segments[index]!;
      const definition = colorDefinition(color);
      const y = INNER_BOTTOM - (index + 1) * unit;
      const label = this.scene.add
        .text(0, y + unit / 2, definition.symbol, {
          fontFamily: FONTS.sans,
          fontSize: `${Math.round(unit * 0.42)}px`,
          fontStyle: "bold",
          color: contrastColor(definition.hex),
        })
        .setOrigin(0.5)
        .setAlpha(0.85);
      this.patternsLayer.add(label);
    }
  }

  private drawGlow(): void {
    this.glow.clear();
    if (this.completed) {
      this.glow.lineStyle(3, COLORS.mint, 0.8);
      this.glow.strokeRoundedRect(
        -BODY_HALF - 5,
        BODY_TOP - 5,
        BOTTLE.bodyWidth + 10,
        BOTTLE.bodyHeight + 10,
        24,
      );
      this.glow.fillStyle(COLORS.mint, 0.06);
      this.glow.fillRoundedRect(
        -BODY_HALF - 5,
        BODY_TOP - 5,
        BOTTLE.bodyWidth + 10,
        BOTTLE.bodyHeight + 10,
        24,
      );
    }
    if (this.selected) {
      this.glow.lineStyle(2.5, COLORS.goldBright, 0.95);
      this.glow.strokeRoundedRect(
        -BODY_HALF - 8,
        BODY_TOP - 8,
        BOTTLE.bodyWidth + 16,
        BOTTLE.bodyHeight + 16,
        26,
      );
    } else if (this.hovered) {
      this.glow.lineStyle(1.5, COLORS.cream, 0.4);
      this.glow.strokeRoundedRect(
        -BODY_HALF - 4,
        BODY_TOP - 4,
        BOTTLE.bodyWidth + 8,
        BOTTLE.bodyHeight + 8,
        22,
      );
    }
  }
}
