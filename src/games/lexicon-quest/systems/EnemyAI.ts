import type { EnemyDefinition, EnemyIntent } from "../types.ts";

/**
 * El enemigo elige su intención al final de su turno, de modo que el jugador
 * siempre ve el próximo ataque antes de actuar. Los ataques especiales se
 * anuncian con `round` múltiplo de `heavyEvery`.
 */
export function pickIntent(
  definition: EnemyDefinition,
  round: number,
): EnemyIntent {
  const isHeavy =
    definition.heavyEvery > 0 && round > 0 && round % definition.heavyEvery === 0;

  if (isHeavy) {
    return {
      kind: "heavy",
      name: definition.heavyName,
      damage: definition.heavyDamage,
      interruptible: definition.interruptMaxLength !== undefined,
      interrupted: false,
    };
  }

  return {
    kind: "attack",
    name: "Ataque",
    damage: definition.baseAttack,
    interruptible: false,
    interrupted: false,
  };
}

export function canInterrupt(
  definition: EnemyDefinition,
  intent: EnemyIntent,
  wordLength: number,
): boolean {
  return (
    intent.interruptible &&
    definition.interruptMaxLength !== undefined &&
    wordLength <= definition.interruptMaxLength
  );
}

export function intentLabel(intent: EnemyIntent): string {
  if (intent.interruptible) {
    return `${intent.name} · ${intent.damage} daño · interrumpible`;
  }
  return `${intent.name} · ${intent.damage} daño`;
}

export function enemyPassiveSummary(definition: EnemyDefinition): string {
  return definition.passive;
}
