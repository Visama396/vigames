import {
  absoluteCells,
  cellKey,
  isInside,
} from "./BoardManager.ts";
import { verifySolution } from "./PuzzleSolver.ts";
import type {
  LevelDefinition,
  ValidationResult,
} from "../types/GameTypes.ts";

/** Valida la geometría, las puertas y (opcionalmente) la ruta conocida. */
export function validateLevel(level: LevelDefinition): ValidationResult {
  const issues: string[] = [];

  if (level.width <= 0 || level.height <= 0) {
    issues.push("El tablero debe tener dimensiones positivas.");
  }

  const ids = new Set<string>();
  const occupied = new Set<string>();

  for (const block of level.blocks) {
    if (ids.has(block.id)) issues.push(`Id de bloque duplicado: ${block.id}.`);
    ids.add(block.id);

    if (block.cells.length === 0) {
      issues.push(`El bloque ${block.id} no ocupa ninguna celda.`);
    }

    const cells = absoluteCells(block, block);
    if (!isInside(level, cells)) {
      issues.push(`El bloque ${block.id} se sale del tablero.`);
    }

    for (const cell of cells) {
      const key = cellKey(cell.x, cell.y);
      if (occupied.has(key)) {
        issues.push(`Dos bloques se solapan en ${key}.`);
      }
      occupied.add(key);
    }
  }

  for (const door of level.doors) {
    if (door.length <= 0) {
      issues.push(`La puerta ${door.id} no tiene longitud.`);
      continue;
    }
    const limit =
      door.side === "left" || door.side === "right"
        ? level.height
        : level.width;
    if (door.start < 0 || door.start + door.length > limit) {
      issues.push(`La puerta ${door.id} se sale del borde.`);
    }
    if (!level.blocks.some((block) => block.color === door.color)) {
      issues.push(`La puerta ${door.id} no tiene bloques de su color.`);
    }
  }

  for (const block of level.blocks) {
    if (!level.doors.some((door) => door.color === block.color)) {
      issues.push(`El bloque ${block.id} no tiene puerta compatible.`);
    }
  }

  if (level.solution) {
    const error = verifySolution(level, level.solution);
    if (error) issues.push(`Solución: ${error}`);
  }

  return { ok: issues.length === 0, issues };
}

/** Comprueba que una disposición concreta no solapa bloques. */
export function validateBlockState(
  level: LevelDefinition,
  state: ReadonlyArray<{ id: string; x: number; y: number }>,
): ValidationResult {
  const issues: string[] = [];
  const occupied = new Set<string>();

  for (const block of state) {
    const definition = level.blocks.find((item) => item.id === block.id);
    if (!definition) {
      issues.push(`Bloque desconocido: ${block.id}.`);
      continue;
    }
    const cells = absoluteCells(definition, block);
    if (!isInside(level, cells)) {
      issues.push(`El bloque ${block.id} se sale del tablero.`);
    }
    for (const cell of cells) {
      const key = cellKey(cell.x, cell.y);
      if (occupied.has(key)) {
        issues.push(`Dos bloques se solapan en ${key}.`);
      }
      occupied.add(key);
    }
  }

  return { ok: issues.length === 0, issues };
}
