import { useEffect, useRef } from "react";
import { hydrateGameProgress } from "../../lib/game-progress";

export default function LexiconQuestGame() {
  const gameRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined" || gameRef.current) return;

    let cancelled = false;

    const boot = async () => {
      await hydrateGameProgress("lexicon-quest");
      if (cancelled) return;

      const PhaserModule = await import("phaser");
      if (cancelled) return;
      const Phaser = PhaserModule.default || PhaserModule;

      const [{ BootScene }, { MenuScene }, { BattleScene }] = await Promise.all([
        import("../../games/lexicon-quest/scenes/BootScene"),
        import("../../games/lexicon-quest/scenes/MenuScene"),
        import("../../games/lexicon-quest/scenes/BattleScene"),
      ]);
      if (cancelled) return;

      const config: any = {
        type: Phaser.AUTO,
        parent: "lexicon-quest-game",
        width: 1024,
        height: 768,
        backgroundColor: "#090d18",
        scene: [BootScene, MenuScene, BattleScene],
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
    <div className="flex h-[calc(100vh-4rem)] w-full items-center justify-center bg-slate-950">
      <div id="lexicon-quest-game" ref={containerRef} className="h-full w-full max-w-[1024px] max-h-[768px]" />
    </div>
  );
}
