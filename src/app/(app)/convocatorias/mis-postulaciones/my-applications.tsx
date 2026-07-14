"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, MapPin, Ticket, UserPlus, XCircle, Check } from "lucide-react";
import type { GigApplication, OpenGig } from "@/lib/queries/convocatorias";
import { addOrganizerToCrmAction, withdrawApplicationAction } from "../actions";
import { GlassPanel, MonoLabel, Badge, Alert, EmptyState } from "@/components/hos";
import { Button } from "@/components/ui/button";

type ActionResult = { ok: true } | { ok: false; error: string };
type Application = GigApplication & { gig: OpenGig | null };

const STATUS_LABEL: Record<GigApplication["status"], string> = {
  pending: "pendiente",
  accepted: "aceptada",
  rejected: "no seleccionada",
};

const STATUS_TONE: Record<
  GigApplication["status"],
  { tone: "up" | "down" | "neutral"; solid?: boolean }
> = {
  pending: { tone: "neutral" },
  accepted: { tone: "up", solid: true },
  rejected: { tone: "down", solid: true },
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
      <EmptyState
        icon={Ticket}
        title="Sin postulaciones aún"
        sub="Aún no has postulado a ninguna convocatoria."
      />
    );
  }

  return (
    <GlassPanel>
      <div className="mb-3 flex items-center justify-between">
        <MonoLabel>Postulaciones</MonoLabel>
        <span className="font-mono text-[10px] uppercase tracking-wider text-white/40">
          {initialApplications.length}
        </span>
      </div>
      <div className="flex flex-col gap-3">
        {initialApplications.map((a) => {
          const busy = isPending && actingId === a.id;
          return (
            <div
              key={a.id}
              className="rounded-xl border border-white/10 p-4"
              style={{ background: "rgba(255,255,255,.03)" }}
            >
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">
                    {a.gig?.title ?? "Convocatoria"}
                  </div>
                  {a.gig?.organizer_name && (
                    <div className="text-xs text-white/45 truncate">
                      {a.gig.organizer_name}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap shrink-0">
                  <Badge tone={STATUS_TONE[a.status].tone} solid={STATUS_TONE[a.status].solid}>
                    {STATUS_LABEL[a.status]}
                  </Badge>
                  {a.status === "pending" && a.viewed_at && (
                    <span className="font-mono text-[10px] text-white/40 uppercase tracking-wider">
                      vista
                    </span>
                  )}
                </div>
              </div>

              {(a.gig?.city || a.gig?.event_date) && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {a.gig?.city && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-white/12 px-2 py-0.5 font-mono text-[10px] text-white/50">
                      <MapPin className="w-3 h-3" /> {a.gig.city}
                    </span>
                  )}
                  {a.gig?.event_date && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-white/12 px-2 py-0.5 font-mono text-[10px] text-white/50">
                      <CalendarDays className="w-3 h-3" /> {fmtDate(a.gig.event_date)}
                    </span>
                  )}
                </div>
              )}

              {errors[a.id] && (
                <div className="mt-2">
                  <Alert tone="danger">{errors[a.id]}</Alert>
                </div>
              )}

              <div className="mt-3 flex items-center gap-2 flex-wrap">
                {a.status === "accepted" &&
                  a.gig &&
                  (crmAdded[a.id] ? (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold text-success">
                      <Check className="w-3.5 h-3.5" />
                      Agregado al CRM
                    </span>
                  ) : (
                    <Button
                      type="button"
                      variant="clayPrimary"
                      size="sm"
                      onClick={() => addToCrm(a)}
                      disabled={busy}
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      Agregar al CRM
                    </Button>
                  ))}
                {a.status === "pending" && (
                  <Button
                    type="button"
                    variant="clay"
                    size="sm"
                    className="text-danger"
                    onClick={() => withdraw(a)}
                    disabled={busy}
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Retirar
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </GlassPanel>
  );
}
