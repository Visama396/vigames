import { useEffect, useRef } from "react";
import { hydrateGameProgress } from "../../lib/game-progress";

export default function TenlinkGame() {
  const gameRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined" || gameRef.current) return;

    let cancelled = false;

    const boot = async () => {
      await hydrateGameProgress("tenlink");
      if (cancelled) return;

      const PhaserModule = await import("phaser");
      if (cancelled) return;
      const Phaser = PhaserModule.default || PhaserModule;

      const [{ BootScene }, { MenuScene }, { GameScene }] = await Promise.all([
        import("../../games/tenlink/scenes/BootScene"),
        import("../../games/tenlink/scenes/MenuScene"),
        import("../../games/tenlink/scenes/GameScene"),
      ]);
      if (cancelled) return;

      const config: any = {
        type: Phaser.AUTO,
        parent: "tenlink-game",
        width: 1024,
        height: 1024,
        backgroundColor: "#08161f",
        disableContextMenu: true,
        scene: [BootScene, MenuScene, GameScene],
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
      };

      gameRef.current = new Phaser.Game(config);
    };

    void boot();

    return () => {
      cancelled = true;
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full items-center justify-center bg-slate-950 p-2 sm:p-3">
      <div
        id="tenlink-game"
        ref={containerRef}
        className="h-full max-h-[1024px] w-full max-w-[1024px]"
      />
    </div>
  );
}
