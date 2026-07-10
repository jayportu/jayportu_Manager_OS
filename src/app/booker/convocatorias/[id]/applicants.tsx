"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, X, ArrowRight, CalendarClock, Inbox } from "lucide-react";
import type { GigApplication } from "@/lib/queries/convocatorias";
import {
  decideApplicationAction,
  closeGigAction,
  markViewedAction,
} from "../actions";
import { relativeTime } from "@/lib/format";

type ActionResult = { ok: true } | { ok: false; error: string };

const STATUS_LABEL: Record<GigApplication["status"], string> = {
  pending: "pendiente",
  accepted: "aceptada",
  rejected: "rechazada",
};

const STATUS_STYLE: Record<GigApplication["status"], string> = {
  pending: "border-border text-fg-muted",
  accepted: "border-success bg-success text-white dark:text-ink",
  rejected: "border-danger bg-danger text-white dark:text-ink",
};

interface Props {
  gigId: string;
  gigStatus: "open" | "closed";
  initialApplications: GigApplication[];
}

export function Applicants({ gigId, gigStatus, initialApplications }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Marca como vistas las postulaciones nuevas al montar — fire-and-forget,
  // no bloquea el render ni dispara un refresh (la vista es incidental, no
  // necesita reflejarse al instante).
  useEffect(() => {
    for (const app of initialApplications) {
      if (app.viewed_at === null) void markViewedAction(app.id);
    }
    // Solo al montar: no repetir en cada refresh de la página.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function run(fn: () => Promise<ActionResult>) {
    setError(null);
    startTransition(async () => {
      const r = await fn();
      if (!r.ok) {
        setError(r.error);
        return;
      }
      router.refresh();
    });
  }

  function decide(app: GigApplication, accept: boolean) {
    run(() => decideApplicationAction(app.id, accept));
  }

  function closeGig() {
    run(() => closeGigAction(gigId));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-xs uppercase tracking-widest text-fg-muted font-semibold">
          Postulantes{initialApplications.length > 0 ? ` (${initialApplications.length})` : ""}
        </h2>
        {gigStatus === "open" && (
          <button
            type="button"
            onClick={closeGig}
            disabled={isPending}
            className="px-3 py-1.5 border-2 border-border font-mono text-[10px] font-bold uppercase tracking-wider text-fg-muted hover:border-danger hover:text-danger disabled:opacity-50 transition-colors"
          >
            Cerrar convocatoria
          </button>
        )}
      </div>

      {error && (
        <div className="text-sm text-danger bg-danger/10 border-2 border-danger px-3 py-2">
          {error}
        </div>
      )}

      {initialApplications.length === 0 ? (
        <div className="border-2 border-dashed border-border p-6 text-center">
          <Inbox className="w-8 h-8 mx-auto text-fg-subtle mb-2" />
          <p className="text-sm text-fg-muted">
            Aún no tienes postulantes. Cuando un DJ postule, va a aparecer acá.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {initialApplications.map((app) => (
            <div key={app.id} className="border-2 border-border p-4 space-y-2">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold">{app.dj_display_name}</span>
                  <span
                    className={`inline-flex items-center font-mono text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border-2 ${STATUS_STYLE[app.status]}`}
                  >
                    {STATUS_LABEL[app.status]}
                  </span>
                  {app.status === "pending" && app.viewed_at && (
                    <span className="font-mono text-[10px] text-fg-subtle uppercase tracking-wider">
                      vista
                    </span>
                  )}
                </div>
                <span className="font-mono text-[10px] text-fg-subtle uppercase tracking-wider shrink-0">
                  {relativeTime(app.created_at)}
                </span>
              </div>

              {app.message && (
                <p className="text-sm whitespace-pre-wrap leading-relaxed p-3 bg-cream/60 border border-border/15">
                  {app.message}
                </p>
              )}
              {app.availability && (
                <div className="text-xs text-fg-muted inline-flex items-center gap-1.5">
                  <CalendarClock className="w-3.5 h-3.5 text-orange" />
                  Disponible: {app.availability}
                </div>
              )}

              <div className="flex items-center gap-2 flex-wrap pt-1">
                {app.dj_slug && (
                  <Link
                    href={`/p/${app.dj_slug}`}
                    target="_blank"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 border-2 border-border font-mono text-[10px] font-bold uppercase tracking-wider hover:border-orange hover:text-orange transition-colors"
                  >
                    Press kit
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => decide(app, true)}
                  disabled={isPending || app.status !== "pending"}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-success text-white dark:text-ink border-2 border-success font-mono text-[10px] font-bold uppercase tracking-wider disabled:opacity-40 transition-opacity"
                >
                  <Check className="w-3.5 h-3.5" />
                  Aceptar
                </button>
                <button
                  type="button"
                  onClick={() => decide(app, false)}
                  disabled={isPending || app.status !== "pending"}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 border-2 border-danger text-danger font-mono text-[10px] font-bold uppercase tracking-wider hover:bg-danger hover:text-white dark:hover:text-ink disabled:opacity-40 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  Rechazar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
