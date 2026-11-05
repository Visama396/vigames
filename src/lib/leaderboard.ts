import { isSupabaseConfigured, supabase } from "./supabase";

export interface LeaderboardEntry {
  game_slug: string;
  rank: number;
  username: string;
  display_name: string;
  score: number;
  detail: unknown;
  updated_at: string;
}

export async function loadLeaderboards(
  gameSlugs: string[],
  limit = 10,
): Promise<{ entries: LeaderboardEntry[]; error?: string }> {
  if (!isSupabaseConfigured) {
    return {
      entries: [],
      error:
        "Supabase no está configurado. Añade PUBLIC_SUPABASE_URL y PUBLIC_SUPABASE_ANON_KEY.",
    };
  }

  try {
    const { data, error } = await supabase.rpc("get_leaderboards", {
      p_game_slugs: gameSlugs,
      p_limit: limit,
    });

    if (error) {
      return { entries: [], error: error.message };
    }

    const entries = (Array.isArray(data) ? data : []).map((row) => ({
      game_slug: String(row.game_slug),
      rank: Number(row.rank),
      username: String(row.username),
      display_name: String(row.display_name || row.username),
      score: Number(row.score),
      detail: row.detail,
      updated_at: String(row.updated_at ?? ""),
    }));

    return { entries };
  } catch (error) {
    return {
      entries: [],
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}
