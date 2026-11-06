import test from "node:test";
import assert from "node:assert/strict";

import { LEVELS, LEVEL_COUNT } from "../data/levels.ts";
import { SAVE_KEY, STAR_MARGIN } from "../config.ts";
import {
  computeGameScore,
  formatScoreDetail,
} from "../../../lib/game-scores.ts";
import {
  canExit,
  canMove,
  doorAcceptsBlock,
  exitDoorFor,
  initialState,
  isSolved,
  moveBlock,
} from "../systems/BoardManager.ts";
import { validateLevel } from "../systems/BoardValidator.ts";
import { MoveHistory } from "../systems/MoveHistory.ts";
import { solve, verifySolution } from "../systems/PuzzleSolver.ts";
import {
  applyLevelCompletion,
  defaultProgress,
  getStars,
  isLevelUnlocked,
  loadProgress,
  nextPlayableLevel,
  saveProgress,
  withSettings,
} from "../systems/ProgressionSystem.ts";

test("todos los niveles son válidos y su solución conocida despeja el tablero", () => {
  for (const level of LEVELS) {
    const validation = validateLevel(level);
    assert.equal(
      validation.ok,
      true,
      `${level.id}: ${validation.issues.join(" · ")}`,
    );

    assert.ok(level.solution, `${level.id} no tiene ruta de validación`);
    assert.equal(
      verifySolution(level, level.solution ?? []),
      null,
      `${level.id} no se resuelve con su ruta`,
    );

    let state = initialState(level);
    for (const move of level.solution ?? []) {
      const next = move.exit
        ? state.filter((block) => block.id !== move.blockId)
        : moveBlock(level, state, move.blockId, move.dx, move.dy);
      assert.ok(next, `${level.id}: movimiento imposible ${move.blockId}`);
      state = next;
    }
    assert.equal(isSolved(state), true, `${level.id} deja bloques`);
  }
});

test("el paquete cubre diez niveles con dificultad creciente y sin ids repetidos", () => {
  assert.equal(LEVEL_COUNT, 10);
  assert.equal(new Set(LEVELS.map((level) => level.id)).size, LEVEL_COUNT);
  assert.deepEqual(
    LEVELS.map((level) => level.difficulty),
    [
      "tutorial",
      "tutorial",
      "easy",
      "easy",
      "normal",
      "normal",
      "hard",
      "hard",
      "expert",
      "expert",
    ],
  );
  assert.deepEqual(
    LEVELS.map((level) => level.width),
    [5, 5, 6, 6, 6, 7, 7, 8, 8, 8],
  );

  for (const level of LEVELS) {
    assert.ok(level.targetMoves > 0);
    assert.ok(level.blocks.length > 0);
    assert.ok(level.doors.length > 0);
  }
});

test("los bloques respetan bordes, colisiones y movimiento de una celda", () => {
  const level = LEVELS[0];
  const state = initialState(level);
  const a = state.find((block) => block.id === "a");
  assert.ok(a);

  assert.equal(canMove(level, state, "a", 1, 0), true);
  assert.equal(canMove(level, state, "a", 0, 1), true);
  assert.equal(canMove(level, state, "a", 1, 1), false);
  assert.equal(canMove(level, state, "a", 0, 0), false);

  const down = moveBlock(level, state, "a", 0, 1);
  assert.ok(down);
  assert.equal(canMove(level, down, "a", 0, 1), false);

  const atTop = moveBlock(level, state, "a", 0, -1);
  assert.ok(atTop);
  assert.equal(canMove(level, atTop, "a", 0, -1), false);
});

test("solo se sale por una puerta del mismo color, borde y ancho suficiente", () => {
  const level = LEVELS[0];
  const initial = initialState(level);
  assert.equal(canExit(level, initial, "a"), false);

  const down = moveBlock(level, initial, "a", 0, 1);
  assert.ok(down);
  const left = moveBlock(level, down, "a", -1, 0);
  assert.ok(left);

  const door = exitDoorFor(level, left, "a");
  assert.equal(door?.id, "d-left");
  assert.equal(canExit(level, left, "a"), true);

  const definition = level.blocks.find((block) => block.id === "a");
  assert.ok(definition);
  const narrow = { ...level.doors[0], length: 0.5 };
  assert.equal(doorAcceptsBlock(level, definition, [], narrow), false);

  const wrongColor = { ...level.doors[0], color: "sky" };
  assert.equal(
    doorAcceptsBlock(
      level,
      definition,
      [
        { x: 0, y: 2 },
        { x: 1, y: 2 },
      ],
      wrongColor,
    ),
    false,
  );

  const custom = {
    ...level,
    width: 4,
    height: 4,
    blocks: [
      {
        id: "wide",
        color: "coral",
        x: 2,
        y: 1,
        cells: [
          { x: 0, y: 0 },
          { x: 1, y: 0 },
        ],
      },
    ],
    doors: [
      {
        id: "narrow",
        color: "coral",
        side: "right",
        start: 1,
        length: 1,
      },
    ],
  };
  assert.equal(
    doorAcceptsBlock(
      custom,
      custom.blocks[0],
      [
        { x: 3, y: 1 },
        { x: 3, y: 2 },
      ],
      custom.doors[0],
    ),
    false,
  );
});

