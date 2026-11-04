import Phaser from "phaser";
import {
  BOARD_CONFIG,
  BOARD_SIZE,
  GAME_HEIGHT,
  GAME_WIDTH,
  HERO,
  MIN_WORD_LENGTH,
} from "../config.ts";
import type { Board, CellIndex, EnemyId, PlayableWord, UpgradeId } from "../types.ts";
import { ENEMIES, ENEMY_ORDER } from "../data/enemies.ts";
import { createBoard, ensurePlayableBoard, extendSelection, findPlayableWord, refillBoard, shuffleBoard, wordFromSelection } from "../systems/LetterBoard.ts";
import { createGameState, describeDamageBonuses, estimateWordDamage, getEnemyDefinitionOf, getNextEnemyDefinition, isFinalEnemy, resolveEnemyTurn, resolvePlayerAttack, startBattle } from "../systems/CombatSystem.ts";
import { WordValidator } from "../systems/WordValidator.ts";
import { SPANISH_WORDS } from "../data/dictionary.ts";
import { createRng } from "../systems/random.ts";
import { getUpgrade, getUpgradeChoices } from "../systems/ProgressionSystem.ts";
import { createBackdrop } from "../render/backdrop.ts";
import { createEnemyArt, type EnemyArtHandle } from "../render/EnemyArt.ts";
import { createButton, createPanel, drawBar, floatingText, smallCaps } from "../render/ui.ts";
import { COLORS, DEPTH, FONTS, hex } from "../render/theme.ts";
import { Sfx } from "../systems/Sfx.ts";

const TILE_SIZE = BOARD_CONFIG.tile;
const PITCH = BOARD_CONFIG.pitch;
const BOARD_X = BOARD_CONFIG.x;
const BOARD_Y = BOARD_CONFIG.y;

interface Tile {
  container: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Graphics;
  letter: Phaser.GameObjects.Text;
  index: CellIndex;
}

interface RewardCard {
  container: Phaser.GameObjects.Container;
  id: UpgradeId;
}

export class BattleScene extends Phaser.Scene {
  private validator!: WordValidator;
  private rng = createRng();
  private sfx!: Sfx;
  private state = createGameState(ENEMIES["babosa"]);
  private board: Board = [];
  private selection: CellIndex[] = [];
  private tiles: Tile[] = [];
  private enemyArt?: EnemyArtHandle;
  private dragging = false;
  private hintWord: PlayableWord | null = null;
  private hintCells = new Set<CellIndex>();

  private hpBar!: Phaser.GameObjects.Graphics;
  private enemyHpBar!: Phaser.GameObjects.Graphics;
  private heroHpText!: Phaser.GameObjects.Text;
  private enemyHpText!: Phaser.GameObjects.Text;
  private enemyNameText!: Phaser.GameObjects.Text;
  private enemyIntentText!: Phaser.GameObjects.Text;
  private enemyPassiveText!: Phaser.GameObjects.Text;
  private turnText!: Phaser.GameObjects.Text;
  private wordText!: Phaser.GameObjects.Text;
  private damageText!: Phaser.GameObjects.Text;
  private bonusText!: Phaser.GameObjects.Text;
  private hintsText!: Phaser.GameObjects.Text;
  private shufflesText!: Phaser.GameObjects.Text;
  private logTexts: Phaser.GameObjects.Text[] = [];
  private relicTexts: Phaser.GameObjects.Text[] = [];

  private playButton!: ReturnType<typeof createButton>;
  private hintButton!: ReturnType<typeof createButton>;
  private shuffleButton!: ReturnType<typeof createButton>;
  private clearButton!: ReturnType<typeof createButton>;
  private rewardPanel!: Phaser.GameObjects.Container;
  private rewardCards: RewardCard[] = [];
  private overlayPanel!: Phaser.GameObjects.Container;
  private overlayTitle!: Phaser.GameObjects.Text;
  private overlayBody!: Phaser.GameObjects.Text;

  constructor() {
    super("BattleScene");
  }

