import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "../config.ts";
import type { PlayerSettings } from "../types/puzzle.ts";
import { COLORS, DEPTH, FONTS, hex } from "../render/theme.ts";
import { createButton, createPanel, createToggle, smallCaps } from "../render/ui.ts";

export interface PauseCallbacks {
  onResume: () => void;
  onRestart: () => void;
  onMenu: () => void;
  onSettingsChange: (patch: Partial<PlayerSettings>) => void;
}

/** Menú de pausa con ajustes persistentes. */
export class PauseMenu {
  private readonly scene: Phaser.Scene;
  private readonly callbacks: PauseCallbacks;
  private settings: PlayerSettings;
  private root: Phaser.GameObjects.Container | null = null;

  constructor(
    scene: Phaser.Scene,
    settings: PlayerSettings,
    callbacks: PauseCallbacks,
  ) {
    this.scene = scene;
    this.settings = { ...settings };
    this.callbacks = callbacks;
  }

  get isOpen(): boolean {
    return this.root !== null;
  }

  show(): void {
    if (this.root) return;
    const scene = this.scene;
    const root = scene.add.container(0, 0).setDepth(DEPTH.overlay);
    this.root = root;

    const dim = scene.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, COLORS.black, 0.62)
      .setOrigin(0)
      .setInteractive();
    root.add(dim);

    const width = 520;
    const height = 650;
    const x = (GAME_WIDTH - width) / 2;
    const y = (GAME_HEIGHT - height) / 2;
    root.add(createPanel(scene, x, y, width, height, { radius: 26, fillAlpha: 0.98 }));

    const title = scene.add
      .text(GAME_WIDTH / 2, y + 52, "PAUSA", {
        fontFamily: FONTS.display,
        fontSize: "38px",
        fontStyle: "bold",
        color: hex(COLORS.goldBright),
        letterSpacing: 4,
      })
      .setOrigin(0.5);
    const subtitle = scene.add
      .text(GAME_WIDTH / 2, y + 92, "Los gatos también descansan.", {
        fontFamily: FONTS.sans,
        fontSize: "15px",
        color: hex(COLORS.muted),
      })
      .setOrigin(0.5);
    root.add([title, subtitle]);

    const resume = createButton(scene, {
      x: x + 56,
      y: y + 126,
      width: width - 112,
      height: 50,
      label: "CONTINUAR",
      primary: true,
      onClick: this.callbacks.onResume,
    });
    root.add(resume.container);

    const settingsTag = smallCaps(
      scene,
      x + 56,
      y + 198,
      "Ajustes",
      COLORS.pink,
      10,
    );
    root.add(settingsTag);

    const settingsRows: Array<{
      key: keyof PlayerSettings;
      label: string;
    }> = [
      { key: "soundEnabled", label: "Sonido" },
      { key: "reducedMotion", label: "Movimiento reducido" },
      { key: "conflictHintsEnabled", label: "Avisos de conflicto" },
      { key: "strictMode", label: "Modo estricto" },
    ];

    settingsRows.forEach((row, index) => {
      const toggle = createToggle(scene, {
        x: x + 56,
        y: y + 236 + index * 46,
        width: width - 112,
        label: row.label,
        value: this.settings[row.key],
        onChange: (value) => {
          this.settings = { ...this.settings, [row.key]: value };
          this.callbacks.onSettingsChange({ [row.key]: value });
        },
      });
      root.add(toggle.container);
    });

    const hint = scene.add.text(
      x + 56,
      y + 424,
      "El modo estricto bloquea las jugadas que incumplen una regla en ese momento. No bloquea callejones sin salida.",
      {
        fontFamily: FONTS.sans,
        fontSize: "11px",
        color: hex(COLORS.muted),
        wordWrap: { width: width - 112 },
        lineSpacing: 3,
      },
    );
    root.add(hint);

    const restart = createButton(scene, {
      x: x + 56,
      y: y + 486,
      width: (width - 128) / 2,
      height: 44,
      label: "REINICIAR",
      onClick: this.callbacks.onRestart,
    });
    const menu = createButton(scene, {
      x: x + 72 + (width - 128) / 2,
      y: y + 486,
      width: (width - 128) / 2,
      height: 44,
      label: "MENÚ",
      onClick: this.callbacks.onMenu,
    });
    root.add([restart.container, menu.container]);

    const close = scene.add.text(
      GAME_WIDTH / 2,
      y + height - 34,
      "Pulsa Esc para volver al tablero",
      {
        fontFamily: FONTS.sans,
        fontSize: "11px",
        color: hex(COLORS.mutedDark),
      },
    ).setOrigin(0.5);
    root.add(close);
  }

  hide(): void {
    this.root?.destroy(true);
    this.root = null;
  }

  setSettings(settings: PlayerSettings): void {
    this.settings = { ...settings };
  }

  destroy(): void {
    this.hide();
  }
}
