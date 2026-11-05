import { useEffect, useState } from "react";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { getCurrentAccount, logout, type Account } from "../../lib/auth";
import { clearLocalGameProgress } from "../../lib/game-progress";
import { supabase } from "../../lib/supabase";

export default function HeaderAuth() {
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    void getCurrentAccount().then((current) => {
      if (!active) return;
      setAccount(current);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        if (!session) {
          setAccount(null);
          setLoading(false);
          return;
        }
        void getCurrentAccount().then((current) => {
          if (active) setAccount(current);
        });
      },
    );

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleLogout() {
    await logout();
    clearLocalGameProgress();
    setAccount(null);
    window.location.assign("/");
  }

  if (loading) {
    return (
      <div className="ml-auto flex items-center gap-2" aria-hidden="true">
        <span className="hidden h-9 w-24 animate-pulse rounded-lg bg-white/5 sm:block" />
        <span className="h-9 w-28 animate-pulse rounded-lg bg-white/10" />
      </div>
    );
  }

  if (account) {
    return (
      <div className="ml-auto flex items-center gap-2">
        <span
          className="hidden max-w-40 truncate rounded-lg bg-white/5 px-3 py-2 text-sm font-medium text-slate-200 sm:block"
          title={`@${account.username}`}
        >
          {account.display_name || account.username}
        </span>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-lg border border-white/10 px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
        >
          Salir
        </button>
      </div>
    );
  }

  return (
    <div className="ml-auto flex items-center gap-2">
      <a
        href="/login"
        className="hidden rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white sm:block"
      >
        Iniciar sesión
      </a>
      <a
        href="/register"
        className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition-colors hover:bg-brand-400"
      >
        Crear cuenta
      </a>
    </div>
  );
}
