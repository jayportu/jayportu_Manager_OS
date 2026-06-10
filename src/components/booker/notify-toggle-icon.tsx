"use client";

/**
 * RA-6 polish — ícono 🔔/🔕 clickeable para prender/apagar los avisos por
 * email de un DJ seguido, desde /booker/seguidos. Reusa toggleFollowNotifyAction
 * (la misma que usa el toggle de /p/[slug]).
 */
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell, BellOff } from "lucide-react";
import { toggleFollowNotifyAction } from "@/app/booker/actions";

interface Props {
  djUserId: string;
  initial: boolean;
}

export function NotifyToggleIcon({ djUserId, initial }: Props) {
  const router = useRouter();
  const [on, setOn] = useState(initial);
  const [pending, startTransition] = useTransition();

  // M9: el mismo DJ puede aparecer 2 veces en /seguidos (feed + grilla). Al
  // togglear uno, el router.refresh() trae el estado fresco del server; este
  // efecto re-sincroniza la otra instancia (useState ignora cambios de `initial`
  // tras el montaje, por eso se desincronizaban).
  useEffect(() => {
    setOn(initial);
  }, [initial]);

  function handleClick(e: React.MouseEvent) {
    // La card suele ser un <Link>; no navegar al togglear.
    e.preventDefault();
    e.stopPropagation();
    if (pending) return;
    const next = !on;
    setOn(next); // optimista
    startTransition(async () => {
      const res = await toggleFollowNotifyAction(djUserId);
      if (res.ok) {
        setOn(res.notifyEmail);
        router.refresh();
      } else {
        setOn(!next); // revertir si falló
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      aria-pressed={on}
      title={
        on
          ? "Avisos por email activados — click para apagar"
          : "Activar avisos por email"
      }
      className={`shrink-0 transition-colors disabled:opacity-50 ${
        on ? "text-orange" : "text-fg-subtle hover:text-fg-muted"
      }`}
    >
      {on ? (
        <Bell className="w-3.5 h-3.5" />
      ) : (
        <BellOff className="w-3.5 h-3.5" />
      )}
    </button>
  );
}
