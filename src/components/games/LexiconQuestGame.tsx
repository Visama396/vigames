import { useEffect, useRef } from "react";

export default function LexiconQuestGame() {
  const gameRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined" || gameRef.current) return;

    let game: any = null;

    import("phaser").then((PhaserModule) => {
      const Phaser = PhaserModule.default || PhaserModule;
      import("../../games/lexicon-quest/scenes/BootScene").then(({ BootScene }) => {
        import("../../games/lexicon-quest/scenes/MenuScene").then(({ MenuScene }) => {
          import("../../games/lexicon-quest/scenes/BattleScene").then(({ BattleScene }) => {
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
            game = new Phaser.Game(config);
            gameRef.current = game;
          });
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
    <div className="flex h-[calc(100vh-4rem)] w-full items-center justify-center bg-slate-950">
      <div id="lexicon-quest-game" ref={containerRef} className="h-full w-full max-w-[1024px] max-h-[768px]" />
    </div>
  );
}
