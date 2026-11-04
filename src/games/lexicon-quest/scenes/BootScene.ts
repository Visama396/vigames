import Phaser from "phaser";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  create(): void {
    this.createDotTexture();
    this.createGlowTexture();
    this.createNoiseTexture();
    this.scene.start("MenuScene");
  }

  private createDotTexture(): void {
    const texture = this.textures.createCanvas("dot", 16, 16);
    if (!texture) return;
    const context = texture.context;
    const gradient = context.createRadialGradient(8, 8, 0, 8, 8, 8);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.45, "rgba(255,255,255,0.9)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 16, 16);
    texture.refresh();
  }

  private createGlowTexture(): void {
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

  private createNoiseTexture(): void {
    const size = 128;
    const texture = this.textures.createCanvas("noise", size, size);
    if (!texture) return;
    const context = texture.context;
    const image = context.createImageData(size, size);
    for (let i = 0; i < image.data.length; i += 4) {
      const value = Math.random();
      image.data[i] = 255;
      image.data[i + 1] = 245;
      image.data[i + 2] = 225;
      image.data[i + 3] = value > 0.72 ? Math.floor(value * 26) : 0;
    }
    context.putImageData(image, 0, 0);
    texture.refresh();
  }
}
