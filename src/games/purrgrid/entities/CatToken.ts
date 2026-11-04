import Phaser from "phaser";
import { ANIMATION } from "../config.ts";
import { COLORS, DEPTH } from "../render/theme.ts";

export interface CatTokenOptions {
  reducedMotion?: boolean;
}

/**
 * Gato dibujado con primitivas. Mantiene una silueta clara y un contraste alto
 * sobre las regiones pastel, sin tapar los bordes de la celda.
 */
export class CatToken extends Phaser.GameObjects.Container {
  private readonly size: number;
  private readonly art: Phaser.GameObjects.Graphics;
  private conflicted = false;
  private reducedMotion: boolean;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    cellSize: number,
    options: CatTokenOptions = {},
  ) {
    super(scene, x, y);
    this.size = cellSize;
    this.reducedMotion = options.reducedMotion ?? false;
    this.art = scene.add.graphics();
    this.add(this.art);
    this.setDepth(DEPTH.cats);
    scene.add.existing(this);
    this.redraw();
  }

  setConflict(conflict: boolean): void {
    if (this.conflicted === conflict) return;
    this.conflicted = conflict;
    this.redraw();
  }

  setReducedMotion(value: boolean): void {
    this.reducedMotion = value;
  }

  private redraw(): void {
    const g = this.art;
    const s = this.size;
    const cat = COLORS.cat;
    const catDark = COLORS.catDark;
    const cream = COLORS.cream;
    const pink = COLORS.pink;

    g.clear();

    if (this.conflicted) {
      g.fillStyle(COLORS.danger, 0.16);
      g.fillCircle(0, 0, s * 0.47);
      g.lineStyle(Math.max(2, s * 0.035), COLORS.danger, 0.95);
      g.strokeCircle(0, 0, s * 0.44);
    }

    // Sombra en el suelo.
    g.fillStyle(COLORS.shadow, 0.24);
    g.fillEllipse(0, s * 0.31, s * 0.52, s * 0.14);

    // Cola curvada.
    g.lineStyle(Math.max(2, s * 0.065), cat, 1);
    g.beginPath();
    g.arc(s * 0.28, s * 0.12, s * 0.16, -Math.PI * 0.35, Math.PI * 0.9, false);
    g.strokePath();

    // Cuerpo.
    g.fillStyle(cat, 1);
    g.fillEllipse(0, s * 0.14, s * 0.46, s * 0.38);

    // Orejas.
    g.fillTriangle(
      -s * 0.24,
      -s * 0.26,
      -s * 0.07,
      -s * 0.45,
      -s * 0.01,
      -s * 0.22,
    );
    g.fillTriangle(
      s * 0.24,
      -s * 0.26,
      s * 0.07,
      -s * 0.45,
      s * 0.01,
      -s * 0.22,
    );

    // Cabeza.
    g.fillStyle(cat, 1);
    g.fillCircle(0, -s * 0.1, s * 0.27);

    // Interior de las orejas.
    g.fillStyle(pink, 0.82);
    g.fillTriangle(
      -s * 0.19,
      -s * 0.27,
      -s * 0.09,
      -s * 0.38,
      -s * 0.05,
      -s * 0.24,
    );
    g.fillTriangle(
      s * 0.19,
      -s * 0.27,
      s * 0.09,
      -s * 0.38,
      s * 0.05,
      -s * 0.24,
    );

    // Pecho claro.
    g.fillStyle(cream, 0.9);
    g.fillEllipse(0, s * 0.18, s * 0.18, s * 0.2);

    // Hocico.
    g.fillStyle(cream, 0.96);
    g.fillEllipse(0, -s * 0.01, s * 0.24, s * 0.15);

    // Ojos.
    g.fillStyle(cream, 1);
    g.fillEllipse(-s * 0.095, -s * 0.13, s * 0.085, s * 0.11);
    g.fillEllipse(s * 0.095, -s * 0.13, s * 0.085, s * 0.11);
    g.fillStyle(catDark, 1);
    g.fillCircle(-s * 0.09, -s * 0.12, s * 0.028);
    g.fillCircle(s * 0.09, -s * 0.12, s * 0.028);

    // Nariz.
    g.fillStyle(pink, 1);
    g.fillTriangle(-s * 0.032, -s * 0.01, s * 0.032, -s * 0.01, 0, s * 0.035);

    // Bigotes.
    g.lineStyle(Math.max(1, s * 0.011), cream, 0.65);
    g.beginPath();
    g.moveTo(-s * 0.08, s * 0.02);
    g.lineTo(-s * 0.3, s * 0.0);
    g.moveTo(-s * 0.08, s * 0.05);
    g.lineTo(-s * 0.29, s * 0.09);
    g.moveTo(s * 0.08, s * 0.02);
    g.lineTo(s * 0.3, s * 0.0);
    g.moveTo(s * 0.08, s * 0.05);
    g.lineTo(s * 0.29, s * 0.09);
    g.strokePath();
  }

  playPlace(): void {
    if (this.reducedMotion) {
      this.setScale(1);
      this.setAlpha(1);
      return;
    }
    this.setScale(0.25);
    this.setAlpha(0);
    this.scene.tweens.add({
      targets: this,
      scale: 1,
      alpha: 1,
      duration: ANIMATION.placeMs,
      ease: "Back.out",
    });
  }

  playRemove(onComplete?: () => void): void {
    if (this.reducedMotion) {
      onComplete?.();
      this.destroy();
      return;
    }
    this.scene.tweens.add({
      targets: this,
      scale: 0.2,
      alpha: 0,
      duration: ANIMATION.removeMs,
      ease: "Cubic.in",
      onComplete: () => {
        onComplete?.();
        this.destroy();
      },
    });
  }

  celebrate(delay = 0): void {
    if (this.reducedMotion) return;
    this.scene.tweens.add({
      targets: this,
      y: this.y - this.size * 0.13,
      duration: 220,
      yoyo: true,
      repeat: 1,
      delay,
      ease: "Sine.inOut",
    });
  }

  shake(): void {
    if (this.reducedMotion) return;
    const baseX = this.x;
    this.scene.tweens.add({
      targets: this,
      x: baseX + 5,
      duration: 45,
      yoyo: true,
      repeat: 3,
      ease: "Sine.inOut",
      onComplete: () => {
        this.x = baseX;
      },
    });
  }
}
