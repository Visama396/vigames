import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.PUBLIC_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY as string | undefined;

/**
 * Indica si las variables públicas de Supabase están definidas. Las pantallas
 * de autenticación muestran un aviso claro cuando falta configuración en lugar
 * de fallar con un error de red poco útil.
 */
export const isSupabaseConfigured = Boolean(url && anonKey);

// Los valores de reserva solo evitan que `createClient` falle durante el build
// o el renderizado en servidor. Sin configuración real, las llamadas de auth y
// progreso se omiten mediante `isSupabaseConfigured`.
export const supabase = createClient(
  url || "https://placeholder.supabase.co",
  anonKey || "public-anon-key",
);
