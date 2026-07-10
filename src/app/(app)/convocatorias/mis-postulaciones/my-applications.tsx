"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, MapPin, Ticket, UserPlus, XCircle } from "lucide-react";
import type { GigApplication, OpenGig } from "@/lib/queries/convocatorias";
import { addOrganizerToCrmAction, withdrawApplicationAction } from "../actions";

type ActionResult = { ok: true } | { ok: false; error: string };
type Application = GigApplication & { gig: OpenGig | null };

const STATUS_LABEL: Record<GigApplication["status"], string> = {
  pending: "pendiente",
  accepted: "aceptada",
  rejected: "no seleccionada",
};

const STATUS_STYLE: Record<GigApplication["status"], string> = {
  pending: "border-border text-fg-muted",
  accepted: "border-success bg-success text-white dark:text-ink",
  rejected: "border-danger bg-danger text-white dark:text-ink",
};

function fmtDate(d: string | null): string {
  if (!d) return "";
  return new Date(d).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function MyApplications({
  initialApplications,
}: {
  initialApplications: Application[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [actingId, setActingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [crmAdded, setCrmAdded] = useState<Record<string, boolean>>({});

  function run(id: string, fn: () => Promise<ActionResult>, onSuccess?: () => void) {
    setActingId(id);
    setErrors((prev) => ({ ...prev, [id]: "" }));
    startTransition(async () => {
      const r = await fn();
      if (!r.ok) {
        setErrors((prev) => ({ ...prev, [id]: r.error }));
        setActingId(null);
        return;
      }
      onSuccess?.();
      setActingId(null);
      router.refresh();
    });
  }

  function withdraw(a: Application) {
    run(a.id, () => withdrawApplicationAction(a.id));
  }

  function addToCrm(a: Application) {
    const gig = a.gig;
    if (!gig) return;
    run(
      a.id,
      () =>
        addOrganizerToCrmAction({
          name: gig.organizer_name,
          city: gig.city,
          country: gig.country,
          gigTitle: gig.title,
        }),
      () => setCrmAdded((prev) => ({ ...prev, [a.id]: true }))
    );
  }

  if (initialApplications.length === 0) {
    return (
      <div className="border-2 border-dashed border-border p-6 text-center">
        <Ticket className="w-8 h-8 mx-auto text-fg-subtle mb-2" />
        <p className="text-sm text-fg-muted">
          Aún no has postulado a ninguna convocatoria.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {initialApplications.map((a) => {
        const busy = isPending && actingId === a.id;
        return (
          <div key={a.id} className="border-2 border-border p-4 space-y-2">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">
                  {a.gig?.title ?? "Convocatoria"}
                </div>
                {a.gig?.organizer_name && (
                  <div className="text-xs text-fg-muted truncate">
                    {a.gig.organizer_name}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap shrink-0">
                <span
                  className={`inline-flex items-center font-mono text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border-2 ${STATUS_STYLE[a.status]}`}
                >
                  {STATUS_LABEL[a.status]}
                </span>
                {a.status === "pending" && a.viewed_at && (
                  <span className="font-mono text-[10px] text-fg-subtle uppercase tracking-wider">
                    vista
                  </span>
                )}
              </div>
            </div>

            {(a.gig?.city || a.gig?.event_date) && (
              <div className="flex flex-wrap items-center gap-1.5">
                {a.gig?.city && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono text-fg-muted border border-border px-1.5 py-0.5">
                    <MapPin className="w-3 h-3" /> {a.gig.city}
                  </span>
                )}
                {a.gig?.event_date && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono text-fg-muted">
                    <CalendarDays className="w-3 h-3" /> {fmtDate(a.gig.event_date)}
                  </span>
                )}
              </div>
            )}

            {errors[a.id] && (
              <div className="text-xs text-danger bg-danger/10 border-2 border-danger px-3 py-2">
                {errors[a.id]}
              </div>
            )}

            <div className="flex items-center gap-2 flex-wrap pt-1">
              {a.status === "accepted" && a.gig && (
                crmAdded[a.id] ? (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold text-success">
                    Agregado al CRM ✓
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => addToCrm(a)}
                    disabled={busy}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-accent text-white font-mono text-[10px] font-bold uppercase tracking-wider disabled:opacity-50 transition-opacity"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    Agregar al CRM
                  </button>
                )
              )}
              {a.status === "pending" && (
                <button
                  type="button"
                  onClick={() => withdraw(a)}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 border-2 border-danger text-danger font-mono text-[10px] font-bold uppercase tracking-wider hover:bg-danger hover:text-white dark:hover:text-ink disabled:opacity-40 transition-colors"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Retirar
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
