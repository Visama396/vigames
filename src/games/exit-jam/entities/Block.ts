import Phaser from "phaser";
import { ANIMATION, BOARD_AREA } from "../config.ts";
import { colorDefinition } from "../data/palette.ts";
import { COLORS, DEPTH, FONTS, hex } from "../render/theme.ts";
import { boundsOf } from "../systems/BoardManager.ts";
import type {
  BlockDefinition,
  BlockState,
  Direction,
} from "../types/GameTypes.ts";

export interface BlockOptions {
  boardX: number;
  boardY: number;
  cellSize: number;
  selected?: boolean;
  exitReady?: boolean;
  showSymbols?: boolean;
  reducedMotion?: boolean;
  onPointerDown?: (block: BlockPiece, pointer: Phaser.Input.Pointer) => void;
  onPointerOver?: (block: BlockPiece) => void;
  onPointerOut?: (block: BlockPiece) => void;
}

/**
 * Vista de un bloque. Solo dibuja y recibe punteros; la posición lógica vive
 * en `MoveHistory` y en los sistemas puros.
 */
export class BlockPiece extends Phaser.GameObjects.Container {
  readonly blockId: string;
  private readonly definition: BlockDefinition;
  private readonly boardX: number;
  private readonly boardY: number;
  private readonly cellSize: number;
  private readonly shape: Phaser.GameObjects.Graphics;
  private readonly glow: Phaser.GameObjects.Graphics;
  private readonly symbols: Phaser.GameObjects.Text[] = [];
  private readonly hit: Phaser.GameObjects.Rectangle;
  private selected = false;
  private exitReady = false;
  private hovered = false;
  private showSymbols: boolean;
  private reducedMotion: boolean;
  private cellX: number;
  private cellY: number;

