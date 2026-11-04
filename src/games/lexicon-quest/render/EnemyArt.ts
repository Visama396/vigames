import Phaser from "phaser";
import type { EnemyId } from "../types.ts";
import { COLORS, FONTS, hex } from "./theme.ts";

export interface EnemyArtHandle {
  container: Phaser.GameObjects.Container;
  body: Phaser.GameObjects.Container;
  baseY: number;
  hit: () => void;
  die: (onComplete: () => void) => void;
  destroy: () => void;
}

function brighten(color: number, amount: number): number {
  return Phaser.Display.Color.IntegerToColor(color).brighten(amount).color;
}

function darken(color: number, amount: number): number {
  return Phaser.Display.Color.IntegerToColor(color).darken(amount).color;
}

export function createEnemyArt(
  scene: Phaser.Scene,
  id: EnemyId,
  x: number,
  y: number,
  color: number,
): EnemyArtHandle {
  const container = scene.add.container(x, y).setDepth(5);
  const aura = scene.add.container(0, 0);
  const auraGraphics = scene.add.graphics();
  auraGraphics.fillStyle(color, 0.06);
  auraGraphics.fillCircle(0, 0, 120);
  auraGraphics.lineStyle(1, color, 0.22);
  auraGraphics.strokeCircle(0, 0, 126);
  auraGraphics.lineStyle(1, COLORS.gold, 0.12);
  auraGraphics.strokeCircle(0, 0, 145);
  aura.add(auraGraphics);

  const glyphs = "LEXICON";
  for (let i = 0; i < glyphs.length; i += 1) {
    const angle = (Math.PI * 2 * i) / glyphs.length - Math.PI / 2;
    const glyph = scene.add
      .text(Math.cos(angle) * 142, Math.sin(angle) * 142 + 18, glyphs[i] as string, {
        fontFamily: FONTS.serif,
        fontSize: "13px",
        color: hex(color),
      })
      .setOrigin(0.5)
      .setAlpha(0.35);
    aura.add(glyph);
  }
  scene.tweens.add({
    targets: aura,
    angle: 360,
    duration: 60000,
    repeat: -1,
    ease: "Linear",
  });

  const shadow = scene.add.graphics();
  shadow.fillStyle(0x000000, 0.32);
  shadow.fillEllipse(0, 96, 190, 26);
  shadow.fillStyle(color, 0.08);
  shadow.fillEllipse(0, 94, 150, 16);

  const body = scene.add.container(0, 0);
  const graphics = scene.add.graphics();
  body.add(graphics);

  if (id === "babosa") {
    drawSlug(graphics, color);
  } else if (id === "escarabajo") {
    drawBeetle(graphics, color);
  } else if (id === "murcielago") {
    drawBat(graphics, color);
  } else {
    drawGolem(graphics, color);
  }

  container.add([aura, shadow, body]);

  const idleTween = scene.tweens.add({
    targets: body,
    y: -7,
    duration: 1600 + Math.random() * 500,
    yoyo: true,
    repeat: -1,
    ease: "Sine.inOut",
  });

  if (id === "murcielago") {
    scene.tweens.add({
      targets: body,
      scaleX: 1.035,
      duration: 260,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut",
    });
  } else if (id === "golem") {
    scene.tweens.add({
      targets: body,
      angle: 1.4,
      duration: 2600,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut",
    });
  }

  let destroyed = false;

  return {
    container,
    body,
    baseY: y,
    hit() {
      if (destroyed) return;
      scene.tweens.add({
        targets: body,
        x: { from: -7, to: 7 },
        duration: 45,
        yoyo: true,
        repeat: 3,
        ease: "Sine.inOut",
        onComplete: () => {
          body.x = 0;
        },
      });
      scene.tweens.add({
        targets: graphics,
        alpha: 0.35,
        duration: 55,
        yoyo: true,
        repeat: 2,
      });
    },
    die(onComplete: () => void) {
      if (destroyed) return;
      destroyed = true;
      idleTween.stop();
      scene.tweens.add({
        targets: body,
        alpha: 0,
        y: -36,
        scale: 1.16,
        angle: 6,
        duration: 520,
        ease: "Cubic.in",
      });
      scene.tweens.add({
        targets: aura,
        alpha: 0,
        scale: 1.5,
        duration: 620,
        ease: "Cubic.out",
      });
      scene.tweens.add({
        targets: shadow,
        alpha: 0,
        duration: 450,
        onComplete: () => {
          onComplete();
          container.destroy(true);
        },
      });
    },
    destroy() {
      destroyed = true;
      idleTween.stop();
      container.destroy(true);
    },
  };
}

