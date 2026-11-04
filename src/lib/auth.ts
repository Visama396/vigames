import { isSupabaseConfigured, supabase } from "./supabase";

export interface Account {
  id: string;
  username: string;
  display_name: string;
}

// Supabase Auth exige un email, pero Visagames solo pide un nombre de usuario.
// Se usa el mismo truco que ViPlay y LaRegión: `${username}@app.local`.
const fakeEmail = (username: string) => `${username}@app.local`;

const NOT_CONFIGURED =
  "La autenticación no está configurada. Faltan PUBLIC_SUPABASE_URL y PUBLIC_SUPABASE_ANON_KEY.";

/**
 * Devuelve la cuenta vinculada al usuario autenticado. La tabla `accounts` es
 * compartida con el resto de proyectos y se relaciona mediante `auth_id`.
 */
export async function getCurrentAccount(): Promise<Account | null> {
  if (!isSupabaseConfigured) return null;

  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) return null;

    const { data, error } = await supabase
      .from("accounts")
      .select("id, username, display_name")
      .eq("auth_id", user.id)
      .maybeSingle();

    if (error || !data) return null;
    return data as Account;
  } catch {
    return null;
  }
}

export async function register(
  username: string,
  password: string,
  displayName?: string,
): Promise<{ account?: Account; error?: string }> {
  if (!isSupabaseConfigured) return { error: NOT_CONFIGURED };

  const cleanName = username.trim().toLowerCase();
  if (cleanName.length < 3 || cleanName.length > 16) {
    return { error: "El usuario debe tener entre 3 y 16 caracteres" };
  }
  if (password.length < 4) {
    return { error: "La contraseña debe tener al menos 4 caracteres" };
  }
  if (!/^[a-z0-9_]+$/.test(cleanName)) {
    return {
      error: "El usuario solo puede contener letras minúsculas, números y guiones bajos",
    };
  }

  // La tabla `accounts` no es legible antes de iniciar sesión (RLS), así que
  // se consulta la función SECURITY DEFINER compartida.
  const { data: taken, error: takenError } = await supabase.rpc(
    "username_taken",
    { p_username: cleanName },
  );
  if (takenError) {
    return { error: `No se pudo comprobar el usuario: ${takenError.message}` };
  }
  if (taken === true) return { error: "Ese usuario ya está en uso" };

  const { data, error } = await supabase.auth.signUp({
    email: fakeEmail(cleanName),
    password,
    options: {
      data: {
        username: cleanName,
        display_name: displayName?.trim() || cleanName,
      },
    },
  });

  if (error) return { error: error.message };
  if (!data.user) return { error: "No se pudo crear la cuenta" };

  // Si el proyecto exige confirmar el correo, no hay sesión y el RPC de
  // vinculación no puede ejecutarse como usuario autenticado.
  if (!data.session) {
    return {
      error:
        "La cuenta se creó, pero Supabase exige confirmar el correo. Desactiva la confirmación por email para usar usuarios sin email.",
    };
  }

  const account = await linkAccount(
    cleanName,
    displayName?.trim() || cleanName,
  );
  return account ? { account } : { error: "No se pudo crear el perfil" };
}

// Supabase oculta detalles detrás de mensajes genéricos; se traducen los casos
// habituales para distinguir una contraseña incorrecta de una cuenta que no
// existe o que requiere confirmación.
function friendlyAuthError(message?: string): string {
  if (!message) return "Usuario o contraseña incorrectos";
  if (/email not confirmed/i.test(message)) {
    return "La cuenta requiere confirmar el correo. Supabase Auth tiene la confirmación activada para este proyecto.";
  }
  if (/invalid login credentials/i.test(message)) {
    return "Usuario o contraseña incorrectos";
  }
  return message;
}

export async function login(
  username: string,
  password: string,
): Promise<{ account?: Account; error?: string }> {
  if (!isSupabaseConfigured) return { error: NOT_CONFIGURED };

  const cleanName = username.trim().toLowerCase();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: fakeEmail(cleanName),
    password,
  });

  if (error || !data.user) return { error: friendlyAuthError(error?.message) };

  // Conserva el nombre visible existente. `ensure_account_link` solo
  // sobrescribe display_name cuando el valor recibido no está vacío.
  const existing = await getCurrentAccount();
  if (existing) return { account: existing };

  const account = await linkAccount(cleanName, cleanName);
  return account ? { account } : { error: "No se pudo cargar el perfil" };
}

// Garantiza que existe la fila de `accounts` vinculada a auth.uid().
async function linkAccount(
  username: string,
  displayName: string,
): Promise<Account | null> {
  const { data, error } = await supabase.rpc("ensure_account_link", {
    p_username: username,
    p_display_name: displayName,
  });
  if (error || !data) return null;

  const account = data as Account;
  return {
    id: account.id,
    username: account.username,
    display_name: account.display_name,
  };
}

export async function logout(): Promise<void> {
  if (!isSupabaseConfigured) return;
  await supabase.auth.signOut();
}

export { fakeEmail };
