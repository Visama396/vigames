import test from "node:test";
import assert from "node:assert/strict";

import { LEVELS } from "../data/levels.ts";
import { SAVE_KEY } from "../config.ts";
import {
  canPlace,
  countByRegion,
  findConflicts,
  isSolved,
} from "../systems/ConstraintChecker.ts";
import {
  isRegionConnected,
  solutionSet,
  validateConfiguration,
  validateLevel,
} from "../systems/BoardValidator.ts";
import { solve } from "../systems/PuzzleSolver.ts";
import { MoveHistory } from "../systems/MoveHistory.ts";
import {
  applyLevelCompletion,
  defaultProgress,
  formatTime,
  isLevelUnlocked,
  loadProgress,
  nextPlayableLevel,
  saveProgress,
  withSettings,
} from "../systems/ProgressionSystem.ts";
import { generateSolutionColumns, growRegions } from "../systems/PuzzleGenerator.ts";
import { createRng } from "../systems/random.ts";
import { cellId } from "../types/puzzle.ts";

test("todos los niveles son válidos y tienen solución única", () => {
  for (const level of LEVELS) {
    const validation = validateLevel(level, { requireUnique: true });
    assert.equal(
      validation.ok,
      true,
      `${level.id}: ${validation.issues.join(" · ")}`,
    );
  }
});

test("el paquete cubre los tamaños y dificultades previstos", () => {
  assert.equal(LEVELS.length, 10);
  assert.equal(new Set(LEVELS.map((level) => level.id)).size, LEVELS.length);
  assert.deepEqual(
    LEVELS.map((level) => level.size),
    [4, 5, 5, 5, 5, 6, 6, 7, 7, 8],
  );

  for (const level of LEVELS) {
    assert.equal(level.cells.length, level.size);
    for (let region = 0; region < level.size; region += 1) {
      assert.equal(
        isRegionConnected(level.size, region, level.cells),
        true,
        `${level.id}: la región ${region} no es conexa`,
      );
    }
  }
});

test("la solución conocida resuelve cada nivel", () => {
  for (const level of LEVELS) {
    const cats = solutionSet(level);
    assert.equal(isSolved(level, cats), true, `${level.id} no se resuelve`);
    assert.equal(validateConfiguration(level, cats).ok, true);
    assert.deepEqual(
      countByRegion(level, cats),
      Array.from({ length: level.size }, () => 1),
    );

    const solverResult = solve(level, { maxSolutions: 2 });
    assert.equal(solverResult.count, 1);
    assert.deepEqual(
      [...(solverResult.solutions[0] ?? [])].sort((a, b) => a - b),
      [...level.solution].sort((a, b) => a - b),
    );
  }
});

test("los conflictos se detectan sin marcar jugadas válidas", () => {
  const level = LEVELS[0];

  const row = findConflicts(level, new Set([cellId(4, 0, 0), cellId(4, 0, 1)]));
  assert.deepEqual(row.rowConflicts, [0]);
  assert.equal(row.adjacentPairs.length, 1);

  const column = findConflicts(level, new Set([cellId(4, 0, 0), cellId(4, 1, 0)]));
  assert.deepEqual(column.columnConflicts, [0]);
  assert.equal(column.adjacentPairs.length, 1);

  // (0,0) y (1,2) comparten región, pero no fila, columna ni contacto.
  const region = findConflicts(level, new Set([cellId(4, 0, 0), cellId(4, 1, 2)]));
  assert.deepEqual(region.regionConflicts, [0]);
  assert.deepEqual(region.rowConflicts, []);
  assert.deepEqual(region.columnConflicts, []);
  assert.equal(region.adjacentPairs.length, 0);

  // (0,0) y (1,1) solo se tocan en diagonal.
  const diagonal = findConflicts(level, new Set([cellId(4, 0, 0), cellId(4, 1, 1)]));
  assert.equal(diagonal.adjacentPairs.length, 1);
  assert.deepEqual(diagonal.rowConflicts, []);
  assert.deepEqual(diagonal.columnConflicts, []);
  assert.deepEqual(diagonal.regionConflicts, []);

  const valid = findConflicts(level, new Set([cellId(4, 0, 0)]));
  assert.equal(valid.hasConflicts, false);
});