  create(): void {
    this.validator = new WordValidator(SPANISH_WORDS);
    this.sfx = new Sfx();
    this.state = createGameState(ENEMIES["babosa"]);
    this.board = createBoard(this.validator, this.rng);
    this.selection = [];
    this.tiles = [];
    this.hintWord = null;
    this.hintCells.clear();

    createBackdrop(this);

    createPanel(this, 14, 14, 996, 118, { radius: 16 });
    createPanel(this, 14, 142, 320, 610, { radius: 16 });
    createPanel(this, 344, 142, 330, 610, { radius: 16 });
    createPanel(this, 684, 142, 326, 610, { radius: 16 });

    this.add.text(38, 34, HERO.name, {
      fontFamily: FONTS.serif,
      fontSize: "24px",
      fontStyle: "bold",
      color: hex(COLORS.parchment),
    });
    smallCaps(this, 38, 66, HERO.title, COLORS.muted);
    this.hpBar = this.add.graphics().setDepth(DEPTH.hud);
    this.heroHpText = this.add.text(38, 86, "", {
      fontFamily: FONTS.sans,
      fontSize: "12px",
      color: hex(COLORS.parchment),
    }).setDepth(DEPTH.hud);

    this.enemyNameText = this.add.text(710, 34, "", {
      fontFamily: FONTS.serif,
      fontSize: "26px",
      fontStyle: "bold",
      color: hex(COLORS.parchment),
    }).setDepth(DEPTH.hud);
    smallCaps(this, 710, 66, "", COLORS.muted).setName("enemyEpithet");
    this.enemyIntentText = this.add.text(710, 88, "", {
      fontFamily: FONTS.sans,
      fontSize: "13px",
      color: hex(COLORS.goldBright),
    }).setDepth(DEPTH.hud);
    this.enemyPassiveText = this.add.text(38, 112, "", {
      fontFamily: FONTS.sans,
      fontSize: "12px",
      color: hex(COLORS.muted),
    }).setDepth(DEPTH.hud);
    this.enemyHpBar = this.add.graphics().setDepth(DEPTH.hud);
    this.enemyHpText = this.add.text(984, 86, "", {
      fontFamily: FONTS.sans,
      fontSize: "12px",
      color: hex(COLORS.parchment),
    }).setOrigin(1, 0).setDepth(DEPTH.hud);

    smallCaps(this, 368, 162, "TABLERO", COLORS.muted);
    smallCaps(this, 38, 162, "REGISTRO", COLORS.muted);
    smallCaps(this, 708, 162, "HÉROE / RECURSOS", COLORS.muted);

    this.wordText = this.add.text(509, 168, "—", {
      fontFamily: FONTS.serif,
      fontSize: "28px",
      fontStyle: "bold",
      color: hex(COLORS.parchment),
    }).setOrigin(0.5).setDepth(DEPTH.hud);
    this.damageText = this.add.text(509, 204, "Selecciona letras para formar una palabra.", {
      fontFamily: FONTS.sans,
      fontSize: "13px",
      color: hex(COLORS.muted),
    }).setOrigin(0.5).setDepth(DEPTH.hud);
    this.bonusText = this.add.text(509, 226, "", {
      fontFamily: FONTS.sans,
      fontSize: "11px",
      color: hex(COLORS.teal),
    }).setOrigin(0.5).setDepth(DEPTH.hud);
    this.turnText = this.add.text(344 + 165, 142 + 8, "", {
      fontFamily: FONTS.sans,
      fontSize: "12px",
      fontStyle: "bold",
      color: hex(COLORS.goldBright),
    }).setDepth(DEPTH.hud);

    for (let i = 0; i < 8; i += 1) {
      const text = this.add.text(38, 188 + i * 22, "", {
        fontFamily: FONTS.sans,
        fontSize: "12px",
        color: hex(COLORS.parchment),
        wordWrap: { width: 270 },
      });
      this.logTexts.push(text);
    }

    smallCaps(this, 708, 188, "RELIQUIAS", COLORS.muted);
    for (let i = 0; i < 6; i += 1) {
      const text = this.add.text(708, 210 + i * 18, "—", {
        fontFamily: FONTS.sans,
        fontSize: "11px",
        color: hex(COLORS.muted),
      });
      this.relicTexts.push(text);
    }

    this.hintsText = this.add.text(708, 336, "", {
      fontFamily: FONTS.sans,
      fontSize: "13px",
      color: hex(COLORS.parchment),
    });
    this.shufflesText = this.add.text(708, 360, "", {
      fontFamily: FONTS.sans,
      fontSize: "13px",
      color: hex(COLORS.parchment),
    });
    this.add.text(708, 400, "Recursos", {
      fontFamily: FONTS.sans,
      fontSize: "12px",
      fontStyle: "bold",
      color: hex(COLORS.goldBright),
    });
    this.add.text(708, 424, "Pista: muestra una palabra jugable.", {
      fontFamily: FONTS.sans,
      fontSize: "11px",
      color: hex(COLORS.muted),
    });
    this.add.text(708, 444, "Mezclar: baraja las letras actuales.", {
      fontFamily: FONTS.sans,
      fontSize: "11px",
      color: hex(COLORS.muted),
    });

    this.playButton = createButton(this, { x: 508 - 140, y: 684, width: 280, height: 54, label: "JUGAR PALABRA", primary: true, onClick: () => this.playWord() });
    this.hintButton = createButton(this, { x: 708, y: 684, width: 140, height: 54, label: "PISTA", onClick: () => this.useHint() });
    this.shuffleButton = createButton(this, { x: 862, y: 684, width: 148, height: 54, label: "MEZCLAR", onClick: () => this.useShuffle() });
    this.clearButton = createButton(this, { x: 508 - 70, y: 746, width: 140, height: 40, label: "LIMPIAR", onClick: () => this.clearSelection() });

    this.createBoardTiles();
    this.enemyArt = createEnemyArt(this, this.state.enemy.id, 754, 520, ENEMIES[this.state.enemy.id].color);
    this.ensureBoardPlayable();
    this.refreshAll();
    this.showRewardPanel(false);
    this.showOverlay(false);
  }

