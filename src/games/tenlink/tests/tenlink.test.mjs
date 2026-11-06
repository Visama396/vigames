import test from "node:test";
import assert from "node:assert/strict";

import {
  BOARD_SHAPE,
  INITIAL_NUMBERS,
  REFILL_NUMBERS,
  SAVE_KEY,
} from "../config.ts";
import {
  computeGameScore,
  formatScoreDetail,
} from "../../../lib/game-scores.ts";
import {
  applyPair,
  collapseRows,
  emptyCells,
  isCleared,
  remainingCells,
} from "../systems/BoardManager.ts";
import {
  createEmptyBoard,
  fillRandomCells,
  generateBoard,
} from "../systems/BoardGenerator.ts";
import {
  allValidPairs,
  checkPair,
  hasValidPair,
  positionsConnected,
  validPartners,
} from "../systems/PairValidator.ts";
import {
  applyRunResult,
  defaultProgress,
  formatTime,
  loadProgress,
  saveProgress,
  withSettings,
} from "../systems/ProgressionSystem.ts";

function customShape(cells) {
  return {
    width: cells[0].length,
    height: cells.length,
  };
}

function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

test("el tablero inicial es 9×9 con exactamente 35 números y al menos una pareja", () => {
  for (let seed = 1; seed <= 25; seed += 1) {
    const board = generateBoard(
      BOARD_SHAPE,
      INITIAL_NUMBERS,
      mulberry32(seed),
    );

    assert.equal(board.length, 9);
    assert.equal(board[0].length, 9);
    assert.equal(remainingCells(board), INITIAL_NUMBERS);
    assert.ok(remainingCells(board) < 81, "el tablero no debe empezar lleno");
    assert.equal(hasValidPair(BOARD_SHAPE, board), true);

    for (const row of board) {
      for (const value of row) {
        if (value === null) continue;
        assert.ok(Number.isInteger(value));
        assert.ok(value >= 1 && value <= 9);
      }
    }
  }
});

test("rellenar números respeta el límite de 35 y no muta el tablero original", () => {
  const board = generateBoard(BOARD_SHAPE, 70, mulberry32(7));
  assert.equal(remainingCells(board), 70);
  assert.equal(emptyCells(board).length, 11);

  const next = fillRandomCells(
    BOARD_SHAPE,
    board,
    REFILL_NUMBERS,
    mulberry32(8),
  );

  assert.equal(remainingCells(next), 81);
  assert.equal(remainingCells(board), 70);
  assert.equal(hasValidPair(BOARD_SHAPE, next), true);
});

test("si no quedan huecos, pedir más números devuelve el mismo tablero", () => {
  const full = generateBoard(BOARD_SHAPE, 81, mulberry32(11));
  assert.equal(remainingCells(full), 81);

  const again = fillRandomCells(
    BOARD_SHAPE,
    full,
    REFILL_NUMBERS,
    mulberry32(12),
  );

  assert.equal(remainingCells(again), 81);
  assert.deepEqual(again, full);
  assert.equal(isCleared(createEmptyBoard(BOARD_SHAPE)), true);
});

test("las cinco parejas que suman 10 son válidas si están conectadas", () => {
  const cells = [[1, 9, 2, 8, 3, 7, 4, 6, 5, 5]];
  const shape = customShape(cells);

  const pairs = [
    [0, 0, 0, 1],
    [0, 2, 0, 3],
    [0, 4, 0, 5],
    [0, 6, 0, 7],
    [0, 8, 0, 9],
  ];

  for (const [rowA, colA, rowB, colB] of pairs) {
    const check = checkPair(
      shape,
      cells,
      { row: rowA, col: colA },
      { row: rowB, col: colB },
    );
    assert.equal(check.valid, true);
    assert.equal(check.sum, 10);
  }
});

test("dos números que no suman 10 nunca se eliminan", () => {
  const cells = [[1, 8]];
  const shape = customShape(cells);
  const check = checkPair(
    shape,
    cells,
    { row: 0, col: 0 },
    { row: 0, col: 1 },
  );

  assert.equal(check.valid, false);
  assert.equal(check.reason, "sum");
  assert.equal(
    applyPair(shape, cells, { row: 0, col: 0 }, { row: 0, col: 1 }),
    null,
  );
});

