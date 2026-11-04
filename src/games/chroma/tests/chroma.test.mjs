import test from "node:test";
import assert from "node:assert/strict";

import { LEVELS } from "../data/levels.ts";
import { SAVE_KEY } from "../config.ts";
import {
  applyMove,
  isBottleComplete,
  isSolved,
  legalMoves,
  simulateSolution,
  topRunLength,
  validateMove,
} from "../systems/MoveValidator.ts";
import { MoveHistory } from "../systems/MoveHistory.ts";
import { countColors, validateLevel } from "../systems/PuzzleValidator.ts";
import { solve } from "../systems/PuzzleSolver.ts";
import { generateLevel } from "../systems/PuzzleGenerator.ts";
import {
  applyLevelCompletion,
  defaultProgress,
  formatMoves,
  formatShortMoves,
  isLevelUnlocked,
  loadProgress,
  nextPlayableLevel,
  saveProgress,
  withSettings,
} from "../systems/ProgressionSystem.ts";

test("todos los niveles son válidos y su solución conocida funciona", () => {
  for (const level of LEVELS) {
    const validation = validateLevel(level);
    assert.equal(
      validation.ok,
      true,
      `${level.id}: ${validation.issues.join(" · ")}`,
    );

    const finalState = simulateSolution(level.bottles, level.solution ?? []);
    assert.ok(finalState, `${level.id}: la ruta de solución no es legal`);
    assert.equal(isSolved(finalState), true, `${level.id} no se resuelve`);
  }
});

test("el paquete cubre la progresión prevista", () => {
  assert.equal(LEVELS.length, 12);
  assert.equal(new Set(LEVELS.map((level) => level.id)).size, LEVELS.length);
  assert.deepEqual(
    LEVELS.map((level) => level.colorCount),
    [2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 8],
  );

  for (const level of LEVELS) {
    assert.equal(level.capacity, 4);
    assert.equal(level.emptyBottleCount, 2);
    assert.equal(level.bottles.length, level.colorCount + 2);
    assert.equal(isSolved(level.bottles), false);
    assert.ok((level.solution?.length ?? 0) > 0);

    const counts = countColors(level.bottles);
    assert.equal(counts.size, level.colorCount);
    for (const count of counts.values()) {
      assert.equal(count, level.capacity);
    }
  }
});

test("los movimientos válidos vierten el máximo posible", () => {
  const bottles = [
    { capacity: 4, segments: ["red", "blue", "blue"] },
    { capacity: 4, segments: ["blue"] },
    { capacity: 4, segments: [] },
    { capacity: 4, segments: ["green", "green", "green", "green"] },
  ];

  assert.equal(topRunLength(bottles[0]), 2);
  assert.equal(topRunLength(bottles[2]), 0);

  const toBlue = validateMove(bottles, 0, 1);
  assert.equal(toBlue.valid, true);
  assert.equal(toBlue.count, 2);

  const toEmpty = validateMove(bottles, 0, 2);
  assert.equal(toEmpty.valid, true);
  assert.equal(toEmpty.count, 2);

  const after = applyMove(bottles, 0, 1);
  assert.deepEqual(after[0].segments, ["red"]);
  assert.deepEqual(after[1].segments, ["blue", "blue", "blue"]);
  // El estado original no se muta.
  assert.deepEqual(bottles[0].segments, ["red", "blue", "blue"]);

  const limited = [
    { capacity: 4, segments: ["red", "blue", "blue", "blue"] },
    { capacity: 4, segments: ["blue", "blue", "blue"] },
  ];
  const spaceLimited = validateMove(limited, 0, 1);
  assert.equal(spaceLimited.valid, true);
  assert.equal(spaceLimited.count, 1);
});

test("los movimientos inválidos no alteran el estado", () => {
  const bottles = [
    { capacity: 4, segments: ["red", "blue"] },
    { capacity: 4, segments: ["green"] },
    { capacity: 4, segments: [] },
    { capacity: 4, segments: ["red", "red", "red", "red"] },
  ];

  assert.equal(validateMove(bottles, 0, 0).reason, "same-bottle");
  assert.equal(validateMove(bottles, 2, 0).reason, "empty-source");
  assert.equal(validateMove(bottles, 0, 3).reason, "full-destination");
  assert.equal(validateMove(bottles, 0, 1).reason, "color-mismatch");
  assert.equal(validateMove(bottles, -1, 0).reason, "invalid-index");
  assert.equal(validateMove(bottles, 0, 9).reason, "invalid-index");

  const before = JSON.stringify(bottles);
  const after = applyMove(bottles, 0, 1);
  assert.deepEqual(after, bottles);
  assert.equal(JSON.stringify(bottles), before);
});

test("la victoria exige botellas llenas de un único color", () => {
  assert.equal(isBottleComplete({ capacity: 4, segments: [] }), false);
  assert.equal(
    isBottleComplete({ capacity: 4, segments: ["a", "a", "a", "a"] }),
    true,
  );
  assert.equal(
    isBottleComplete({ capacity: 4, segments: ["a", "a"] }),
    false,
  );
  assert.equal(
    isBottleComplete({ capacity: 4, segments: ["a", "a", "b", "b"] }),
    false,
  );

  assert.equal(
    isSolved([
      { capacity: 4, segments: [] },
      { capacity: 4, segments: ["a", "a", "a", "a"] },
      { capacity: 4, segments: ["b", "b", "b", "b"] },
    ]),
    true,
  );
  assert.equal(
    isSolved([
      { capacity: 4, segments: ["a", "a"] },
      { capacity: 4, segments: ["b", "b", "b", "b"] },
    ]),
    false,
  );
});

