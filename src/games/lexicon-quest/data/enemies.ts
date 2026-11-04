import type { EnemyDefinition, EnemyId } from "../types.ts";

export const ENEMIES: Record<EnemyId, EnemyDefinition> = {
  babosa: {
    id: "babosa",
    name: "Babosa de tinta",
    epithet: "Cría del tintero",
    chapter: "Capítulo I · El primer borrón",
    maxHp: 24,
    baseAttack: 4,
    heavyEvery: 0,
    heavyName: "",
    heavyDamage: 0,
    passive: "Una criatura simple. Aprende a formar palabras y atacar.",
    flavor: "Deja un rastro brillante que mancha las páginas del archivo.",
    color: 0x59c8b5,
    colorHex: "#59c8b5",
  },
  escarabajo: {
    id: "escarabajo",
    name: "Escarabajo acorazado",
    epithet: "Guardián del estante",
    chapter: "Capítulo II · El caparazón",
    maxHp: 34,
    baseAttack: 5,
    heavyEvery: 4,
    heavyName: "Embate de quitina",
    heavyDamage: 8,
    shortWordArmor: 3,
    passive: "Caparazón: las palabras de 3 letras o menos restan 3 de daño.",
    flavor: "Su coraza está hecha de cubiertas de libros mordidas por el tiempo.",
    color: 0xc98a4b,
    colorHex: "#c98a4b",
  },
  murcielago: {
    id: "murcielago",
    name: "Murciélago eco",
    epithet: "Ala de la biblioteca",
    chapter: "Capítulo III · El eco",
    maxHp: 31,
    baseAttack: 4,
    heavyEvery: 3,
    heavyName: "Eco ensordecedor",
    heavyDamage: 11,
    interruptMaxLength: 3,
    passive: "Eco: interrumpe su ataque anunciado con una palabra de 3 letras o menos.",
    flavor: "Duerme entre los márgenes y repite cada palabra que escucha.",
    color: 0x9d8bf5,
    colorHex: "#9d8bf5",
  },
  golem: {
    id: "golem",
    name: "Gólem de papel",
    epithet: "Última página",
    chapter: "Capítulo IV · La página en blanco",
    maxHp: 50,
    baseAttack: 6,
    heavyEvery: 4,
    heavyName: "Prensa de papel",
    heavyDamage: 13,
    interruptMaxLength: 3,
    longWordMultiplier: 1.5,
    passive: "Papel antiguo: +50% de daño con palabras de 6 letras o más.",
    flavor: "Un cuerpo de pliegos escritos con una tinta que aún no se ha secado.",
    color: 0xe5d3a7,
    colorHex: "#e5d3a7",
  },
};

export const ENEMY_ORDER: readonly EnemyId[] = [
  "babosa",
  "escarabajo",
  "murcielago",
  "golem",
];

export function getEnemy(id: EnemyId): EnemyDefinition {
  return ENEMIES[id];
}
