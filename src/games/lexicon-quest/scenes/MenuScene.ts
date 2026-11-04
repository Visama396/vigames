import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "../config.ts";
import { createBackdrop } from "../render/backdrop.ts";
import { createButton, createPanel, smallCaps } from "../render/ui.ts";
import { COLORS, FONTS, hex } from "../render/theme.ts";

export class MenuScene extends Phaser.Scene {
  constructor() {
    super("MenuScene");
  }

  create(): void {
    createBackdrop(this, { glows: [
      { x: 170, y: 120, color: COLORS.teal, scale: 2.9, alpha: 0.14 },
      { x: 860, y: 150, color: COLORS.gold, scale: 2.4, alpha: 0.12 },
      { x: 720, y: 680, color: COLORS.purple, scale: 2.7, alpha: 0.1 },
    ] });

    createPanel(this, 90, 110, GAME_WIDTH - 180, 190, { radius: 18 });

    this.add
      .text(GAME_WIDTH / 2, 150, "LEXICON QUEST", {
        fontFamily: FONTS.serif,
        fontSize: "64px",
        fontStyle: "bold",
        color: hex(COLORS.goldBright),
        stroke: "#080b12",
        strokeThickness: 6,
        letterSpacing: 6,
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, 214, "La Archivera contra los manuscritos corrompidos", {
        fontFamily: FONTS.serif,
        fontSize: "22px",
        color: hex(COLORS.parchment),
        stroke: "#080b12",
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    smallCaps(this, GAME_WIDTH / 2, 258, "Combate por palabras · Adyacentes/diagonales · Sin reutilizar casillas", COLORS.muted).setOrigin(0.5);

    createPanel(this, 140, 330, GAME_WIDTH - 280, 290, { radius: 16 });

    this.add
      .text(190, 360, "CÓMO JUGAR", {
        fontFamily: FONTS.sans,
        fontSize: "16px",
        fontStyle: "bold",
        color: hex(COLORS.goldBright),
        letterSpacing: 2,
      });

    const rules = [
      "• Forma palabras uniendo letras adyacentes o en diagonal.",
      "• No puedes reutilizar casillas en la misma palabra.",
      "• El daño depende de la longitud: palabras más largas golpean con más fuerza.",
      "• Las palabras de 6+ letras pueden interrumpir ataques anunciados.",
      "• Tras usar letras, el tablero se repone con nuevas letras.",
      "• Usa Pistas / Mezclar si te quedas sin jugadas.",
    ];
    rules.forEach((rule, index) => {
      this.add
        .text(190, 396 + index * 28, rule, {
          fontFamily: FONTS.sans,
          fontSize: "15px",
          color: hex(COLORS.parchment),
        });
    });

    createButton(this, {
      x: GAME_WIDTH / 2 - 150,
      y: 660,
      width: 300,
      height: 58,
      label: "EMPEZAR",
      primary: true,
      onClick: () => {
        this.scene.start("BattleScene");
      },
    });

    this.add
      .text(GAME_WIDTH / 2, 738, "Las tildes se ignoran · La Ñ es una letra distinta", {
        fontFamily: FONTS.sans,
        fontSize: "12px",
        color: hex(COLORS.muted),
      })
      .setOrigin(0.5);
  }
}
