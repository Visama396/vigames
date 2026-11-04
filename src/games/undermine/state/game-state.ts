import {
  BOARD,
  CELL_HEALTH,
  COAL_BUY_AMOUNT,
  COAL_BUY_COST,
  COMPONENTS_GOAL,
  DEMOLISH_REFUND,
  DRILL_MINING_POWER,
  EXPAND_COST,
  EXPANSION_CELL_COST,
  GENERATOR_FUEL_SECONDS,
  GLOBAL_COAL_CAPACITY,
  INITIAL_PICKAXE_LEVEL,
  INITIAL_PICKAXE_POWER,
  INITIAL_STATE,
  INVENTORY_CAPACITY,
  MACHINE_DEFS,
  MACHINE_RECIPE_OPTIONS,
  PICKAXE_UPGRADE_BASE_COST,
  RECIPES,
  RESOURCES,
  TRANSFER_RATE,
  isMachineType,
} from "../config";
import type {
  ActionResult,
  Cell,
  CellResource,
  CellState,
  Connection,
  GameState,
  MachineState,
  MachineType,
  ResourceId,
} from "../types";

function createCell(
  x: number,
  y: number,
  owned: boolean,
  resource: CellResource = null,
): CellState {
  return {
    x,
    y,
    resource,
    maxHealth: CELL_HEALTH,
    health: CELL_HEALTH,
    mined: false,
    owned,
  };
}

function randomCellResource(): CellResource {
  if (Math.random() >= 0.3) return null;
  return Math.random() < 0.5 ? "coal" : "iron_ore";
}

function createInitialCells(cols: number, rows: number): CellState[][] {
  const cells: CellState[][] = [];
  for (let y = 0; y < rows; y++) {
    cells[y] = [];
    for (let x = 0; x < cols; x++) {
      cells[y][x] = createCell(x, y, false);
    }
  }
  // Initial 2x2 layout: 1 coal, 1 iron, 2 empty
  if (cols >= 2 && rows >= 2) {
    cells[0][0] = createCell(0, 0, true, "coal");
    cells[0][1] = createCell(1, 0, true, "iron_ore");
    cells[1][0] = createCell(0, 1, true);
    cells[1][1] = createCell(1, 1, true);
  }
  return cells;
}

export function createInitialState(): GameState {
  return {
    version: 1,
    credits: INITIAL_STATE.credits,
    elapsedSeconds: 0,
    machines: [],
    connections: [],
    inventory: { coal: INITIAL_STATE.coal },
    componentsProduced: 0,
    deepDrillUnlocked: false,
    nextMachineId: 1,
    nextConnectionId: 1,
    boardCols: BOARD.cols,
    boardRows: BOARD.rows,
    cells: createInitialCells(BOARD.cols, BOARD.rows),
    pickaxePower: INITIAL_PICKAXE_POWER,
    pickaxeLevel: INITIAL_PICKAXE_LEVEL,
  };
}

export function machineRect(machine: Pick<MachineState, "x" | "y" | "type">) {
  const def = MACHINE_DEFS[machine.type];
  return {
    x: machine.x,
    y: machine.y,
    width: def.width,
    height: def.height,
  };
}

