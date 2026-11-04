import Phaser from "phaser";

/** Prepara texturas generadas y arranca el menú. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  create(): void {
    this.input.mouse?.disableContextMenu();
    this.createGlowTexture();
    this.createDotTexture();
    this.scene.start("MenuScene");
  }

  private createGlowTexture(): void {
    if (this.textures.exists("soft-glow")) return;
    const size = 256;
    const texture = this.textures.createCanvas("soft-glow", size, size);
    if (!texture) return;
    const context = texture.context;
    const gradient = context.createRadialGradient(
      size / 2,
      size / 2,
      0,
      size / 2,
      size / 2,
      size / 2,
    );
    gradient.addColorStop(0, "rgba(255,255,255,0.9)");
    gradient.addColorStop(0.35, "rgba(255,255,255,0.35)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
    texture.refresh();
  }

  private createDotTexture(): void {
    if (this.textures.exists("dot")) return;
    const size = 16;
    const texture = this.textures.createCanvas("dot", size, size);
    if (!texture) return;
    const context = texture.context;
    const gradient = context.createRadialGradient(
      size / 2,
      size / 2,
      0,
      size / 2,
      size / 2,
      size / 2,
    );
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.5, "rgba(255,255,255,0.8)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
    texture.refresh();
  }
}
