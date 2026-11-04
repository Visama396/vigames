import test from "node:test";
import assert from "node:assert/strict";

import { getBaseDamage } from "../config.ts";
import { ENEMIES } from "../data/enemies.ts";
import {
  applySelection,
  createBoard,
  ensurePlayableBoard,
  extendSelection,
  findPlayableWord,
  isAdjacent,
  pointToCell,
  refillBoard,
  wordFromSelection,
} from "../systems/LetterBoard.ts";
import {
  createGameState,
  estimateWordDamage,
  resolveEnemyTurn,
  resolvePlayerAttack,
  startBattle,
} from "../systems/CombatSystem.ts";
import { normalizeWord, WordValidator } from "../systems/WordValidator.ts";
import { createRng } from "../systems/random.ts";
import { pickIntent } from "../systems/EnemyAI.ts";

const validator = new WordValidator([
  "sol", "mar", "casa", "libro", "mariposa", "chocolate", "de", "año", "ano",
  "uña", "arbol", "gato", "perro", "luna", "tinta", "eco", "gema",
]);

test("la tabla de daño sigue el GDD", () => {
  assert.equal(getBaseDamage(3), 7);
  assert.equal(getBaseDamage(5), 16);
  assert.equal(getBaseDamage(8), 37);
  assert.equal(getBaseDamage(9), 42);
  assert.equal(getBaseDamage(1), 0);
});

test("el daño estimado usa la longitud y las reglas del enemigo", () => {
  const slug = createGameState(ENEMIES.babosa);
  assert.equal(estimateWordDamage(slug, "sol").total, 7);
  assert.equal(estimateWordDamage(slug, "libro").total, 16);
  assert.equal(estimateWordDamage(slug, "mariposa").total, 37);

  const beetle = createGameState(ENEMIES.escarabajo);
  assert.equal(estimateWordDamage(beetle, "sol").total, 4); // 7 - 3 de caparazón
  assert.equal(estimateWordDamage(beetle, "libro").total, 16);

  const golem = createGameState(ENEMIES.golem);
  assert.equal(estimateWordDamage(golem, "mariposa").total, 56); // 37 * 1.5
});

test("las tildes se ignoran y la ñ es una letra distinta", () => {
  assert.equal(normalizeWord("árbol"), "ARBOL");
  assert.equal(normalizeWord("AÑO"), "AÑO");
  assert.notEqual(normalizeWord("AÑO"), normalizeWord("ANO"));

  const words = new WordValidator(["año", "ano"]);
  assert.equal(words.isWord("año"), true);
  assert.equal(words.isWord("ano"), true);
  assert.equal(words.isWord("año"), true);
  assert.equal(words.isWord("a ñ o"), true);
  assert.equal(words.isWord("zzz"), false);
});

test("una ruta no adyacente se rechaza", () => {
  assert.equal(isAdjacent(pointToCell(0, 0), pointToCell(1, 1)), true);
  assert.equal(isAdjacent(pointToCell(0, 0), pointToCell(2, 0)), false);
  assert.equal(isAdjacent(pointToCell(4, 4), pointToCell(0, 0)), false);

  const selection = [pointToCell(0, 0)];
  const result = extendSelection(selection, pointToCell(2, 2));
  assert.equal(result.action, "invalid");
  assert.deepEqual(result.selection, selection);

  const applied = applySelection(selection, pointToCell(2, 2), false);
  assert.equal(applied.action, "invalid");
  assert.deepEqual(applied.selection, selection);
});

test("una casilla no se reutiliza en la misma palabra", () => {
  const first = pointToCell(0, 0);
  const second = pointToCell(1, 0);

  let selection = applySelection([], first).selection;
  selection = applySelection(selection, second).selection;
  assert.deepEqual(selection, [first, second]);

  const repeated = extendSelection(selection, first);
  assert.equal(repeated.action, "invalid");
  assert.deepEqual(repeated.selection, selection);

  // Tocar la última letra la deshace; tocar una anterior recorta la selección.
  assert.deepEqual(applySelection(selection, second).selection, [first]);
  selection = [first, second, pointToCell(2, 0)];
  assert.deepEqual(applySelection(selection, second).selection, [first, second]);
});

test("una palabra inválida no consume el turno ni cambia el estado", () => {
  const state = createGameState(ENEMIES.babosa);
  const beforeHp = state.enemy.hp;
  const result = resolvePlayerAttack(state, "zzz", validator);

  assert.equal(result.ok, false);
  assert.equal(result.reason, "not-a-word");
  assert.equal(state.phase, "player");
  assert.equal(state.enemy.hp, beforeHp);
  assert.equal(state.stats.wordsPlayed, 0);
  assert.equal(state.stats.damageDealt, 0);
});

test("una palabra válida ataca y provoca la respuesta enemiga", () => {
  const state = createGameState(ENEMIES.babosa);
  const result = resolvePlayerAttack(state, "sol", validator);

  assert.equal(result.ok, true);
  assert.equal(result.damage, 7);
  assert.equal(state.enemy.hp, 17);
  assert.equal(state.phase, "enemy");

  const heroBefore = state.hero.hp;
  const enemyTurn = resolveEnemyTurn(state);
  assert.equal(enemyTurn.skipped, false);
  assert.equal(enemyTurn.damage, 4);
  assert.equal(state.hero.hp, heroBefore - 4);
  assert.equal(state.phase, "player");
  assert.equal(state.turn, 2);
});

