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
  stars?: number;
}

const DEFAULT_GLOWS: GlowSpec[] = [
  { x: 140, y: 120, color: COLORS.pink, scale: 2.6, alpha: 0.13 },
  { x: 880, y: 180, color: COLORS.sky, scale: 2.2, alpha: 0.12 },
  { x: 760, y: 900, color: COLORS.lavender, scale: 2.8, alpha: 0.1 },
  { x: 220, y: 860, color: COLORS.mint, scale: 2.2, alpha: 0.08 },
];

/** Fondo suave y acogedor, sin recursos externos. */
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

  const stars = options.stars ?? 42;
  const graphics = scene.add.graphics().setDepth(DEPTH.backdrop + 2);
  for (let index = 0; index < stars; index += 1) {
    const x = 24 + ((index * 137 + 53) % (GAME_WIDTH - 48));
    const y = 24 + ((index * 89 + 31) % (GAME_HEIGHT - 48));
    const radius = index % 7 === 0 ? 1.8 : 1;
    graphics.fillStyle(COLORS.cream, index % 5 === 0 ? 0.28 : 0.12);
    graphics.fillCircle(x, y, radius);
  }

  // Huellas decorativas muy tenues en las esquinas.
  const paws = scene.add.graphics().setDepth(DEPTH.backdrop + 3);
  drawPaw(paws, 76, 930, 28, COLORS.pink, 0.09);
  drawPaw(paws, 952, 72, 22, COLORS.sky, 0.1);
  drawPaw(paws, 930, 936, 18, COLORS.lavender, 0.08);
}

/** Dibuja una huella de gato simple (para fondos y celebraciones). */
export function drawPaw(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  size: number,
  color: number,
  alpha = 1,
): void {
  graphics.fillStyle(color, alpha);
  graphics.fillEllipse(x, y, size * 0.62, size * 0.52);
  const toeRadius = size * 0.13;
  const offset = size * 0.26;
  graphics.fillCircle(x - offset, y - size * 0.28, toeRadius);
  graphics.fillCircle(x - size * 0.09, y - size * 0.38, toeRadius);
  graphics.fillCircle(x + size * 0.09, y - size * 0.38, toeRadius);
  graphics.fillCircle(x + offset, y - size * 0.28, toeRadius);
}
