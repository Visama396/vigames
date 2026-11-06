import Phaser from "phaser";
import { DOOR_DEPTH } from "../config.ts";
import { colorDefinition } from "../data/palette.ts";
import { COLORS, DEPTH, FONTS, hex } from "../render/theme.ts";
import type { DoorDefinition } from "../types/GameTypes.ts";

/** Marco de salida dibujado en el borde del tablero. */
export class ExitDoorView extends Phaser.GameObjects.Container {
  readonly door: DoorDefinition;
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly glow: Phaser.GameObjects.Graphics;
  private readonly symbol: Phaser.GameObjects.Text;
  private highlighted = false;

  constructor(
    scene: Phaser.Scene,
    door: DoorDefinition,
    boardX: number,
    boardY: number,
    boardSize: number,
    cellSize: number,
  ) {
    const rect = ExitDoorView.rectFor(
      door,
      boardX,
      boardY,
      boardSize,
      cellSize,
    );
    super(scene, rect.x, rect.y);
    this.door = door;
    this.graphics = scene.add.graphics();
    this.glow = scene.add.graphics();
    this.add([this.glow, this.graphics]);
    this.setDepth(DEPTH.doors);

    const color = colorDefinition(door.color);
    this.symbol = scene.add
      .text(rect.width / 2, rect.height / 2, color.symbol, {
        fontFamily: FONTS.sans,
        fontSize: `${Math.max(12, Math.min(rect.width, rect.height) * 0.72)}px`,
        fontStyle: "bold",
        color: hex(COLORS.bgDeep),
      })
      .setOrigin(0.5);
    this.add(this.symbol);

    this.draw(rect.width, rect.height);
    scene.add.existing(this);
  }

  static rectFor(
    door: DoorDefinition,
    boardX: number,
    boardY: number,
    boardSize: number,
    cellSize: number,
  ): { x: number; y: number; width: number; height: number } {
    switch (door.side) {
      case "left":
        return {
          x: boardX - DOOR_DEPTH,
          y: boardY + door.start * cellSize + 2,
          width: DOOR_DEPTH,
          height: door.length * cellSize - 4,
        };
      case "right":
        return {
          x: boardX + boardSize,
          y: boardY + door.start * cellSize + 2,
          width: DOOR_DEPTH,
          height: door.length * cellSize - 4,
        };
      case "up":
        return {
          x: boardX + door.start * cellSize + 2,
          y: boardY - DOOR_DEPTH,
          width: door.length * cellSize - 4,
          height: DOOR_DEPTH,
        };
      case "down":
        return {
          x: boardX + door.start * cellSize + 2,
          y: boardY + boardSize,
          width: door.length * cellSize - 4,
          height: DOOR_DEPTH,
        };
    }
  }

  setShowSymbol(visible: boolean): void {
    this.symbol.setVisible(visible);
  }

  setHighlight(highlight: boolean): void {
    if (this.highlighted === highlight) return;
    this.highlighted = highlight;
    const rect = { width: this.width || 0, height: this.height || 0 };
    // Las dimensiones reales se guardan al dibujar.
    const stored = this.getData("size") as
      | { width: number; height: number }
      | undefined;
    this.draw(stored?.width ?? rect.width, stored?.height ?? rect.height);

    if (highlight && !this.scene.tweens.isTweening(this.glow)) {
      this.glow.setAlpha(0.5);
      this.scene.tweens.add({
        targets: this.glow,
        alpha: 1,
        duration: 460,
        yoyo: true,
        repeat: -1,
      });
    } else if (!highlight) {
      this.scene.tweens.killTweensOf(this.glow);
      this.glow.setAlpha(1);
    }
  }

  private draw(width: number, height: number): void {
    this.setData("size", { width, height });
    const color = colorDefinition(this.door.color);
    const radius = Math.min(8, Math.min(width, height) / 2);

    this.glow.clear();
    this.graphics.clear();

    if (this.highlighted) {
      this.glow.fillStyle(COLORS.goldBright, 0.22);
      this.glow.fillRoundedRect(-5, -5, width + 10, height + 10, radius + 4);
      this.glow.lineStyle(2.5, COLORS.goldBright, 0.95);
      this.glow.strokeRoundedRect(-5, -5, width + 10, height + 10, radius + 4);
    }

    this.graphics.fillStyle(color.dark, 1);
    this.graphics.fillRoundedRect(0, 0, width, height, radius);
    this.graphics.fillStyle(color.hex, 1);
    this.graphics.fillRoundedRect(1.5, 1.5, width - 3, height - 3, radius);
    this.graphics.lineStyle(1.5, color.light, 0.85);
    this.graphics.strokeRoundedRect(1.5, 1.5, width - 3, height - 3, radius);
  }
}
