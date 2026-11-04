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
  bubbles?: number;
}

const DEFAULT_GLOWS: GlowSpec[] = [
  { x: 130, y: 150, color: COLORS.sky, scale: 2.5, alpha: 0.14 },
  { x: 890, y: 210, color: COLORS.lavender, scale: 2.2, alpha: 0.12 },
  { x: 760, y: 900, color: COLORS.mint, scale: 2.8, alpha: 0.09 },
  { x: 210, y: 880, color: COLORS.gold, scale: 2.1, alpha: 0.07 },
];

/** Fondo de laboratorio suave, generado por completo con gráficos. */
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

  // Burbujas decorativas.
  const bubbles = options.bubbles ?? 34;
  const graphics = scene.add.graphics().setDepth(DEPTH.backdrop + 2);
  for (let index = 0; index < bubbles; index += 1) {
    const x = 30 + ((index * 149 + 47) % (GAME_WIDTH - 60));
    const y = 30 + ((index * 97 + 71) % (GAME_HEIGHT - 60));
    const radius = index % 9 === 0 ? 4 : index % 4 === 0 ? 2.2 : 1.2;
    graphics.fillStyle(COLORS.glass, index % 6 === 0 ? 0.16 : 0.07);
    graphics.fillCircle(x, y, radius);
    if (index % 9 === 0) {
      graphics.lineStyle(1, COLORS.glass, 0.12);
      graphics.strokeCircle(x, y, radius + 2);
    }
  }

  // Retícula tenue de laboratorio.
  const grid = scene.add.graphics().setDepth(DEPTH.backdrop + 3);
  grid.lineStyle(1, COLORS.sky, 0.025);
  for (let x = 64; x < GAME_WIDTH; x += 96) {
    grid.lineBetween(x, 0, x, GAME_HEIGHT);
  }
  for (let y = 64; y < GAME_HEIGHT; y += 96) {
    grid.lineBetween(0, y, GAME_WIDTH, y);
  }
}

/** Dibuja una gota simple para adornos y celebraciones. */
export function drawDrop(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  size: number,
  color: number,
  alpha = 1,
): void {
  graphics.fillStyle(color, alpha);
  graphics.fillCircle(x, y, size * 0.5);
  graphics.fillTriangle(
    x - size * 0.42,
    y - size * 0.12,
    x + size * 0.42,
    y - size * 0.12,
    x,
    y - size * 1.05,
  );
}
