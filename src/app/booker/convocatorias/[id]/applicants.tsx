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
import { GlassPanel, Badge, Alert, EmptyState } from "@/components/hos";
import { Button } from "@/components/ui/button";

type ActionResult = { ok: true } | { ok: false; error: string };

const STATUS_LABEL: Record<GigApplication["status"], string> = {
  pending: "pendiente",
  accepted: "aceptada",
  rejected: "rechazada",
};

const STATUS_TONE: Record<
  GigApplication["status"],
  "up" | "warn" | "down" | "info" | "neutral"
> = {
  pending: "neutral",
  accepted: "up",
  rejected: "down",
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
        <h2 className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-white/50">
          Postulantes{initialApplications.length > 0 ? ` (${initialApplications.length})` : ""}
        </h2>
        {gigStatus === "open" && (
          <Button
            type="button"
            variant="clay"
            size="sm"
            onClick={closeGig}
            disabled={isPending}
          >
            Cerrar convocatoria
          </Button>
        )}
      </div>

      {error && <Alert tone="danger">{error}</Alert>}

      {initialApplications.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="Aún no tienes postulantes"
          sub="Cuando un DJ postule, va a aparecer acá."
        />
      ) : (
        <div className="space-y-3">
          {initialApplications.map((app) => (
            <GlassPanel key={app.id}>
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{app.dj_display_name}</span>
                    <Badge tone={STATUS_TONE[app.status]}>
                      {STATUS_LABEL[app.status]}
                    </Badge>
                    {app.status === "pending" && app.viewed_at && (
                      <span className="font-mono text-[10px] text-white/40 uppercase tracking-wider">
                        vista
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-[10px] text-white/40 uppercase tracking-wider shrink-0">
                    {relativeTime(app.created_at)}
                  </span>
                </div>

                {app.message && (
                  <p className="text-sm whitespace-pre-wrap leading-relaxed p-3 rounded-xl bg-white/[0.04] border border-white/10">
                    {app.message}
                  </p>
                )}
                {app.availability && (
                  <div className="text-xs text-white/60 inline-flex items-center gap-1.5">
                    <CalendarClock className="w-3.5 h-3.5 text-orange" />
                    Disponible: {app.availability}
                  </div>
                )}

                <div className="flex items-center gap-2 flex-wrap pt-1">
                  {app.dj_slug && (
                    <Button
                      asChild
                      variant="clay"
                      size="sm"
                      className="gap-1.5 [&_svg]:!size-3.5"
                    >
                      <Link
                        href={`/p/${app.dj_slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Press kit
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="clayPrimary"
                    size="sm"
                    onClick={() => decide(app, true)}
                    disabled={isPending || app.status !== "pending"}
                    className="gap-1.5 [&_svg]:!size-3.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Aceptar
                  </Button>
                  <Button
                    type="button"
                    variant="clay"
                    size="sm"
                    onClick={() => decide(app, false)}
                    disabled={isPending || app.status !== "pending"}
                    className="gap-1.5 text-[rgb(var(--drop-danger))] [&_svg]:!size-3.5"
                  >
                    <X className="w-3.5 h-3.5" />
                    Rechazar
                  </Button>
                </div>
              </div>
            </GlassPanel>
          ))}
        </div>
      )}
    </div>
  );
}
