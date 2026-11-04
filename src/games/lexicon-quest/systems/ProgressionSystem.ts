import {
  REST_HEAL,
  REST_HINTS,
  REST_SHUFFLES,
  REWARD_CHOICES,
} from "../config.ts";
import type {
  DamageModifiers,
  GameState,
  RelicSummary,
  UpgradeDefinition,
  UpgradeId,
} from "../types.ts";
import type { Rng } from "./random.ts";
import { shuffled } from "./random.ts";

export const UPGRADES: Record<UpgradeId, UpgradeDefinition> = {
  pluma: {
    id: "pluma",
    name: "Pluma constante",
    description: "+1 de daño con todas las palabras.",
    icon: "✒",
    effects: { flatDamage: 1 },
  },
  "golpe-preciso": {
    id: "golpe-preciso",
    name: "Golpe preciso",
    description: "+3 de daño con palabras de 2 o 3 letras.",
    icon: "3",
    effects: { shortWordDamage: 3 },
  },
  guante: {
    id: "guante",
    name: "Guante de calígrafo",
    description: "+3 de daño con palabras de 4 letras.",
    icon: "4",
    effects: { fourLetterDamage: 3 },
  },
  "cadena-lexica": {
    id: "cadena-lexica",
    name: "Cadena léxica",
    description: "+3 de daño con palabras de 5 o más letras.",
    icon: "5",
    effects: { fivePlusDamage: 3 },
  },
  rompearmaduras: {
    id: "rompearmaduras",
    name: "Rompearmaduras",
    description: "+5 de daño con palabras de 6 o más letras.",
    icon: "6",
    effects: { longWordDamage: 5 },
  },
  "amuleto-eco": {
    id: "amuleto-eco",
    name: "Amuleto del eco",
    description:
      "La primera palabra de 6+ letras de cada combate inflige +10 de daño.",
    icon: "✦",
    effects: { firstLongWordDamage: 10 },
  },
  "ultima-vocal": {
    id: "ultima-vocal",
    name: "Última vocal",
    description: "Si la palabra termina en vocal, recuperas 3 de vida.",
    icon: "A",
    effects: { healOnVowel: 3 },
  },
  vitalidad: {
    id: "vitalidad",
    name: "Vitalidad de archivo",
    description: "+12 de vida máxima y recupera 12 de vida ahora.",
    icon: "♥",
    effects: { maxHp: 12 },
  },
  lupa: {
    id: "lupa",
    name: "Lupa de archivista",
    description: "+2 pistas para el resto de la aventura.",
    icon: "?",
    effects: { hints: 2 },
  },
  reordenar: {
    id: "reordenar",
    name: "Reordenar letras",
    description: "+2 mezclas para el resto de la aventura.",
    icon: "↻",
    effects: { shuffles: 2 },
  },
  "letra-ene": {
    id: "letra-ene",
    name: "La letra olvidada",
    description: "+4 de daño si la palabra contiene Ñ.",
    icon: "Ñ",
    effects: { eneDamage: 4 },
  },
};

const UPGRADE_LIST = Object.values(UPGRADES);

export function getUpgrade(id: UpgradeId): UpgradeDefinition {
  return UPGRADES[id];
}

export function getDamageModifiers(upgrades: readonly UpgradeId[]): DamageModifiers {
  const modifiers: DamageModifiers = {
    flat: 0,
    short: 0,
    four: 0,
    fivePlus: 0,
    long: 0,
    ene: 0,
    firstLong: 0,
    healOnVowel: 0,
  };

  for (const id of upgrades) {
    const effects = UPGRADES[id].effects;
    modifiers.flat += effects.flatDamage ?? 0;
    modifiers.short += effects.shortWordDamage ?? 0;
    modifiers.four += effects.fourLetterDamage ?? 0;
    modifiers.fivePlus += effects.fivePlusDamage ?? 0;
    modifiers.long += effects.longWordDamage ?? 0;
    modifiers.ene += effects.eneDamage ?? 0;
    modifiers.firstLong += effects.firstLongWordDamage ?? 0;
    modifiers.healOnVowel += effects.healOnVowel ?? 0;
  }

  return modifiers;
}

export function getUpgradeChoices(
  state: GameState,
  rng: Rng,
  count = REWARD_CHOICES,
): UpgradeDefinition[] {
  const available = UPGRADE_LIST.filter(
    (upgrade) => !state.upgrades.includes(upgrade.id),
  );
  return shuffled(available, rng).slice(0, count);
}

export function applyUpgrade(state: GameState, upgrade: UpgradeDefinition): void {
  if (state.upgrades.includes(upgrade.id)) return;
  state.upgrades.push(upgrade.id);

  const effects = upgrade.effects;
  if (effects.maxHp) {
    state.hero.maxHp += effects.maxHp;
    state.hero.hp = Math.min(state.hero.maxHp, state.hero.hp + effects.maxHp);
  }
  if (effects.hints) {
    state.hintsLeft += effects.hints;
  }
  if (effects.shuffles) {
    state.shufflesLeft += effects.shuffles;
  }
}

/** Descanso entre encuentros: cura una parte y repone recursos tácticos. */
export function prepareNextBattle(state: GameState): void {
  state.hero.hp = Math.min(state.hero.maxHp, state.hero.hp + REST_HEAL);
  state.hintsLeft = Math.min(9, state.hintsLeft + REST_HINTS);
  state.shufflesLeft = Math.min(9, state.shufflesLeft + REST_SHUFFLES);
}

export function getRelicSummaries(
  upgrades: readonly UpgradeId[],
): RelicSummary[] {
  return upgrades.map((id) => {
    const upgrade = UPGRADES[id];
    return {
      id,
      name: upgrade.name,
      icon: upgrade.icon,
      description: upgrade.description,
    };
  });
}
