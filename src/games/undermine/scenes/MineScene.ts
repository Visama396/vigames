import Phaser from "phaser";
import { BOARD, EXPAND_COST, GENERATOR_POWER_OUTPUT, MACHINE_DEFS, RECIPES, RESOURCES } from "../config";
import { createInitialState, placeMachine, upgradeMachine, getMachineUpgradeCost, getMachinePowerDemand, getMachinePowerOutput, getMachineAtCell, connectMachines, loadCoalIntoGenerator, toggleGeneratorAuto, buyCoal, sellResource, getPowerStats, getTotalResource, mineCell, expandBoard, getExpansionCost, upgradePickaxe, getPickaxeUpgradeCost, buyCell } from "../state/game-state";
import { stepSimulation } from "../simulation/simulation";
import type { GameState, MachineState, MachineType, ResourceId, UiState } from "../types";

const RESOURCE_IDS = Object.keys(RESOURCES) as ResourceId[];

const PANEL_X_OFFSET = 240;
const PANEL_Y = 10;
const PANEL_WIDTH = 224;
const SELL_ROW_TOP = PANEL_Y + 30;
const SELL_ROW_HEIGHT = 30;
const SELL_ALL_Y = SELL_ROW_TOP + RESOURCE_IDS.length * SELL_ROW_HEIGHT + 6;
const PANEL_DETAILS_Y = SELL_ALL_Y + 44;
const PANEL_HEIGHT = 420;

interface SellRow {
  resource: ResourceId;
  label: Phaser.GameObjects.Text;
  button: Phaser.GameObjects.Rectangle;
  buttonText: Phaser.GameObjects.Text;
}

export class MineScene extends Phaser.Scene {
  private state!: GameState;
  private ui!: UiState;
  private gridGraphics!: Phaser.GameObjects.Graphics;
  private machineGraphics!: Phaser.GameObjects.Graphics;
  private connectionGraphics!: Phaser.GameObjects.Graphics;
  private selectionGraphics!: Phaser.GameObjects.Graphics;
  private progressGraphics!: Phaser.GameObjects.Graphics;
  private veinGraphics!: Phaser.GameObjects.Graphics;
  private resourceSprites: Phaser.GameObjects.Image[] = [];
  private machineLabels: Phaser.GameObjects.Text[] = [];
  private timeAccumulator = 0;
  private hudText!: Phaser.GameObjects.Text;
  private panelText!: Phaser.GameObjects.Text;
  private buttonTexts: Phaser.GameObjects.Text[] = [];
  private sellRows: SellRow[] = [];
  private sellAllButton!: Phaser.GameObjects.Rectangle;
  private sellAllText!: Phaser.GameObjects.Text;
  private expandButton!: Phaser.GameObjects.Rectangle;
  private expandButtonText!: Phaser.GameObjects.Text;
  private upgradeButton!: Phaser.GameObjects.Rectangle;
  private upgradeButtonText!: Phaser.GameObjects.Text;

  constructor() {
    super("MineScene");
  }

