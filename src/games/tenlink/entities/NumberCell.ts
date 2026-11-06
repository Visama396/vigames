import Phaser from "phaser";
import { ANIMATION } from "../config.ts";
import { COLORS, DEPTH, FONTS, hex } from "../render/theme.ts";
import type { CellValue } from "../types/GameTypes.ts";

export interface NumberCellOptions {
  cellSize: number;
  value: CellValue;
  reducedMotion: boolean;
  onPointerDown?: (cell: NumberCell) => void;
  onPointerOver?: (cell: NumberCell) => void;
  onPointerOut?: (cell: NumberCell) => void;
}

/**
 * Vista de una casilla numérica. Todos los números comparten el mismo estilo:
 * el jugador decide libremente qué parejas forma, sin grupos de color.
 */
export class NumberCell extends Phaser.GameObjects.Container {
  row: number;
  col: number;
  centerX: number;
  centerY: number;
  readonly cellSize: number;

  private readonly tile: Phaser.GameObjects.Graphics;
  private readonly glow: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;
  private readonly hit: Phaser.GameObjects.Rectangle;
  private currentValue: CellValue;
  private selected = false;
  private cursor = false;
  private hinted = false;
  private hovered = false;
  private reducedMotion: boolean;

  constructor(
    scene: Phaser.Scene,
    row: number,
    col: number,
    centerX: number,
    centerY: number,
    options: NumberCellOptions,
  ) {
    super(scene, centerX, centerY);
    this.row = row;
    this.col = col;
    this.cellSize = options.cellSize;
    this.centerX = centerX;
    this.centerY = centerY;
    this.currentValue = options.value;
    this.reducedMotion = options.reducedMotion;

    this.tile = scene.add.graphics();
    this.glow = scene.add.graphics();
    this.label = scene.add
      .text(0, 0, "", {
        fontFamily: FONTS.display,
        fontSize: `${Math.round(this.cellSize * 0.46)}px`,
        fontStyle: "bold",
        color: hex(COLORS.cream),
        stroke: hex(COLORS.bgDeep),
        strokeThickness: Math.max(2, this.cellSize * 0.03),
      })
      .setOrigin(0.5);

    const hitSize = this.cellSize * 0.94;
    this.hit = scene.add
      .rectangle(0, 0, hitSize, hitSize, 0xffffff, 0.001)
      .setInteractive({ useHandCursor: true });

    this.add([this.tile, this.glow, this.label, this.hit]);
    this.setDepth(DEPTH.cells);
    this.draw();
    this.syncInteractive();

    this.hit.on("pointerdown", () => options.onPointerDown?.(this));
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

    scene.add.existing(this);
  }

  get value(): CellValue {
    return this.currentValue;
  }

  get isEmpty(): boolean {
    return this.currentValue === null;
  }

  /** Cambia la casilla de fila/columna y la desplaza visualmente. */
  moveToSlot(
    row: number,
    col: number,
    centerX: number,
    centerY: number,
    animate = true,
  ): void {
    this.row = row;
    this.col = col;
    this.centerX = centerX;
    this.centerY = centerY;

    this.scene.tweens.killTweensOf(this);
    if (!animate || this.reducedMotion) {
      this.setPosition(centerX, centerY);
      return;
    }

    this.scene.tweens.add({
      targets: this,
      x: centerX,
      y: centerY,
      duration: ANIMATION.collapseMs,
      ease: "Cubic.inOut",
    });
  }

  setValue(value: CellValue, animate = true): void {
    this.currentValue = value;
    this.tile.setAlpha(1);
    this.hit.setAlpha(1);
    this.draw();
    this.syncInteractive();
    this.drawGlow();

    if (value === null || !animate || this.reducedMotion) {
      this.setScale(1);
      this.setAlpha(1);
      return;
    }

    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.add({
      targets: this,
      scale: { from: 0.82, to: 1 },
      duration: ANIMATION.selectMs + 40,
      ease: "Back.out",
    });
  }

  setSelected(selected: boolean): void {
    if (this.selected === selected) return;
    this.selected = selected;
    this.setDepth(selected ? DEPTH.selected : DEPTH.cells);
    this.drawGlow();
    if (this.reducedMotion) {
      this.setScale(1);
      return;
    }
    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.add({
      targets: this,
      scale: selected ? 1.045 : 1,
      duration: ANIMATION.selectMs,
      ease: "Cubic.out",
    });
  }

  setCursor(cursor: boolean): void {
    if (this.cursor === cursor) return;
    this.cursor = cursor;
    this.drawGlow();
  }

  setHint(hinted: boolean): void {
    if (this.hinted === hinted) return;
    this.hinted = hinted;
    this.drawGlow();
    this.scene.tweens.killTweensOf(this.glow);
    this.glow.setAlpha(1);
    if (hinted && !this.reducedMotion) {
      this.scene.tweens.add({
        targets: this.glow,
        alpha: { from: 1, to: 0.45 },
        duration: 420,
        yoyo: true,
        repeat: -1,
      });
    }
  }

