import type { ColorId } from "../types/puzzle.ts";

export interface ColorDefinition {
  id: ColorId;
  label: string;
  hex: number;
  dark: number;
  light: number;
  symbol: string;
}

/** Ocho colores vivos y distinguibles sobre el fondo oscuro del laboratorio. */
export const COLOR_DEFINITIONS: Record<ColorId, ColorDefinition> = {
  coral: {
    id: "coral",
    label: "Coral",
    hex: 0xff7a8a,
    dark: 0xc94f61,
    light: 0xffb3bd,
    symbol: "●",
  },
  amber: {
    id: "amber",
    label: "Ámbar",
    hex: 0xffb84d,
    dark: 0xc98524,
    light: 0xffd79a,
    symbol: "▲",
  },
  lemon: {
    id: "lemon",
    label: "Limón",
    hex: 0xf2e05a,
    dark: 0xb9a72c,
    light: 0xf8ef9e,
    symbol: "■",
  },
  mint: {
    id: "mint",
    label: "Menta",
    hex: 0x5fd9a4,
    dark: 0x2f9a6f,
    light: 0xa9f0d0,
    symbol: "◆",
  },
  aqua: {
    id: "aqua",
    label: "Aqua",
    hex: 0x4fc9e8,
    dark: 0x2689a8,
    light: 0x9ee6f5,
    symbol: "★",
  },
  blue: {
    id: "blue",
    label: "Azul",
    hex: 0x6f8cff,
    dark: 0x4057c4,
    light: 0xb3c2ff,
    symbol: "✦",
  },
  violet: {
    id: "violet",
    label: "Violeta",
    hex: 0xb07cff,
    dark: 0x7647c4,
    light: 0xd7b8ff,
    symbol: "✚",
  },
  pink: {
    id: "pink",
    label: "Rosa",
    hex: 0xff7ad8,
    dark: 0xc2479f,
    light: 0xffb3ec,
    symbol: "☾",
  },
};

export const COLOR_ORDER: ColorId[] = [
  "coral",
  "amber",
  "lemon",
  "mint",
  "aqua",
  "blue",
  "violet",
  "pink",
];

export function colorDefinition(color: ColorId): ColorDefinition {
  return COLOR_DEFINITIONS[color] ?? COLOR_DEFINITIONS.coral!;
}
