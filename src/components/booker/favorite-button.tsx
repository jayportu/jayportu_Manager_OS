"use client";

/**
 * Botón corazón para que el Booker guarde un DJ en favoritos.
 *
 * Render condicional: el server caller decide si mostrarlo (solo cuando
 * hay un booker logueado, no DJ, no anónimo). El estado inicial se pasa
 * como prop; al click se llama la server action y se updatea local + via
 * revalidatePath.
 */
import { useState, useTransition } from "react";
import { Heart } from "lucide-react";
import { toggleFavoriteAction } from "@/app/booker/actions";

interface Props {
  djUserId: string;
  initialFavorited: boolean;
  /** Tamaño visual: 'sm' (default) o 'lg' (hero del press kit). */
  size?: "sm" | "lg";
  /** Mostrar texto al lado del icono. */
  showLabel?: boolean;
}

export function FavoriteButton({
  djUserId,
  initialFavorited,
  size = "sm",
  showLabel = false,
}: Props) {
  const [favorited, setFavorited] = useState(initialFavorited);
  const [pending, startTransition] = useTransition();

  function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    // Optimistic update
    const optimistic = !favorited;
    setFavorited(optimistic);

    startTransition(async () => {
      const r = await toggleFavoriteAction(djUserId);
      if (!r.ok) {
        // Revertir si falla
        setFavorited(!optimistic);
        console.error("toggleFavoriteAction error:", r.error);
      } else {
        setFavorited(r.favorited);
      }
    });
  }

  const sizeCls =
    size === "lg"
      ? "w-11 h-11 [&_svg]:w-5 [&_svg]:h-5"
      : "w-9 h-9 [&_svg]:w-4 [&_svg]:h-4";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-label={favorited ? "Quitar de favoritos" : "Guardar en favoritos"}
      aria-pressed={favorited}
      className={`group inline-flex items-center justify-center gap-2 rounded-full ${
        showLabel ? "px-3 w-auto" : sizeCls
      } border transition-colors disabled:opacity-60 ${
        favorited
          ? "bg-[rgb(var(--drop-orange))] text-black border-transparent hover:bg-[rgb(var(--drop-orange))]/85"
          : "bg-white/[0.06] backdrop-blur-sm text-white/80 border-white/15 hover:border-[rgb(var(--drop-orange))] hover:text-[rgb(var(--drop-orange))]"
      }`}
    >
      <Heart
        className={favorited ? "fill-current" : ""}
        strokeWidth={favorited ? 0 : 2}
      />
      {showLabel && (
        <span className="font-mono text-[11px] font-bold uppercase tracking-wider">
          {favorited ? "Guardado" : "Guardar"}
        </span>
      )}
    </button>
  );
}