test("los movimientos legales se enumeran sin duplicados incoherentes", () => {
  const bottles = [
    { capacity: 4, segments: ["red", "blue"] },
    { capacity: 4, segments: ["blue"] },
    { capacity: 4, segments: [] },
  ];
  const moves = legalMoves(bottles);
  assert.ok(moves.some((move) => move.from === 0 && move.to === 1));
  assert.ok(moves.some((move) => move.from === 0 && move.to === 2));
  assert.ok(moves.some((move) => move.from === 1 && move.to === 0));
  assert.ok(moves.some((move) => move.from === 1 && move.to === 2));
  for (const move of moves) {
    const result = validateMove(bottles, move.from, move.to);
    assert.equal(result.valid, true);
    assert.equal(result.count, move.count);
  }
});

test("el historial deshace y reinicia con exactitud", () => {
  const level = LEVELS[2];
  const history = new MoveHistory(level.bottles);
  assert.equal(history.moveCount, 0);
  assert.equal(history.canUndo, false);
  assert.deepEqual(history.bottles, level.bottles);

  const first = level.solution[0];
  history.apply(first);
  assert.equal(history.moveCount, 1);
  assert.equal(history.canUndo, true);
  assert.equal(history.lastMove?.from, first.from);

  const afterUndo = history.undo();
  assert.ok(afterUndo);
  assert.deepEqual(afterUndo, level.bottles);
  assert.equal(history.moveCount, 0);
  assert.equal(history.undo(), null);

  history.apply(level.solution[0]);
  history.apply(level.solution[1]);
  assert.equal(history.moveCount, 2);
  history.reset();
  assert.equal(history.moveCount, 0);
  assert.equal(history.canUndo, false);
  assert.deepEqual(history.bottles, level.bottles);
});

test("el progreso desbloquea, guarda la mejor marca y persiste ajustes", () => {
  const memory = new Map();
  const storage = {
    getItem: (key) => memory.get(key) ?? null,
    setItem: (key, value) => {
      memory.set(key, value);
    },
  };

  const base = defaultProgress();
  assert.equal(isLevelUnlocked(base, 0), true);
  assert.equal(isLevelUnlocked(base, 1), false);

  const completed = applyLevelCompletion(base, "chroma-01", 0, 12);
  assert.equal(completed.unlockedLevel, 1);
  assert.deepEqual(completed.completedLevels, ["chroma-01"]);
  assert.equal(completed.bestMoveCounts["chroma-01"], 12);

  const improved = applyLevelCompletion(completed, "chroma-01", 0, 9);
  assert.equal(improved.bestMoveCounts["chroma-01"], 9);
  assert.equal(improved.completedLevels.length, 1);

  const slower = applyLevelCompletion(improved, "chroma-01", 0, 30);
  assert.equal(slower.bestMoveCounts["chroma-01"], 9);

  const tuned = withSettings(improved, {
    colorPatternsEnabled: true,
    reducedMotion: true,
    soundEnabled: false,
  });
  saveProgress(tuned, storage);

  assert.ok(memory.has(SAVE_KEY));
  assert.deepEqual(loadProgress(storage), tuned);
  assert.equal(nextPlayableLevel(tuned, 12), 1);
  assert.equal(formatMoves(1), "1 movimiento");
  assert.equal(formatMoves(3), "3 movimientos");
  assert.equal(formatShortMoves(3), "3 mov.");
});

test("un guardado corrupto no rompe la progresión", () => {
  const storage = {
    getItem: () => "{esto no es json",
    setItem: () => {},
  };
  assert.deepEqual(loadProgress(storage), defaultProgress());
});

test("el solucionador encuentra salida y detecta un nivel ya resuelto", () => {
  const alreadySolved = [
    { capacity: 4, segments: ["a", "a", "a", "a"] },
    { capacity: 4, segments: [] },
  ];
  const trivial = solve(alreadySolved);
  assert.equal(trivial.solved, true);
  assert.deepEqual(trivial.moves, []);

  const level = LEVELS[LEVELS.length - 1];
  const result = solve(level.bottles, { maxNodes: 250_000 });
  assert.equal(result.solved, true);
  assert.ok(result.moves && result.moves.length > 0);
  const finalState = simulateSolution(level.bottles, result.moves);
  assert.ok(finalState);
  assert.equal(isSolved(finalState), true);
});

test("el generador es determinista y produce niveles resolubles", () => {
  const options = {
    colorCount: 3,
    emptyBottleCount: 2,
    capacity: 4,
    id: "chroma-test",
    name: "Prueba",
    difficulty: "easy",
    seed: 4242,
    attempts: 40,
  };

  const first = generateLevel(options);
  const second = generateLevel(options);
  assert.deepEqual(first.bottles, second.bottles);
  assert.deepEqual(first.solution, second.solution);
  assert.equal(validateLevel(first).ok, true);
  assert.equal(isSolved(first.bottles), false);
  assert.equal(first.colorCount, 3);
  assert.equal(first.bottles.length, 5);
});

test("el validador detecta niveles incoherentes", () => {
  const level = LEVELS[0];
  const wrongCounts = {
    ...level,
    bottles: level.bottles.map((bottle, index) =>
      index === 0
        ? { capacity: bottle.capacity, segments: bottle.segments.slice(1) }
        : bottle,
    ),
  };
  assert.equal(validateLevel(wrongCounts).ok, false);

  const badSolution = {
    ...level,
    solution: [{ from: 0, to: 0, count: 1 }],
  };
  assert.equal(validateLevel(badSolution).ok, false);

  const missingSolution = {
    ...level,
    solution: undefined,
  };
  assert.equal(validateLevel(missingSolution).ok, false);
});