export function rectsOverlap(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

export function canPlaceMachine(
  state: GameState,
  type: MachineType,
  x: number,
  y: number,
  options: { ignoreCost?: boolean } = {},
): ActionResult {
  const def = MACHINE_DEFS[type];

  if (!def) {
    return { ok: false, error: "Tipo de máquina desconocido." };
  }

  if (
    !Number.isInteger(x) ||
    !Number.isInteger(y) ||
    x < 0 ||
    y < 0 ||
    x + def.width > state.boardCols ||
    y + def.height > state.boardRows
  ) {
    return { ok: false, error: "La máquina no cabe dentro del tablero." };
  }

  const candidate = { x, y, width: def.width, height: def.height };

  for (const machine of state.machines) {
    if (rectsOverlap(candidate, machineRect(machine))) {
      return {
        ok: false,
        error: "Esa zona ya está ocupada por otra máquina.",
      };
    }
  }

  if (!options.ignoreCost && state.credits < def.cost) {
    return { ok: false, error: "No hay créditos suficientes." };
  }

  return { ok: true };
}

export function placeMachine(
  state: GameState,
  type: MachineType,
  x: number,
  y: number,
): ActionResult {
  const result = canPlaceMachine(state, type, x, y);
  if (!result.ok) return result;

  const def = MACHINE_DEFS[type];
  const id = `m-${String(state.nextMachineId).padStart(4, "0")}`;
  state.nextMachineId += 1;
  state.credits -= def.cost;
  state.machines.push({
    id,
    type,
    x,
    y,
    level: 1,
    selectedRecipeId: MACHINE_RECIPE_OPTIONS[type]?.[0]?.id ?? null,
    active: true,
    progress: 0,
    inputs: {},
    outputs: {},
    fuelTimer: 0,
    autoFuel: true,
    powered: false,
    blockReason: null,
  });

  return { ok: true };
}

/** Vatios que consume una máquina según su tipo y nivel. */
export function getMachinePowerDemand(machine: MachineState): number {
  if (machine.type === "generator") return 0;
  return MACHINE_DEFS[machine.type].powerDemand * machine.level;
}

/** Vatios que genera un generador (5 W por Mk). */
export function getMachinePowerOutput(machine: MachineState): number {
  if (machine.type !== "generator") return 0;
  return (RECIPES.generator?.powerOutput ?? 5) * machine.level;
}

/** Coste de subir una máquina al siguiente Mk: coste base × Mk actual. */
export function getMachineUpgradeCost(machine: MachineState): number {
  return MACHINE_DEFS[machine.type].cost * machine.level;
}

export function upgradeMachine(
  state: GameState,
  machineId: string,
): ActionResult & { cost?: number; level?: number } {
  const machine = state.machines.find((item) => item.id === machineId);
  if (!machine) return { ok: false, error: "La máquina ya no existe." };

  const cost = getMachineUpgradeCost(machine);
  if (state.credits < cost) {
    return { ok: false, error: `Necesitas €${cost} para mejorar a Mk${machine.level + 1}.` };
  }

  state.credits -= cost;
  machine.level += 1;
  // La mejora no interrumpe el progreso ni los recursos almacenados.
  machine.progress = Math.min(
    machine.progress,
    RECIPES[machine.type]?.duration ?? machine.progress,
  );
  machine.blockReason = null;

  return { ok: true, cost, level: machine.level };
}

export function removeMachine(state: GameState, machineId: string): ActionResult {
  const index = state.machines.findIndex((machine) => machine.id === machineId);
  if (index === -1) {
    return { ok: false, error: "La máquina ya no existe." };
  }

  const machine = state.machines[index];
  const invested = MACHINE_DEFS[machine.type].cost * machine.level;
  const refund = Math.floor(invested * DEMOLISH_REFUND);
  state.machines.splice(index, 1);
  state.connections = state.connections.filter(
    (connection) =>
      connection.fromMachineId !== machineId &&
      connection.toMachineId !== machineId,
  );
  state.credits += refund;
  return { ok: true };
}

export function getMachineAtCell(
  state: GameState,
  cell: Cell,
): MachineState | null {
  return (
    state.machines.find((machine) => {
      const rect = machineRect(machine);
      return (
        cell.x >= rect.x &&
        cell.x < rect.x + rect.width &&
        cell.y >= rect.y &&
        cell.y < rect.y + rect.height
      );
    }) ?? null
  );
}

export function compatibleResource(
  from: MachineState,
  to: MachineState,
): ResourceId | null {
  const fromRecipe = RECIPES[from.type];
  const toRecipe = RECIPES[to.type];
  if (!fromRecipe || !toRecipe || from.id === to.id) return null;

  for (const resource of Object.keys(fromRecipe.outputs) as ResourceId[]) {
    if ((toRecipe.inputs[resource] ?? 0) > 0) {
      return resource;
    }
  }

  return null;
}

export function connectMachines(
  state: GameState,
  fromMachineId: string,
  toMachineId: string,
): ActionResult {
  const from = state.machines.find((machine) => machine.id === fromMachineId);
  const to = state.machines.find((machine) => machine.id === toMachineId);

  if (!from || !to) {
    return { ok: false, error: "Alguna de las máquinas ya no existe." };
  }

  if (from.id === to.id) {
    return { ok: false, error: "Una máquina no puede conectarse consigo misma." };
  }

  const resource = compatibleResource(from, to);
  if (!resource) {
    return {
      ok: false,
      error: "Esas máquinas no comparten un recurso compatible.",
    };
  }

  const duplicate = state.connections.some(
    (connection) =>
      connection.fromMachineId === from.id &&
      connection.toMachineId === to.id &&
      connection.fromResource === resource,
  );

  if (duplicate) {
    return { ok: false, error: "Esa conexión ya existe." };
  }

  const connection: Connection = {
    id: `c-${String(state.nextConnectionId).padStart(4, "0")}`,
    fromMachineId: from.id,
    fromResource: resource,
    toMachineId: to.id,
    toResource: resource,
    maxRate: TRANSFER_RATE,
    lastRate: 0,
  };
  state.nextConnectionId += 1;
  state.connections.push(connection);

  return { ok: true };
}

export function toggleMachine(state: GameState, machineId: string): ActionResult {
  const machine = state.machines.find((item) => item.id === machineId);
  if (!machine) return { ok: false, error: "La máquina ya no existe." };
  machine.active = !machine.active;
  return { ok: true };
}

export function loadCoalIntoGenerator(
  state: GameState,
  machineId: string,
  maxAmount: number = INVENTORY_CAPACITY,
): ActionResult {
  const machine = state.machines.find((item) => item.id === machineId);
  if (!machine) return { ok: false, error: "La máquina ya no existe." };
  if (machine.type !== "generator") {
    return { ok: false, error: "Solo el generador consume carbón." };
  }

  const stored = machine.inputs.coal ?? 0;
  const space = Math.min(
    INVENTORY_CAPACITY - stored,
    Math.max(0, Math.floor(maxAmount)),
  );

  if (space <= 0) {
    return {
      ok: false,
      error:
        stored >= INVENTORY_CAPACITY
          ? "El generador ya está lleno."
          : "No queda carbón en el almacén.",
    };
  }

  let remaining = space;
  let loaded = 0;

  // Primero del almacén general y después de lo que hayan minado las
  // perforadoras (el total de carbón que muestra la interfaz).
  const fromInventory = Math.min(remaining, state.inventory.coal ?? 0);
  if (fromInventory > 0) {
    state.inventory.coal = (state.inventory.coal ?? 0) - fromInventory;
    remaining -= fromInventory;
    loaded += fromInventory;
  }

  for (const other of state.machines) {
    if (remaining <= 0) break;
    if (other.id === machine.id) continue;

    const available = other.outputs.coal ?? 0;
    if (available <= 0) continue;

    const take = Math.min(remaining, available);
    const next = available - take;
    if (next > 0) {
      other.outputs.coal = next;
    } else {
      delete other.outputs.coal;
    }

    remaining -= take;
    loaded += take;
  }

  if (loaded <= 0) {
    return { ok: false, error: "No queda carbón en el almacén." };
  }

  machine.inputs.coal = stored + loaded;
  return { ok: true };
}

export function toggleGeneratorAuto(
  state: GameState,
  machineId: string,
): ActionResult {
  const machine = state.machines.find((item) => item.id === machineId);
  if (!machine) return { ok: false, error: "La máquina ya no existe." };
  if (machine.type !== "generator") {
    return { ok: false, error: "Solo el generador tiene modo automático." };
  }

  machine.autoFuel = !machine.autoFuel;
  return { ok: true };
}

export function buyCoal(state: GameState): ActionResult {
  if (state.credits < COAL_BUY_COST) {
    return { ok: false, error: "No hay créditos suficientes para comprar carbón." };
  }

  const stored = state.inventory.coal ?? 0;
  if (stored + COAL_BUY_AMOUNT > GLOBAL_COAL_CAPACITY) {
    return { ok: false, error: "El almacén de carbón está lleno." };
  }

  state.credits -= COAL_BUY_COST;
  state.inventory.coal = stored + COAL_BUY_AMOUNT;
  return { ok: true };
}

export function getTotalResource(state: GameState, resource: ResourceId) {
  let total = state.inventory[resource] ?? 0;
  for (const machine of state.machines) {
    total += machine.outputs[resource] ?? 0;
  }
  return total;
}

export function mineCell(
  state: GameState,
  cellX: number,
  cellY: number,
): ActionResult & { mined?: ResourceId; amount?: number } {
  if (cellX < 0 || cellY < 0 || cellX >= state.boardCols || cellY >= state.boardRows) {
    return { ok: false, error: "Fuera del tablero." };
  }
  const cell = state.cells[cellY]?.[cellX];
  if (!cell) return { ok: false, error: "Nada que minar." };
  if (!cell.owned) return { ok: false, error: "Compra esta celda primero." };
  if (!cell.resource) {
    return { ok: false, error: "Nada que minar." };
  }

  const resource = cell.resource;
  cell.health -= state.pickaxePower;

  // El daño sobrante pasa al siguiente ciclo: con poder 6 sobre una veta de
  // 5 HP se obtiene 1 mineral y queda 1 HP de daño aplicado (4 HP restantes).
  let amount = 0;
  let guard = 0;
  while (cell.health <= 0 && guard < 1000) {
    guard += 1;
    cell.health += cell.maxHealth;
    amount += 1;
  }

  if (amount > 0) {
    state.inventory[resource] = (state.inventory[resource] ?? 0) + amount;
    cell.mined = false;
    return { ok: true, mined: resource, amount };
  }

  return { ok: true };
}

export function buyCell(state: GameState, cellX: number, cellY: number): ActionResult {
  if (cellX < 0 || cellY < 0 || cellX >= state.boardCols || cellY >= state.boardRows) {
    return { ok: false, error: "Fuera del tablero." };
  }
  const cell = state.cells[cellY]?.[cellX];
  if (!cell) return { ok: false, error: "No existe." };
  if (cell.owned) return { ok: false, error: "Ya es tuyo." };
  // Must be adjacent to owned cell
  const adjacentOwned = [
    [cellX - 1, cellY],
    [cellX + 1, cellY],
    [cellX, cellY - 1],
    [cellX, cellY + 1],
  ].some(([x, y]) => {
    if (x < 0 || y < 0 || x >= state.boardCols || y >= state.boardRows) return false;
    return state.cells[y]?.[x]?.owned;
  });
  if (!adjacentOwned) return { ok: false, error: "Debe estar junto a una celda propia." };
  if (state.credits < EXPAND_COST) {
    return { ok: false, error: "No hay créditos suficientes." };
  }
  state.credits -= EXPAND_COST;
  cell.owned = true;
  // Give some random resource chance or empty? Keep existing resource
  return { ok: true };
}

export function getExpansionCost(state: GameState): number {
  const newCells =
    (state.boardCols + 2) * (state.boardRows + 2) -
    state.boardCols * state.boardRows;
  return newCells * EXPANSION_CELL_COST;
}

export function expandBoard(
  state: GameState,
): ActionResult & { cost?: number; cells?: number } {
  const cost = getExpansionCost(state);
  if (state.credits < cost) {
    return { ok: false, error: `Necesitas €${cost} para ampliar el terreno.` };
  }

  const newCols = state.boardCols + 2;
  const newRows = state.boardRows + 2;
  const newCells = newCols * newRows - state.boardCols * state.boardRows;

  // El tablero crece un anillo alrededor del actual. Las celdas nuevas se
  // pagan y quedan disponibles; las antiguas se desplazan una posición para
  // mantener el terreno centrado.
  const next: CellState[][] = [];
  for (let y = 0; y < newRows; y++) {
    next[y] = [];
    for (let x = 0; x < newCols; x++) {
      next[y][x] = createCell(x, y, true, randomCellResource());
    }
  }

  for (let y = 0; y < state.boardRows; y++) {
    for (let x = 0; x < state.boardCols; x++) {
      const existing = state.cells[y]?.[x];
      if (existing) {
        next[y + 1][x + 1] = { ...existing, x: x + 1, y: y + 1 };
      }
    }
  }

  for (const machine of state.machines) {
    machine.x += 1;
    machine.y += 1;
  }

  state.cells = next;
  state.boardCols = newCols;
  state.boardRows = newRows;
  state.credits -= cost;

  return { ok: true, cost, cells: newCells };
}

export function getPickaxeUpgradeCost(state: GameState): number {
  return PICKAXE_UPGRADE_BASE_COST * state.pickaxeLevel;
}

export function upgradePickaxe(
  state: GameState,
): ActionResult & { cost?: number; level?: number; power?: number } {
  const cost = getPickaxeUpgradeCost(state);
  if (state.credits < cost) {
    return { ok: false, error: `Necesitas €${cost} para mejorar el pico.` };
  }

  state.credits -= cost;
  state.pickaxeLevel += 1;
  state.pickaxePower += 1;

  return {
    ok: true,
    cost,
    level: state.pickaxeLevel,
    power: state.pickaxePower,
  };
}

export function getSellableResources(state: GameState): ResourceId[] {
  return (Object.keys(RESOURCES) as ResourceId[]).filter(
    (resource) => getTotalResource(state, resource) > 0,
  );
}

export function sellResource(
  state: GameState,
  resource: ResourceId,
): ActionResult & { amount?: number; credits?: number } {
  let amount = 0;
  for (const machine of state.machines) {
    amount += machine.outputs[resource] ?? 0;
    delete machine.outputs[resource];
  }
  amount += state.inventory[resource] ?? 0;
  if (resource === "coal") {
    state.inventory.coal = 0;
  } else if (resource in state.inventory) {
    state.inventory[resource] = 0;
  }

  if (amount <= 0) {
    return { ok: false, error: "No hay unidades para vender." };
  }

  const credits = amount * RESOURCES[resource].price;
  state.credits += credits;
  return { ok: true, amount, credits };
}

export function getPowerStats(state: GameState) {
  let supply = 0;
  let demand = 0;

  for (const machine of state.machines) {
    if (machine.type === "generator") {
      if (machine.active && machine.powered) {
        supply += getMachinePowerOutput(machine);
      }
    } else if (machine.active) {
      demand += getMachinePowerDemand(machine);
    }
  }

  return { supply, demand, used: Math.min(supply, demand) };
}

export function checkProgression(state: GameState) {
  if (
    !state.deepDrillUnlocked &&
    state.componentsProduced >= COMPONENTS_GOAL
  ) {
    state.deepDrillUnlocked = true;
    return true;
  }
  return false;
}

export function sanitizeResourceRecord(
  value: unknown,
): Partial<Record<ResourceId, number>> {
  if (!value || typeof value !== "object") return {};

  const record: Partial<Record<ResourceId, number>> = {};
  for (const [key, amount] of Object.entries(value)) {
    if (!(key in RESOURCES)) continue;
    if (typeof amount !== "number" || !Number.isFinite(amount)) continue;
    record[key as ResourceId] = Math.max(
      0,
      Math.min(INVENTORY_CAPACITY, Math.floor(amount)),
    );
  }
  return record;
}

export function isKnownMachineType(value: unknown): value is MachineType {
  return typeof value === "string" && isMachineType(value);
}