  private createBoardTiles(): void {
    for (let i = 0; i < BOARD_SIZE; i += 1) {
      const point = { col: i % BOARD_CONFIG.cols, row: Math.floor(i / BOARD_CONFIG.cols) };
      const x = BOARD_X + point.col * PITCH;
      const y = BOARD_Y + point.row * PITCH;
      const container = this.add.container(x, y).setDepth(DEPTH.tiles);
      const bg = this.add.graphics();
      const letter = this.add.text(0, -1, "", {
        fontFamily: FONTS.serif,
        fontSize: "26px",
        fontStyle: "bold",
        color: hex(COLORS.parchment),
      }).setOrigin(0.5);
      const hit = this.add.rectangle(0, 0, TILE_SIZE + 6, TILE_SIZE + 6, 0xffffff, 0.001).setInteractive();
      hit.on("pointerdown", () => this.onTileDown(i));
      hit.on("pointerover", () => this.onTileOver(i));
      container.add([bg, letter, hit]);
      this.tiles.push({ container, bg, letter, index: i });
    }
  }

  private onTileDown(index: CellIndex): void {
    if (this.state.phase !== "player") return;
    this.dragging = true;
    try {
      this.sfx.select(index);
    } catch {}
    const res = extendSelection(this.selection, index);
    if (res.action === "added") {
      this.selection = res.selection;
    } else if (res.action === "invalid" && this.selection.length === 0) {
      this.selection = [index];
    } else if (res.action === "invalid") {
      // keep current selection
    } else {
      this.selection = res.selection;
    }
    this.refreshSelection();
  }

  private onTileOver(index: CellIndex): void {
    if (!this.dragging || this.state.phase !== "player") return;
    if (this.selection.includes(index)) return;
    if (this.selection.length === 0) {
      this.selection = [index];
      this.refreshSelection();
      return;
    }
    const last = this.selection[this.selection.length - 1] as CellIndex;
    if (!Phaser.Math.Distance.Between(this.tiles[last].container.x, this.tiles[last].container.y, this.tiles[index].container.x, this.tiles[index].container.y) <= PITCH * 1.6) return;
    const neighbors = this.tiles[last].container;
    void neighbors;
    const a = last % BOARD_CONFIG.cols;
    const b = Math.floor(last / BOARD_CONFIG.cols);
    const c = index % BOARD_CONFIG.cols;
    const d = Math.floor(index / BOARD_CONFIG.cols);
    if (Math.abs(a - c) <= 1 && Math.abs(b - d) <= 1 && !(a === c && b === d)) {
      this.selection.push(index);
      this.sfx.select();
      this.refreshSelection();
    }
  }