  setReducedMotion(reducedMotion: boolean): void {
    this.reducedMotion = reducedMotion;
    if (reducedMotion) {
      this.cancelAnimation();
    }
  }

  /** Detiene una animación en curso y devuelve la casilla a su estado estable. */
  cancelAnimation(): void {
    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.killTweensOf(this.glow);
    this.glow.setAlpha(1);
    this.setScale(1);
    this.setAlpha(1);
    this.setPosition(this.centerX, this.centerY);
  }

  flashInvalid(): void {
    if (this.reducedMotion) return;
    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.add({
      targets: this,
      x: {
        from: this.centerX - 5,
        to: this.centerX + 5,
      },
      duration: ANIMATION.invalidMs / 2,
      yoyo: true,
      repeat: 1,
      onComplete: () => this.setPosition(this.centerX, this.centerY),
    });
  }

  playRemove(onComplete?: () => void): void {
    if (this.reducedMotion) {
      this.setValue(null, false);
      onComplete?.();
      return;
    }

    this.hit.disableInteractive();
    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.add({
      targets: this,
      scale: { from: 1, to: 1.18 },
      duration: ANIMATION.removeMs * 0.45,
      ease: "Quad.out",
      onComplete: () => {
        this.scene.tweens.add({
          targets: this,
          scale: 0.5,
          alpha: 0,
          duration: ANIMATION.removeMs * 0.55,
          ease: "Cubic.in",
          onComplete: () => {
            this.setValue(null, false);
            onComplete?.();
          },
        });
      },
    });
  }

  private syncInteractive(): void {
    if (this.currentValue === null) {
      this.hit.disableInteractive();
    } else {
      this.hit.setInteractive({ useHandCursor: true });
    }
  }

  private draw(): void {
    const size = this.cellSize - Math.max(6, this.cellSize * 0.08);
    const half = size / 2;
    const radius = Math.max(7, this.cellSize * 0.16);
    this.tile.clear();

    if (this.currentValue === null) {
      this.tile.fillStyle(COLORS.bgDeep, 0.55);
      this.tile.fillRoundedRect(-half, -half, size, size, radius);
      this.tile.lineStyle(1, COLORS.borderSoft, 0.4);
      this.tile.strokeRoundedRect(-half, -half, size, size, radius);
      this.tile.fillStyle(COLORS.mutedDark, 0.22);
      this.tile.fillCircle(0, 0, Math.max(2, this.cellSize * 0.03));
      this.label.setText("");
      return;
    }

    this.tile.fillStyle(COLORS.bgDeep, 0.72);
    this.tile.fillRoundedRect(-half, -half + 4, size, size, radius);
    this.tile.fillStyle(COLORS.panelLight, 0.98);
    this.tile.fillRoundedRect(-half, -half, size, size, radius);
    this.tile.fillStyle(COLORS.mint, 0.12);
    this.tile.fillRoundedRect(-half + 2, -half + 2, size - 4, size - 4, radius);
    this.tile.fillStyle(COLORS.mint, 0.85);
    this.tile.fillRoundedRect(
      -half + size * 0.18,
      -half + size * 0.1,
      size * 0.64,
      Math.max(3, this.cellSize * 0.035),
      Math.max(2, this.cellSize * 0.02),
    );
    this.tile.lineStyle(2, this.selected ? COLORS.goldBright : COLORS.border, 0.8);
    this.tile.strokeRoundedRect(-half + 2, -half + 2, size - 4, size - 4, radius);

    this.label.setText(String(this.currentValue));
    this.label.setColor(hex(COLORS.cream));
    this.label.setVisible(true);
  }

  private drawGlow(): void {
    const size = this.cellSize - Math.max(6, this.cellSize * 0.08);
    const half = size / 2;
    const radius = Math.max(9, this.cellSize * 0.19);
    this.glow.clear();

    if (this.cursor) {
      this.glow.lineStyle(1.5, COLORS.cream, 0.55);
      this.glow.strokeRoundedRect(
        -half - 7,
        -half - 7,
        size + 14,
        size + 14,
        radius + 4,
      );
    }

    if (this.hinted) {
      this.glow.lineStyle(3.5, COLORS.goldBright, 0.95);
      this.glow.strokeRoundedRect(
        -half - 5,
        -half - 5,
        size + 10,
        size + 10,
        radius + 3,
      );
    }

    if (this.selected) {
      this.glow.fillStyle(COLORS.goldBright, 0.1);
      this.glow.fillRoundedRect(
        -half - 4,
        -half - 4,
        size + 8,
        size + 8,
        radius + 2,
      );
      this.glow.lineStyle(3, COLORS.goldBright, 1);
      this.glow.strokeRoundedRect(
        -half - 4,
        -half - 4,
        size + 8,
        size + 8,
        radius + 2,
      );
    } else if (this.hovered && this.currentValue !== null) {
      this.glow.lineStyle(1.5, COLORS.cream, 0.22);
      this.glow.strokeRoundedRect(
        -half - 1,
        -half - 1,
        size + 2,
        size + 2,
        radius + 1,
      );
    }
  }
}
