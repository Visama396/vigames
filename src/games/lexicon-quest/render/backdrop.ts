import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "../config.ts";
import { COLORS, DEPTH, FONTS, hex } from "./theme.ts";

interface BackdropOptions {
  letters?: boolean;
  glows?: Array<{ x: number; y: number; color: number; scale: number; alpha: number }>;
}

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

  const glows = options.glows ?? [
    { x: 130, y: 90, color: COLORS.teal, scale: 2.8, alpha: 0.12 },
    { x: 900, y: 130, color: COLORS.gold, scale: 2.2, alpha: 0.1 },
    { x: 820, y: 700, color: COLORS.purple, scale: 2.6, alpha: 0.08 },
  ];

  for (const glow of glows) {
    scene.add
      .image(glow.x, glow.y, "soft-glow")
      .setTint(glow.color)
      .setAlpha(glow.alpha)
      .setScale(glow.scale)
      .setDepth(DEPTH.backdrop + 1);
  }

  scene.add
    .tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, "noise")
    .setOrigin(0, 0)
    .setAlpha(0.035)
    .setDepth(DEPTH.backdrop + 2);

  const frame = scene.add.graphics().setDepth(DEPTH.backdrop + 3);
  frame.lineStyle(1, COLORS.gold, 0.18);
  frame.strokeRect(12, 12, GAME_WIDTH - 24, GAME_HEIGHT - 24);
  frame.lineStyle(1, COLORS.teal, 0.08);
  frame.strokeRect(18, 18, GAME_WIDTH - 36, GAME_HEIGHT - 36);

  const corners: Array<[number, number, number, number]> = [
    [22, 22, 1, 1],
    [GAME_WIDTH - 22, 22, -1, 1],
    [22, GAME_HEIGHT - 22, 1, -1],
    [GAME_WIDTH - 22, GAME_HEIGHT - 22, -1, -1],
  ];
  for (const [x, y, dx, dy] of corners) {
    frame.lineStyle(2, COLORS.gold, 0.35);
    frame.beginPath();
    frame.moveTo(x, y + dy * 18);
    frame.lineTo(x, y);
    frame.lineTo(x + dx * 18, y);
    frame.strokePath();
    frame.fillStyle(COLORS.gold, 0.5);
    frame.fillCircle(x + dx * 7, y + dy * 7, 2);
  }

  if (options.letters !== false) {
    const letters = "ABCDEFGHILMNOPQRSTUVXYZÑ";
    for (let i = 0; i < 16; i += 1) {
      const x = 40 + Math.random() * (GAME_WIDTH - 80);
      const y = 40 + Math.random() * (GAME_HEIGHT - 80);
      const letter = letters[Math.floor(Math.random() * letters.length)] as string;
      const text = scene.add
        .text(x, y, letter, {
          fontFamily: FONTS.serif,
          fontSize: `${18 + Math.floor(Math.random() * 32)}px`,
          color: hex(i % 3 === 0 ? COLORS.gold : COLORS.teal),
        })
        .setAlpha(0.045 + Math.random() * 0.045)
        .setAngle(Math.random() * 30 - 15)
        .setDepth(DEPTH.backdrop + 4);

      scene.tweens.add({
        targets: text,
        y: y - 18 - Math.random() * 26,
        angle: text.angle + (Math.random() > 0.5 ? 8 : -8),
        duration: 5000 + Math.random() * 5000,
        yoyo: true,
        repeat: -1,
        ease: "Sine.inOut",
      });
    }
  }

  scene.add
    .particles(0, 0, "dot", {
      x: { min: 0, max: GAME_WIDTH },
      y: { min: GAME_HEIGHT * 0.55, max: GAME_HEIGHT + 20 },
      lifespan: { min: 5000, max: 9000 },
      speedY: { min: -10, max: -3 },
      speedX: { min: -3, max: 3 },
      scale: { start: 0.14, end: 0 },
      alpha: { start: 0.22, end: 0 },
      frequency: 380,
      quantity: 1,
      tint: [COLORS.gold, COLORS.teal, COLORS.purple],
    })
    .setDepth(DEPTH.backdrop + 5);
}
