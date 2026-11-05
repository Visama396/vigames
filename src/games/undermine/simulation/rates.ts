import { DRILL_MINING_POWER, INVENTORY_CAPACITY, RECIPES } from "../config";
import type { GameState, MachineState, ResourceId } from "../types";

export type ResourceRates = Record<ResourceId, number>;

const RATE_EPSILON = 0.01;

function emptyRates(): ResourceRates {
  return { iron_ore: 0, iron_ingot: 0, component: 0, coal: 0 };
}

/** Una máquina solo produce o consume mientras está activa, con energía y sin bloqueo. */
function isRunning(machine: MachineState): boolean {
  return machine.active && machine.powered && machine.blockReason === null;
}

function hasRecipeInputs(
  machine: MachineState,
  inputs: Partial<Record<ResourceId, number>>,
): boolean {
  return (Object.entries(inputs) as [ResourceId, number][]).every(
    ([resource, amount]) => (machine.inputs[resource] ?? 0) >= amount,
  );
}

function hasOutputSpace(
  machine: MachineState,
  outputs: Partial<Record<ResourceId, number>>,
): boolean {
  return (Object.entries(outputs) as [ResourceId, number][]).every(
    ([resource, amount]) =>
      (machine.outputs[resource] ?? 0) + amount <= INVENTORY_CAPACITY,
  );
}

/**
 * Calcula la variación neta por segundo de cada recurso a partir de las
 * máquinas que están funcionando ahora mismo. No incluye el minado manual ni
 * las transferencias internas entre máquinas.
 *
 * Las tasas son teóricas por ciclo: una perforadora inflige
 * `DRILL_MINING_POWER × Mk` de daño por segundo y extrae una unidad cada
 * `maxHealth` de daño; una fundición consume/produce según su receta y un
 * generador quema `1 × Mk` carbón cada `GENERATOR_FUEL_SECONDS`.
 */
export function getResourceRates(state: GameState): ResourceRates {
  const rates = emptyRates();

  for (const machine of state.machines) {
    if (!isRunning(machine)) continue;

    if (machine.type === "drill") {
      const cell = state.cells[machine.y]?.[machine.x];
      if (cell?.owned && cell.resource) {
        // La perforadora daña la veta; cada unidad tarda `maxHealth` de daño.
        rates[cell.resource] +=
          (DRILL_MINING_POWER * machine.level) / Math.max(1, cell.maxHealth);
      }
      continue;
    }

    const recipe = RECIPES[machine.type];
    if (!recipe || recipe.duration <= 0) continue;

    // El generador consume el combustible que ya tiene dentro; el resto de
    // máquinas solo cuentan si pueden completar un ciclo ahora mismo.
    if (
      machine.type !== "generator" &&
      (!hasRecipeInputs(machine, recipe.inputs) ||
        !hasOutputSpace(machine, recipe.outputs))
    ) {
      continue;
    }

    const cyclesPerSecond = machine.level / recipe.duration;

    for (const [resource, amount] of Object.entries(recipe.inputs) as [
      ResourceId,
      number,
    ][]) {
      rates[resource] -= amount * cyclesPerSecond;
    }

    for (const [resource, amount] of Object.entries(recipe.outputs) as [
      ResourceId,
      number,
    ][]) {
      rates[resource] += amount * cyclesPerSecond;
    }
  }

  return rates;
}

/** Texto compacto para el panel: `+0.2/s`, `-0.2/s` o `±0/s`. */
export function formatResourceRate(rate: number): string {
  if (Math.abs(rate) < RATE_EPSILON) return "±0/s";

  const rounded = Math.round(Math.abs(rate) * 100) / 100;
  const magnitude = Number.isInteger(rounded)
    ? String(rounded)
    : rounded.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");

  return `${rate > 0 ? "+" : "-"}${magnitude}/s`;
}