test("el modo estricto solo bloquea reglas incumplidas en ese momento", () => {
  const level = LEVELS[0];
  const empty = new Set();

  assert.equal(canPlace(level, empty, 0, 0).allowed, true);

  const sameRow = canPlace(level, new Set([cellId(4, 0, 0)]), 0, 2);
  assert.equal(sameRow.allowed, false);
  assert.ok(sameRow.reasons.includes("row"));
  assert.ok(sameRow.reasons.includes("region"));
  assert.equal(sameRow.reasons.includes("adjacent"), false);

  const diagonal = canPlace(level, new Set([cellId(4, 0, 0)]), 1, 1);
  assert.equal(diagonal.allowed, false);
  assert.deepEqual(diagonal.reasons, ["adjacent"]);

  // La última celda de la solución es válida con el resto ya colocado: el
  // modo estricto no bloquea por "lo que podría pasar después".
  const solution = solutionSet(level);
  const lastId = level.solution[level.size - 1];
  const stillValid = canPlace(
    level,
    new Set([...solution].filter((id) => id !== lastId)),
    Math.floor(lastId / level.size),
    lastId % level.size,
  );
  assert.equal(stillValid.allowed, true);
});

test("el historial deshace, rehace y reinicia sin perder coherencia", () => {
  const history = new MoveHistory();
  assert.equal(history.moves, 0);
  assert.equal(history.canUndo, false);

  history.toggle(0);
  history.toggle(1);
  assert.equal(history.has(0), true);
  assert.equal(history.has(1), true);
  assert.equal(history.moves, 2);
  assert.equal(history.canUndo, true);

  const afterUndo = history.undo();
  assert.deepEqual([...(afterUndo ?? [])], [0]);
  assert.equal(history.moves, 1);

  history.undo();
  assert.equal(history.cats.size, 0);
  assert.equal(history.undo(), null);

  history.toggle(3);
  history.reset();
  assert.equal(history.cats.size, 0);
  assert.equal(history.moves, 0);
  assert.equal(history.canUndo, false);
});

test("el progreso desbloquea, guarda el mejor tiempo y persiste ajustes", () => {
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

  const completed = applyLevelCompletion(base, "purrgrid-01", 0, 1234);
  assert.equal(completed.unlockedLevel, 1);
  assert.deepEqual(completed.completedLevels, ["purrgrid-01"]);
  assert.equal(completed.bestTimes["purrgrid-01"], 1234);

  const improved = applyLevelCompletion(completed, "purrgrid-01", 0, 900);
  assert.equal(improved.bestTimes["purrgrid-01"], 900);
  assert.equal(improved.completedLevels.length, 1);

  const slower = applyLevelCompletion(improved, "purrgrid-01", 0, 5000);
  assert.equal(slower.bestTimes["purrgrid-01"], 900);

  const tuned = withSettings(improved, {
    strictMode: true,
    reducedMotion: true,
    soundEnabled: false,
  });
  saveProgress(tuned, storage);

  assert.ok(memory.has(SAVE_KEY));
  assert.deepEqual(loadProgress(storage), tuned);
  assert.equal(nextPlayableLevel(tuned, 10), 1);
  assert.equal(formatTime(65_000), "01:05");
});

test("un guardado corrupto no rompe la progresión", () => {
  const storage = {
    getItem: () => "{esto no es json",
    setItem: () => {},
  };
  assert.deepEqual(loadProgress(storage), defaultProgress());
});

test("el generador de soluciones y regiones es determinista", () => {
  const columns = generateSolutionColumns(8, createRng(4242));
  assert.ok(columns);
  assert.equal(new Set(columns).size, 8);
  for (let row = 1; row < columns.length; row += 1) {
    assert.ok(Math.abs(columns[row] - columns[row - 1]) >= 2);
  }

  assert.deepEqual(
    generateSolutionColumns(8, createRng(4242)),
    columns,
  );

  const regions = growRegions(8, columns, createRng(99));
  assert.ok(regions);
  const ids = new Set();
  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      const region = regions[row]?.[col];
      assert.notEqual(region, -1);
      ids.add(region ?? -1);
    }
  }
  assert.equal(ids.size, 8);
});