  update(): void {
    if (this.dragging && this.input.activePointer.isDown === false) {
      this.dragging = false;
    }
  }

  private clearSelection(): void {
    if (this.state.phase !== "player") return;
    this.selection = [];
    this.refreshSelection();
  }

  private refreshSelection(): void {
    const word = wordFromSelection(this.board, this.selection);
    if (this.selection.length === 0) {
      this.wordText.setText("—");
      this.damageText.setText("Selecciona letras para formar una palabra.");
      this.bonusText.setText("");
      this.playButton.setEnabled(false);
    } else {
      this.wordText.setText(word || "—");
      if (word.length < MIN_WORD_LENGTH) {
        this.damageText.setText(`Mínimo ${MIN_WORD_LENGTH} letras.`);
        this.bonusText.setText("");
        this.playButton.setEnabled(false);
      } else if (!this.validator.isWord(word)) {
        this.damageText.setText("No está en el diccionario.");
        this.bonusText.setText("");
        this.playButton.setEnabled(false);
      } else {
        const estimate = estimateWordDamage(this.state, word);
        this.damageText.setText(`Daño estimado: ${estimate.total} · ${estimate.category}`);
        this.bonusText.setText(describeDamageBonuses(estimate).join(" · "));
        this.playButton.setEnabled(this.state.phase === "player");
      }
    }

    for (const tile of this.tiles) {
      const idx = tile.index;
      const selected = this.selection.indexOf(idx);
      tile.bg.clear();
      const inHint = this.hintCells.has(idx);
      if (selected >= 0) {
        tile.bg.fillStyle(COLORS.gold, 0.95);
        tile.bg.fillRoundedRect(-TILE_SIZE / 2, -TILE_SIZE / 2, TILE_SIZE, TILE_SIZE, 9);
        tile.bg.lineStyle(2, COLORS.goldBright, 1);
        tile.bg.strokeRoundedRect(-TILE_SIZE / 2, -TILE_SIZE / 2, TILE_SIZE, TILE_SIZE, 9);
        tile.bg.fillStyle(COLORS.white, 0.16);
        tile.bg.fillRoundedRect(-TILE_SIZE / 2 + 3, -TILE_SIZE / 2 + 3, TILE_SIZE - 6, 10, 6);
        tile.letter.setColor(hex(COLORS.ink));
      } else if (inHint) {
        tile.bg.fillStyle(COLORS.teal, 0.26);
        tile.bg.fillRoundedRect(-TILE_SIZE / 2, -TILE_SIZE / 2, TILE_SIZE, TILE_SIZE, 9);
        tile.bg.lineStyle(1.5, COLORS.teal, 0.9);
        tile.bg.strokeRoundedRect(-TILE_SIZE / 2, -TILE_SIZE / 2, TILE_SIZE, TILE_SIZE, 9);
        tile.letter.setColor(hex(COLORS.parchment));
      } else {
        tile.bg.fillStyle(COLORS.panelLight, 0.98);
        tile.bg.fillRoundedRect(-TILE_SIZE / 2, -TILE_SIZE / 2, TILE_SIZE, TILE_SIZE, 9);
        tile.bg.lineStyle(1, COLORS.border, 0.9);
        tile.bg.strokeRoundedRect(-TILE_SIZE / 2, -TILE_SIZE / 2, TILE_SIZE, TILE_SIZE, 9);
        tile.bg.fillStyle(COLORS.white, 0.03);
        tile.bg.fillRoundedRect(-TILE_SIZE / 2 + 3, -TILE_SIZE / 2 + 3, TILE_SIZE - 6, 10, 6);
        tile.letter.setColor(hex(COLORS.parchment));
      }
    }
  }

  private syncTiles(): void {
    for (let i = 0; i < this.tiles.length; i += 1) {
      this.tiles[i].letter.setText(this.board[i] ?? "");
    }
    this.refreshSelection();
  }

