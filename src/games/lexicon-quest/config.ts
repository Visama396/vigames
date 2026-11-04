/**
 * Parámetros de Lexicon Quest. Los valores numéricos son provisionales y
 * están agrupados aquí para poder equilibrar el juego sin tocar el combate.
 */

export const GAME_WIDTH = 1024;
export const GAME_HEIGHT = 768;

export const BOARD_CONFIG = {
  cols: 5,
  rows: 5,
  /** Separación entre el centro de dos casillas. */
  pitch: 56,
  /** Lado de la casilla visible. */
  tile: 50,
  cornerRadius: 9,
  /** Origen del tablero en coordenadas de la escena. */
  x: 56,
  y: 462,
} as const;

export const BOARD_SIZE = BOARD_CONFIG.cols * BOARD_CONFIG.rows;

/** Tabla base de daño según la longitud de la palabra. */
export const DAMAGE_TABLE: Record<number, number> = {
  2: 4,
  3: 7,
  4: 11,
  5: 16,
  6: 22,
  7: 29,
  8: 37,
};

/** Daño adicional por cada letra a partir de 9. */
export const EPIC_DAMAGE_BONUS = 5;

export const MIN_WORD_LENGTH = 2;

export const DAMAGE_CATEGORIES: Record<number, string> = {
  2: "Golpe rápido",
  3: "Golpe ligero",
  4: "Ataque",
  5: "Ataque fuerte",
  6: "Ataque devastador",
  7: "Golpe heroico",
  8: "Palabra épica",
};

export function getDamageCategory(length: number): string {
  if (length >= 8) return "Palabra épica";
  return DAMAGE_CATEGORIES[length] ?? "Golpe";
}

/** Daño base de una palabra. No incluye reliquias ni defensas. */
export function getBaseDamage(length: number): number {
  if (length < MIN_WORD_LENGTH) return 0;
  if (length >= 9) {
    return (DAMAGE_TABLE[8] ?? 37) + (length - 8) * EPIC_DAMAGE_BONUS;
  }
  return DAMAGE_TABLE[length] ?? 0;
}

export const HERO = {
  name: "La Archivera",
  title: "Guardiana del Lexicon",
  maxHp: 70,
} as const;

export const STARTING_HINTS = 3;
export const STARTING_SHUFFLES = 2;

/** Vida recuperada al superar un encuentro. */
export const REST_HEAL = 18;
/** Recursos gratuitos que se recuperan entre encuentros. */
export const REST_HINTS = 1;
export const REST_SHUFFLES = 1;

export const REWARD_CHOICES = 3;

/** Probabilidades relativas de las letras del tablero (sin tildes). */
export const LETTER_WEIGHTS: ReadonlyArray<readonly [string, number]> = [
  ["A", 12],
  ["E", 13],
  ["O", 9],
  ["S", 7],
  ["R", 6],
  ["N", 6],
  ["I", 6],
  ["D", 5],
  ["L", 5],
  ["C", 4],
  ["T", 4],
  ["U", 4],
  ["M", 3],
  ["P", 3],
  ["B", 2],
  ["G", 2],
  ["V", 2],
  ["Y", 1],
  ["Q", 1],
  ["H", 1],
  ["F", 1],
  ["Z", 1],
  ["J", 1],
  ["Ñ", 1],
  ["X", 1],
];

export const LETTER_BAG: ReadonlyArray<string> = LETTER_WEIGHTS.flatMap(
  ([letter, weight]) => Array.from({ length: weight }, () => letter),
);

/** Número de intentos de mezcla antes de regenerar un tablero sin palabras. */
export const PLAYABLE_ATTEMPTS = 14;
