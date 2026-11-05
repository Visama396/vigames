import type {
  MachineDefinition,
  MachineType,
  Recipe,
  RecipeOption,
  ResourceId,
} from "./types";

export const BOARD = {
  cols: 2,
  rows: 2,
  cell: 64,
  get width() {
    return this.cols * this.cell;
  },
  get height() {
    return this.rows * this.cell;
  },
} as const;

export const CELL_HEALTH = 5;
export const INITIAL_PICKAXE_POWER = 1;
export const INITIAL_PICKAXE_LEVEL = 1;
export const EXPAND_COST = 50;
export const EXPANSION_CELL_COST = 5;
export const PICKAXE_UPGRADE_BASE_COST = 20;
/** Poder de minería por segundo de una perforadora Mk1 (y por cada Mk extra). */
export const DRILL_MINING_POWER = 1;
/** Vatios que produce un generador Mk1 (cada Mk suma otros 5 W). */
export const GENERATOR_POWER_OUTPUT = 5;
/** Segundos que dura 1 carbón en el generador. */
export const GENERATOR_FUEL_SECONDS = 5;

export const SIM_STEP = 0.25;
export const INVENTORY_CAPACITY = 10;
export const GLOBAL_COAL_CAPACITY = 100;
export const TRANSFER_RATE = 6;
export const COMPONENTS_GOAL = 20;
export const SAVE_KEY = "undermine.save.v1";
export const SAVE_VERSION = 1;
export const AUTOSAVE_STEPS = 20;

export const INITIAL_STATE = {
  credits: 0,
  coal: 0,
} as const;

export const COAL_BUY_AMOUNT = 10;
export const COAL_BUY_COST = 25;
export const DEMOLISH_REFUND = 0.5;

export const RESOURCES: Record<
  ResourceId,
  { label: string; short: string; color: number; colorHex: string; price: number }
> = {
  iron_ore: {
    label: "Mineral de hierro",
    short: "Hierro",
    color: 0x94a3b8,
    colorHex: "#94a3b8",
    price: 4,
  },
  iron_ingot: {
    label: "Lingote de hierro",
    short: "Lingote",
    color: 0xe2e8f0,
    colorHex: "#e2e8f0",
    price: 5,
  },
  component: {
    label: "Componente",
    short: "Componente",
    color: 0xc084fc,
    colorHex: "#c084fc",
    price: 14,
  },
  coal: {
    label: "Carbón",
    short: "Carbón",
    color: 0x64748b,
    colorHex: "#64748b",
    price: 2,
  },
};

export const MACHINE_DEFS: Record<MachineType, MachineDefinition> = {
  drill: {
    type: "drill",
    label: "Perforadora",
    short: "PER",
    description:
      "Extrae la veta que ocupa y la envía al almacén: 1 poder de minería/s por Mk y consume 1 W por Mk.",
    cost: 25,
    width: 1,
    height: 1,
    powerDemand: 1,
    color: 0x38bdf8,
    colorHex: "#38bdf8",
  },
  smelter: {
    type: "smelter",
    label: "Fundición",
    short: "FUN",
    description:
      "Convierte 2 minerales de hierro en 1 lingote. Consume 2 W por Mk (el doble de rápida por Mk). Haz clic para cargar mineral.",
    cost: 30,
    width: 1,
    height: 1,
    powerDemand: 2,
    color: 0xfb923c,
    colorHex: "#fb923c",
  },
  assembler: {
    type: "assembler",
    label: "Ensambladora",
    short: "ENS",
    description:
      "Convierte 2 lingotes en 1 componente. Consume 3 W por Mk (el doble de rápida por Mk). Haz clic para cargar lingotes.",
    cost: 40,
    width: 1,
    height: 1,
    powerDemand: 3,
    color: 0xc084fc,
    colorHex: "#c084fc",
  },
  generator: {
    type: "generator",
    label: "Generador",
    short: "GEN",
    description:
      "Quema 1 carbón cada 5 s por Mk y suministra 5 W por Mk. Auto: se recarga del almacén.",
    cost: 35,
    width: 1,
    height: 1,
    powerDemand: 0,
    color: 0xfacc15,
    colorHex: "#facc15",
  },
};

export const RECIPES: Record<MachineType, Recipe | null> = {
  drill: {
    inputs: {},
    // La salida real depende de la veta bajo la perforadora. Se declaran ambos
    // recursos para que las conexiones reconozcan las salidas compatibles.
    outputs: { iron_ore: 1, coal: 1 },
    duration: 0.5,
    powerDemand: 1,
  },
  smelter: {
    inputs: { iron_ore: 2 },
    outputs: { iron_ingot: 1 },
    duration: 1,
    powerDemand: 2,
  },
  assembler: {
    inputs: { iron_ingot: 2 },
    outputs: { component: 1 },
    duration: 2,
    powerDemand: 3,
  },
  generator: {
    inputs: { coal: 1 },
    outputs: {},
    duration: GENERATOR_FUEL_SECONDS,
    powerDemand: 0,
    powerOutput: GENERATOR_POWER_OUTPUT,
  },
};

export const MACHINE_LIST = Object.values(MACHINE_DEFS);

/**
 * Recetas que el jugador puede elegir en el menú de cada máquina. Por ahora
 * solo la fundición tiene selección (lingote de hierro).
 */
export const MACHINE_RECIPE_OPTIONS: Record<MachineType, RecipeOption[]> = {
  drill: [],
  smelter: [
    {
      id: "iron_ingot",
      label: "Lingote de hierro",
      icon: "iron_ingot",
      inputs: { iron_ore: 2 },
      outputs: { iron_ingot: 1 },
      duration: 1,
      powerDemand: 2,
    },
  ],
  assembler: [],
  generator: [],
};

export function isResourceId(value: string): value is ResourceId {
  return value in RESOURCES;
}

export function isMachineType(value: string): value is MachineType {
  return value in MACHINE_DEFS;
}