  private refreshAll(): void {
    this.syncTiles();
    this.updateHud();
    this.updateLog();
    this.updateRelics();
    this.playButton.setEnabled(this.state.phase === "player" && this.selection.length >= MIN_WORD_LENGTH && this.validator.isWord(wordFromSelection(this.board, this.selection)));
    this.hintButton.setEnabled(this.state.phase === "player" && this.state.hintsLeft > 0);
    this.shuffleButton.setEnabled(this.state.phase === "player" && this.state.shufflesLeft > 0);
    this.clearButton.setEnabled(this.state.phase === "player" && this.selection.length > 0);
  }

  private updateHud(): void {
    const heroHp = this.state.hero.hp;
    const heroMax = this.state.hero.maxHp;
    drawBar(this.hpBar, 160, 86, 220, 14, heroHp / Math.max(1, heroMax), COLORS.green);
    this.heroHpText.setText(`${heroHp} / ${heroMax}`);
    const def = this.state.enemy;
    drawBar(this.enemyHpBar, 710, 86, 264, 14, def.hp / Math.max(1, def.maxHp), COLORS.red);
    this.enemyHpText.setText(`${def.hp} / ${def.maxHp}`);
    this.enemyNameText.setText(def.name);
    const epithet = (this.children.getByName("enemyEpithet") as Phaser.GameObjects.Text | undefined);
    if (epithet) epithet.setText(getEnemyDefinitionOf(this.state).epithet);
    this.enemyIntentText.setText(def.intent.interrupted ? "Anunciado: interrumpido" : `${def.intent.kind === "heavy" ? "¡ATAQUE PESADO! " : "Ataque: "}${def.intent.name} (${def.intent.damage})`);
    this.enemyPassiveText.setText(getEnemyDefinitionOf(this.state).passive);
    this.turnText.setText(`Ronda ${this.state.turn} · ${this.state.phase === "player" ? "Tu turno" : this.state.phase === "enemy" ? "Turno enemigo" : this.state.phase === "victory" ? "Victoria" : "Derrota"}`);
    this.hintsText.setText(`Pistas: ${this.state.hintsLeft}`);
    this.shufflesText.setText(`Mezclar: ${this.state.shufflesLeft}`);
  }

  private updateLog(): void {
    const logs = this.state.log.slice(-8);
    for (let i = 0; i < this.logTexts.length; i += 1) {
      const log = logs[i];
      if (!log) {
        this.logTexts[i].setText("");
        continue;
      }
      const color = log.tone === "good" ? COLORS.green : log.tone === "bad" ? COLORS.red : log.tone === "special" ? COLORS.goldBright : COLORS.parchment;
      this.logTexts[i].setText(log.text);
      this.logTexts[i].setColor(hex(color));
    }
  }

  private updateRelics(): void {
    const upgrades = this.state.upgrades;
    for (let i = 0; i < this.relicTexts.length; i += 1) {
      if (upgrades[i]) {
        const def = getUpgrade(upgrades[i]);
        this.relicTexts[i].setText(`${def.icon} ${def.name}`);
        this.relicTexts[i].setColor(hex(COLORS.parchment));
      } else {
        this.relicTexts[i].setText("—");
        this.relicTexts[i].setColor(hex(COLORS.muted));
      }
    }
  }

  private ensureBoardPlayable(): void {
    const check = ensurePlayableBoard(this.board, this.validator, this.rng, 3);
    if (check.regenerated || check.changed) {
      this.board = check.board;
    }
    this.syncTiles();
  }

  private useHint(): void {
    if (this.state.phase !== "player" || this.state.hintsLeft <= 0) return;
    this.hintWord = findPlayableWord(this.board, this.validator, { minLength: 3 }) ?? findPlayableWord(this.board, this.validator, { minLength: 2 });
    if (!this.hintWord) {
      this.ensureBoardPlayable();
      this.hintWord = findPlayableWord(this.board, this.validator, { minLength: 3 });
    }
    if (!this.hintWord) return;
    this.state.hintsLeft -= 1;
    this.hintCells.clear();
    for (const cell of this.hintWord.path) this.hintCells.add(cell);
    this.sfx.hint();
    this.time.delayedCall(2500, () => {
      this.hintCells.clear();
      this.refreshSelection();
    });
    this.refreshAll();
  }

