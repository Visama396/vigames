import { DRILL_MINING_POWER, GENERATOR_FUEL_SECONDS, INVENTORY_CAPACITY, MACHINE_DEFS, RECIPES } from "../config";
import type {
  GameState,
  MachineState,
  MachineType,
  ResourceId,
} from "../types";
import { checkProgression, getMachinePowerDemand, getMachinePowerOutput, loadCoalIntoGenerator } from "../state/game-state";

export interface SimulationEvent {
  type: "component" | "unlocked";
  message: string;
}

export interface StepResult {
  events: SimulationEvent[];
  produced: number;
}

/**
 * Avanza la simulación un paso fijo. La función muta el estado de forma
 * determinista y no depende de Phaser ni de los FPS.
 */
export function stepSimulation(
  state: GameState,
  dt: number,
): StepResult {
  const events: SimulationEvent[] = [];
  const machines = [...state.machines].sort((a, b) => a.id.localeCompare(b.id));

  for (const machine of state.machines) {
    machine.powered = false;
    machine.blockReason = null;
  }
  for (const connection of state.connections) {
    connection.lastRate = 0;
  }

  // 1-2. Combustible de los generadores y asignación determinista de potencia.
  let supply = 0;
  for (const machine of machines) {
    if (machine.type !== "generator") continue;

    if (!machine.active) {
      machine.blockReason = "Pausada";
      continue;
    }

    // Modo auto: repone el carbón que necesita este Mk cuando se queda sin
    // combustible (1 carbón cada 5 s por cada Mk).
    if (
      machine.autoFuel &&
      machine.fuelTimer <= 0 &&
      (machine.inputs.coal ?? 0) < machine.level
    ) {
      loadCoalIntoGenerator(state, machine.id, machine.level);
    }

    if (machine.fuelTimer > 0) {
      machine.fuelTimer = Math.max(0, machine.fuelTimer - dt);
      machine.powered = true;
    } else {
      const coal = machine.inputs.coal ?? 0;
      if (coal >= machine.level) {
        machine.inputs.coal = coal - machine.level;
        machine.fuelTimer = Math.max(
          0,
          (RECIPES.generator?.duration ?? GENERATOR_FUEL_SECONDS) - dt,
        );
        machine.powered = true;
      } else {
        machine.powered = false;
        machine.blockReason = "Sin carbón";
      }
    }

    if (machine.powered) {
      supply += getMachinePowerOutput(machine);
    }
  }

  let remainingPower = supply;
  for (const machine of machines) {
    if (machine.type === "generator") continue;

    if (!machine.active) {
      machine.blockReason = "Pausada";
      continue;
    }

    const demand = getMachinePowerDemand(machine);
    if (remainingPower >= demand) {
      machine.powered = true;
      remainingPower -= demand;
    } else {
      machine.powered = false;
      machine.blockReason = "Sin energía";
    }
  }

  // 3. Progreso de las recetas activas.
  for (const machine of machines) {
    if (
      machine.type === "generator" ||
      machine.type === "drill" ||
      !machine.active ||
      !machine.powered
    ) {
      continue;
    }

    const recipe = RECIPES[machine.type];
    if (!recipe) continue;

    // Cada Mk duplica la velocidad de proceso (misma duración por ciclo).
    machine.progress = Math.min(
      recipe.duration,
      machine.progress + dt * machine.level,
    );
  }

  // 3b. Las perforadoras dañan la veta que ocupan (el clic manual se suma).
  mineWithDrills(state, machines, dt);

  // 4 y 7. Completar ciclos antes de las transferencias y otra vez después.
  // La segunda pasada permite que una máquina que ya había alcanzado su
  // duración use los materiales recibidos en este mismo paso. El movimiento
  // de recursos se calcula en dos fases, por lo que ningún recurso se usa dos
  // veces dentro del mismo paso.
  completeMachines(state, machines, events);
  transferResources(state, machines, dt);
  completeMachines(state, machines, events);

  // 8. Estado final para la interfaz.
  for (const machine of state.machines) {
    machine.blockReason = getBlockReason(state, machine);
  }

  state.elapsedSeconds += dt;

  if (checkProgression(state)) {
    events.push({
      type: "unlocked",
      message:
        "¡Perforación profunda desbloqueada! Has fabricado 20 componentes.",
    });
  }

  return {
    events,
    produced: state.componentsProduced,
  };
}

function mineWithDrills(
  state: GameState,
  machines: MachineState[],
  dt: number,
) {
  for (const machine of machines) {
    if (machine.type !== "drill" || !machine.active || !machine.powered) {
      continue;
    }

    const cell = state.cells[machine.y]?.[machine.x];
    if (!cell || !cell.owned || !cell.resource) continue;

    cell.health -= DRILL_MINING_POWER * machine.level * dt;

    let guard = 0;
    while (cell.health <= 0 && guard < 8) {
      guard += 1;
      const resource = cell.resource;

      // La producción de la perforadora va directa al almacén general.
      state.inventory[resource] = (state.inventory[resource] ?? 0) + 1;
      cell.health += cell.maxHealth;
    }
  }
}

