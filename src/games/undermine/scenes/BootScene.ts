import Phaser from "phaser";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  preload() {
    this.load.image("coal", "/assets/undermine/coal.png");
    this.load.image("iron_ore", "/assets/undermine/iron.png");
  }

  create() {
    this.scene.start("MineScene");
  }
}
