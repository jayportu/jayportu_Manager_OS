"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  FEEDBACK_STATUSES,
  FEEDBACK_STATUS_LABELS,
  FEEDBACK_KIND_LABELS,
  type FeedbackReportWithUser,
  type FeedbackStatus,
} from "@/types/database";
import { SelectNative } from "@/components/ui/select-native";
import { Label } from "@/components/ui/label";
import {
  GlassPanel,
  ClayChipButton,
  Alert,
  Badge,
  EmptyState,
  FIELD,
  SELECT,
} from "@/components/hos";
import { updateFeedbackAction } from "./actions";
import { useConfirm } from "@/components/admin/confirm-dialog";

interface Props {
  initialReports: FeedbackReportWithUser[];
}

export function FeedbackTable({ initialReports }: Props) {
  const router = useRouter();
  const confirm = useConfirm();
  const [reports, setReports] = useState(initialReports);
  const [filter, setFilter] = useState<FeedbackStatus | "all">("all");
  const [err, setErr] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState<string | null>(null);
  // Borradores locales de admin_notes editados pero aún no guardados.
  // Se envían junto al cambio de status (incluido cuando se marca "resuelto"
  // y el server dispara el email de fix-followup usando estas notas como
  // fixSummary).
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});

  const filtered =
    filter === "all" ? reports : reports.filter((r) => r.status === filter);

  function notesFor(r: FeedbackReportWithUser): string {
    return noteDrafts[r.id] ?? r.admin_notes ?? "";
  }

  async function handleStatusChange(r: FeedbackReportWithUser, status: FeedbackStatus) {
    const adminNotes = notesFor(r);
    const willSendEmail = status === "resolved" && r.status !== "resolved";

    if (willSendEmail && r.email) {
      const res = await confirm({
        title: "Marcar como resuelto",
        message: (
          <>
            Marcar como “Resuelto” y mandar email a{" "}
            <strong>{r.artist_name || r.email}</strong> ({r.email}).
            {adminNotes.trim()
              ? " Se incluye tu resumen del fix."
              : " Sin resumen — se usará texto genérico."}
          </>
        ),
        confirmLabel: "Resolver y avisar",
      });
      if (!res.ok) return;
    }

    setErr(null);
    startTransition(async () => {
      const res = await updateFeedbackAction(r.id, status, adminNotes);
      if (res.ok) {
        setReports((rs) =>
          rs.map((x) =>
            x.id === r.id ? { ...x, status, admin_notes: adminNotes } : x
          )
        );
        // Limpiar el draft ahora que está persistido
        setNoteDrafts((n) => {
          const next = { ...n };
          delete next[r.id];
          return next;
        });
        router.refresh();
      } else {
        setErr(res.error);
      }
    });
  }

  function kindBadge(k: FeedbackReportWithUser["kind"]) {
    const tone = {
      bug: "down",
      idea: "info",
      copy: "warn",
      otro: "neutral",
    }[k] as "down" | "info" | "warn" | "neutral";
    return <Badge tone={tone}>{FEEDBACK_KIND_LABELS[k]}</Badge>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <div className="font-mono text-[10px] uppercase tracking-wider text-white/45 mr-2">
          Filtrar:
        </div>
        {(["all", ...FEEDBACK_STATUSES] as const).map((s) => (
          <ClayChipButton
            key={s}
            active={filter === s}
            onClick={() => setFilter(s)}
          >
            {s === "all" ? "Todos" : FEEDBACK_STATUS_LABELS[s]} (
            {s === "all"
              ? reports.length
              : reports.filter((r) => r.status === s).length}
            )
          </ClayChipButton>
        ))}
      </div>

      {err && <Alert tone="danger">{err}</Alert>}

      <GlassPanel padded={false}>
        {filtered.length === 0 && (
          <div className="p-4">
            <EmptyState title="Sin feedback en este filtro." />
          </div>
        )}
        {filtered.map((r) => {
          const isExp = expanded === r.id;
          const draft = noteDrafts[r.id];
          const hasUnsavedNote =
            draft !== undefined && draft !== (r.admin_notes || "");
          return (
            <div
              key={r.id}
              className="border-b border-white/[0.06] px-4 py-3 last:border-b-0"
            >
              <div className="flex items-start gap-3">
                <div className="shrink-0 pt-1">{kindBadge(r.kind)}</div>
                <div className="flex-1 min-w-0">
                  <div
                    className={`text-sm text-white/90 cursor-pointer ${
                      isExp ? "" : "line-clamp-2"
                    }`}
                    onClick={() => setExpanded(isExp ? null : r.id)}
                  >
                    {r.description}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 items-center font-mono text-[10px] text-white/45">
                    <span>
                      {new Date(r.created_at).toLocaleString("es-CL", {
                        timeZone: "America/Santiago",
                      })}
                    </span>
                    {r.page_url && <span>· URL: {r.page_url}</span>}
                    {(r.artist_name || r.email) && (
                      <span className="text-white/70">
                        ·{" "}
                        <span className="font-semibold text-white/90">
                          {r.artist_name || "—"}
                        </span>
                        {r.email && (
                          <span className="text-white/45"> · {r.email}</span>
                        )}
                      </span>
                    )}
                  </div>
                  {isExp && r.screenshot_url && (
                    <a
                      href={r.screenshot_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-block text-xs text-orange underline"
                    >
                      Ver screenshot →
                    </a>
                  )}
                  {isExp && r.user_agent && (
                    <div className="mt-2 text-[10px] font-mono text-white/35 break-all">
                      UA: {r.user_agent}
                    </div>
                  )}

                  {isExp && (
                    <div className="mt-3 space-y-1.5">
                      <Label
                        htmlFor={`admin-notes-${r.id}`}
                        className="block text-white/45"
                      >
                        Resumen del fix (admin notes)
                      </Label>
                      <textarea
                        id={`admin-notes-${r.id}`}
                        value={notesFor(r)}
                        onChange={(e) =>
                          setNoteDrafts((n) => ({
                            ...n,
                            [r.id]: e.target.value,
                          }))
                        }
                        rows={2}
                        placeholder="Si lo marcás como 'Resuelto', este texto va al email que el DJ recibe (ej: 'Ya está arreglado. Ahora el calendario muestra siempre la hora chilena, así que tu show 05-jun 21:00 ya aparece bajo el card 05 JUN.'). Si lo dejas vacío, se manda un texto genérico cordial."
                        className={`${FIELD} text-xs font-sans leading-relaxed`}
                      />
                      {hasUnsavedNote && (
                        <div className="font-mono text-[10px] text-warning">
                          ↑ Nota editada — se guarda al cambiar el estado.
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="shrink-0">
                  <SelectNative
                    value={r.status}
                    onChange={(e) =>
                      handleStatusChange(r, e.target.value as FeedbackStatus)
                    }
                    disabled={isPending}
                    className={`${SELECT} h-8 text-xs`}
                  >
                    {FEEDBACK_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {FEEDBACK_STATUS_LABELS[s]}
                      </option>
                    ))}
                  </SelectNative>
                </div>
              </div>
            </div>
          );
        })}
      </GlassPanel>
    </div>
  );
}