function drawSlug(g: Phaser.GameObjects.Graphics, color: number): void {
  const light = brighten(color, 22);
  const dark = darken(color, 28);

  g.fillStyle(dark, 1);
  g.fillEllipse(-14, 46, 172, 86);
  g.fillStyle(color, 1);
  g.fillEllipse(-14, 36, 164, 80);
  g.fillStyle(light, 0.75);
  g.fillEllipse(-26, 20, 96, 34);

  g.fillStyle(color, 1);
  g.fillCircle(62, 42, 34);
  g.fillStyle(light, 0.8);
  g.fillCircle(56, 32, 19);

  g.lineStyle(4, light, 0.9);
  g.beginPath();
  g.moveTo(68, 17);
  g.lineTo(82, -16);
  g.strokePath();
  g.beginPath();
  g.moveTo(86, 22);
  g.lineTo(99, -10);
  g.strokePath();
  g.fillStyle(COLORS.goldBright, 1);
  g.fillCircle(82, -18, 4);
  g.fillCircle(99, -12, 3.5);

  g.fillStyle(0xf8f1dd, 1);
  g.fillCircle(76, 38, 8.5);
  g.fillCircle(92, 37, 7.5);
  g.fillStyle(0x1b2130, 1);
  g.fillCircle(78, 39, 4);
  g.fillCircle(93, 38, 3.5);
  g.fillStyle(0xffffff, 0.85);
  g.fillCircle(76.5, 36.5, 1.6);

  g.lineStyle(2.5, dark, 0.8);
  g.beginPath();
  g.moveTo(78, 54);
  g.lineTo(92, 51);
  g.strokePath();

  g.fillStyle(dark, 0.85);
  g.fillEllipse(-72, 72, 11, 25);
  g.fillEllipse(-38, 80, 8, 18);
  g.fillEllipse(18, 78, 9, 20);

  g.fillStyle(light, 0.4);
  g.fillCircle(-52, 30, 9);
  g.fillCircle(-20, 46, 12);
  g.fillCircle(12, 28, 7);
  g.fillCircle(-86, 50, 6);
}

function drawBeetle(g: Phaser.GameObjects.Graphics, color: number): void {
  const light = brighten(color, 24);
  const dark = darken(color, 32);

  g.lineStyle(5, dark, 1);
  const legs: Array<[number, number, number, number]> = [
    [-65, 18, -104, 58],
    [-40, 44, -74, 86],
    [65, 18, 104, 58],
    [40, 44, 74, 86],
    [-20, 58, -34, 94],
    [20, 58, 34, 94],
  ];
  for (const [x1, y1, x2, y2] of legs) {
    g.beginPath();
    g.moveTo(x1, y1);
    g.lineTo(x2, y2);
    g.strokePath();
    g.fillStyle(dark, 1);
    g.fillCircle(x2, y2, 3);
  }

  g.fillStyle(dark, 1);
  g.fillEllipse(0, 30, 174, 112);
  g.fillStyle(color, 1);
  g.fillEllipse(0, 24, 162, 100);
  g.fillStyle(light, 0.5);
  g.fillEllipse(-28, 2, 82, 44);

  g.lineStyle(3, dark, 0.8);
  g.beginPath();
  g.moveTo(0, -24);
  g.lineTo(0, 72);
  g.strokePath();

  g.fillStyle(dark, 0.6);
  const spots: Array<[number, number, number]> = [
    [-48, 12, 10],
    [44, 10, 9],
    [-30, 48, 7],
    [33, 45, 8],
    [-62, 35, 6],
    [60, 34, 6],
  ];
  for (const [x, y, r] of spots) g.fillCircle(x, y, r);

  g.fillStyle(dark, 1);
  g.fillCircle(0, -42, 34);
  g.fillStyle(color, 1);
  g.fillCircle(0, -46, 28);
  g.fillStyle(light, 0.4);
  g.fillCircle(-8, -54, 10);

  g.fillStyle(dark, 1);
  g.fillTriangle(-16, -68, -4, -106, 4, -66);
  g.fillStyle(COLORS.gold, 0.9);
  g.fillTriangle(-11, -72, -3, -99, 1, -70);

  g.fillStyle(0xf8f1dd, 1);
  g.fillCircle(-12, -48, 7);
  g.fillCircle(12, -48, 7);
  g.fillStyle(0x201a12, 1);
  g.fillCircle(-12, -47, 3.5);
  g.fillCircle(12, -47, 3.5);
  g.fillStyle(COLORS.goldBright, 1);
  g.fillCircle(-13, -49, 1.4);
  g.fillCircle(11, -49, 1.4);
}