function completeMachines(
  state: GameState,
  machines: MachineState[],
  events: SimulationEvent[],
) {
  for (const machine of machines) {
    if (machine.type === "generator" || machine.type === "drill") continue;

    const recipe = RECIPES[machine.type];
    if (!recipe) continue;

    let guard = 0;
    while (
      machine.progress + 1e-9 >= recipe.duration &&
      guard < 4
    ) {
      guard += 1;

      const missing = hasMissingInputs(machine, recipe.inputs);
      if (missing) {
        machine.blockReason = "Faltan materiales";
        break;
      }

      const full = hasFullOutput(machine, recipe.outputs);
      if (full) {
        machine.blockReason = "Salida llena";
        break;
      }

      for (const [resource, amount] of Object.entries(recipe.inputs) as [
        ResourceId,
        number,
      ][]) {
        const next = (machine.inputs[resource] ?? 0) - amount;
        if (next > 0) {
          machine.inputs[resource] = next;
        } else {
          delete machine.inputs[resource];
        }
      }

      for (const [resource, amount] of Object.entries(recipe.outputs) as [
        ResourceId,
        number,
      ][]) {
        machine.outputs[resource] = (machine.outputs[resource] ?? 0) + amount;
      }

      machine.progress = Math.max(0, machine.progress - recipe.duration);

      if (machine.type === "assembler") {
        const made = recipe.outputs.component ?? 0;
        state.componentsProduced += made;
        events.push({
          type: "component",
          message: `Componente fabricado (${state.componentsProduced}).`,
        });
      }
    }
  }
}

function hasMissingInputs(
  machine: MachineState,
  inputs: Partial<Record<ResourceId, number>>,
) {
  return (Object.entries(inputs) as [ResourceId, number][]).some(
    ([resource, amount]) => (machine.inputs[resource] ?? 0) < amount,
  );
}

function hasFullOutput(
  machine: MachineState,
  outputs: Partial<Record<ResourceId, number>>,
) {
  return (Object.entries(outputs) as [ResourceId, number][]).some(
    ([resource, amount]) =>
      (machine.outputs[resource] ?? 0) + amount > INVENTORY_CAPACITY,
  );
}

interface PlannedTransfer {
  connectionId: string;
  fromMachineId: string;
  toMachineId: string;
  resource: ResourceId;
  amount: number;
}

function transferResources(
  state: GameState,
  machines: MachineState[],
  dt: number,
) {
  const byId = new Map(machines.map((machine) => [machine.id, machine]));
  const sourceBudget = new Map<string, number>();
  const targetBudget = new Map<string, number>();
  const planned: PlannedTransfer[] = [];

  const sortedConnections = [...state.connections].sort((a, b) =>
    a.id.localeCompare(b.id),
  );

  // Primera fase: calcular todas las cantidades sin modificar inventarios.
  for (const connection of sortedConnections) {
    const from = byId.get(connection.fromMachineId);
    const to = byId.get(connection.toMachineId);
    if (!from || !to) continue;

    const sourceKey = `${from.id}:${connection.fromResource}`;
    const targetKey = `${to.id}:${connection.toResource}`;

    const sourceAvailable =
      sourceBudget.get(sourceKey) ??
      (from.outputs[connection.fromResource] ?? 0);
    const targetSpace =
      targetBudget.get(targetKey) ??
      (INVENTORY_CAPACITY - (to.inputs[connection.toResource] ?? 0));

    const amount = Math.floor(
      Math.max(
        0,
        Math.min(
          connection.maxRate * dt,
          sourceAvailable,
          targetSpace,
        ),
      ),
    );

    if (amount <= 0) continue;

    sourceBudget.set(sourceKey, sourceAvailable - amount);
    targetBudget.set(targetKey, targetSpace - amount);
    planned.push({
      connectionId: connection.id,
      fromMachineId: from.id,
      toMachineId: to.id,
      resource: connection.fromResource,
      amount,
    });
  }

  // Segunda fase: aplicar los movimientos ya calculados.
  for (const transfer of planned) {
    const from = byId.get(transfer.fromMachineId);
    const to = byId.get(transfer.toMachineId);
    if (!from || !to) continue;

    const source = from.outputs[transfer.resource] ?? 0;
    const nextSource = source - transfer.amount;
    if (nextSource > 0) {
      from.outputs[transfer.resource] = nextSource;
    } else {
      delete from.outputs[transfer.resource];
    }

    to.inputs[transfer.resource] =
      (to.inputs[transfer.resource] ?? 0) + transfer.amount;

    const connection = state.connections.find(
      (item) => item.id === transfer.connectionId,
    );
    if (connection) {
      connection.lastRate = transfer.amount / dt;
    }
  }
}

function getBlockReason(state: GameState, machine: MachineState): string | null {
  if (!machine.active) return "Pausada";

  if (machine.type === "generator") {
    return machine.powered ? null : "Sin carbón";
  }

  if (!machine.powered) return "Sin energía";

  if (machine.type === "drill") {
    const cell = state.cells[machine.y]?.[machine.x];
    if (!cell || !cell.owned || !cell.resource) return "Sin veta";
    return null;
  }

  const recipe = RECIPES[machine.type];
  if (!recipe) return null;

  if (hasFullOutput(machine, recipe.outputs)) return "Salida llena";

  if (
    machine.progress + 1e-9 >= recipe.duration &&
    hasMissingInputs(machine, recipe.inputs)
  ) {
    return "Faltan materiales";
  }

  return null;
}

/** Etiqueta legible del estado de una máquina para los paneles de la interfaz. */
export function machineStatusLabel(machine: MachineState): string {
  if (!machine.active) return "Pausada";
  if (machine.blockReason) return machine.blockReason;
  if (!machine.powered) return "Sin energía";
  return "Funcionando";
}

export function machineTypeLabel(type: MachineType): string {
  return MACHINE_DEFS[type].label;
}
