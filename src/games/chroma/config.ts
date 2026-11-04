/**
 * Constantes de presentación y ajustes de CHROMA.
 *
 * La lógica del puzle no depende de Phaser: aquí solo se agrupa lo que afecta
 * al tablero, la interfaz y la persistencia.
 */

export const GAME_WIDTH = 1024;
export const GAME_HEIGHT = 1024;

export const TOP_BAR = {
  x: 48,
  y: 36,
  width: 928,
  height: 92,
} as const;

export const BOTTOM_BAR = {
  x: 48,
  y: 900,
  width: 928,
  height: 72,
} as const;

export const BOARD_AREA = {
  x: 48,
  y: 160,
  width: 928,
  height: 720,
} as const;

export const BOTTLE = {
  width: 104,
  height: 276,
  bodyWidth: 92,
  bodyHeight: 232,
  neckWidth: 38,
  neckHeight: 32,
  selectedLift: 18,
} as const;

export const SAVE_KEY = "chroma.progress.v1";
export const SAVE_VERSION = 1;
export const DEFAULT_CAPACITY = 4;

export const ANIMATION = {
  selectMs: 130,
  pourMs: 260,
  shakeMs: 45,
  victoryMs: 900,
} as const;
