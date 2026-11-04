import Phaser from "phaser";
import { regionColor, regionMark, darken } from "../data/regions.ts";
import { COLORS, DEPTH } from "../render/theme.ts";
import type { CellId, ConflictKind, RegionId } from "../types/puzzle.ts";

export interface GridCellOptions {
  row: number;
  col: number;
  id: CellId;
  regionId: RegionId;
  cellSize: number;
  onClick?: (cell: GridCell) => void;
  onRightClick?: (cell: GridCell) => void;
  onHover?: (cell: GridCell | null) => void;
}

/**
 * Celda visual del tablero. Solo se ocupa de dibujar y de recibir punteros; el
 * estado del puzle vive en los sistemas puros.
 */
export class GridCell extends Phaser.GameObjects.Container {
  readonly row: number;
  readonly col: number;
  readonly id: CellId;
  readonly regionId: RegionId;
  readonly cellSize: number;

  private readonly fill: Phaser.GameObjects.Graphics;
  private readonly hover: Phaser.GameObjects.Graphics;
  private readonly conflict: Phaser.GameObjects.Graphics;
  private readonly note: Phaser.GameObjects.Graphics;
  private readonly hit: Phaser.GameObjects.Rectangle;
  private readonly mark: Phaser.GameObjects.Text;
  private readonly baseX: number;
  private readonly baseY: number;
  private readonly onClick?: (cell: GridCell) => void;
  private readonly onRightClick?: (cell: GridCell) => void;
  private readonly onHover?: (cell: GridCell | null) => void;
  private rightClickHandled = false;

  constructor(scene: Phaser.Scene, x: number, y: number, options: GridCellOptions) {
    super(scene, x, y);
    const { row, col, id, regionId, cellSize } = options;
    this.row = row;
    this.col = col;
    this.id = id;
    this.regionId = regionId;
    this.cellSize = cellSize;
    this.baseX = x;
    this.baseY = y;
    this.onClick = options.onClick;
    this.onRightClick = options.onRightClick;
    this.onHover = options.onHover;

    const half = cellSize / 2;
    const color = regionColor(regionId);
    this.fill = scene.add.graphics();
    this.fill.fillStyle(color, 0.96);
    this.fill.fillRect(-half, -half, cellSize, cellSize);
    this.fill.fillStyle(COLORS.white, 0.07);
    this.fill.fillRect(-half + 2, -half + 2, cellSize - 4, cellSize * 0.11);
    this.fill.lineStyle(1, COLORS.white, 0.07);
    this.fill.lineBetween(half - 0.5, -half, half - 0.5, half);
    this.fill.lineBetween(-half, half - 0.5, half, half - 0.5);

    this.mark = scene.add
      .text(-half + 6, -half + 5, regionMark(regionId), {
        fontFamily: "'Trebuchet MS', sans-serif",
        fontSize: `${Math.max(9, Math.round(cellSize * 0.11))}px`,
        color: `#${darken(color, 0.5).toString(16).padStart(6, "0")}`,
      })
      .setAlpha(0.42);

    this.note = scene.add.graphics();
    const noteInset = cellSize * 0.29;
    this.note.lineStyle(
      Math.max(2, cellSize * 0.055),
      COLORS.catDark,
      0.52,
    );
    this.note.lineBetween(
      -half + noteInset,
      -half + noteInset,
      half - noteInset,
      half - noteInset,
    );
    this.note.lineBetween(
      half - noteInset,
      -half + noteInset,
      -half + noteInset,
      half - noteInset,
    );
    this.note.setVisible(false);

    this.hover = scene.add.graphics();
    this.hover.fillStyle(COLORS.white, 0.13);
    this.hover.fillRect(-half, -half, cellSize, cellSize);
    this.hover.lineStyle(Math.max(1.5, cellSize * 0.025), COLORS.white, 0.55);
    this.hover.strokeRect(-half + 1, -half + 1, cellSize - 2, cellSize - 2);
    this.hover.setVisible(false);

    this.conflict = scene.add.graphics();
    this.conflict.setVisible(false);

    this.hit = scene.add
      .rectangle(0, 0, cellSize, cellSize, 0xffffff, 0.001)
      .setInteractive({ useHandCursor: true });

    this.add([
      this.fill,
      this.mark,
      this.note,
      this.hover,
      this.conflict,
      this.hit,
    ]);
    this.setDepth(DEPTH.grid);
    scene.add.existing(this);

    this.hit.on("pointerover", () => {
      this.setHovered(true);
      this.onHover?.(this);
    });
    this.hit.on("pointerout", () => {
      this.rightClickHandled = false;
      this.setHovered(false);
      this.onHover?.(null);
    });
    this.hit.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (!pointer.rightButtonDown()) return;
      this.rightClickHandled = true;
      this.onRightClick?.(this);
    });
    this.hit.on("pointerup", () => {
      if (this.rightClickHandled) {
        this.rightClickHandled = false;
        return;
      }
      this.onClick?.(this);
    });
  }

  setMarked(marked: boolean): void {
    this.note.setVisible(marked);
  }

  setHovered(hovered: boolean): void {
    this.hover.setVisible(hovered);
  }

  setConflict(conflict: boolean, kinds: readonly ConflictKind[] = []): void {
    this.conflict.clear();
    this.conflict.setVisible(conflict);
    if (!conflict) return;
    const half = this.cellSize / 2;
    this.conflict.fillStyle(COLORS.danger, 0.18);
    this.conflict.fillRect(-half, -half, this.cellSize, this.cellSize);
    this.conflict.lineStyle(Math.max(2, this.cellSize * 0.035), COLORS.danger, 0.95);
    this.conflict.strokeRect(-half + 1, -half + 1, this.cellSize - 2, this.cellSize - 2);

    if (kinds.includes("adjacent")) {
      this.conflict.lineStyle(Math.max(1, this.cellSize * 0.012), COLORS.danger, 0.5);
      this.conflict.lineBetween(-half + 8, -half + 8, half - 8, half - 8);
      this.conflict.lineBetween(half - 8, -half + 8, -half + 8, half - 8);
    }
  }

  flashInvalid(): void {
    this.scene.tweens.add({
      targets: this,
      x: this.baseX + 4,
      duration: 42,
      yoyo: true,
      repeat: 3,
      ease: "Sine.inOut",
      onComplete: () => {
        this.x = this.baseX;
        this.y = this.baseY;
      },
    });
  }

  get centerX(): number {
    return this.baseX;
  }

  get centerY(): number {
    return this.baseY;
  }
}
