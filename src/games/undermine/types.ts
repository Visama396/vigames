export type ResourceId = "iron_ore" | "iron_ingot" | "component" | "coal";

export type CellResource = "iron_ore" | "coal" | null;

export type MachineType = "drill" | "smelter" | "assembler" | "generator";

export interface Recipe {
  inputs: Partial<Record<ResourceId, number>>;
  outputs: Partial<Record<ResourceId, number>>;
  duration: number;
  powerDemand: number;
  powerOutput?: number;
}

/** Receta seleccionable desde el menú de una máquina. */
export interface RecipeOption extends Recipe {
  id: string;
  label: string;
  /** Clave de textura del icono en el menú. */
  icon: string;
}

export interface MachineDefinition {
  type: MachineType;
  label: string;
  short: string;
  description: string;
  cost: number;
  width: number;
  height: number;
  powerDemand: number;
  color: number;
  colorHex: string;
}

export interface MachineState {
  id: string;
  type: MachineType;
  x: number;
  y: number;
  /** Nivel de mejora (Mk1, Mk2, Mk3...). */
  level: number;
  /** Receta activa elegida en el menú (si el tipo tiene varias). */
  selectedRecipeId: string | null;
  active: boolean;
  progress: number;
  inputs: Partial<Record<ResourceId, number>>;
  outputs: Partial<Record<ResourceId, number>>;
  /** Segundos de combustible restantes (solo generador). */
  fuelTimer: number;
  /** Recarga automática de carbón desde el almacén (solo generador). */
  autoFuel: boolean;
  /** Estado calculado por la simulación, no se guarda. */
  powered: boolean;
  /** Motivo del bloqueo calculado por la simulación, no se guarda. */
  blockReason: string | null;
}

export interface Connection {
  id: string;
  fromMachineId: string;
  fromResource: ResourceId;
  toMachineId: string;
  toResource: ResourceId;
  maxRate: number;
  /** Tasa real del último paso, para la interfaz. */
  lastRate: number;
}

export interface CellState {
  x: number;
  y: number;
  resource: CellResource;
  maxHealth: number;
  health: number;
  mined: boolean;
  owned: boolean;
}

export interface GameState {
  version: 1;
  credits: number;
  elapsedSeconds: number;
  machines: MachineState[];
  connections: Connection[];
  inventory: Partial<Record<ResourceId, number>>;
  componentsProduced: number;
  deepDrillUnlocked: boolean;
  nextMachineId: number;
  nextConnectionId: number;
  boardCols: number;
  boardRows: number;
  cells: CellState[][];
  pickaxePower: number;
  pickaxeLevel: number;
}

export interface Cell {
  x: number;
  y: number;
}

export type MessageTone = "info" | "success" | "error";

export interface UiState {
  selectedMachineId: string | null;
  placementType: MachineType | null;
  connectFromId: string | null;
  hoverCell: Cell | null;
  paused: boolean;
  message: { text: string; tone: MessageTone; id: number } | null;
}

export interface ActionResult {
  ok: boolean;
  error?: string;
}