  constructor(
    scene: Phaser.Scene,
    definition: BlockDefinition,
    state: BlockState,
    options: BlockOptions,
  ) {
    super(
      scene,
      options.boardX + state.x * options.cellSize,
      options.boardY + state.y * options.cellSize,
    );
    this.blockId = definition.id;
    this.definition = definition;
    this.boardX = options.boardX;
    this.boardY = options.boardY;
    this.cellSize = options.cellSize;
    this.cellX = state.x;
    this.cellY = state.y;
    this.showSymbols = options.showSymbols ?? true;
    this.reducedMotion = options.reducedMotion ?? false;
    this.selected = options.selected ?? false;
    this.exitReady = options.exitReady ?? false;

    this.shape = scene.add.graphics();
    this.glow = scene.add.graphics();

    const bounds = boundsOf(definition.cells);
    const width = (bounds.maxX - bounds.minX + 1) * this.cellSize;
    const height = (bounds.maxY - bounds.minY + 1) * this.cellSize;
    const centerX = ((bounds.minX + bounds.maxX + 1) / 2) * this.cellSize;
    const centerY = ((bounds.minY + bounds.maxY + 1) / 2) * this.cellSize;

    this.hit = scene.add
      .rectangle(centerX, centerY, width, height, 0xffffff, 0.001)
      .setInteractive({ useHandCursor: true });

    this.add([this.glow, this.shape, this.hit]);
    this.draw();

    this.hit.on("pointerover", () => {
      this.hovered = true;
      this.drawGlow();
      options.onPointerOver?.(this);
    });
    this.hit.on("pointerout", () => {
      this.hovered = false;
      this.drawGlow();
      options.onPointerOut?.(this);
    });
    this.hit.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      options.onPointerDown?.(this, pointer);
    });

    this.setDepth(DEPTH.blocks);
    scene.add.existing(this);
  }

  get cellPosition(): { x: number; y: number } {
    return { x: this.cellX, y: this.cellY };
  }

  get pixelCenter(): { x: number; y: number } {
    const bounds = boundsOf(this.definition.cells);
    return {
      x: this.x + ((bounds.minX + bounds.maxX + 1) / 2) * this.cellSize,
      y: this.y + ((bounds.minY + bounds.maxY + 1) / 2) * this.cellSize,
    };
  }

  syncPosition(state: BlockState, animate = true): void {
    this.cellX = state.x;
    this.cellY = state.y;
    const targetX = this.boardX + state.x * this.cellSize;
    const targetY = this.boardY + state.y * this.cellSize;

    this.scene.tweens.killTweensOf(this);
    if (!animate || this.reducedMotion) {
      this.setPosition(targetX, targetY);
      return;
    }
    this.scene.tweens.add({
      targets: this,
      x: targetX,
      y: targetY,
      duration: ANIMATION.moveMs,
      ease: "Cubic.out",
    });
  }

  setSelected(selected: boolean): void {
    if (this.selected === selected) return;
    this.selected = selected;
    this.setDepth(selected ? DEPTH.selected : DEPTH.blocks);
    this.drawGlow();
    if (this.reducedMotion) return;
    this.scene.tweens.killTweensOf(this);
    const baseScale = selected ? 1.035 : 1;
    this.scene.tweens.add({
      targets: this,
      scale: baseScale,
      duration: ANIMATION.selectMs,
      ease: "Cubic.out",
    });
  }

  setExitReady(exitReady: boolean): void {
    if (this.exitReady === exitReady) return;
    this.exitReady = exitReady;
    this.drawGlow();
  }

  setShowSymbols(show: boolean): void {
    this.showSymbols = show;
    for (const symbol of this.symbols) symbol.setVisible(show);
  }

  setReducedMotion(reducedMotion: boolean): void {
    this.reducedMotion = reducedMotion;
    if (reducedMotion) {
      this.scene.tweens.killTweensOf(this);
      this.setScale(1);
      this.setPosition(
        this.boardX + this.cellX * this.cellSize,
        this.boardY + this.cellY * this.cellSize,
      );
    }
  }

  flashInvalid(): void {
    if (this.reducedMotion) return;
    const baseX = this.boardX + this.cellX * this.cellSize;
    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.add({
      targets: this,
      x: { from: baseX - 4, to: baseX + 4 },
      duration: ANIMATION.invalidMs / 2,
      yoyo: true,
      repeat: 1,
      onComplete: () => this.setX(baseX),
    });
  }

  playExit(direction: Direction, onComplete?: () => void): void {
    const distance = BOARD_AREA.size + this.cellSize * 2;
    const duration = this.reducedMotion ? 0 : ANIMATION.exitMs;
    const target =
      direction === "left"
        ? { x: this.x - distance }
        : direction === "right"
          ? { x: this.x + distance }
          : direction === "up"
            ? { y: this.y - distance }
            : { y: this.y + distance };

    this.hit.disableInteractive();
    if (this.reducedMotion) {
      this.setAlpha(0);
      onComplete?.();
      this.destroy();
      return;
    }

    this.scene.tweens.add({
      targets: this,
      ...target,
      alpha: 0,
      scale: 1.12,
      duration,
      ease: "Cubic.in",
      onComplete: () => {
        onComplete?.();
        this.destroy();
      },
    });
  }

  celebrate(delay = 0): void {
    if (this.reducedMotion) return;
    this.scene.tweens.add({
      targets: this,
      scale: { from: 1, to: 1.08 },
      duration: 220,
      delay,
      yoyo: true,
      ease: "Quad.out",
    });
  }

  private draw(): void {
    const color = colorDefinition(this.definition.color);
    const inset = Math.max(2, this.cellSize * 0.035);
    const radius = Math.max(6, this.cellSize * 0.18);

    this.shape.clear();
    for (const cell of this.definition.cells) {
      const x = cell.x * this.cellSize + inset;
      const y = cell.y * this.cellSize + inset;
      const size = this.cellSize - inset * 2;

      this.shape.fillStyle(color.dark, 1);
      this.shape.fillRoundedRect(x, y + 3, size, size, radius);
      this.shape.fillStyle(color.hex, 1);
      this.shape.fillRoundedRect(x, y, size, size, radius);
      this.shape.fillStyle(color.light, 0.28);
      this.shape.fillRoundedRect(
        x + inset,
        y + inset,
        size - inset * 2,
        size * 0.24,
        radius * 0.6,
      );
      this.shape.lineStyle(
        Math.max(1, this.cellSize * 0.025),
        color.light,
        0.55,
      );
      this.shape.strokeRoundedRect(x, y, size, size, radius);
    }

    this.symbols.splice(0).forEach((symbol) => symbol.destroy());
    for (const cell of this.definition.cells) {
      const symbol = this.scene.add
        .text(
          cell.x * this.cellSize + this.cellSize / 2,
          cell.y * this.cellSize + this.cellSize / 2,
          color.symbol,
          {
            fontFamily: FONTS.sans,
            fontSize: `${Math.round(this.cellSize * 0.3)}px`,
            fontStyle: "bold",
            color: hex(COLORS.bgDeep),
          },
        )
        .setOrigin(0.5)
        .setAlpha(0.72)
        .setVisible(this.showSymbols);
      this.symbols.push(symbol);
      this.add(symbol);
      this.bringToTop(symbol);
    }
    this.bringToTop(this.hit);
    this.drawGlow();
  }

  private drawGlow(): void {
    const color = colorDefinition(this.definition.color);
    const inset = Math.max(2, this.cellSize * 0.035);
    this.glow.clear();

    if (this.exitReady) {
      this.glow.lineStyle(3, COLORS.goldBright, 0.95);
      this.glow.fillStyle(COLORS.goldBright, 0.08);
      for (const cell of this.definition.cells) {
        this.glow.fillRoundedRect(
          cell.x * this.cellSize - 2,
          cell.y * this.cellSize - 2,
          this.cellSize + 4,
          this.cellSize + 4,
          Math.max(8, this.cellSize * 0.2),
        );
        this.glow.strokeRoundedRect(
          cell.x * this.cellSize - 2,
          cell.y * this.cellSize - 2,
          this.cellSize + 4,
          this.cellSize + 4,
          Math.max(8, this.cellSize * 0.2),
        );
      }
    }

    if (this.selected) {
      this.glow.lineStyle(3, COLORS.cream, 0.95);
      for (const cell of this.definition.cells) {
        this.glow.strokeRoundedRect(
          cell.x * this.cellSize + inset - 3,
          cell.y * this.cellSize + inset - 3,
          this.cellSize - inset * 2 + 6,
          this.cellSize - inset * 2 + 6,
          Math.max(8, this.cellSize * 0.2),
        );
      }
    } else if (this.hovered) {
      this.glow.lineStyle(1.5, color.light, 0.45);
      for (const cell of this.definition.cells) {
        this.glow.strokeRoundedRect(
          cell.x * this.cellSize + inset,
          cell.y * this.cellSize + inset,
          this.cellSize - inset * 2,
          this.cellSize - inset * 2,
          Math.max(6, this.cellSize * 0.18),
        );
      }
    }
  }
}
