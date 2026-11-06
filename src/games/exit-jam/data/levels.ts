/**
 * Paquete de niveles de EXIT JAM.
 *
 * Los niveles se construyeron desde una posición final despejada (cada bloque
 * junto a su puerta) y se retiraron los bloques hacia dentro con movimientos
 * inversos válidos. Así la ruta `solution` demuestra que cada nivel tiene
 * salida y sirve para validar el paquete en los tests.
 */
import type {
  BlockDefinition,
  Cell,
  LevelDefinition,
} from "../types/GameTypes.ts";

function horizontal(length: number): Cell[] {
  return Array.from({ length }, (_, x) => ({ x, y: 0 }));
}

function vertical(length: number): Cell[] {
  return Array.from({ length }, (_, y) => ({ x: 0, y }));
}

function square(size: number): Cell[] {
  const cells: Cell[] = [];
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) cells.push({ x, y });
  }
  return cells;
}

function lShape(): Cell[] {
  return [
    { x: 0, y: 0 },
    { x: 0, y: 1 },
    { x: 1, y: 1 },
  ];
}

function block(
  id: string,
  color: BlockDefinition["color"],
  x: number,
  y: number,
  cells: Cell[],
): BlockDefinition {
  return { id, color, x, y, cells };
}

export const LEVELS: LevelDefinition[] = [
  {
    id: "exit-jam-01",
    name: "Primera salida",
    width: 5,
    height: 5,
    difficulty: "tutorial",
    targetMoves: 6,
    blocks: [
      block("a", "coral", 1, 1, horizontal(2)),
      block("b", "coral", 2, 3, horizontal(2)),
    ],
    doors: [
      { id: "d-left", color: "coral", side: "left", start: 2, length: 1 },
      { id: "d-right", color: "coral", side: "right", start: 2, length: 1 },
    ],
    solution: [
      { blockId: "a", dx: 0, dy: 1 },
      { blockId: "a", dx: -1, dy: 0 },
      { blockId: "a", dx: 0, dy: 0, exit: true },
      { blockId: "b", dx: 0, dy: -1 },
      { blockId: "b", dx: 1, dy: 0 },
      { blockId: "b", dx: 0, dy: 0, exit: true },
    ],
  },
  {
    id: "exit-jam-02",
    name: "Dos colores",
    width: 5,
    height: 5,
    difficulty: "tutorial",
    targetMoves: 6,
    blocks: [
      block("a", "coral", 2, 1, vertical(2)),
      block("b", "sky", 1, 3, horizontal(2)),
    ],
    doors: [
      { id: "d-left", color: "coral", side: "left", start: 1, length: 2 },
      { id: "d-right", color: "sky", side: "right", start: 3, length: 1 },
    ],
    solution: [
      { blockId: "a", dx: -1, dy: 0 },
      { blockId: "a", dx: -1, dy: 0 },
      { blockId: "a", dx: 0, dy: 0, exit: true },
      { blockId: "b", dx: 1, dy: 0 },
      { blockId: "b", dx: 1, dy: 0 },
      { blockId: "b", dx: 0, dy: 0, exit: true },
    ],
  },
  {
    id: "exit-jam-03",
    name: "Tres caminos",
    width: 6,
    height: 6,
    difficulty: "easy",
    targetMoves: 9,
    blocks: [
      block("a", "coral", 2, 2, horizontal(3)),
      block("b", "sky", 3, 3, square(2)),
      block("c", "mint", 1, 2, vertical(2)),
    ],
    doors: [
      { id: "d-left", color: "coral", side: "left", start: 2, length: 1 },
      { id: "d-right", color: "sky", side: "right", start: 3, length: 2 },
      { id: "d-bottom", color: "mint", side: "down", start: 0, length: 1 },
    ],
    solution: [
      { blockId: "c", dx: 0, dy: 1 },
      { blockId: "c", dx: 0, dy: 1 },
      { blockId: "c", dx: -1, dy: 0 },
      { blockId: "c", dx: 0, dy: 0, exit: true },
      { blockId: "a", dx: -1, dy: 0 },
      { blockId: "a", dx: -1, dy: 0 },
      { blockId: "a", dx: 0, dy: 0, exit: true },
      { blockId: "b", dx: 1, dy: 0 },
      { blockId: "b", dx: 0, dy: 0, exit: true },
    ],
  },
  {
    id: "exit-jam-04",
    name: "El orden importa",
    width: 6,
    height: 6,
    difficulty: "easy",
    targetMoves: 12,
    blocks: [
      block("a", "coral", 2, 4, horizontal(2)),
      block("b", "sky", 3, 1, square(2)),
      block("c", "mint", 0, 2, vertical(2)),
    ],
    doors: [
      { id: "d-left", color: "coral", side: "left", start: 2, length: 1 },
      { id: "d-right", color: "sky", side: "right", start: 3, length: 2 },
      { id: "d-bottom", color: "mint", side: "down", start: 0, length: 1 },
    ],
    solution: [
      { blockId: "c", dx: 0, dy: 1 },
      { blockId: "c", dx: 0, dy: 1 },
      { blockId: "c", dx: 0, dy: 0, exit: true },
      { blockId: "a", dx: -1, dy: 0 },
      { blockId: "a", dx: -1, dy: 0 },
      { blockId: "a", dx: 0, dy: -1 },
      { blockId: "a", dx: 0, dy: -1 },
      { blockId: "a", dx: 0, dy: 0, exit: true },
      { blockId: "b", dx: 0, dy: 1 },
      { blockId: "b", dx: 0, dy: 1 },
      { blockId: "b", dx: 1, dy: 0 },
      { blockId: "b", dx: 0, dy: 0, exit: true },
    ],
  },
  {
    id: "exit-jam-05",
    name: "Cuatro compases",
    width: 6,
    height: 6,
    difficulty: "normal",
    targetMoves: 12,
    blocks: [
      block("a", "coral", 1, 2, lShape()),
      block("b", "sky", 4, 2, horizontal(2)),
      block("c", "mint", 2, 0, vertical(3)),
      block("d", "amber", 3, 3, horizontal(2)),
    ],
    doors: [
      { id: "d-left", color: "coral", side: "left", start: 2, length: 2 },
      { id: "d-top", color: "sky", side: "up", start: 4, length: 2 },
      { id: "d-bottom", color: "mint", side: "down", start: 2, length: 1 },
      { id: "d-right", color: "amber", side: "right", start: 4, length: 1 },
    ],
    solution: [
      { blockId: "a", dx: -1, dy: 0 },
      { blockId: "a", dx: 0, dy: 0, exit: true },
      { blockId: "c", dx: 0, dy: 1 },
      { blockId: "c", dx: 0, dy: 1 },
      { blockId: "c", dx: 0, dy: 1 },
      { blockId: "c", dx: 0, dy: 0, exit: true },
      { blockId: "b", dx: 0, dy: -1 },
      { blockId: "b", dx: 0, dy: -1 },
      { blockId: "b", dx: 0, dy: 0, exit: true },
      { blockId: "d", dx: 1, dy: 0 },
      { blockId: "d", dx: 0, dy: 1 },
      { blockId: "d", dx: 0, dy: 0, exit: true },
    ],
  },
  {
    id: "exit-jam-06",
    name: "Pasillo estrecho",
    width: 7,
    height: 7,
    difficulty: "normal",
    targetMoves: 11,
    blocks: [
      block("a", "coral", 0, 5, horizontal(2)),
      block("b", "sky", 4, 2, vertical(2)),
      block("c", "mint", 2, 3, square(2)),
      block("d", "amber", 3, 1, horizontal(3)),
    ],
    doors: [
      { id: "d-left", color: "coral", side: "left", start: 3, length: 1 },
      { id: "d-right", color: "sky", side: "right", start: 2, length: 2 },
      { id: "d-bottom", color: "mint", side: "down", start: 2, length: 2 },
      { id: "d-top", color: "amber", side: "up", start: 3, length: 3 },
    ],
    solution: [
      { blockId: "a", dx: 0, dy: -1 },
      { blockId: "a", dx: 0, dy: -1 },
      { blockId: "a", dx: 0, dy: 0, exit: true },
      { blockId: "c", dx: 0, dy: 1 },
      { blockId: "c", dx: 0, dy: 1 },
      { blockId: "c", dx: 0, dy: 0, exit: true },
      { blockId: "d", dx: 0, dy: -1 },
      { blockId: "d", dx: 0, dy: 0, exit: true },
      { blockId: "b", dx: 1, dy: 0 },
      { blockId: "b", dx: 1, dy: 0 },
      { blockId: "b", dx: 0, dy: 0, exit: true },
    ],
  },
  {
    id: "exit-jam-07",
    name: "Cinco llaves",
    width: 7,
    height: 7,
    difficulty: "hard",
    targetMoves: 13,
    blocks: [
      block("a", "coral", 0, 3, horizontal(3)),
      block("b", "sky", 4, 1, square(2)),
      block("c", "mint", 3, 4, vertical(3)),
      block("d", "amber", 3, 0, horizontal(2)),
      block("e", "violet", 1, 0, horizontal(2)),
    ],
    doors: [
      { id: "d-left", color: "coral", side: "left", start: 2, length: 1 },
      { id: "d-right", color: "sky", side: "right", start: 3, length: 2 },
      { id: "d-bottom", color: "mint", side: "down", start: 1, length: 1 },
      { id: "d-top", color: "amber", side: "up", start: 4, length: 2 },
      { id: "d-left-2", color: "violet", side: "left", start: 0, length: 1 },
    ],
    solution: [
      { blockId: "a", dx: 0, dy: -1 },
      { blockId: "a", dx: 0, dy: 0, exit: true },
      { blockId: "c", dx: -1, dy: 0 },
      { blockId: "c", dx: -1, dy: 0 },
      { blockId: "c", dx: 0, dy: 0, exit: true },
      { blockId: "b", dx: 0, dy: 1 },
      { blockId: "b", dx: 0, dy: 1 },
      { blockId: "b", dx: 1, dy: 0 },
      { blockId: "b", dx: 0, dy: 0, exit: true },
      { blockId: "d", dx: 1, dy: 0 },
      { blockId: "d", dx: 0, dy: 0, exit: true },
      { blockId: "e", dx: -1, dy: 0 },
      { blockId: "e", dx: 0, dy: 0, exit: true },
    ],
  },
  {
    id: "exit-jam-08",
    name: "Sala de máquinas",
    width: 8,
    height: 8,
    difficulty: "hard",
    targetMoves: 18,
    blocks: [
      block("a", "coral", 3, 2, horizontal(2)),
      block("b", "sky", 5, 2, square(2)),
      block("c", "mint", 0, 3, vertical(2)),
      block("d", "amber", 3, 1, horizontal(3)),
      block("e", "violet", 6, 5, vertical(3)),
      block("f", "rose", 2, 5, horizontal(2)),
    ],
    doors: [
      { id: "d-left", color: "coral", side: "left", start: 2, length: 1 },
      { id: "d-right", color: "sky", side: "right", start: 2, length: 2 },
      { id: "d-bottom", color: "mint", side: "down", start: 0, length: 1 },
      { id: "d-top", color: "amber", side: "up", start: 3, length: 3 },
      { id: "d-bottom-2", color: "violet", side: "down", start: 7, length: 1 },
      { id: "d-left-2", color: "rose", side: "left", start: 4, length: 1 },
    ],
    solution: [
      { blockId: "a", dx: -1, dy: 0 },
      { blockId: "a", dx: -1, dy: 0 },
      { blockId: "a", dx: -1, dy: 0 },
      { blockId: "a", dx: 0, dy: 0, exit: true },
      { blockId: "b", dx: 1, dy: 0 },
      { blockId: "b", dx: 0, dy: 0, exit: true },
      { blockId: "c", dx: 0, dy: 1 },
      { blockId: "c", dx: 0, dy: 1 },
      { blockId: "c", dx: 0, dy: 1 },
      { blockId: "c", dx: 0, dy: 0, exit: true },
      { blockId: "d", dx: 0, dy: -1 },
      { blockId: "d", dx: 0, dy: 0, exit: true },
      { blockId: "e", dx: 1, dy: 0 },
      { blockId: "e", dx: 0, dy: 0, exit: true },
      { blockId: "f", dx: 0, dy: -1 },
      { blockId: "f", dx: -1, dy: 0 },
      { blockId: "f", dx: -1, dy: 0 },
      { blockId: "f", dx: 0, dy: 0, exit: true },
    ],
  },
  {
    id: "exit-jam-09",
    name: "Engranaje",
    width: 8,
    height: 8,
    difficulty: "expert",
    targetMoves: 17,
    blocks: [
      block("a", "coral", 2, 4, [
        { x: 0, y: 0 },
        { x: 0, y: 1 },
        { x: 1, y: 1 },
        { x: 2, y: 1 },
      ]),
      block("b", "sky", 3, 2, horizontal(4)),
      block("c", "mint", 5, 5, square(2)),
      block("d", "amber", 1, 3, vertical(3)),
      block("e", "violet", 0, 2, horizontal(2)),
      block("f", "rose", 7, 2, vertical(2)),
    ],
    doors: [
      { id: "d-left", color: "coral", side: "left", start: 3, length: 2 },
      { id: "d-top", color: "sky", side: "up", start: 3, length: 4 },
      { id: "d-right", color: "mint", side: "right", start: 5, length: 2 },
      { id: "d-bottom", color: "amber", side: "down", start: 1, length: 1 },
      { id: "d-left-2", color: "violet", side: "left", start: 0, length: 1 },
      { id: "d-right-2", color: "rose", side: "right", start: 1, length: 2 },
    ],
    solution: [
      { blockId: "e", dx: 0, dy: -1 },
      { blockId: "e", dx: 0, dy: -1 },
      { blockId: "e", dx: 0, dy: 0, exit: true },
      { blockId: "b", dx: 0, dy: -1 },
      { blockId: "b", dx: 0, dy: -1 },
      { blockId: "b", dx: 0, dy: 0, exit: true },
      { blockId: "d", dx: 0, dy: 1 },
      { blockId: "d", dx: 0, dy: 1 },
      { blockId: "d", dx: 0, dy: 0, exit: true },
      { blockId: "a", dx: 0, dy: -1 },
      { blockId: "a", dx: -1, dy: 0 },
      { blockId: "a", dx: -1, dy: 0 },
      { blockId: "a", dx: 0, dy: 0, exit: true },
      { blockId: "c", dx: 1, dy: 0 },
      { blockId: "c", dx: 0, dy: 0, exit: true },
      { blockId: "f", dx: 0, dy: -1 },
      { blockId: "f", dx: 0, dy: 0, exit: true },
    ],
  },
  {
    id: "exit-jam-10",
    name: "La gran jam",
    width: 8,
    height: 8,
    difficulty: "expert",
    targetMoves: 23,
    blocks: [
      block("a", "coral", 2, 2, horizontal(2)),
      block("b", "sky", 4, 2, square(2)),
      block("c", "mint", 0, 3, vertical(2)),
      block("d", "amber", 2, 1, horizontal(3)),
      block("e", "violet", 5, 5, vertical(3)),
      block("f", "rose", 2, 5, lShape()),
      block("g", "coral", 2, 3, horizontal(2)),
    ],
    doors: [
      { id: "d-left", color: "coral", side: "left", start: 1, length: 1 },
      { id: "d-right", color: "sky", side: "right", start: 1, length: 2 },
      { id: "d-bottom", color: "mint", side: "down", start: 0, length: 1 },
      { id: "d-top", color: "amber", side: "up", start: 2, length: 3 },
      { id: "d-bottom-2", color: "violet", side: "down", start: 6, length: 1 },
      { id: "d-left-2", color: "rose", side: "left", start: 4, length: 2 },
      { id: "d-left-3", color: "coral", side: "left", start: 3, length: 1 },
    ],
    solution: [
      { blockId: "c", dx: 0, dy: 1 },
      { blockId: "c", dx: 0, dy: 1 },
      { blockId: "c", dx: 0, dy: 1 },
      { blockId: "c", dx: 0, dy: 0, exit: true },
      { blockId: "a", dx: -1, dy: 0 },
      { blockId: "a", dx: -1, dy: 0 },
      { blockId: "a", dx: 0, dy: -1 },
      { blockId: "a", dx: 0, dy: 0, exit: true },
      { blockId: "g", dx: -1, dy: 0 },
      { blockId: "g", dx: -1, dy: 0 },
      { blockId: "g", dx: 0, dy: 0, exit: true },
      { blockId: "b", dx: 1, dy: 0 },
      { blockId: "b", dx: 1, dy: 0 },
      { blockId: "b", dx: 0, dy: -1 },
      { blockId: "b", dx: 0, dy: 0, exit: true },
      { blockId: "d", dx: 0, dy: -1 },
      { blockId: "d", dx: 0, dy: 0, exit: true },
      { blockId: "e", dx: 1, dy: 0 },
      { blockId: "e", dx: 0, dy: 0, exit: true },
      { blockId: "f", dx: 0, dy: -1 },
      { blockId: "f", dx: -1, dy: 0 },
      { blockId: "f", dx: -1, dy: 0 },
      { blockId: "f", dx: 0, dy: 0, exit: true },
    ],
  },
];

export const LEVEL_COUNT = LEVELS.length;

export function getLevel(index: number): LevelDefinition {
  return LEVELS[Math.max(0, Math.min(LEVELS.length - 1, index))]!;
}

export function getLevelById(id: string): LevelDefinition | null {
  return LEVELS.find((level) => level.id === id) ?? null;
}

export function getLevelIndex(id: string): number {
  return LEVELS.findIndex((level) => level.id === id);
}
