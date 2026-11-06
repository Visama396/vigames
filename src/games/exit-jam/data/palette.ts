import type { ColorId } from "../types/GameTypes.ts";

export interface ColorDefinition {
  id: ColorId;
  name: string;
  hex: number;
  light: number;
  dark: number;
  /** Marca compartida entre bloque y puerta (nunca solo color). */
  symbol: string;
}

export const BLOCK_COLORS: Record<ColorId, ColorDefinition> = {
  coral: {
    id: "coral",
    name: "Coral",
    hex: 0xff6b7d,
    light: 0xffb3bc,
    dark: 0xa8394a,
    symbol: "◆",
  },
  sky: {
    id: "sky",
    name: "Cielo",
    hex: 0x4fb6ff,
    light: 0xa9dcff,
    dark: 0x256fa8,
    symbol: "●",
  },
  mint: {
    id: "mint",
    name: "Menta",
    hex: 0x4bd9a8,
    light: 0xa7f0d5,
    dark: 0x1f8d6a,
    symbol: "▲",
  },
  amber: {
    id: "amber",
    name: "Ámbar",
    hex: 0xffc857,
    light: 0xffe3a4,
    dark: 0xaa7e26,
    symbol: "■",
  },
  violet: {
    id: "violet",
    name: "Violeta",
    hex: 0xb18cff,
    light: 0xd9c7ff,
    dark: 0x6c4bb0,
    symbol: "★",
  },
  rose: {
    id: "rose",
    name: "Rosa",
    hex: 0xff8ad4,
    light: 0xffc3ea,
    dark: 0xa84d85,
    symbol: "✚",
  },
};

export const COLOR_ORDER: ColorId[] = [
  "coral",
  "sky",
  "mint",
  "amber",
  "violet",
  "rose",
];

export function colorDefinition(color: ColorId): ColorDefinition {
  return BLOCK_COLORS[color] ?? BLOCK_COLORS.coral;
}
