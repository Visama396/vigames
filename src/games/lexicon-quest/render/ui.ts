import Phaser from "phaser";
import { COLORS, FONTS, hex } from "./theme.ts";

interface PanelOptions {
  fill?: number;
  fillAlpha?: number;
  border?: number;
  borderAlpha?: number;
  radius?: number;
  innerLine?: boolean;
}

export function createPanel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  options: PanelOptions = {},
): Phaser.GameObjects.Graphics {
  const {
    fill = COLORS.panel,
    fillAlpha = 0.92,
    border = COLORS.border,
    borderAlpha = 0.9,
    radius = 14,
    innerLine = true,
  } = options;

  const graphics = scene.add.graphics();
  graphics.fillStyle(fill, fillAlpha);
  graphics.fillRoundedRect(x, y, width, height, radius);
  graphics.lineStyle(1, border, borderAlpha);
  graphics.strokeRoundedRect(x, y, width, height, radius);

  if (innerLine) {
    graphics.lineStyle(1, COLORS.white, 0.035);
    graphics.strokeRoundedRect(x + 3, y + 3, width - 6, height - 6, Math.max(1, radius - 3));
  }

  return graphics;
}

export function drawBar(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  width: number,
  height: number,
  ratio: number,
  color: number,
): void {
  const clamped = Phaser.Math.Clamp(ratio, 0, 1);
  graphics.clear();
  graphics.fillStyle(0x060a13, 0.85);
  graphics.fillRoundedRect(x, y, width, height, height / 2);
  graphics.lineStyle(1, COLORS.white, 0.08);
  graphics.strokeRoundedRect(x, y, width, height, height / 2);

  if (clamped > 0) {
    const innerWidth = Math.max(height, (width - 4) * clamped);
    graphics.fillStyle(color, 1);
    graphics.fillRoundedRect(x + 2, y + 2, innerWidth, height - 4, (height - 4) / 2);
    graphics.fillStyle(COLORS.white, 0.18);
    graphics.fillRoundedRect(
      x + 4,
      y + 4,
      Math.max(2, innerWidth - 4),
      Math.max(1, (height - 8) / 2),
      3,
    );
  }
}

export interface ButtonOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  sublabel?: string;
  primary?: boolean;
  danger?: boolean;
  depth?: number;
  onClick: () => void;
}

export interface ButtonHandle {
  container: Phaser.GameObjects.Container;
  setEnabled: (enabled: boolean) => void;
  setLabels: (label: string, sublabel?: string) => void;
  setVisible: (visible: boolean) => void;
  destroy: () => void;
}

