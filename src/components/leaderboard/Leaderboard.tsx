import { useEffect, useState } from "react";
import { games } from "../../data/games";
import { formatScoreDetail } from "../../lib/game-scores";
import {
  loadLeaderboards,
  type LeaderboardEntry,
} from "../../lib/leaderboard";

const scoredGames = games.filter(
  (game) => game.supportsScores && !game.comingSoon,
);

const PODIUM = ["🥇", "🥈", "🥉"];

export default function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    void loadLeaderboards(
      scoredGames.map((game) => game.slug),
      10,
    ).then((result) => {
      if (!active) return;
      setEntries(result.entries);
      setError(result.error ?? "");
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, []);

  if (error) {
    return (
      <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-5 text-sm leading-relaxed text-amber-100">
        <p className="font-semibold">No se pudo cargar la clasificación</p>
        <p className="mt-1 text-amber-200/80">{error}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-5" aria-busy="true" aria-label="Cargando clasificación">
        {scoredGames.map((game) => (
          <div
            key={game.slug}
            className="h-48 animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {scoredGames.map((game) => {
        const rows = entries.filter((entry) => entry.game_slug === game.slug);

        return (
          <section
            key={game.slug}
            className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]"
            aria-labelledby={`ranking-${game.slug}`}
          >
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/10 px-5 py-4">
              <div>
                <h2
                  id={`ranking-${game.slug}`}
                  className="text-lg font-bold tracking-tight"
                >
                  {game.title}
                </h2>
                <p className="mt-0.5 text-xs text-slate-400">
                  Top 10 · {game.category.join(" · ")}
                </p>
              </div>
              <a
                href={`/games/${game.slug}`}
                className="rounded-lg bg-brand-500 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-400"
              >
                Jugar
              </a>
            </div>

            {rows.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="text-sm font-semibold text-slate-200">
                  Todavía no hay récords
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Inicia sesión, juega y guarda tu mejor resultado para aparecer aquí.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[32rem] text-left text-sm">
                  <thead className="text-[11px] uppercase tracking-wider text-slate-500">
                    <tr>
                      <th scope="col" className="px-5 py-2 font-medium">
                        Puesto
                      </th>
                      <th scope="col" className="px-5 py-2 font-medium">
                        Jugador
                      </th>
                      <th scope="col" className="px-5 py-2 font-medium">
                        Progreso
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {rows.map((entry) => (
                      <tr key={`${entry.game_slug}-${entry.username}`}>
                        <td className="w-20 px-5 py-3 font-mono text-sm text-slate-300">
                          {PODIUM[entry.rank - 1] ?? `#${entry.rank}`}
                        </td>
                        <td className="px-5 py-3">
                          <span className="font-semibold text-slate-100">
                            {entry.display_name}
                          </span>
                          <span className="ml-2 text-xs text-slate-500">
                            @{entry.username}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-slate-300">
                          {formatScoreDetail(
                            entry.game_slug,
                            entry.detail,
                            entry.score,
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
