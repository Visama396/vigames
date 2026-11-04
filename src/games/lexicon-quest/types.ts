export type EnemyId = "babosa" | "escarabajo" | "murcielago" | "golem";

export type UpgradeId =
  | "pluma"
  | "golpe-preciso"
  | "guante"
  | "cadena-lexica"
  | "rompearmaduras"
  | "amuleto-eco"
  | "ultima-vocal"
  | "vitalidad"
  | "lupa"
  | "reordenar"
  | "letra-ene";

export type Board = string[];

export type CellIndex = number;

export interface EnemyDefinition {
  id: EnemyId;
  name: string;
  epithet: string;
  chapter: string;
  maxHp: number;
  baseAttack: number;
  /** Ataque anunciado que se ejecuta cada `heavyEvery` turnos. */
  heavyEvery: number;
  heavyName: string;
  heavyDamage: number;
  /** Longitud máxima de palabra que interrumpe el ataque anunciado. */
  interruptMaxLength?: number;
  /** Daño que resta a las palabras de 3 letras o menos. */
  shortWordArmor?: number;
  /** Multiplicador de daño para palabras de 6 o más letras. */
  longWordMultiplier?: number;
  passive: string;
  flavor: string;
  color: number;
  colorHex: string;
}

export interface EnemyIntent {
  kind: "attack" | "heavy";
  name: string;
  damage: number;
  interruptible: boolean;
  interrupted: boolean;
}

export interface EnemyState {
  id: EnemyId;
  name: string;
  hp: number;
  maxHp: number;
  round: number;
  intent: EnemyIntent;
}

export interface HeroState {
  hp: number;
  maxHp: number;
}

export type BattlePhase = "player" | "enemy" | "victory" | "defeat";

export type LogTone = "info" | "good" | "bad" | "special";

export interface LogEntry {
  text: string;
  tone: LogTone;
  turn: number;
}

export interface RunStats {
  wordsPlayed: number;
  bestWord: string;
  bestWordLength: number;
  damageDealt: number;
  interrupts: number;
  enemiesDefeated: number;
  startedAt: number;
}

export interface GameState {
  hero: HeroState;
  enemy: EnemyState;
  upgrades: UpgradeId[];
  hintsLeft: number;
  shufflesLeft: number;
  turn: number;
  phase: BattlePhase;
  firstLongWordUsed: boolean;
  enemyIndex: number;
  stats: RunStats;
  log: LogEntry[];
}

export interface UpgradeEffects {
  flatDamage?: number;
  shortWordDamage?: number;
  fourLetterDamage?: number;
  fivePlusDamage?: number;
  longWordDamage?: number;
  eneDamage?: number;
  firstLongWordDamage?: number;
  healOnVowel?: number;
  maxHp?: number;
  hints?: number;
  shuffles?: number;
}

export interface UpgradeDefinition {
  id: UpgradeId;
  name: string;
  description: string;
  icon: string;
  effects: UpgradeEffects;
}

export interface DamageModifiers {
  flat: number;
  short: number;
  four: number;
  fivePlus: number;
  long: number;
  ene: number;
  firstLong: number;
  healOnVowel: number;
}

export interface DamageEstimate {
  length: number;
  base: number;
  flatBonus: number;
  shortBonus: number;
  fourBonus: number;
  fivePlusBonus: number;
  longBonus: number;
  eneBonus: number;
  firstLongBonus: number;
  armor: number;
  multiplier: number;
  total: number;
  category: string;
  interrupts: boolean;
}

export interface PlayableWord {
  word: string;
  path: CellIndex[];
}

export interface SelectionResult {
  selection: CellIndex[];
  action: "added" | "removed" | "truncated" | "restarted" | "invalid";
}

export interface BoardCheck {
  board: Board;
  changed: boolean;
  regenerated: boolean;
  word: PlayableWord | null;
}

export interface PlayerActionResult {
  ok: boolean;
  reason?: "not-player-turn" | "too-short" | "not-a-word" | "defeated";
  word: string;
  damage?: number;
  category?: string;
  estimate?: DamageEstimate;
  interrupted?: boolean;
  healed?: number;
  enemyDefeated?: boolean;
}

export interface EnemyTurnResult {
  skipped: boolean;
  damage?: number;
  interrupted?: boolean;
  defeated?: boolean;
}

export interface RelicSummary {
  id: UpgradeId;
  name: string;
  icon: string;
  description: string;
}