  private useShuffle(): void {
    if (this.state.phase !== "player" || this.state.shufflesLeft <= 0) return;
    this.board = shuffleBoard(this.board, this.rng);
    this.state.shufflesLeft -= 1;
    this.selection = [];
    this.hintCells.clear();
    this.sfx.shuffle();
    this.ensureBoardPlayable();
    this.refreshAll();
  }

  private playWord(): void {
    const word = wordFromSelection(this.board, this.selection);
    if (this.state.phase !== "player" || word.length < MIN_WORD_LENGTH) return;
    const result = resolvePlayerAttack(this.state, word, this.validator);
    if (!result.ok) {
      if (result.reason === "not-a-word") this.sfx.invalid();
      this.refreshAll();
      return;
    }
    this.sfx.attack();
    this.enemyArt?.hit();
    floatingText(this, this.enemyArt?.container.x ?? 754, 420, `-${result.damage}`, COLORS.goldBright, 32, DEPTH.tooltip);
    if (result.healed && result.healed > 0) {
      floatingText(this, 200, 520, `+${result.healed}`, COLORS.green, 24, DEPTH.tooltip);
    }
    this.board = refillBoard(this.board, this.selection, this.rng);
    this.selection = [];
    this.hintCells.clear();
    this.ensureBoardPlayable();
    this.refreshAll();

    if (result.enemyDefeated) {
      this.state.stats.enemiesDefeated += 1;
      this.enemyArt?.die(() => {
        this.showRewardPanel(!isFinalEnemy(this.state));
        if (isFinalEnemy(this.state)) {
          this.showOverlay(true, "VICTORIA", "Has purificado el Lexicon.\nLos manuscritos vuelven a guardar palabras en paz.");
        }
      });
      return;
    }

    if (this.state.phase === "enemy") {
      this.time.delayedCall(650, () => this.runEnemyTurn());
    }
  }

  private runEnemyTurn(): void {
    const result = resolveEnemyTurn(this.state);
    if (result.skipped) {
      this.refreshAll();
      return;
    }
    if (!result.interrupted && result.damage && result.damage > 0) {
      this.sfx.hit();
      floatingText(this, 200, 520, `-${result.damage}`, COLORS.red, 30, DEPTH.tooltip);
      this.cameras.main.shake(160, 0.004);
    } else if (result.interrupted) {
      this.sfx.block();
    }
    this.refreshAll();
    if (result.defeated || this.state.phase === "defeat") {
      this.showOverlay(true, "DERROTA", "La tinta te alcanza.\nRevisa tu vocabulario e inténtalo de nuevo.");
      return;
    }
    this.refreshAll();
  }