test("se detectan las ocho direcciones de vecindad", () => {
  const cells = [
    [5, 5, 5],
    [5, 5, 5],
    [5, 5, 5],
  ];
  const shape = customShape(cells);
  const center = { row: 1, col: 1 };
  const partners = validPartners(shape, cells, center);
  assert.equal(partners.length, 8);

  const directions = [
    [0, 0],
    [0, 1],
    [0, 2],
    [1, 0],
    [1, 2],
    [2, 0],
    [2, 1],
    [2, 2],
  ];
  for (const [row, col] of directions) {
    assert.equal(
      checkPair(shape, cells, center, { row, col }).valid,
      true,
      `falta la dirección ${row},${col}`,
    );
  }
});

test("la continuidad conecta solo el final de una fila con el inicio de la siguiente", () => {
  const cells = [
    [1, 2, 3, 9],
    [1, 1, 4, 5],
    [6, 7, 8, 9],
  ];
  const shape = customShape(cells);

  assert.equal(
    positionsConnected(shape, { row: 0, col: 3 }, { row: 1, col: 0 }),
    true,
  );
  assert.equal(
    checkPair(shape, cells, { row: 0, col: 3 }, { row: 1, col: 0 }).valid,
    true,
  );

  const notConnected = checkPair(
    shape,
    cells,
    { row: 0, col: 3 },
    { row: 1, col: 1 },
  );
  assert.equal(notConnected.valid, false);
  assert.equal(notConnected.reason, "not-connected");

  assert.equal(
    positionsConnected(shape, { row: 0, col: 3 }, { row: 2, col: 0 }),
    false,
  );
});

test("no se puede saltar por encima de números intermedios", () => {
  const cells = [[1, 5, 9]];
  const shape = customShape(cells);
  const check = checkPair(
    shape,
    cells,
    { row: 0, col: 0 },
    { row: 0, col: 2 },
  );

  assert.equal(check.valid, false);
  assert.equal(check.reason, "not-connected");
});

test("una casilla vacía no se puede seleccionar ni usar para saltar", () => {
  const cells = [[1, null, 9]];
  const shape = customShape(cells);
  const check = checkPair(
    shape,
    cells,
    { row: 0, col: 0 },
    { row: 0, col: 1 },
  );

  assert.equal(check.valid, false);
  assert.equal(check.reason, "empty");
  assert.equal(validPartners(shape, cells, { row: 0, col: 1 }).length, 0);
  assert.equal(allValidPairs(shape, cells).length, 0);
  assert.equal(hasValidPair(shape, cells), false);
});

test("las filas vacías desaparecen y las de abajo suben sin dejar huecos", () => {
  const board = [
    [1, 2, 3],
    [null, null, null],
    [4, 5, 6],
    [null, null, null],
    [7, 8, 9],
  ];

  const result = collapseRows(board);

  assert.deepEqual(result.removedRows, [1, 3]);
  assert.deepEqual(result.board, [
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9],
    [null, null, null],
    [null, null, null],
  ]);
});

test("las filas vacías del final no cuentan como filas eliminadas", () => {
  const board = [
    [1, 2, 3],
    [4, 5, 6],
    [null, null, null],
  ];

  const result = collapseRows(board);

  assert.deepEqual(result.removedRows, []);
  assert.deepEqual(result.board, board);
});

test("una fila con algún número no se compacta ni pierde sus huecos", () => {
  const board = [
    [1, null, 3],
    [null, null, null],
    [4, null, 6],
  ];

  const result = collapseRows(board);

  assert.deepEqual(result.removedRows, [1]);
  assert.deepEqual(result.board, [
    [1, null, 3],
    [4, null, 6],
    [null, null, null],
  ]);
});

test("al subir una fila pueden quedar conectados números que antes no lo estaban", () => {
  const shape = { width: 3, height: 3 };
  const board = [
    [1, null, null],
    [null, null, null],
    [9, null, null],
  ];

  assert.equal(
    positionsConnected(shape, { row: 0, col: 0 }, { row: 2, col: 0 }),
    false,
  );

  const collapsed = collapseRows(board).board;
  assert.deepEqual(collapsed[1], [9, null, null]);
  assert.equal(
    checkPair(shape, collapsed, { row: 0, col: 0 }, { row: 1, col: 0 }).valid,
    true,
  );
});

