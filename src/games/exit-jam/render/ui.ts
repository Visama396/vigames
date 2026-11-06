import Phaser from "phaser";
import { COLORS, FONTS, hex } from "./theme.ts";

export interface PanelOptions {
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
    fillAlpha = 0.94,
    border = COLORS.border,
    borderAlpha = 0.9,
    radius = 18,
    innerLine = true,
  } = options;

  const graphics = scene.add.graphics();
  graphics.fillStyle(fill, fillAlpha);
  graphics.fillRoundedRect(x, y, width, height, radius);
  graphics.lineStyle(1.5, border, borderAlpha);
  graphics.strokeRoundedRect(x, y, width, height, radius);

  if (innerLine) {
    graphics.lineStyle(1, COLORS.white, 0.04);
    graphics.strokeRoundedRect(
      x + 3,
      y + 3,
      width - 6,
      height - 6,
      Math.max(1, radius - 3),
    );
  }

  return graphics;
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
  const container = scene.add
    .container(options.x + width / 2, options.y + height / 2)
    .setDepth(options.depth ?? 80);

  const background = scene.add.graphics();
  const label = scene.add
    .text(0, options.sublabel ? -7 : 0, options.label, {
      fontFamily: FONTS.sans,
      fontSize: primary ? "17px" : "13px",
      fontStyle: "bold",
      color: primary
        ? hex(COLORS.bgDeep)
        : hex(danger ? COLORS.danger : COLORS.goldBright),
      letterSpacing: 0.8,
    })
    .setOrigin(0.5);
  const sublabel = scene.add
    .text(0, 12, options.sublabel ?? "", {
      fontFamily: FONTS.sans,
      fontSize: "9px",
      color: primary ? "#4a3a1f" : hex(COLORS.muted),
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

  const draw = (): void => {
    background.clear();
    const fill = primary
      ? hovered && enabled
        ? COLORS.goldBright
        : COLORS.gold
      : danger
        ? hovered && enabled
          ? 0x3a1b2a
          : COLORS.panelLight
        : hovered && enabled
          ? COLORS.panelSoft
          : COLORS.panelLight;
    const border = primary
      ? COLORS.goldBright
      : danger
        ? COLORS.danger
        : hovered && enabled
          ? COLORS.goldBright
          : COLORS.goldDark;

    background.fillStyle(fill, enabled ? 0.98 : 0.35);
    background.fillRoundedRect(-width / 2, -height / 2, width, height, 11);
    background.lineStyle(1.5, border, enabled ? 0.95 : 0.35);
    background.strokeRoundedRect(-width / 2, -height / 2, width, height, 11);
    if (!primary) {
      background.fillStyle(COLORS.white, 0.04);
      background.fillRoundedRect(
        -width / 2 + 3,
        -height / 2 + 3,
        width - 6,
        10,
        5,
      );
    }
    container.setScale(pressed && enabled ? 0.985 : 1);
    container.setAlpha(enabled ? 1 : 0.68);
    label.setAlpha(enabled ? 1 : 0.6);
    sublabel.setAlpha(options.sublabel ? (enabled ? 0.8 : 0.4) : 0);
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
      sublabel.setAlpha(nextSub ? (enabled ? 0.8 : 0.4) : 0);
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

export interface ToggleOptions {
  x: number;
  y: number;
  width: number;
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}

export interface ToggleHandle {
  container: Phaser.GameObjects.Container;
  setValue: (value: boolean) => void;
  setVisible: (visible: boolean) => void;
  destroy: () => void;
}

export function createToggle(
  scene: Phaser.Scene,
  options: ToggleOptions,
): ToggleHandle {
  const { width, label, onChange } = options;
  const container = scene.add.container(options.x, options.y).setDepth(120);
  const text = scene.add.text(0, 0, label, {
    fontFamily: FONTS.sans,
    fontSize: "14px",
    color: hex(COLORS.text),
  });
  const track = scene.add.graphics();
  const knob = scene.add.circle(width - 22, 0, 9, COLORS.cream, 1);
  const hit = scene.add
    .rectangle(width / 2, 0, width, 34, 0xffffff, 0.001)
    .setInteractive({ useHandCursor: true });
  container.add([text, track, knob, hit]);

  let value = options.value;

  const draw = (): void => {
    track.clear();
    track.fillStyle(value ? COLORS.goldDark : COLORS.panelSoft, 0.95);
    track.fillRoundedRect(width - 46, -12, 44, 24, 12);
    track.lineStyle(1, value ? COLORS.gold : COLORS.border, 0.9);
    track.strokeRoundedRect(width - 46, -12, 44, 24, 12);
    knob.setX(value ? width - 8 : width - 36);
    knob.setFillStyle(value ? COLORS.goldBright : COLORS.mutedDark, 1);
  };

  hit.on("pointerup", () => {
    value = !value;
    draw();
    onChange(value);
  });

  draw();

  return {
    container,
    setValue(next: boolean) {
      value = next;
      draw();
    },
    setVisible(visible: boolean) {
      container.setVisible(visible);
    },
    destroy() {
      container.destroy(true);
    },
  };
}

export function smallCaps(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  color: number = COLORS.muted,
  size = 10,
): Phaser.GameObjects.Text {
  return scene.add.text(x, y, text.toUpperCase(), {
    fontFamily: FONTS.sans,
    fontSize: `${size}px`,
    fontStyle: "bold",
    color: hex(color),
    letterSpacing: 1.5,
  });
}

export function floatingText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  color: number,
  size = 20,
  depth = 90,
): void {
  const label = scene.add
    .text(x, y, text, {
      fontFamily: FONTS.sans,
      fontSize: `${size}px`,
      fontStyle: "bold",
      color: hex(color),
      stroke: hex(COLORS.bgDeep),
      strokeThickness: 4,
    })
    .setOrigin(0.5)
    .setDepth(depth);

  scene.tweens.add({
    targets: label,
    y: y - 42,
    alpha: { from: 1, to: 0 },
    scale: { from: 0.8, to: 1.05 },
    duration: 850,
    ease: "Cubic.out",
    onComplete: () => label.destroy(),
  });
}
