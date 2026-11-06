/**
 * Constantes de presentación y persistencia de TENLINK.
 *
 * TENLINK es un modo sin niveles: el jugador empieza con un tablero de 9×9
 * parcialmente lleno y sigue jugando hasta quedarse sin parejas posibles.
 */
import type { BoardShape } from "./types/GameTypes.ts";

export const GAME_WIDTH = 1024;
export const GAME_HEIGHT = 1024;

export const BOARD_SIZE = 9;
export const INITIAL_NUMBERS = 35;
export const REFILL_NUMBERS = 35;

export const BOARD_SHAPE: BoardShape = {
  width: BOARD_SIZE,
  height: BOARD_SIZE,
};

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

export const SAVE_KEY = "tenlink.progress.v2";
export const SAVE_VERSION = 2;

export const TIMER_TICK_MS = 250;

export const ANIMATION = {
  selectMs: 100,
  removeMs: 260,
  invalidMs: 90,
  collapseMs: 240,
  victoryMs: 820,
} as const;
