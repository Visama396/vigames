import {
  getBaseDamage,
  getDamageCategory,
  HERO,
  MIN_WORD_LENGTH,
  STARTING_HINTS,
  STARTING_SHUFFLES,
} from "../config.ts";
import { ENEMIES, ENEMY_ORDER, getEnemy } from "../data/enemies.ts";
import type {
  BattlePhase,
  DamageEstimate,
  EnemyDefinition,
  EnemyState,
  EnemyTurnResult,
  GameState,
  LogTone,
  PlayerActionResult,
} from "../types.ts";
import type { WordValidator } from "./WordValidator.ts";
import { normalizeWord } from "./WordValidator.ts";
import { canInterrupt, pickIntent } from "./EnemyAI.ts";
import { getDamageModifiers } from "./ProgressionSystem.ts";

const VOWELS = new Set(["A", "E", "I", "O", "U"]);

export function createEnemyState(definition: EnemyDefinition): EnemyState {
  return {
    id: definition.id,
    name: definition.name,
    hp: definition.maxHp,
    maxHp: definition.maxHp,
    round: 1,
    intent: pickIntent(definition, 1),
  };
}

export function createGameState(
  definition: EnemyDefinition = ENEMIES[ENEMY_ORDER[0] as keyof typeof ENEMIES],
  now = Date.now(),
): GameState {
  return {
    hero: {
      hp: HERO.maxHp,
      maxHp: HERO.maxHp,
    },
    enemy: createEnemyState(definition),
    upgrades: [],
    hintsLeft: STARTING_HINTS,
    shufflesLeft: STARTING_SHUFFLES,
    turn: 1,
    phase: "player",
    firstLongWordUsed: false,
    enemyIndex: 0,
    stats: {
      wordsPlayed: 0,
      bestWord: "",
      bestWordLength: 0,
      damageDealt: 0,
      interrupts: 0,
      enemiesDefeated: 0,
      startedAt: now,
    },
    log: [
      {
        text: `¡${definition.name} bloquea el paso!`,
        tone: "info",
        turn: 1,
      },
    ],
  };
}

function addLog(state: GameState, text: string, tone: LogTone): void {
  state.log.push({ text, tone, turn: state.turn });
  if (state.log.length > 18) state.log.shift();
}

export function startBattle(
  state: GameState,
  definition: EnemyDefinition,
  enemyIndex: number,
): void {
  state.enemy = createEnemyState(definition);
  state.enemyIndex = enemyIndex;
  state.turn = 1;
  state.phase = "player";
  state.firstLongWordUsed = false;
  state.log = [];
  addLog(state, `¡${definition.name} bloquea el paso!`, "info");
  if (definition.passive) {
    addLog(state, definition.passive, "special");
  }
}

export function getEnemyDefinitionOf(state: GameState): EnemyDefinition {
  return getEnemy(state.enemy.id);
}

/**
 * Calcula el daño completo de una palabra, incluyendo reliquias, defensas y
 * multiplicadores del enemigo. Es una función pura: no modifica el estado.
 */
export function estimateWordDamage(
  state: GameState,
  rawWord: string,
): DamageEstimate {
  const word = normalizeWord(rawWord);
  const length = word.length;
  const modifiers = getDamageModifiers(state.upgrades);
  const definition = getEnemyDefinitionOf(state);

  const base = getBaseDamage(length);
  const flatBonus = length >= MIN_WORD_LENGTH ? modifiers.flat : 0;
  const shortBonus =
    length >= MIN_WORD_LENGTH && length <= 3 ? modifiers.short : 0;
  const fourBonus = length === 4 ? modifiers.four : 0;
  const fivePlusBonus = length >= 5 ? modifiers.fivePlus : 0;
  const longBonus = length >= 6 ? modifiers.long : 0;
  const eneBonus = length >= MIN_WORD_LENGTH && word.includes("Ñ")
    ? modifiers.ene
    : 0;
  const firstLongBonus =
    length >= 6 && !state.firstLongWordUsed ? modifiers.firstLong : 0;

  const subtotal =
    base +
    flatBonus +
    shortBonus +
    fourBonus +
    fivePlusBonus +
    longBonus +
    eneBonus +
    firstLongBonus;

  const multiplier =
    definition.longWordMultiplier !== undefined && length >= 6
      ? definition.longWordMultiplier
      : 1;

  const armor =
    definition.shortWordArmor !== undefined && length <= 3
      ? definition.shortWordArmor
      : 0;

  const total = Math.max(1, Math.round(subtotal * multiplier) - armor);

  return {
    length,
    base,
    flatBonus,
    shortBonus,
    fourBonus,
    fivePlusBonus,
    longBonus,
    eneBonus,
    firstLongBonus,
    armor,
    multiplier,
    total: length >= MIN_WORD_LENGTH ? total : 0,
    category: getDamageCategory(length),
    interrupts: canInterrupt(
      definition,
      state.enemy.intent,
      length,
    ),
  };
}