test("aplicar una pareja elimina sus números y compacta la fila vacía", () => {
  const shape = { width: 3, height: 3 };
  const board = [
    [1, 2, 3],
    [9, null, null],
    [5, 6, 7],
  ];

  const next = applyPair(
    shape,
    board,
    { row: 0, col: 0 },
    { row: 1, col: 0 },
  );

  assert.deepEqual(next, [
    [null, 2, 3],
    [5, 6, 7],
    [null, null, null],
  ]);
});

test("se detecta un tablero sin parejas válidas", () => {
  const cells = [
    [1, 2],
    [3, 4],
  ];
  const shape = customShape(cells);

  assert.equal(hasValidPair(shape, cells), false);
  assert.equal(allValidPairs(shape, cells).length, 0);
});

test("el progreso guarda la mejor partida y desempata por tiempo", () => {
  const base = defaultProgress();
  assert.equal(base.bestPairs, 0);
  assert.equal(base.bestTimeMs, null);
  assert.equal(base.runs, 0);

  let progress = applyRunResult(base, 5, 60_000);
  assert.equal(progress.bestPairs, 5);
  assert.equal(progress.bestTimeMs, 60_000);
  assert.equal(progress.runs, 1);

  progress = applyRunResult(progress, 3, 10_000);
  assert.equal(progress.bestPairs, 5);
  assert.equal(progress.bestTimeMs, 60_000);
  assert.equal(progress.runs, 2);

  progress = applyRunResult(progress, 5, 50_000);
  assert.equal(progress.bestPairs, 5);
  assert.equal(progress.bestTimeMs, 50_000);
  assert.equal(progress.runs, 3);

  progress = applyRunResult(progress, 5, 70_000);
  assert.equal(progress.bestPairs, 5);
  assert.equal(progress.bestTimeMs, 50_000);
  assert.equal(progress.runs, 4);

  progress = applyRunResult(progress, 0, 1_000);
  assert.equal(progress.bestPairs, 5);
  assert.equal(progress.bestTimeMs, 50_000);
  assert.equal(progress.runs, 5);

  const tuned = withSettings(progress, {
    soundEnabled: false,
    reducedMotion: true,
  });
  const memory = new Map();
  const storage = {
    getItem: (key) => memory.get(key) ?? null,
    setItem: (key, value) => {
      memory.set(key, value);
    },
  };

  saveProgress(tuned, storage);
  assert.ok(memory.has(SAVE_KEY));
  assert.deepEqual(loadProgress(storage), tuned);
  assert.equal(formatTime(65_000), "01:05");
});

test("un guardado antiguo o corrupto no rompe la progresión", () => {
  const oldStorage = {
    getItem: () =>
      JSON.stringify({
        completedLevels: ["tenlink-01"],
        bestHintCounts: { "tenlink-01": 0 },
        settings: { soundEnabled: false },
      }),
    setItem: () => {},
  };
  const migrated = loadProgress(oldStorage);
  assert.equal(migrated.bestPairs, 0);
  assert.equal(migrated.bestTimeMs, null);
  assert.equal(migrated.runs, 0);
  assert.equal(migrated.settings.soundEnabled, false);

  const corruptStorage = {
    getItem: () => "{esto no es json",
    setItem: () => {},
  };
  assert.deepEqual(loadProgress(corruptStorage), defaultProgress());
});

test("la puntuación de TENLINK premia más parejas y, a igualdad, menos tiempo", () => {
  const record = computeGameScore("tenlink", {
    bestPairs: 10,
    bestTimeMs: 60_000,
    runs: 3,
  });
  assert.ok(record);
  assert.equal(record.detail.bestPairs, 10);
  assert.equal(record.detail.bestTimeMs, 60_000);
  assert.equal(record.detail.runs, 3);

  const morePairs = computeGameScore("tenlink", {
    bestPairs: 11,
    bestTimeMs: 120_000,
    runs: 3,
  });
  assert.ok(morePairs);
  assert.ok(morePairs.score > record.score);

  const faster = computeGameScore("tenlink", {
    bestPairs: 10,
    bestTimeMs: 30_000,
    runs: 3,
  });
  assert.ok(faster);
  assert.ok(faster.score > record.score);

  assert.equal(
    computeGameScore("tenlink", { bestPairs: 0, bestTimeMs: 1_000 }),
    null,
  );
  assert.equal(computeGameScore("tenlink", {}), null);

  assert.equal(
    formatScoreDetail("tenlink", record.detail, record.score),
    "10 parejas · 01:00 · 3 partidas",
  );
});
