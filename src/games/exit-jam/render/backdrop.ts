import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "../config.ts";
import { COLORS, DEPTH } from "./theme.ts";

export interface GlowSpec {
  x: number;
  y: number;
  color: number;
  scale?: number;
  alpha?: number;
}

export interface BackdropOptions {
  glows?: GlowSpec[];
  specks?: number;
}

const DEFAULT_GLOWS: GlowSpec[] = [
  { x: 150, y: 140, color: 0xff6b7d, scale: 2.4, alpha: 0.12 },
  { x: 880, y: 190, color: 0x4fb6ff, scale: 2.2, alpha: 0.12 },
  { x: 810, y: 890, color: 0xb18cff, scale: 2.7, alpha: 0.1 },
  { x: 190, y: 860, color: 0x4bd9a8, scale: 2.1, alpha: 0.08 },
];

/** Fondo nocturno de arcade, generado por completo con gráficos. */
export function createBackdrop(
  scene: Phaser.Scene,
  options: BackdropOptions = {},
): void {
  const background = scene.add.graphics().setDepth(DEPTH.backdrop);
  background.fillGradientStyle(
    COLORS.bgTop,
    COLORS.bgTop,
    COLORS.bgBottom,
    COLORS.bgBottom,
    1,
  );
  background.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  const glows = options.glows ?? DEFAULT_GLOWS;
  for (const glow of glows) {
    if (!scene.textures.exists("soft-glow")) break;
    scene.add
      .image(glow.x, glow.y, "soft-glow")
      .setDepth(DEPTH.backdrop + 1)
      .setScale(glow.scale ?? 2)
      .setAlpha(glow.alpha ?? 0.1)
      .setTint(glow.color)
      .setBlendMode(Phaser.BlendModes.ADD);
  }

  const specks = options.specks ?? 44;
  const graphics = scene.add.graphics().setDepth(DEPTH.backdrop + 2);
  for (let index = 0; index < specks; index += 1) {
    const x = 24 + ((index * 137 + 53) % (GAME_WIDTH - 48));
    const y = 24 + ((index * 89 + 31) % (GAME_HEIGHT - 48));
    const radius = index % 8 === 0 ? 2.2 : 1;
    graphics.fillStyle(COLORS.cream, index % 5 === 0 ? 0.22 : 0.1);
    graphics.fillCircle(x, y, radius);
  }

  // Trama diagonal tenue, como cinta de embalar.
  const grid = scene.add.graphics().setDepth(DEPTH.backdrop + 3);
  grid.lineStyle(1, COLORS.gold, 0.022);
  for (let offset = -GAME_HEIGHT; offset < GAME_WIDTH; offset += 86) {
    grid.lineBetween(offset, 0, offset + GAME_HEIGHT, GAME_HEIGHT);
  }
}

export function drawSpark(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  size: number,
  color: number,
  alpha = 1,
): void {
  graphics.fillStyle(color, alpha);
  graphics.fillTriangle(x, y - size, x + size * 0.8, y, x, y + size);
  graphics.fillTriangle(x, y - size, x - size * 0.8, y, x, y + size);
}
