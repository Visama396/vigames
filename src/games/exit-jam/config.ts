/**
 * Constantes de presentación y ajustes de EXIT JAM.
 *
 * La lógica del puzle no depende de Phaser: aquí solo se agrupa lo que afecta
 * al tablero, la interfaz y la persistencia.
 */

export const GAME_WIDTH = 1024;
export const GAME_HEIGHT = 1024;

export const TOP_BAR = {
  x: 48,
  y: 34,
  width: 928,
  height: 100,
} as const;

export const BOARD_AREA = {
  x: 64,
  y: 168,
  size: 680,
} as const;

export const SIDE_PANEL = {
  x: 772,
  y: 168,
  width: 204,
  height: 680,
} as const;

export const DOOR_DEPTH = 18;

export const SAVE_KEY = "exit-jam.progress.v1";
export const SAVE_VERSION = 1;

export const ANIMATION = {
  moveMs: 110,
  exitMs: 360,
  selectMs: 110,
  invalidMs: 90,
  victoryMs: 900,
} as const;

/** Margen de estrellas: 3 estrellas en el objetivo, 2 dentro de este margen. */
export const STAR_MARGIN = 4;