  create() {
    this.state = createInitialState();
    this.ui = {
      selectedMachineId: null,
      placementType: null,
      connectFromId: null,
      hoverCell: null,
      paused: false,
      message: null,
    };

    this.cameras.main.setBackgroundColor(0x0f172a);
    this.centerCamera();
    this.gridGraphics = this.add.graphics().setDepth(0);
    this.veinGraphics = this.add.graphics().setDepth(0);
    this.machineGraphics = this.add.graphics().setDepth(1);
    this.connectionGraphics = this.add.graphics().setDepth(2);
    this.selectionGraphics = this.add.graphics().setDepth(3);
    this.progressGraphics = this.add.graphics().setDepth(4);

    this.drawVein();
    this.drawGrid();

    this.hudText = this.add.text(10, 10, "", {
      fontFamily: "monospace",
      fontSize: "12px",
      color: "#e2e8f0",
      backgroundColor: "rgba(15,23,42,0.7)",
      padding: { x: 6, y: 4 },
    }).setScrollFactor(0).setDepth(100);

    const canvasWidth = this.scale.width || 1024;
    const panelX = canvasWidth - PANEL_X_OFFSET;

    this.createBuildButtons();
    this.createSellPanel();

    this.panelText = this.add.text(panelX + 8, PANEL_DETAILS_Y, "", {
      fontFamily: "monospace",
      fontSize: "11px",
      color: "#cbd5e1",
      padding: { x: 6, y: 4 },
      wordWrap: { width: PANEL_WIDTH - 24 },
    }).setScrollFactor(0).setDepth(101);

    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      this.handlePointerDown(pointer);
    });
    this.input.on("pointermove", this.handlePointerMove, this);
    if (this.input.mouse) {
      this.input.mouse.disableContextMenu();
    }

    this.events.on("update", this.updateSimulation, this);
  }

  private drawVein() {
    this.veinGraphics.clear();
    // No longer using fixed vein in new design
  }

  private centerCamera() {
    const ownedCells: Array<{ x: number; y: number }> = [];
    for (let y = 0; y < this.state.boardRows; y++) {
      for (let x = 0; x < this.state.boardCols; x++) {
        if (this.state.cells[y]?.[x]?.owned) ownedCells.push({ x, y });
      }
    }
    if (ownedCells.length === 0) return;
    let minX = ownedCells[0].x, maxX = ownedCells[0].x;
    let minY = ownedCells[0].y, maxY = ownedCells[0].y;
    for (const c of ownedCells) {
      if (c.x < minX) minX = c.x;
      if (c.x > maxX) maxX = c.x;
      if (c.y < minY) minY = c.y;
      if (c.y > maxY) maxY = c.y;
    }
    const centerX = ((minX + maxX + 1) / 2) * BOARD.cell;
    const centerY = ((minY + maxY + 1) / 2) * BOARD.cell;
    this.cameras.main.centerOn(centerX, centerY);
  }

  private drawGrid() {
    this.gridGraphics.clear();
    this.gridGraphics.lineStyle(1, 0x334155, 0.8);
    const width = this.state.boardCols * BOARD.cell;
    const height = this.state.boardRows * BOARD.cell;
    for (let x = 0; x <= this.state.boardCols; x++) {
      this.gridGraphics.moveTo(x * BOARD.cell, 0);
      this.gridGraphics.lineTo(x * BOARD.cell, height);
    }
    for (let y = 0; y <= this.state.boardRows; y++) {
      this.gridGraphics.moveTo(0, y * BOARD.cell);
      this.gridGraphics.lineTo(width, y * BOARD.cell);
    }
    this.gridGraphics.strokePath();
  }

  private createBuildButtons() {
    const canvasWidth = this.scale.width || 1024;
    const canvasHeight = this.scale.height || 768;
    const types: MachineType[] = ["drill", "smelter", "assembler", "generator"];
    let x = 10;
    const y = canvasHeight - 42;

    types.forEach((type) => {
      const def = MACHINE_DEFS[type];
      const rect = this.add.rectangle(x, y, 130, 32, 0x1e293b, 0.9)
        .setStrokeStyle(1, def.color)
        .setOrigin(0, 0)
        .setInteractive({ useHandCursor: true })
        .setScrollFactor(0)
        .setDepth(100);
      rect.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
        pointer.event.stopPropagation();
        this.ui.placementType = type;
        this.ui.connectFromId = null;
        this.showMessage(`Colocar ${def.label} (€${def.cost})`);
      });
      const watts =
        type === "generator"
          ? `+${GENERATOR_POWER_OUTPUT}W`
          : `${def.powerDemand}W`;
      this.add.text(x + 4, y + 9, `${def.label} €${def.cost} ${watts}`, {
        fontFamily: "monospace",
        fontSize: "10px",
        color: def.colorHex,
        wordWrap: { width: 122 },
      }).setScrollFactor(0).setDepth(101);
      x += 138;
    });

    // Connect button
    const crect = this.add.rectangle(x, y, 130, 32, 0x1e293b, 0.9)
      .setStrokeStyle(1, 0xa78bfa)
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true })
      .setScrollFactor(0)
      .setDepth(100);
    crect.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      pointer.event.stopPropagation();
      this.ui.placementType = null;
      this.ui.connectFromId = null;
      this.showMessage("Conectar: origen -> destino");
    });
    this.add.text(x + 4, y + 9, "CONECTAR", {
      fontFamily: "monospace",
      fontSize: "11px",
      color: "#a78bfa",
    }).setScrollFactor(0).setDepth(101);
    x += 138;

    // Expandir terreno: crea un anillo de celdas alrededor del tablero actual.
    this.expandButton = this.add.rectangle(x, y, 130, 32, 0x1e293b, 0.9)
      .setStrokeStyle(1, 0x22c55e)
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true })
      .setScrollFactor(0)
      .setDepth(100);
    this.expandButton.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      pointer.event.stopPropagation();
      this.tryExpand();
    });
    this.expandButtonText = this.add.text(x + 4, y + 9, "EXPANDIR", {
      fontFamily: "monospace",
      fontSize: "10px",
      color: "#22c55e",
    }).setScrollFactor(0).setDepth(101);
    x += 138;

    // Mejorar pico: +1 poder de minería por nivel.
    this.upgradeButton = this.add.rectangle(x, y, 130, 32, 0x1e293b, 0.9)
      .setStrokeStyle(1, 0xfbbf24)
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true })
      .setScrollFactor(0)
      .setDepth(100);
    this.upgradeButton.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      pointer.event.stopPropagation();
      this.tryUpgradePickaxe();
    });
    this.upgradeButtonText = this.add.text(x + 4, y + 9, "MEJORAR PICO", {
      fontFamily: "monospace",
      fontSize: "10px",
      color: "#fbbf24",
    }).setScrollFactor(0).setDepth(101);
    x += 138;
  }

  private tryExpand() {
    const result = expandBoard(this.state);
    if (result.ok) {
      this.centerCamera();
      this.drawGrid();
      this.showMessage(
        `Terreno ampliado: +${result.cells} celdas (€${result.cost})`,
        "success",
      );
    } else {
      this.showMessage(result.error || "No se puede ampliar", "error");
    }
  }

  private tryUpgradePickaxe() {
    const result = upgradePickaxe(this.state);
    if (result.ok) {
      this.showMessage(
        `Pico mejorado a Nv${result.level} (poder ${result.power})`,
        "success",
      );
    } else {
      this.showMessage(result.error || "No se puede mejorar", "error");
    }
  }

  private createSellPanel() {
    const panelX = (this.scale.width || 1024) - PANEL_X_OFFSET;

    this.add.rectangle(panelX, PANEL_Y, PANEL_WIDTH, PANEL_HEIGHT, 0x0f172a, 0.8)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0x334155)
      .setScrollFactor(0)
      .setDepth(100);

    this.add.text(panelX + 8, PANEL_Y + 7, "MATERIALES", {
      fontFamily: "monospace",
      fontSize: "12px",
      color: "#e2e8f0",
    }).setScrollFactor(0).setDepth(101);

    for (const [index, resource] of RESOURCE_IDS.entries()) {
      const y = SELL_ROW_TOP + index * SELL_ROW_HEIGHT;

      const label = this.add.text(panelX + 8, y + 5, "", {
        fontFamily: "monospace",
        fontSize: "11px",
        color: "#cbd5e1",
      }).setScrollFactor(0).setDepth(101);

      const button = this.add.rectangle(panelX + PANEL_WIDTH - 96, y, 88, 24, 0x1e293b, 0.9)
        .setOrigin(0, 0)
        .setStrokeStyle(1, 0x22c55e)
        .setInteractive({ useHandCursor: true })
        .setScrollFactor(0)
        .setDepth(100);
      button.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
        pointer.event.stopPropagation();
        const result = sellResource(this.state, resource);
        if (result.ok) {
          this.showMessage(
            `Vendido: ${result.amount} ${RESOURCES[resource].short} (+€${result.credits})`,
            "success",
          );
        } else {
          this.showMessage(result.error || "Nada que vender", "error");
        }
      });

      const buttonText = this.add.text(panelX + PANEL_WIDTH - 92, y + 5, "", {
        fontFamily: "monospace",
        fontSize: "10px",
        color: "#22c55e",
      }).setScrollFactor(0).setDepth(101);

      this.sellRows.push({ resource, label, button, buttonText });
    }

    this.sellAllButton = this.add.rectangle(
      panelX + 8,
      SELL_ALL_Y,
      PANEL_WIDTH - 16,
      28,
      0x14532d,
      0.9,
    )
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0x22c55e)
      .setInteractive({ useHandCursor: true })
      .setScrollFactor(0)
      .setDepth(100);
    this.sellAllButton.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      pointer.event.stopPropagation();
      this.sellAllResources();
    });

    this.sellAllText = this.add.text(panelX + 12, SELL_ALL_Y + 8, "", {
      fontFamily: "monospace",
      fontSize: "11px",
      color: "#bbf7d0",
    }).setScrollFactor(0).setDepth(101);
  }

  private sellAllResources() {
    let units = 0;
    let credits = 0;

    for (const resource of RESOURCE_IDS) {
      const result = sellResource(this.state, resource);
      if (!result.ok) continue;
      units += result.amount ?? 0;
      credits += result.credits ?? 0;
    }

    if (units > 0) {
      this.showMessage(`Vendidas ${units} unidades por €${credits}`, "success");
    } else {
      this.showMessage("Nada que vender", "error");
    }
  }

  private updateSellPanel() {
    let totalCredits = 0;

    for (const row of this.sellRows) {
      const amount = getTotalResource(this.state, row.resource);
      const credits = amount * RESOURCES[row.resource].price;
      totalCredits += credits;

      row.label.setText(`${RESOURCES[row.resource].short}: ${amount}`);
      row.buttonText.setText(`Vender €${credits}`);
      this.setRowEnabled(row.button, row.buttonText, amount > 0);
    }

    this.sellAllText.setText(`VENDER TODO €${totalCredits}`);
    this.setRowEnabled(this.sellAllButton, this.sellAllText, totalCredits > 0);
  }

  private setRowEnabled(
    button: Phaser.GameObjects.Rectangle,
    buttonText: Phaser.GameObjects.Text,
    enabled: boolean,
  ) {
    button.setAlpha(enabled ? 1 : 0.35);
    buttonText.setAlpha(enabled ? 1 : 0.4);

    if (enabled) {
      if (!button.input) {
        button.setInteractive({ useHandCursor: true });
      } else {
        // disableInteractive() keeps the input object, so re-enable it directly.
        button.input.enabled = true;
      }
    } else if (button.input?.enabled) {
      button.disableInteractive();
    }
  }

  private mineCellAt(cellX: number, cellY: number) {
    const res = mineCell(this.state, cellX, cellY);
    if (res.ok && res.mined) {
      const amount = res.amount ?? 1;
      this.showMessage(
        `Minado: ${amount} ${RESOURCES[res.mined].short}`,
        "success",
      );
    } else if (res.error && res.error !== "Nada que minar.") {
      this.showMessage(res.error, "error");
    }
  }

  private getGeneratorToggleRect(machine: MachineState) {
    return {
      x: machine.x * BOARD.cell + BOARD.cell - 34,
      y: machine.y * BOARD.cell + 4,
      width: 28,
      height: 18,
    };
  }

  private getCellFromPointer(x: number, y: number) {
    return { x: Math.floor(x / BOARD.cell), y: Math.floor(y / BOARD.cell) };
  }

  /** Converts screen-space pointer coordinates to world coordinates (camera-aware). */
  private getWorldPointer(pointer: Phaser.Input.Pointer) {
    return this.cameras.main.getWorldPoint(pointer.x, pointer.y);
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer) {
    const world = this.getWorldPointer(pointer);
    const boardWidth = this.state.boardCols * BOARD.cell;
    const boardHeight = this.state.boardRows * BOARD.cell;

    if (
      world.x >= 0 &&
      world.y >= 0 &&
      world.x < boardWidth &&
      world.y < boardHeight
    ) {
      this.ui.hoverCell = this.getCellFromPointer(world.x, world.y);
    } else {
      this.ui.hoverCell = null;
    }
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer) {
    // Los botones y el panel de materiales están por encima del tablero: un
    // clic ahí no debe minar la celda que queda detrás.
    const canvasWidth = this.scale.width || 1024;
    const canvasHeight = this.scale.height || 768;
    const overBottomBar = pointer.y >= canvasHeight - 52;
    const overPanel =
      pointer.x >= canvasWidth - PANEL_X_OFFSET &&
      pointer.y >= PANEL_Y &&
      pointer.y <= PANEL_Y + PANEL_HEIGHT;
    if (overBottomBar || overPanel) return;

    // Convert the click from screen space into board/world space.
    const world = this.getWorldPointer(pointer);
    const x = world.x;
    const y = world.y;
    if (x < 0 || y < 0) return;
    const boardWidth = this.state.boardCols * BOARD.cell;
    const boardHeight = this.state.boardRows * BOARD.cell;
    if (x >= boardWidth || y >= boardHeight) return;

    const cell = this.getCellFromPointer(x, y);
    if (cell.x < 0 || cell.y < 0 || cell.x >= this.state.boardCols || cell.y >= this.state.boardRows) return;

    // Check if clicking empty/resource cell - manual mining
    const cellState = this.state.cells[cell.y]?.[cell.x];
    const machine = getMachineAtCell(this.state, cell);

    if (this.ui.placementType) {
      // Si la celda ya tiene una máquina del mismo tipo, el clic la mejora.
      if (machine && machine.type === this.ui.placementType) {
        const upgrade = upgradeMachine(this.state, machine.id);
        if (upgrade.ok) {
          this.showMessage(
            `${MACHINE_DEFS[machine.type].label} mejorada a Mk${upgrade.level} (€${upgrade.cost})`,
            "success",
          );
          this.ui.placementType = null;
        } else {
          this.showMessage(upgrade.error || "No se puede mejorar", "error");
        }
        return;
      }

      const res = placeMachine(this.state, this.ui.placementType, cell.x, cell.y);
      if (res.ok) {
        this.showMessage(`Colocado ${MACHINE_DEFS[this.ui.placementType].label}`, "success");
        this.ui.placementType = null;
      } else {
        this.showMessage(res.error || "No se puede colocar", "error");
      }
      return;
    }

    if (this.ui.connectFromId) {
      if (machine && machine.id !== this.ui.connectFromId) {
        const res = connectMachines(this.state, this.ui.connectFromId, machine.id);
        if (res.ok) {
          this.showMessage("Conexión creada", "success");
        } else {
          this.showMessage(res.error || "Error", "error");
        }
        this.ui.connectFromId = null;
      } else if (machine) {
        this.ui.connectFromId = null;
      }
      return;
    }

    if (machine) {
      this.ui.selectedMachineId = machine.id;

      // Un taladro no impide minar a mano: los clics se suman a su producción.
      if (machine.type === "drill" && cellState?.owned && cellState.resource) {
        this.mineCellAt(cell.x, cell.y);
        return;
      }

      // Check if clicking on generator to load coal
      if (machine.type === "generator") {
        const toggle = this.getGeneratorToggleRect(machine);
        const onToggle =
          x >= toggle.x &&
          x <= toggle.x + toggle.width &&
          y >= toggle.y &&
          y <= toggle.y + toggle.height;

        if (onToggle) {
          const result = toggleGeneratorAuto(this.state, machine.id);
          if (result.ok) {
            this.showMessage(
              machine.autoFuel
                ? "Auto activado: se recarga solo con carbón del almacén"
                : "Auto desactivado: carga el generador con un clic",
              "success",
            );
          } else {
            this.showMessage(result.error || "No se puede cambiar", "error");
          }
          return;
        }

        const res = loadCoalIntoGenerator(this.state, machine.id);
        if (res.ok) this.showMessage("Carbón cargado en generador", "success");
        else if (res.error && res.error !== "El generador ya está lleno.") this.showMessage(res.error, "error");
      }
      return;
    }

    // Manual mining on empty/resource cells
    if (cellState && cellState.owned && cellState.resource) {
      this.mineCellAt(cell.x, cell.y);
      this.ui.selectedMachineId = null;
      return;
    }

    // Buy unowned adjacent cell
    if (cellState && !cellState.owned) {
      const res = buyCell(this.state, cell.x, cell.y);
      if (res.ok) {
        this.showMessage(`Celda comprada (€${EXPAND_COST})`, "success");
        this.centerCamera();
        this.drawGrid();
      } else {
        if (res.error?.includes("créditos")) {
          this.showMessage(res.error, "error");
        } else if (res.error?.includes("junto")) {
          this.showMessage(res.error, "error");
        } else {
          this.showMessage(res.error || "No se puede comprar", "error");
        }
      }
      this.ui.selectedMachineId = null;
      return;
    }

    this.ui.selectedMachineId = null;
  }

  private messageText?: Phaser.GameObjects.Text;
  private messageTimer?: Phaser.Time.TimerEvent;
  private showMessage(text: string, tone: "info" | "success" | "error" = "info") {
    const color = tone === "error" ? "#f87171" : tone === "success" ? "#4ade80" : "#e2e8f0";
    if (!this.messageText) {
      this.messageText = this.add.text(10, 10 + 40, text, {
        fontFamily: "monospace",
        fontSize: "12px",
        color,
        backgroundColor: "rgba(15,23,42,0.9)",
        padding: { x: 6, y: 4 },
      }).setScrollFactor(0).setDepth(101);
    } else {
      this.messageText.setText(text).setColor(color);
    }
    this.messageTimer?.remove(false);
    this.messageTimer = this.time.delayedCall(2000, () => {
      if (this.messageText) this.messageText.setText("");
    });
  }

  private updateSimulation(time: number, delta: number) {
    if (this.ui.paused) return;
    this.timeAccumulator += delta / 1000;
    while (this.timeAccumulator >= 0.25) {
      stepSimulation(this.state, 0.25);
      this.timeAccumulator -= 0.25;
    }
    this.render();
  }

  private render() {
    this.machineGraphics.clear();
    this.connectionGraphics.clear();
    this.selectionGraphics.clear();
    this.progressGraphics.clear();
    this.drawGrid();

    // Clean up resource sprites
    for (const sprite of this.resourceSprites) {
      sprite.destroy();
    }
    this.resourceSprites = [];

    for (const label of this.machineLabels) {
      label.destroy();
    }
    this.machineLabels = [];

    // Draw resource cells and unowned cells
    for (let y = 0; y < this.state.boardRows; y++) {
      for (let x = 0; x < this.state.boardCols; x++) {
        const cell = this.state.cells[y]?.[x];
        if (!cell) continue;
        if (cell.owned && cell.resource) {
          const key = cell.resource;
          const occupyingMachine = getMachineAtCell(this.state, { x, y });

          if (this.textures.exists(key)) {
            const sprite = this.add.image(
              x * BOARD.cell + BOARD.cell / 2,
              y * BOARD.cell + BOARD.cell / 2,
              key
            );
            // Si hay una máquina encima, el icono se dibuja más pequeño y por
            // encima de su fondo, para que el mineral siga viéndose nítido.
            const size = occupyingMachine ? BOARD.cell - 24 : BOARD.cell - 4;
            sprite.setDisplaySize(size, size);
            sprite.setAlpha(occupyingMachine ? 1 : 0.9);
            sprite.setDepth(1.5);
            this.resourceSprites.push(sprite);
          } else {
            const color = key === "coal" ? 0x475569 : 0x94a3b8;
            this.machineGraphics.fillStyle(color, 0.8);
            this.machineGraphics.fillCircle(x * BOARD.cell + BOARD.cell / 2, y * BOARD.cell + BOARD.cell / 2, BOARD.cell / 3);
          }

          // Barra de minado: se llena con cada golpe y se vacía al completar la veta.
          if (cell.health < cell.maxHealth) {
            const ratio = Math.min(1, Math.max(0, 1 - cell.health / cell.maxHealth));
            const barX = x * BOARD.cell + 6;
            const barY = y * BOARD.cell + BOARD.cell - 12;
            const barWidth = BOARD.cell - 12;
            const barHeight = 6;

            this.progressGraphics.fillStyle(0x0f172a, 0.85);
            this.progressGraphics.fillRoundedRect(barX, barY, barWidth, barHeight, 3);
            this.progressGraphics.fillStyle(0x22c55e, 0.95);
            this.progressGraphics.fillRoundedRect(barX, barY, barWidth * ratio, barHeight, 3);
          }
        } else if (!cell.owned) {
          // Check if adjacent to owned
          const adjacentOwned = [
            [x - 1, y],
            [x + 1, y],
            [x, y - 1],
            [x, y + 1],
          ].some(([cx, cy]) => {
            if (cx < 0 || cy < 0 || cx >= this.state.boardCols || cy >= this.state.boardRows) return false;
            return this.state.cells[cy]?.[cx]?.owned;
          });
          if (adjacentOwned) {
            const canBuy = this.state.credits >= EXPAND_COST;
            this.machineGraphics.fillStyle(canBuy ? 0x22c55e : 0x475569, 0.6);
            this.machineGraphics.fillRect(x * BOARD.cell + 8, y * BOARD.cell + 8, BOARD.cell - 16, BOARD.cell - 16);
            this.machineGraphics.lineStyle(2, canBuy ? 0x22c55e : 0x64748b);
            this.machineGraphics.strokeRect(x * BOARD.cell + 8, y * BOARD.cell + 8, BOARD.cell - 16, BOARD.cell - 16);
            const dollar = this.add.text(x * BOARD.cell + BOARD.cell / 2, y * BOARD.cell + BOARD.cell / 2, "$", {
              fontFamily: "monospace",
              fontSize: "18px",
              color: canBuy ? "#22c55e" : "#94a3b8",
            }).setOrigin(0.5);
            (dollar as any).setScrollFactor(0);
            this.resourceSprites.push(dollar as any);
          } else {
            this.machineGraphics.fillStyle(0x1e293b, 0.4);
            this.machineGraphics.fillRect(x * BOARD.cell, y * BOARD.cell, BOARD.cell, BOARD.cell);
          }
        }
      }
    }

    // Draw connections
    this.connectionGraphics.lineStyle(2, 0xa78bfa, 0.7);
    for (const conn of this.state.connections) {
      const from = this.state.machines.find(m => m.id === conn.fromMachineId);
      const to = this.state.machines.find(m => m.id === conn.toMachineId);
      if (!from || !to) continue;
      const fx = (from.x + MACHINE_DEFS[from.type].width / 2) * BOARD.cell;
      const fy = (from.y + MACHINE_DEFS[from.type].height / 2) * BOARD.cell;
      const tx = (to.x + MACHINE_DEFS[to.type].width / 2) * BOARD.cell;
      const ty = (to.y + MACHINE_DEFS[to.type].height / 2) * BOARD.cell;
      this.connectionGraphics.lineBetween(fx, fy, tx, ty);
    }
    this.connectionGraphics.strokePath();

    // Draw machines
    for (const machine of this.state.machines) {
      const def = MACHINE_DEFS[machine.type];
      const color = machine.powered ? def.color : 0x475569;
      this.machineGraphics.fillStyle(color, machine.active ? 0.8 : 0.4);
      this.machineGraphics.fillRect(machine.x * BOARD.cell + 4, machine.y * BOARD.cell + 4, def.width * BOARD.cell - 8, def.height * BOARD.cell - 8);
      this.machineGraphics.lineStyle(2, machine.active ? def.color : 0x64748b);
      this.machineGraphics.strokeRect(machine.x * BOARD.cell + 4, machine.y * BOARD.cell + 4, def.width * BOARD.cell - 8, def.height * BOARD.cell - 8);

      // Nivel y vatios de la máquina. El generador solo muestra el Mk para no
      // tapar el punto de auto (arriba a la derecha); sus W van en el panel.
      const labelText =
        machine.type === "generator"
          ? `Mk${machine.level}`
          : `Mk${machine.level} -${getMachinePowerDemand(machine)}W`;
      const label = this.add
        .text(
          machine.x * BOARD.cell + 6,
          machine.y * BOARD.cell + 4,
          labelText,
          {
            fontFamily: "monospace",
            fontSize: "8px",
            color: machine.type === "generator" ? "#facc15" : "#e2e8f0",
            backgroundColor: "rgba(15,23,42,0.75)",
            padding: { x: 2, y: 1 },
          },
        )
        .setDepth(1.6);
      this.machineLabels.push(label);
    }

    // Auto toggle de los generadores (verde = recarga automática, rojo = manual)
    for (const machine of this.state.machines) {
      if (machine.type !== "generator") continue;

      const toggle = this.getGeneratorToggleRect(machine);
      this.progressGraphics.fillStyle(0x0f172a, 0.95);
      this.progressGraphics.fillRoundedRect(toggle.x, toggle.y, toggle.width, toggle.height, 5);
      this.progressGraphics.lineStyle(1, 0x94a3b8, 0.9);
      this.progressGraphics.strokeRoundedRect(toggle.x, toggle.y, toggle.width, toggle.height, 5);
      this.progressGraphics.fillStyle(machine.autoFuel ? 0x22c55e : 0xef4444, 1);
      this.progressGraphics.fillCircle(toggle.x + toggle.width / 2, toggle.y + toggle.height / 2, 5);
    }

    // Selection
    if (this.ui.selectedMachineId) {
      const machine = this.state.machines.find(m => m.id === this.ui.selectedMachineId);
      if (machine) {
        const def = MACHINE_DEFS[machine.type];
        this.selectionGraphics.lineStyle(3, 0xfbbf24);
        this.selectionGraphics.strokeRect(machine.x * BOARD.cell, machine.y * BOARD.cell, def.width * BOARD.cell, def.height * BOARD.cell);
      }
    }

    // HUD
    this.updateSellPanel();

    const expansionCost = getExpansionCost(this.state);
    this.expandButtonText.setText(`EXPANDIR €${expansionCost}`);
    this.setRowEnabled(
      this.expandButton,
      this.expandButtonText,
      this.state.credits >= expansionCost,
    );

    const upgradeCost = getPickaxeUpgradeCost(this.state);
    this.upgradeButtonText.setText(`MEJORAR PICO €${upgradeCost}`);
    this.setRowEnabled(
      this.upgradeButton,
      this.upgradeButtonText,
      this.state.credits >= upgradeCost,
    );

    const power = getPowerStats(this.state);
    const ironOre = getTotalResource(this.state, "iron_ore");
    const ironIngot = getTotalResource(this.state, "iron_ingot");
    const component = getTotalResource(this.state, "component");
    const coal = getTotalResource(this.state, "coal");
    const sellStr = [
      ironOre > 0 ? `Hierro:${ironOre}` : null,
      ironIngot > 0 ? `Lingote:${ironIngot}` : null,
      component > 0 ? `Comp:${component}` : null,
      coal > 0 ? `Carbón:${coal}` : null,
    ].filter(Boolean).join(" | ");
    this.hudText.setText(
      `Créditos: €${this.state.credits} | Pico: Nv${this.state.pickaxeLevel} Poder:${this.state.pickaxePower} | Potencia: ${power.used}/${power.supply} W (demanda ${power.demand} W)\n` +
      `Componentes: ${this.state.componentsProduced}/20${sellStr ? " | " + sellStr : ""} | Tablero: ${this.state.boardCols}x${this.state.boardRows}`
    );

    // Panel
    if (this.ui.selectedMachineId) {
      const machine = this.state.machines.find(m => m.id === this.ui.selectedMachineId);
      if (machine) {
        const def = MACHINE_DEFS[machine.type];
        const recipe = RECIPES[machine.type];
        let panel = `${def.label} (${machine.id})\n`;
        panel += `Nivel: Mk${machine.level} | Mejora: €${getMachineUpgradeCost(machine)}\n`;
        panel += `Estado: ${machine.active ? "Activo" : "Pausado"} | ${machine.powered ? "Con energía" : "Sin energía"}\n`;
        panel +=
          machine.type === "generator"
            ? `Producción: ${getMachinePowerOutput(machine)} W\n`
            : `Consumo: ${getMachinePowerDemand(machine)} W\n`;
        if (machine.blockReason) panel += `Bloqueo: ${machine.blockReason}\n`;
        if (recipe && machine.type === "drill") {
          const cell = this.state.cells[machine.y]?.[machine.x];
          if (cell?.resource) {
            panel += `Veta: ${Math.max(0, cell.health).toFixed(1)}/${cell.maxHealth}\n`;
            panel += `Poder de minería: ${machine.level}/s\n`;
            panel += `Salida: directa al almacén\n`;
          } else {
            panel += `Sin veta\n`;
          }
        } else if (recipe && machine.type !== "generator") {
          panel += `Progreso: ${(machine.progress / recipe.duration * 100).toFixed(0)}% (x${machine.level} velocidad)\n`;
        }
        if (machine.type === "generator") {
          panel += `Auto: ${machine.autoFuel ? "Sí (verde)" : "No (rojo)"} — click en el punto\n`;
          panel += `Combustible: ${machine.fuelTimer.toFixed(1)}s\n`;
          panel += `Carbón interno: ${machine.inputs.coal ?? 0}\n`;
          panel += `Consumo: ${machine.level} carbón cada 5 s\n`;
        }
        panel += `\nEntradas:\n`;
        for (const [r, v] of Object.entries(machine.inputs)) {
          panel += `  ${r}: ${v}\n`;
        }
        panel += `Salidas:\n`;
        for (const [r, v] of Object.entries(machine.outputs)) {
          panel += `  ${r}: ${v}\n`;
        }
        panel += `\nClick: seleccionar/cargar carbón`;
        panel += `\nMejorar: elige su botón y vuelve a hacer click aquí`;
        this.panelText.setText(panel);
      }
    } else {
      this.panelText.setText("Selecciona una máquina\npara ver sus detalles.");
    }
  }
}
