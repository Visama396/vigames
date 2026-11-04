import { useEffect, useRef, useState } from "react";

export default function UndermineGame() {
  const gameRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined" || gameRef.current) return;

    let game: any = null;

    import("phaser").then((PhaserModule) => {
      const Phaser = PhaserModule.default || PhaserModule;
      import("../../games/undermine/scenes/BootScene").then(({ BootScene }) => {
        import("../../games/undermine/scenes/MineScene").then(({ MineScene }) => {
          const config: any = {
            type: Phaser.AUTO,
            parent: "undermine-game",
            width: 1024,
            height: 768,
            backgroundColor: "#0f172a",
            scene: [BootScene, MineScene],
            scale: {
              mode: Phaser.Scale.FIT,
              autoCenter: Phaser.Scale.CENTER_BOTH,
            },
            physics: {
              default: "arcade",
              arcade: {
                debug: false,
              },
            },
          };
          game = new Phaser.Game(config);
          gameRef.current = game;
        });
      });
    });

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full flex-col items-center justify-center gap-4 bg-slate-950 p-4">
      <div
        id="undermine-game"
        ref={containerRef}
        className="min-h-0 w-full max-w-[1024px] flex-1"
      />
      <div className="w-full max-w-[1024px] shrink-0 rounded border border-slate-700 bg-slate-900 p-4 font-mono text-xs text-slate-300">
        <h2 className="mb-2 text-sm font-semibold text-slate-100">Controles</h2>
        <ul className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
          <li>Click celda con recurso: minar (pico Nv1 poder 1)</li>
          <li>Click botón + click tablero: colocar máquina</li>
          <li>Click botón + click máquina igual: mejorarla (Mk2, Mk3...)</li>
          <li>Click CONECTAR: crear conexión</li>
          <li>Click máquina: seleccionar/cargar carbón</li>
          <li>La perforadora extrae la veta que ocupa y la añade al almacén</li>
          <li>Generador Mk1: 1 carbón/5 s → 5 W (cada Mk suma 5 W y 1 carbón/5 s)</li>
          <li>Perforadora Mk1: 1 W → 1 poder de minería/s</li>
          <li>Fundición 2 W y ensambladora 3 W por Mk</li>
          <li>Generador: punto verde = auto, rojo = carga manual</li>
          <li>Vender: usa la lista de materiales del panel derecho</li>
          <li>VENDER TODO: vender todos los recursos</li>
          <li>EXPANDIR: comprar más terreno (€5 por celda nueva)</li>
          <li>MEJORAR PICO: +1 poder de minería por nivel</li>
        </ul>
        <p className="mt-2 text-slate-400">Objetivo: 20 componentes</p>
        <p className="text-slate-400">Sin dinero al inicio - ¡Vende lo que mines!</p>
      </div>
    </div>
  );
}
