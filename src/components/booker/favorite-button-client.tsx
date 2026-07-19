"use client";

/**
 * Versión cliente-self-contained de <FavoriteButton>. Pensada para páginas
 * cacheadas estáticamente (/p/[slug], /dj) donde no queremos saber el estado
 * de auth en server-side render.
 *
 * Al montar, fetch a /api/booker/favorite-state?dj=... para saber:
 *   - canFavorite: si mostrarse (solo si visitante es booker logueado)
 *   - favorited: estado actual
 *
 * Al click:
 *   - Si canFavorite → server action toggle (optimistic update)
 *   - Si NO logueado → redirect a /signup/booker
 */
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { toggleFavoriteAction } from "@/app/booker/actions";

interface Props {
  djUserId: string;
  /** Tamaño: 'sm' (default, en cards) o 'lg' (hero de press kit). */
  size?: "sm" | "lg";
  /** Si true, redirige a /signup/booker cuando user no logueado. */
  redirectOnUnauth?: boolean;
  /**
   * Estado inicial conocido desde el server (páginas del booker logueado como
   * /booker/buscar y /booker/match). Si se pasa, NO hacemos el fetch por-card
   * (evita el N+1 de un request por cada DJ de la grilla).
   */
  initialCanFavorite?: boolean;
  initialFavorited?: boolean;
}

interface State {
  loaded: boolean;
  canFavorite: boolean;
  favorited: boolean;
}

export function FavoriteButtonClient({
  djUserId,
  size = "sm",
  redirectOnUnauth = true,
  initialCanFavorite,
  initialFavorited,
}: Props) {
  const router = useRouter();
  // Si el server ya nos dio el estado, arrancamos cargado y saltamos el fetch.
  const hasInitial = initialCanFavorite !== undefined;
  const [state, setState] = useState<State>(
    hasInitial
      ? {
          loaded: true,
          canFavorite: !!initialCanFavorite,
          favorited: !!initialFavorited,
        }
      : { loaded: false, canFavorite: false, favorited: false }
  );
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (hasInitial) return; // estado ya provisto por el server → sin fetch
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(
          `/api/booker/favorite-state?dj=${encodeURIComponent(djUserId)}`,
          { cache: "no-store" }
        );
        if (!res.ok) {
          if (!cancelled)
            setState({ loaded: true, canFavorite: false, favorited: false });
          return;
        }
        const json = await res.json();
        if (!cancelled) {
          setState({
            loaded: true,
            canFavorite: !!json.canFavorite,
            favorited: !!json.favorited,
          });
        }
      } catch {
        if (!cancelled)
          setState({ loaded: true, canFavorite: false, favorited: false });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [djUserId]);

  function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (!state.canFavorite) {
      if (redirectOnUnauth) {
        router.push(`/signup/booker?next=${encodeURIComponent(window.location.pathname)}`);
      }
      return;
    }

    const optimistic = !state.favorited;
    setState((s) => ({ ...s, favorited: optimistic }));

    startTransition(async () => {
      const r = await toggleFavoriteAction(djUserId);
      if (!r.ok) {
        setState((s) => ({ ...s, favorited: !optimistic }));
        console.error("toggleFavoriteAction error:", r.error);
      } else {
        setState((s) => ({ ...s, favorited: r.favorited }));
      }
    });
  }

  // Estados:
  //   - Loading: render placeholder con opacity
  //   - Anon: render outline (click → /signup/booker)
  //   - Booker: render full state

  // Si está cargado y NO se puede favoritar Y no redireccionamos → no render
  if (state.loaded && !state.canFavorite && !redirectOnUnauth) return null;

  const sizeCls =
    size === "lg"
      ? "w-11 h-11 [&_svg]:w-5 [&_svg]:h-5"
      : "w-9 h-9 [&_svg]:w-4 [&_svg]:h-4";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending || !state.loaded}
      aria-label={state.favorited ? "Quitar de favoritos" : "Guardar en favoritos"}
      aria-pressed={state.favorited}
      title={
        !state.loaded
          ? "Cargando..."
          : !state.canFavorite
            ? "Crear cuenta para guardar favoritos"
            : state.favorited
              ? "Quitar de favoritos"
              : "Guardar en favoritos"
      }
      className={`inline-flex items-center justify-center ${sizeCls} rounded-full border transition-all disabled:opacity-50 ${
        !state.loaded
          ? "bg-white/[0.04] text-white/40 border-white/10"
          : state.favorited
            ? "bg-[rgb(var(--drop-orange))] text-black border-transparent hover:bg-[rgb(var(--drop-orange))]/85"
            : "bg-white/[0.06] backdrop-blur-sm text-white/80 border-white/15 hover:border-[rgb(var(--drop-orange))] hover:text-[rgb(var(--drop-orange))]"
      }`}
    >
      <Heart
        className={state.favorited ? "fill-current" : ""}
        strokeWidth={state.favorited ? 0 : 2}
      />
    </button>
  );
}
