"use client";

/**
 * Sprint RA-3 — Toggle "Seguir con avisos por email".
 *
 * Aparece debajo del hero en /p/[slug] solo cuando el visitante es un
 * booker logueado (canFavorite=true del endpoint /api/booker/favorite-state).
 *
 * Si el booker no tiene favoriteado al DJ aún, al activar este toggle se
 * crea el favorito + se activa notify_email (one-click follow + notify).
 * Si ya estaba favoriteado, solo flippea notify_email.
 */

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { toggleFollowNotifyAction } from "@/app/booker/actions";

interface Props {
  djUserId: string;
  djArtistName: string;
}

interface State {
  loaded: boolean;
  canFavorite: boolean;
  notifyEmail: boolean;
}

export function FollowNotifyToggle({ djUserId, djArtistName }: Props) {
  const router = useRouter();
  const [state, setState] = useState<State>({
    loaded: false,
    canFavorite: false,
    notifyEmail: false,
  });
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(
          `/api/booker/favorite-state?dj=${encodeURIComponent(djUserId)}`,
          { cache: "no-store" }
        );
        const data = (await res.json()) as {
          canFavorite?: boolean;
          notifyEmail?: boolean;
        };
        if (cancelled) return;
        setState({
          loaded: true,
          canFavorite: !!data.canFavorite,
          notifyEmail: !!data.notifyEmail,
        });
      } catch {
        if (!cancelled) setState((s) => ({ ...s, loaded: true }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [djUserId]);

  function handleToggle() {
    if (pending) return;
    startTransition(async () => {
      const res = await toggleFollowNotifyAction(djUserId);
      if (res.ok) {
        setState((s) => ({ ...s, notifyEmail: res.notifyEmail }));
        router.refresh();
      }
    });
  }

  // No mostrar mientras carga, o si visitante no puede seguir (DJ propio, anon)
  if (!state.loaded || !state.canFavorite) return null;

  const on = state.notifyEmail;
  return (
    <div
      role="switch"
      aria-checked={on}
      tabIndex={0}
      onClick={handleToggle}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleToggle();
        }
      }}
      className="mt-5 cursor-pointer select-none p-3 bg-cream border-2 border-border flex items-center gap-3 hover:bg-bg-panel transition-colors"
    >
      {/* Pill switch */}
      <span
        aria-hidden="true"
        className={`relative shrink-0 w-[44px] h-[24px] border-2 border-border transition-colors ${
          on ? "bg-orange" : "bg-bg-panel"
        }`}
      >
        <span
          className={`absolute top-[2px] left-[2px] w-[16px] h-[16px] bg-ink transition-transform duration-200 ${
            on ? "translate-x-[20px]" : "translate-x-0"
          }`}
        />
      </span>

      <span className="flex-1 min-w-0">
        <span className="block font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-fg">
          Seguir con avisos
        </span>
        <span className="block text-[11px] text-fg-muted mt-0.5 leading-snug">
          {on
            ? `✓ Te aviso por email cuando ${djArtistName} agende un show o publique disponibilidad.`
            : `Te aviso por email cuando ${djArtistName} agende un show o publique disponibilidad.`}
        </span>
      </span>

      <Bell
        aria-hidden="true"
        className={`shrink-0 w-[18px] h-[18px] ${on ? "text-orange" : "text-fg-muted"}`}
        strokeWidth={2.25}
      />
    </div>
  );
}
