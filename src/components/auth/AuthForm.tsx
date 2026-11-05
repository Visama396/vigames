import { useEffect, useState, type FormEvent } from "react";
import {
  getCurrentAccount,
  login,
  register,
  type Account,
} from "../../lib/auth";

interface AuthFormProps {
  mode: "login" | "register";
}

function safeNextPath(): string {
  if (typeof window === "undefined") return "/";
  const next = new URLSearchParams(window.location.search).get("next");
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/";
  return next;
}

export default function AuthForm({ mode }: AuthFormProps) {
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  const isRegister = mode === "register";

  useEffect(() => {
    let active = true;
    void getCurrentAccount().then((account) => {
      if (!active) return;
      setCheckingSession(false);
      if (account) window.location.replace(safeNextPath());
    });
    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (isRegister && password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    setLoading(true);
    try {
      const result: { account?: Account; error?: string } = isRegister
        ? await register(username, password, displayName)
        : await login(username, password);

      if (result.error) {
        setError(result.error);
        return;
      }

      if (result.account) {
        window.location.assign(safeNextPath());
      }
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Algo salió mal. Inténtalo de nuevo.",
      );
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition-colors focus:border-brand-400";

  const disabled = loading || checkingSession;

  return (
    <div className="mx-auto flex w-full max-w-md flex-col px-4 py-12 sm:px-6 sm:py-16">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-400">
          {isRegister ? "Crear cuenta" : "Iniciar sesión"}
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          {isRegister ? "Únete a Visagames" : "Bienvenido de nuevo"}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">
          {isRegister
            ? "Solo necesitas un nombre de usuario y una contraseña. Sin correo, sin confirmaciones."
            : "Entra para recuperar tu progreso guardado y tus puestos en la clasificación."}
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-8 space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6"
      >
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
            Usuario
          </span>
          <input
            type="text"
            value={username}
            onChange={(event) =>
              setUsername(event.target.value.toLowerCase().slice(0, 16))
            }
            placeholder="tu_usuario"
            autoComplete="username"
            required
            minLength={3}
            maxLength={16}
            pattern="[a-z0-9_]+"
            className={inputClass}
          />
          {isRegister && (
            <span className="mt-1 block text-[11px] text-slate-500">
              Entre 3 y 16 caracteres: letras minúsculas, números y guiones bajos.
            </span>
          )}
        </label>

        {isRegister && (
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
              Nombre visible <span className="font-normal normal-case">(opcional)</span>
            </span>
            <input
              type="text"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value.slice(0, 20))}
              placeholder="Cómo te verán en la clasificación"
              autoComplete="nickname"
              maxLength={20}
              className={inputClass}
            />
          </label>
        )}

        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
            Contraseña
          </span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
            autoComplete={isRegister ? "new-password" : "current-password"}
            required
            minLength={4}
            className={inputClass}
          />
        </label>

        {isRegister && (
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
              Repite la contraseña
            </span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
              required
              minLength={4}
              className={inputClass}
            />
          </label>
        )}

        {error && (
          <p
            role="alert"
            className="rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-sm text-red-200"
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={disabled || !username.trim() || !password}
          className="w-full rounded-xl bg-brand-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition-colors hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {checkingSession
            ? "Comprobando sesión…"
            : loading
              ? "..."
              : isRegister
                ? "Crear cuenta"
                : "Entrar"}
        </button>

        <p className="text-center text-[11px] leading-relaxed text-slate-500">
          No usamos email. Guarda bien tu contraseña: no hay recuperación por correo.
        </p>
      </form>

      <p className="mt-6 text-center text-sm text-slate-400">
        {isRegister ? "¿Ya tienes cuenta?" : "¿Todavía no tienes cuenta?"}{" "}
        <a
          href={isRegister ? "/login" : "/register"}
          className="font-semibold text-brand-300 hover:text-brand-200"
        >
          {isRegister ? "Iniciar sesión" : "Crear una gratis"}
        </a>
      </p>
    </div>
  );
}