export function createButton(
  scene: Phaser.Scene,
  options: ButtonOptions,
): ButtonHandle {
  const { width, height, primary = false, danger = false } = options;
  const container = scene.add.container(options.x + width / 2, options.y + height / 2);
  container.setDepth(options.depth ?? 40);

  const background = scene.add.graphics();
  const label = scene.add
    .text(0, options.sublabel ? -7 : 0, options.label, {
      fontFamily: FONTS.sans,
      fontSize: primary ? "16px" : "14px",
      fontStyle: "bold",
      color: primary ? hex(COLORS.ink) : hex(danger ? COLORS.red : COLORS.goldBright),
      letterSpacing: 1,
    })
    .setOrigin(0.5);
  const sublabel = scene.add
    .text(0, 11, options.sublabel ?? "", {
      fontFamily: FONTS.sans,
      fontSize: "9px",
      color: primary ? "#58452a" : hex(COLORS.muted),
      letterSpacing: 0.5,
    })
    .setOrigin(0.5)
    .setAlpha(options.sublabel ? 1 : 0);

  const hit = scene.add
    .rectangle(0, 0, width, height, 0xffffff, 0.001)
    .setInteractive({ useHandCursor: true });

  container.add([background, label, sublabel, hit]);

  let enabled = true;
  let hovered = false;
  let pressed = false;

  const draw = () => {
    background.clear();
    const fill = primary
      ? hovered && enabled
        ? COLORS.goldBright
        : COLORS.gold
      : danger
        ? hovered && enabled
          ? 0x3a1b23
          : COLORS.panelLight
        : hovered && enabled
          ? COLORS.panelSoft
          : COLORS.panelLight;
    const border = primary
      ? COLORS.goldBright
      : danger
        ? COLORS.red
        : hovered && enabled
          ? COLORS.goldBright
          : COLORS.goldDark;

    background.fillStyle(fill, enabled ? 0.98 : 0.35);
    background.fillRoundedRect(-width / 2, -height / 2, width, height, 10);
    background.lineStyle(1.5, border, enabled ? 0.95 : 0.35);
    background.strokeRoundedRect(-width / 2, -height / 2, width, height, 10);
    if (!primary) {
      background.fillStyle(COLORS.white, 0.04);
      background.fillRoundedRect(-width / 2 + 3, -height / 2 + 3, width - 6, 10, 5);
    }
    container.setScale(pressed && enabled ? 0.985 : 1);
    container.setAlpha(enabled ? 1 : 0.72);
    label.setAlpha(enabled ? 1 : 0.65);
    sublabel.setAlpha(options.sublabel ? (enabled ? 0.8 : 0.45) : 0);
  };

  hit.on("pointerover", () => {
    hovered = true;
    draw();
  });
  hit.on("pointerout", () => {
    hovered = false;
    pressed = false;
    draw();
  });
  hit.on("pointerdown", () => {
    if (!enabled) return;
    pressed = true;
    draw();
  });
  hit.on("pointerup", () => {
    if (!enabled) return;
    pressed = false;
    draw();
    options.onClick();
  });

  draw();

  return {
    container,
    setEnabled(next: boolean) {
      enabled = next;
      if (!next) pressed = false;
      if (next) hit.setInteractive({ useHandCursor: true });
      else hit.disableInteractive();
      draw();
    },
    setLabels(nextLabel: string, nextSub?: string) {
      label.setText(nextLabel);
      options.sublabel = nextSub;
      sublabel.setText(nextSub ?? "");
      sublabel.setAlpha(nextSub ? (enabled ? 0.8 : 0.45) : 0);
      label.setY(nextSub ? -7 : 0);
    },
    setVisible(visible: boolean) {
      container.setVisible(visible);
    },
    destroy() {
      container.destroy(true);
    },
  };
}

export function floatingText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  color: number,
  size = 24,
  depth = 80,
): void {
  const label = scene.add
    .text(x, y, text, {
      fontFamily: FONTS.serif,
      fontSize: `${size}px`,
      fontStyle: "bold",
      color: hex(color),
      stroke: "#080b12",
      strokeThickness: 4,
    })
    .setOrigin(0.5)
    .setDepth(depth);

  scene.tweens.add({
    targets: label,
    y: y - 52,
    alpha: { from: 1, to: 0 },
    scale: { from: 0.75, to: 1.1 },
    duration: 900,
    ease: "Cubic.out",
    onComplete: () => label.destroy(),
  });
}

export function smallCaps(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  color: number = COLORS.muted,
  size = 9,
): Phaser.GameObjects.Text {
  return scene.add.text(x, y, text.toUpperCase(), {
    fontFamily: FONTS.sans,
    fontSize: `${size}px`,
    fontStyle: "bold",
    color: hex(color),
    letterSpacing: 1.4,
  });
}

export function makeCircleButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  radius: number,
  label: string,
  onClick: () => void,
): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y).setDepth(45);
  const bg = scene.add.graphics();
  const text = scene.add
    .text(0, 0, label, {
      fontFamily: FONTS.sans,
      fontSize: `${Math.round(radius * 0.9)}px`,
      fontStyle: "bold",
      color: hex(COLORS.goldBright),
    })
    .setOrigin(0.5);
  const hit = scene.add
    .circle(0, 0, radius, 0xffffff, 0.001)
    .setInteractive({ useHandCursor: true });

  const draw = (hover: boolean) => {
    bg.clear();
    bg.fillStyle(hover ? COLORS.panelSoft : COLORS.panelLight, 0.95);
    bg.fillCircle(0, 0, radius);
    bg.lineStyle(1, COLORS.goldDark, hover ? 1 : 0.7);
    bg.strokeCircle(0, 0, radius);
  };
  draw(false);
  hit.on("pointerover", () => draw(true));
  hit.on("pointerout", () => draw(false));
  hit.on("pointerup", onClick);

  container.add([bg, text, hit]);
  return container;
}