function drawBat(g: Phaser.GameObjects.Graphics, color: number): void {
  const light = brighten(color, 26);
  const dark = darken(color, 34);

  g.fillStyle(dark, 1);
  g.fillTriangle(-28, -4, -166, -54, -138, 68);
  g.fillTriangle(28, -4, 166, -54, 138, 68);
  g.fillStyle(color, 0.9);
  g.fillTriangle(-34, 2, -148, -36, -122, 52);
  g.fillTriangle(34, 2, 148, -36, 122, 52);

  g.lineStyle(2, dark, 0.8);
  g.beginPath();
  g.moveTo(-48, 10);
  g.lineTo(-118, -14);
  g.strokePath();
  g.beginPath();
  g.moveTo(-44, 26);
  g.lineTo(-108, 16);
  g.strokePath();
  g.beginPath();
  g.moveTo(48, 10);
  g.lineTo(118, -14);
  g.strokePath();
  g.beginPath();
  g.moveTo(44, 26);
  g.lineTo(108, 16);
  g.strokePath();

  g.fillStyle(dark, 1);
  g.fillEllipse(0, 30, 76, 92);
  g.fillStyle(color, 1);
  g.fillEllipse(0, 24, 64, 82);
  g.fillStyle(light, 0.4);
  g.fillEllipse(-10, 8, 24, 34);

  g.fillStyle(dark, 1);
  g.fillTriangle(-30, -26, -14, -74, -2, -24);
  g.fillTriangle(30, -26, 14, -74, 2, -24);
  g.fillStyle(color, 1);
  g.fillTriangle(-26, -30, -15, -66, -7, -28);
  g.fillTriangle(26, -30, 15, -66, 7, -28);

  g.fillStyle(color, 1);
  g.fillCircle(0, -30, 34);

  g.fillStyle(0x1a1524, 1);
  g.fillCircle(-12, -34, 7);
  g.fillCircle(12, -34, 7);
  g.fillStyle(COLORS.goldBright, 1);
  g.fillCircle(-12, -34, 3.4);
  g.fillCircle(12, -34, 3.4);
  g.fillStyle(0xffffff, 1);
  g.fillCircle(-11, -35, 1.2);
  g.fillCircle(13, -35, 1.2);

  g.fillStyle(0xf8f1dd, 1);
  g.fillTriangle(-8, -12, -2, 2, 2, -12);
  g.fillTriangle(8, -12, 2, 2, 14, -12);

  g.fillStyle(dark, 0.9);
  g.fillCircle(0, 52, 12);
  g.fillTriangle(-12, 60, 0, 86, 12, 60);
}

function drawGolem(g: Phaser.GameObjects.Graphics, color: number): void {
  const light = brighten(color, 18);
  const dark = darken(color, 34);
  const ink = 0x4a3a27;

  g.fillStyle(dark, 0.9);
  g.fillRoundedRect(-78, -74, 44, 134, 14);
  g.fillRoundedRect(34, -74, 44, 134, 14);
  g.fillStyle(color, 1);
  g.fillRoundedRect(-84, -80, 46, 138, 14);
  g.fillRoundedRect(38, -80, 46, 138, 14);
  g.fillStyle(light, 0.55);
  g.fillRoundedRect(-76, -70, 18, 92, 8);
  g.fillRoundedRect(48, -70, 18, 92, 8);

  g.fillStyle(dark, 1);
  g.fillRoundedRect(-64, -58, 128, 158, 18);
  g.fillStyle(color, 1);
  g.fillRoundedRect(-66, -66, 132, 158, 18);
  g.fillStyle(light, 0.7);
  g.fillRoundedRect(-56, -56, 100, 36, 12);

  g.fillStyle(0xf7efdd, 0.35);
  g.fillRoundedRect(-78, -138, 150, 82, 18);
  g.lineStyle(3, ink, 0.55);
  g.strokeRoundedRect(-78, -138, 150, 82, 18);

  g.fillStyle(color, 1);
  g.fillRoundedRect(-44, -164, 88, 54, 14);
  g.fillStyle(light, 0.65);
  g.fillRoundedRect(-34, -154, 58, 18, 7);

  g.lineStyle(3, ink, 0.55);
  g.beginPath();
  g.moveTo(-26, -124);
  g.lineTo(-8, -108);
  g.lineTo(8, -128);
  g.lineTo(28, -112);
  g.strokePath();
  g.beginPath();
  g.moveTo(-20, -86);
  g.lineTo(44, -80);
  g.strokePath();
  g.beginPath();
  g.moveTo(-46, -28);
  g.lineTo(-8, -18);
  g.lineTo(18, -34);
  g.lineTo(52, -20);
  g.strokePath();

  g.fillStyle(0x1d2430, 1);
  g.fillEllipse(-22, -141, 28, 13);
  g.fillEllipse(22, -140, 28, 13);
  g.fillStyle(COLORS.teal, 1);
  g.fillCircle(-22, -141, 6);
  g.fillCircle(22, -141, 6);
  g.fillStyle(0xffffff, 0.8);
  g.fillCircle(-24, -143, 2);
  g.fillCircle(20, -143, 2);

  g.fillStyle(ink, 0.7);
  g.fillRoundedRect(-14, -132, 28, 7, 3);

  g.fillStyle(COLORS.teal, 0.14);
  g.fillCircle(0, 4, 56);
  g.fillStyle(COLORS.teal, 0.4);
  g.fillCircle(0, 4, 30);
  g.fillStyle(COLORS.goldBright, 0.65);
  g.fillCircle(0, 4, 16);
  g.lineStyle(2, COLORS.teal, 0.55);
  g.strokeCircle(0, 4, 42);

  for (let i = 0; i < 4; i += 1) {
    const x = -50 + i * 34;
    g.lineStyle(2, ink, 0.35);
    g.beginPath();
    g.moveTo(x, 66);
    g.lineTo(x + 14, 78);
    g.lineTo(x + 4, 91);
    g.strokePath();
  }
}
