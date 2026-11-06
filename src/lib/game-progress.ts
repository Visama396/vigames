import { SAVE_KEY as CHROMA_SAVE_KEY } from "../games/chroma/config.ts";
import { SAVE_KEY as EXIT_JAM_SAVE_KEY } from "../games/exit-jam/config.ts";
import { SAVE_KEY as LEXICON_SAVE_KEY } from "../games/lexicon-quest/config.ts";
import { SAVE_KEY as PURRGRID_SAVE_KEY } from "../games/purrgrid/config.ts";
import { SAVE_KEY as TENLINK_SAVE_KEY } from "../games/tenlink/config.ts";
import { SAVE_KEY as UNDERMINE_SAVE_KEY } from "../games/undermine/config.ts";
import { computeGameScore } from "./game-scores";
import { isSupabaseConfigured, supabase } from "./supabase";

export const GAME_STORAGE_KEYS = {
  purrgrid: PURRGRID_SAVE_KEY,
  chroma: CHROMA_SAVE_KEY,
  undermine: UNDERMINE_SAVE_KEY,
  "lexicon-quest": LEXICON_SAVE_KEY,
  "exit-jam": EXIT_JAM_SAVE_KEY,
  tenlink: TENLINK_SAVE_KEY,
} as const;

export type GameSlug = keyof typeof GAME_STORAGE_KEYS;

interface ProgressMeta {
  updatedAt: number;
  ownerId?: string;
}

const META_PREFIX = "visagames.progress-meta.v1.";
const pendingSaves = new Map<string, ReturnType<typeof setTimeout>>();

function getStorage(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

function storageKeyFor(gameSlug: string, override?: string): string {
  return (
    override ??
    GAME_STORAGE_KEYS[gameSlug as GameSlug] ??
    `visagames.progress.${gameSlug}`
  );
}

function metaKeyFor(gameSlug: string): string {
  return `${META_PREFIX}${gameSlug}`;
}

function readMeta(gameSlug: string): ProgressMeta | null {
  const storage = getStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(metaKeyFor(gameSlug));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ProgressMeta>;
    if (typeof parsed.updatedAt !== "number" || !Number.isFinite(parsed.updatedAt)) {
      return null;
    }
    return {
      updatedAt: parsed.updatedAt,
      ...(typeof parsed.ownerId === "string" ? { ownerId: parsed.ownerId } : {}),
    };
  } catch {
    return null;
  }
}

function writeMeta(gameSlug: string, updatedAt: number, ownerId?: string): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    const meta: ProgressMeta = { updatedAt };
    if (ownerId) meta.ownerId = ownerId;
    storage.setItem(metaKeyFor(gameSlug), JSON.stringify(meta));
  } catch {
    // Persistence is best effort.
  }
}

function parseProgress(raw: string | null): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function pushGameProgress(
  gameSlug: string,
  progress: unknown,
): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return;

  writeMeta(gameSlug, Date.now(), session.user.id);

  const { error } = await supabase.rpc("save_game_progress", {
    p_game_slug: gameSlug,
    p_progress: progress,
  });
  if (error) {
    console.warn(`[visagames] No se pudo guardar el progreso de ${gameSlug}`, error.message);
    return;
  }

  await pushGameScore(gameSlug, progress);
}

async function pushGameScore(
  gameSlug: string,
  progress: unknown,
): Promise<void> {
  const calculated = computeGameScore(gameSlug, progress);
  if (!calculated) return;

  const score = Math.max(
    0,
    Math.min(Number.MAX_SAFE_INTEGER, Math.round(calculated.score)),
  );

  const { error } = await supabase.rpc("submit_game_score", {
    p_game_slug: gameSlug,
    p_score: score,
    p_detail: calculated.detail,
  });
  if (error) {
    console.warn(`[visagames] No se pudo enviar la puntuación de ${gameSlug}`, error.message);
  }
}

/**
 * Pulls the signed-in user's cloud save into localStorage before a game boots.
 * Guest progress is uploaded when there is no cloud save yet.
 */
export async function hydrateGameProgress(
  gameSlug: string,
  overrideStorageKey?: string,
): Promise<void> {
  if (!isSupabaseConfigured || typeof window === "undefined") return;

  const storage = getStorage();
  if (!storage) return;

  const storageKey = storageKeyFor(gameSlug, overrideStorageKey);

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    const meta = readMeta(gameSlug);
    let localRaw = storage.getItem(storageKey);
    let localUpdatedAt = meta?.updatedAt ?? 0;

    // Local data from a different account must never leak into this one.
    if (meta?.ownerId && meta.ownerId !== session.user.id) {
      storage.removeItem(storageKey);
      storage.removeItem(metaKeyFor(gameSlug));
      localRaw = null;
      localUpdatedAt = 0;
    }

    const { data, error } = await supabase.rpc("load_game_progress", {
      p_game_slug: gameSlug,
    });
    if (error) {
      console.warn(
        `[visagames] No se pudo cargar el progreso de ${gameSlug}`,
        error.message,
      );
      return;
    }

    const row = Array.isArray(data) ? data[0] : data;
    const cloudProgress = row?.progress;
    const cloudUpdatedAt = Date.parse(row?.updated_at ?? "") || 0;

    if (cloudProgress !== undefined && cloudProgress !== null) {
      if (!localRaw || cloudUpdatedAt >= localUpdatedAt) {
        storage.setItem(storageKey, JSON.stringify(cloudProgress));
        writeMeta(gameSlug, cloudUpdatedAt || Date.now(), session.user.id);
        window.dispatchEvent(
          new CustomEvent("visagames:progress-hydrated", {
            detail: { gameSlug },
          }),
        );
        await pushGameScore(gameSlug, cloudProgress);
        return;
      }
    }

    const localProgress = parseProgress(localRaw);
    if (localProgress !== null) {
      await pushGameProgress(gameSlug, localProgress);
    }
  } catch (error) {
    console.warn(
      `[visagames] Error al sincronizar el progreso de ${gameSlug}`,
      error,
    );
  }
}

/**
 * Debounced cloud save. Safe to call on every local save; signed-out players
 * simply keep their localStorage progress.
 */
export function queueGameProgress(gameSlug: string, progress: unknown): void {
  if (!isSupabaseConfigured || typeof window === "undefined") return;

  writeMeta(gameSlug, Date.now());

  const previous = pendingSaves.get(gameSlug);
  if (previous) clearTimeout(previous);

  const timer = setTimeout(() => {
    pendingSaves.delete(gameSlug);
    void pushGameProgress(gameSlug, progress).catch((error) => {
      console.warn(`[visagames] Error al guardar el progreso de ${gameSlug}`, error);
    });
  }, 700);

  pendingSaves.set(gameSlug, timer);
}

/** Clears cached local saves when the user signs out. */
export function clearLocalGameProgress(): void {
  const storage = getStorage();
  if (!storage) return;

  for (const timer of pendingSaves.values()) clearTimeout(timer);
  pendingSaves.clear();

  for (const [gameSlug, key] of Object.entries(GAME_STORAGE_KEYS)) {
    try {
      storage.removeItem(key);
      storage.removeItem(metaKeyFor(gameSlug));
    } catch {
      // Best effort.
    }
  }
}