  private showRewardPanel(show: boolean, nextIndex?: number): void {
    if (show) {
      const idx = nextIndex ?? this.state.enemyIndex + 1;
      const choices = getUpgradeChoices(this.state, this.rng, 3);
      this.rewardPanel?.destroy(true);
      this.rewardCards = [];
      const panel = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2).setDepth(DEPTH.overlay);
      const bg = createPanel(this, -320, -210, 640, 420, { radius: 18 });
      bg.setDepth(DEPTH.overlay);
      panel.add(bg);
      const title = this.add.text(0, -170, "RECOMPENSA", {
        fontFamily: FONTS.sans,
        fontSize: "18px",
        fontStyle: "bold",
        color: hex(COLORS.goldBright),
        letterSpacing: 4,
      }).setOrigin(0.5);
      panel.add(title);
      const subtitle = this.add.text(0, -140, "Elige una reliquia para tu siguiente encuentro", {
        fontFamily: FONTS.sans,
        fontSize: "13px",
        color: hex(COLORS.parchment),
      }).setOrigin(0.5);
      panel.add(subtitle);

      choices.forEach((upgrade, i) => {
        const def = upgrade;
        const card = this.add.container(-190 + i * 190, 20).setDepth(DEPTH.overlay + 1);
        const cardBg = createPanel(this, -80, -120, 160, 240, { radius: 12 });
        cardBg.setDepth(DEPTH.overlay + 1);
        card.add(cardBg);
        const icon = this.add.text(0, -80, def.icon, {
          fontFamily: FONTS.sans,
          fontSize: "36px",
        }).setOrigin(0.5);
        card.add(icon);
        const name = this.add.text(0, -30, def.name, {
          fontFamily: FONTS.serif,
          fontSize: "16px",
          fontStyle: "bold",
          color: hex(COLORS.parchment),
          align: "center",
          wordWrap: { width: 130 },
        }).setOrigin(0.5);
        card.add(name);
        const desc = this.add.text(0, 40, def.description, {
          fontFamily: FONTS.sans,
          fontSize: "11px",
          color: hex(COLORS.parchment),
          align: "center",
          wordWrap: { width: 130 },
        }).setOrigin(0.5);
        card.add(desc);
        const hit = this.add.rectangle(0, 0, 160, 240, 0xffffff, 0.001).setInteractive({ useHandCursor: true });
        hit.on("pointerup", () => {
          this.applyReward(def.id, idx);
        });
        card.add(hit);
        panel.add(card);
        this.rewardCards.push({ container: card, id: def.id });
      });

      const skip = createButton(this, { x: -90, y: 150, width: 180, height: 44, label: "DESCANSAR", onClick: () => this.restAndContinue(idx) });
      skip.container.setDepth(DEPTH.overlay + 1);
      panel.add(skip.container);
      this.rewardPanel = panel;
      this.add.existing(panel);
    } else {
      this.rewardPanel?.destroy(true);
      this.rewardPanel = undefined as any;
      this.rewardCards = [];
    }
  }

  private applyReward(id: UpgradeId, nextIndex: number): void {
    const def = getUpgrade(id);
    if (!this.state.upgrades.includes(id)) {
      this.state.upgrades.push(id);
    }
    if (def.effects.maxHp) {
      this.state.hero.maxHp += def.effects.maxHp;
      this.state.hero.hp = Math.min(this.state.hero.maxHp, this.state.hero.hp + def.effects.maxHp);
    }
    if (def.effects.hints) this.state.hintsLeft += def.effects.hints;
    if (def.effects.shuffles) this.state.shufflesLeft += def.effects.shuffles;
    this.showRewardPanel(false);
    this.continueToNext(nextIndex);
  }

  private restAndContinue(nextIndex: number): void {
    this.state.hero.hp = Math.min(this.state.hero.maxHp, this.state.hero.hp + 18);
    this.state.hintsLeft += 1;
    this.state.shufflesLeft += 1;
    this.showRewardPanel(false);
    this.continueToNext(nextIndex);
  }

  private continueToNext(nextIndex: number): void {
    const def = ENEMIES[ENEMY_ORDER[nextIndex] as EnemyId];
    startBattle(this.state, def, nextIndex);
    if (this.enemyArt) {
      this.enemyArt.destroy();
    }
    this.enemyArt = createEnemyArt(this, def.id, 754, 520, def.color);
    this.board = createBoard(this.validator, this.rng);
    this.selection = [];
    this.hintCells.clear();
    this.ensureBoardPlayable();
    this.refreshAll();
  }

  private showOverlay(show: boolean, title?: string, body?: string): void {
    if (show) {
      this.overlayPanel?.destroy(true);
      const panel = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2).setDepth(DEPTH.overlay);
      const bg = createPanel(this, -280, -160, 560, 320, { radius: 18 });
      bg.setDepth(DEPTH.overlay);
      panel.add(bg);
      this.overlayTitle = this.add.text(0, -110, title ?? "", {
        fontFamily: FONTS.serif,
        fontSize: "48px",
        fontStyle: "bold",
        color: hex(COLORS.goldBright),
        stroke: "#080b12",
        strokeThickness: 6,
      }).setOrigin(0.5);
      panel.add(this.overlayTitle);
      this.overlayBody = this.add.text(0, -20, body ?? "", {
        fontFamily: FONTS.sans,
        fontSize: "16px",
        color: hex(COLORS.parchment),
        align: "center",
        wordWrap: { width: 460 },
      }).setOrigin(0.5);
      panel.add(this.overlayBody);
      const btn = createButton(this, { x: -120, y: 70, width: 240, height: 52, label: "VOLVER AL MENÚ", onClick: () => this.scene.start("MenuScene") });
      btn.container.setDepth(DEPTH.overlay + 1);
      panel.add(btn.container);
      this.overlayPanel = panel;
      this.add.existing(panel);
    } else {
      this.overlayPanel?.destroy(true);
      this.overlayPanel = undefined as any;
    }
  }
}