test("el historial deshace movimientos y salidas, y reinicia el nivel", () => {
  const level = LEVELS[0];
  const history = new MoveHistory(level);
  assert.equal(history.moveCount, 0);
  assert.equal(history.canUndo, false);

  assert.ok(history.applyStep(level, "a", 0, 1));
  assert.ok(history.applyStep(level, "a", -1, 0));
  assert.equal(history.moveCount, 2);
  assert.equal(history.canUndo, true);

  assert.ok(history.applyExit(level, "a"));
  assert.equal(history.blocks.length, 1);
  assert.equal(history.moveList.at(-1)?.exit, true);

  const afterUndo = history.undo();
  assert.ok(afterUndo);
  assert.equal(afterUndo.length, 2);
  assert.equal(history.moveCount, 2);

  history.reset();
  assert.equal(history.blocks.length, 2);
  assert.equal(history.moveCount, 0);
  assert.equal(history.canUndo, false);
});

test("el solucionador encuentra una salida en los niveles de tutorial", () => {
  for (const level of LEVELS.slice(0, 2)) {
    const result = solve(level, { maxNodes: 20_000 });
    assert.equal(result.solved, true, `${level.id} sin solución`);
    assert.ok(result.moves && result.moves.length > 0);
    assert.equal(verifySolution(level, result.moves ?? []), null);
  }
});

test("el progreso desbloquea niveles y conserva el mejor número de movimientos", () => {
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

  const completed = applyLevelCompletion(base, "exit-jam-01", 0, 8);
  assert.equal(completed.unlockedLevel, 1);
  assert.deepEqual(completed.completedLevels, ["exit-jam-01"]);
  assert.equal(completed.bestMoveCounts["exit-jam-01"], 8);

  const improved = applyLevelCompletion(completed, "exit-jam-01", 0, 6);
  assert.equal(improved.bestMoveCounts["exit-jam-01"], 6);
  assert.equal(improved.completedLevels.length, 1);

  const slower = applyLevelCompletion(improved, "exit-jam-01", 0, 20);
  assert.equal(slower.bestMoveCounts["exit-jam-01"], 6);

  const tuned = withSettings(improved, {
    soundEnabled: false,
    reducedMotion: true,
    showSymbols: false,
  });
  saveProgress(tuned, storage);

  assert.ok(memory.has(SAVE_KEY));
  assert.deepEqual(loadProgress(storage), tuned);
  assert.equal(nextPlayableLevel(tuned, LEVEL_COUNT), 1);
});

test("las estrellas premian el objetivo y el margen de eficiencia", () => {
  assert.equal(getStars(10, 10), 3);
  assert.equal(getStars(10, 9), 2);
  assert.equal(getStars(10 + STAR_MARGIN, 10), 2);
  assert.equal(getStars(11 + STAR_MARGIN, 10), 1);
});

test("un guardado corrupto no rompe la progresión", () => {
  const storage = {
    getItem: () => "{esto no es json",
    setItem: () => {},
  };
  assert.deepEqual(loadProgress(storage), defaultProgress());
});

test("la puntuación de EXIT JAM premia completar, los objetivos y menos movimientos", () => {
  const level = LEVELS[0];
  const other = LEVELS[1];

  const oneTarget = computeGameScore("exit-jam", {
    completedLevels: [level.id],
    bestMoveCounts: { [level.id]: level.targetMoves },
  });
  assert.ok(oneTarget);
  assert.equal(oneTarget.detail.completed, 1);
  assert.equal(oneTarget.detail.perfectLevels, 1);
  assert.equal(oneTarget.detail.totalMoves, level.targetMoves);

  const twoCompleted = computeGameScore("exit-jam", {
    completedLevels: [level.id, other.id],
    bestMoveCounts: {
      [level.id]: level.targetMoves + 50,
      [other.id]: other.targetMoves + 50,
    },
  });
  assert.ok(twoCompleted);
  assert.ok(twoCompleted.score > oneTarget.score);

  const oneSlow = computeGameScore("exit-jam", {
    completedLevels: [level.id],
    bestMoveCounts: { [level.id]: level.targetMoves + 1 },
  });
  assert.ok(oneSlow);
  assert.ok(oneTarget.score > oneSlow.score);
  assert.equal(oneSlow.detail.perfectLevels, 0);

  assert.equal(
    computeGameScore("exit-jam", {
      completedLevels: [],
      bestMoveCounts: { [level.id]: level.targetMoves },
    }),
    null,
  );

  const detail = formatScoreDetail(
    "exit-jam",
    oneTarget.detail,
    oneTarget.score,
  );
  assert.match(detail, /^1\/10 niveles/);
  assert.match(detail, /1 perfectos/);
  assert.match(detail, new RegExp(`${level.targetMoves} mov\\.$`));
});