/** Texto compacto con las bonificaciones aplicadas, para el HUD. */
export function describeDamageBonuses(estimate: DamageEstimate): string[] {
  const parts: string[] = [];
  if (estimate.flatBonus) parts.push(`+${estimate.flatBonus} pluma`);
  if (estimate.shortBonus) parts.push(`+${estimate.shortBonus} golpe preciso`);
  if (estimate.fourBonus) parts.push(`+${estimate.fourBonus} guante`);
  if (estimate.fivePlusBonus) parts.push(`+${estimate.fivePlusBonus} cadena`);
  if (estimate.longBonus) parts.push(`+${estimate.longBonus} rompearmaduras`);
  if (estimate.eneBonus) parts.push(`+${estimate.eneBonus} letra ñ`);
  if (estimate.firstLongBonus) parts.push(`+${estimate.firstLongBonus} amuleto`);
  if (estimate.armor) parts.push(`-${estimate.armor} caparazón`);
  if (estimate.multiplier !== 1) parts.push(`×${estimate.multiplier} papel`);
  return parts;
}

/**
 * Resuelve un ataque del jugador. Si la palabra no es válida, el estado no
 * cambia: no se consume el turno ni se pierden letras.
 */
export function resolvePlayerAttack(
  state: GameState,
  rawWord: string,
  validator: WordValidator,
): PlayerActionResult {
  const word = normalizeWord(rawWord);

  if (state.phase !== "player") {
    return { ok: false, reason: "not-player-turn", word };
  }
  if (word.length < MIN_WORD_LENGTH) {
    return { ok: false, reason: "too-short", word };
  }
  if (!validator.isWord(word)) {
    return { ok: false, reason: "not-a-word", word };
  }

  const estimate = estimateWordDamage(state, word);
  const modifiers = getDamageModifiers(state.upgrades);

  let interrupted = false;
  if (estimate.interrupts && !state.enemy.intent.interrupted) {
    state.enemy.intent.interrupted = true;
    state.stats.interrupts += 1;
    interrupted = true;
    addLog(state, "¡Ataque anunciado interrumpido!", "special");
  }

  state.enemy.hp = Math.max(0, state.enemy.hp - estimate.total);
  state.firstLongWordUsed = state.firstLongWordUsed || word.length >= 6;

  state.stats.wordsPlayed += 1;
  state.stats.damageDealt += estimate.total;
  if (word.length > state.stats.bestWordLength) {
    state.stats.bestWordLength = word.length;
    state.stats.bestWord = word;
  }

  let healed = 0;
  const lastLetter = word.slice(-1);
  if (modifiers.healOnVowel > 0 && VOWELS.has(lastLetter)) {
    const before = state.hero.hp;
    state.hero.hp = Math.min(state.hero.maxHp, state.hero.hp + modifiers.healOnVowel);
    healed = state.hero.hp - before;
    if (healed > 0) {
      addLog(state, `«${word}» recupera ${healed} de vida.`, "good");
    }
  }

  addLog(
    state,
    `«${word}» · ${estimate.total} de daño (${estimate.category}).`,
    word.length >= 6 ? "special" : "good",
  );

  const enemyDefeated = state.enemy.hp <= 0;
  if (enemyDefeated) {
    state.phase = "victory";
    state.stats.enemiesDefeated += 1;
    addLog(state, `${state.enemy.name} se disuelve en tinta.`, "special");
  } else {
    state.phase = "enemy";
  }

  return {
    ok: true,
    word,
    damage: estimate.total,
    category: estimate.category,
    estimate,
    interrupted,
    healed,
    enemyDefeated,
  };
}

/**
 * Ejecuta la intención del enemigo. Si el enemigo ha muerto o el combate ya
 * no está en su fase, no hace nada (criterio de aceptación: un enemigo
 * derrotado no ataca).
 */
export function resolveEnemyTurn(state: GameState): EnemyTurnResult {
  if (state.phase !== "enemy" || state.enemy.hp <= 0) {
    return { skipped: true };
  }

  const definition = getEnemyDefinitionOf(state);
  const intent = state.enemy.intent;
  let interrupted = false;
  let damage = 0;

  if (intent.interrupted) {
    interrupted = true;
    addLog(state, `${intent.name} se deshace en el aire.`, "special");
  } else {
    damage = intent.damage;
    state.hero.hp = Math.max(0, state.hero.hp - damage);
    addLog(
      state,
      `${state.enemy.name} usa ${intent.name}: ${damage} de daño.`,
      intent.kind === "heavy" ? "bad" : "bad",
    );
  }

  if (state.hero.hp <= 0) {
    state.phase = "defeat";
    addLog(state, "La tinta borra tus últimos trazos…", "bad");
    return { skipped: false, damage, interrupted, defeated: true };
  }

  state.enemy.round += 1;
  state.turn = state.enemy.round;
  state.enemy.intent = pickIntent(definition, state.enemy.round);
  state.phase = "player";

  if (state.enemy.intent.kind === "heavy") {
    addLog(
      state,
      `Se anuncia: ${state.enemy.intent.name} (${state.enemy.intent.damage}).`,
      "special",
    );
  }

  return { skipped: false, damage, interrupted, defeated: false };
}

export function isFinalEnemy(state: GameState): boolean {
  return state.enemyIndex >= ENEMY_ORDER.length - 1;
}

export function getNextEnemyDefinition(
  state: GameState,
): EnemyDefinition | null {
  const next = ENEMY_ORDER[state.enemyIndex + 1];
  return next ? getEnemy(next) : null;
}

export function phaseLabel(phase: BattlePhase): string {
  switch (phase) {
    case "player":
      return "Tu turno";
    case "enemy":
      return "Turno enemigo";
    case "victory":
      return "Victoria";
    case "defeat":
      return "Derrota";
  }
}
