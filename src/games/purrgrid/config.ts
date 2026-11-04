/**
 * Constantes de presentación y ajustes de PURRGRID.
 *
 * La lógica del puzle no depende de Phaser ni de estos valores: aquí solo se
 * agrupa lo que afecta al tablero, la interfaz y la persistencia.
 */

export const GAME_WIDTH = 1024;
export const GAME_HEIGHT = 1024;

/** Zona reservada para la cuadrícula. */
export const BOARD_AREA = {
  x: 48,
  y: 176,
  size: 600,
} as const;

/** Panel lateral de información y controles. */
export const PANEL = {
  x: 680,
  y: 176,
  width: 296,
  height: 600,
} as const;

export const TOP_BAR = {
  x: 48,
  y: 44,
  width: 928,
  height: 92,
} as const;

export const SAVE_KEY = "purrgrid.progress.v1";
export const SAVE_VERSION = 1;

export const TIMER_TICK_MS = 250;

/** Colores pastel de las regiones. Se reutilizan cíclicamente. */
export const REGION_COLORS = [
  0xf7b7c8, // rosa
  0xf7d08a, // albaricoque
  0xf5ee9b, // mantequilla
  0xb8e6b8, // menta
  0x9fe0d8, // aguamarina
  0xa9d4f5, // cielo
  0xc3b8f5, // lavanda
  0xf0b8e8, // orquídea
  0xd9c3a5, // arena
] as const;

/** Marcas sutiles por región para no depender solo del color. */
export const REGION_MARKS = ["·", "••", "•••", "◇", "◇◇", "△", "△△", "○", "○○"] as const;

export const ANIMATION = {
  placeMs: 260,
  removeMs: 170,
  conflictMs: 120,
  victoryMs: 900,
} as const;