test("el enemigo no ataca después de ser derrotado", () => {
  const state = createGameState(ENEMIES.babosa);
  state.enemy.hp = 1;

  const result = resolvePlayerAttack(state, "sol", validator);
  assert.equal(result.enemyDefeated, true);
  assert.equal(state.phase, "victory");

  const heroBefore = state.hero.hp;
  const enemyTurn = resolveEnemyTurn(state);
  assert.equal(enemyTurn.skipped, true);
  assert.equal(state.hero.hp, heroBefore);
});

test("una palabra corta interrumpe el ataque anunciado", () => {
  const state = createGameState(ENEMIES.murcielago);
  state.enemy.intent = pickIntent(ENEMIES.murcielago, 3);
  assert.equal(state.enemy.intent.kind, "heavy");

  const result = resolvePlayerAttack(state, "sol", validator);
  assert.equal(result.interrupted, true);
  assert.equal(state.enemy.intent.interrupted, true);

  const heroBefore = state.hero.hp;
  const enemyTurn = resolveEnemyTurn(state);
  assert.equal(enemyTurn.interrupted, true);
  assert.equal(enemyTurn.damage, 0);
  assert.equal(state.hero.hp, heroBefore);
});

test("el tablero generado siempre contiene una palabra", () => {
  for (let seed = 1; seed <= 40; seed += 1) {
    const rng = createRng(seed);
    const board = createBoard(validator, rng);
    const word = findPlayableWord(board, validator, { minLength: 3 });
    assert.ok(word, `seed ${seed} sin palabra`);
  }
});

test("un tablero sin palabras se regenera y no bloquea la partida", () => {
  const rng = createRng(7);
  const dead = Array.from({ length: 25 }, () => "Q");
  assert.equal(findPlayableWord(dead, validator, { minLength: 3 }), null);

  const check = ensurePlayableBoard(dead, validator, rng);
  assert.equal(check.changed, true);
  assert.ok(check.word);
  assert.notEqual(check.board.join(""), dead.join(""));
});

test("la reposición cambia solo las letras consumidas", () => {
  const rng = createRng(3);
  const board = Array.from({ length: 25 }, () => "A");
  const refilled = refillBoard(board, [0, 1, 2], rng);
  assert.equal(refilled.length, board.length);
  assert.equal(refilled[3], "A");
  assert.equal(refilled[24], "A");
});

test("las palabras se componen en el orden de la ruta", () => {
  const board = Array.from({ length: 25 }, () => "A");
  board[0] = "S";
  board[1] = "O";
  board[2] = "L";
  assert.equal(wordFromSelection(board, [0, 1, 2]), "SOL");
});

test("startBattle conserva la vida y las reliquias de la aventura", () => {
  const state = createGameState(ENEMIES.babosa);
  state.hero.hp = 42;
  state.upgrades.push("pluma");
  state.hintsLeft = 1;

  startBattle(state, ENEMIES.murcielago, 2);

  assert.equal(state.hero.hp, 42);
  assert.deepEqual(state.upgrades, ["pluma"]);
  assert.equal(state.enemy.id, "murcielago");
  assert.equal(state.enemyIndex, 2);
  assert.equal(state.enemy.hp, ENEMIES.murcielago.maxHp);
  assert.equal(state.turn, 1);
  assert.equal(state.hintsLeft, 1);
});

test("las reliquias modifican el daño esperado", () => {
  const state = createGameState(ENEMIES.babosa);
  state.upgrades.push("pluma", "guante", "letra-ene");
  assert.equal(estimateWordDamage(state, "casa").total, 15); // 11 + 1 + 3
  assert.equal(estimateWordDamage(state, "año").total, 12); // 7 + 1 + 4
});

test("el generador aleatorio es determinista", () => {
  const a = createRng(42);
  const b = createRng(42);
  const c = createRng(43);
  assert.equal(a(), b());
  assert.equal(a(), b());
  assert.notEqual(b(), c());
});

test("la partida tiene cuatro encuentros con intenciones anunciadas", () => {
  const bat = ENEMIES.murcielago;
  assert.equal(pickIntent(bat, 1).kind, "attack");
  assert.equal(pickIntent(bat, 3).kind, "heavy");
  assert.equal(pickIntent(bat, 3).interruptible, true);

  const golem = ENEMIES.golem;
  assert.equal(pickIntent(golem, 4).kind, "heavy");
  assert.equal(pickIntent(golem, 4).interruptible, true);

  const slug = ENEMIES.babosa;
  assert.equal(pickIntent(slug, 6).kind, "attack");
});

test("el HUD puede calcular el daño de una selección vacía sin romperse", () => {
  const state = createGameState(ENEMIES.babosa);
  const estimate = estimateWordDamage(state, "");
  assert.equal(estimate.total, 0);
  assert.equal(estimate.length, 0);
});

test("dos generadores con semillas distintas producen tableros distintos", () => {
  const first = createBoard(validator, createRng(1));
  const second = createBoard(validator, createRng(2));
  assert.notDeepEqual(first, second);
});

