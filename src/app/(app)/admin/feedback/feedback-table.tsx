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
    const bg = {
      bug: "bg-danger text-white border-danger",
      idea: "bg-info text-white border-info",
      copy: "bg-warning text-fg border-border",
      otro: "bg-cream text-fg border-border",
    }[k];
    return (
      <span
        className={`inline-block font-mono text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border-2 ${bg}`}
      >
        {FEEDBACK_KIND_LABELS[k]}
      </span>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <div className="font-mono text-[10px] uppercase tracking-wider text-fg-muted mr-2">
          Filtrar:
        </div>
        {(["all", ...FEEDBACK_STATUSES] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={`font-mono text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 border-2 border-border transition-colors ${
              filter === s ? "bg-ink text-white" : "bg-cream hover:bg-ink/10"
            }`}
          >
            {s === "all" ? "Todos" : FEEDBACK_STATUS_LABELS[s]} (
            {s === "all"
              ? reports.length
              : reports.filter((r) => r.status === s).length}
            )
          </button>
        ))}
      </div>

      {err && (
        <div className="border-2 border-danger bg-danger/10 text-danger text-sm px-3 py-2">
          {err}
        </div>
      )}

      <div className="border-2 border-border bg-bg-panel">
        {filtered.length === 0 && (
          <div className="p-10 text-center text-fg-muted text-sm">
            Sin feedback en este filtro.
          </div>
        )}
        {filtered.map((r) => {
          const isExp = expanded === r.id;
          const draft = noteDrafts[r.id];
          const hasUnsavedNote =
            draft !== undefined && draft !== (r.admin_notes || "");
          return (
            <div key={r.id} className="border-b border-border/10 px-4 py-3">
              <div className="flex items-start gap-3">
                <div className="shrink-0 pt-1">{kindBadge(r.kind)}</div>
                <div className="flex-1 min-w-0">
                  <div
                    className={`text-sm cursor-pointer ${
                      isExp ? "" : "line-clamp-2"
                    }`}
                    onClick={() => setExpanded(isExp ? null : r.id)}
                  >
                    {r.description}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 items-center font-mono text-[10px] text-fg-muted">
                    <span>
                      {new Date(r.created_at).toLocaleString("es-CL", {
                        timeZone: "America/Santiago",
                      })}
                    </span>
                    {r.page_url && <span>· URL: {r.page_url}</span>}
                    {(r.artist_name || r.email) && (
                      <span className="text-fg">
                        ·{" "}
                        <span className="font-semibold text-fg">
                          {r.artist_name || "—"}
                        </span>
                        {r.email && (
                          <span className="text-fg-muted"> · {r.email}</span>
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
                    <div className="mt-2 text-[10px] font-mono text-fg-subtle break-all">
                      UA: {r.user_agent}
                    </div>
                  )}

                  {isExp && (
                    <div className="mt-3 space-y-1.5">
                      <label className="block font-mono text-[10px] font-bold uppercase tracking-wider text-fg-muted">
                        Resumen del fix (admin notes)
                      </label>
                      <textarea
                        value={notesFor(r)}
                        onChange={(e) =>
                          setNoteDrafts((n) => ({
                            ...n,
                            [r.id]: e.target.value,
                          }))
                        }
                        rows={2}
                        placeholder="Si lo marcás como 'Resuelto', este texto va al email que el DJ recibe (ej: 'Ya está arreglado. Ahora el calendario muestra siempre la hora chilena, así que tu show 05-jun 21:00 ya aparece bajo el card 05 JUN.'). Si lo dejas vacío, se manda un texto genérico cordial."
                        className="w-full text-xs px-2.5 py-2 border-2 border-border bg-cream/30 font-sans leading-relaxed focus:bg-bg-panel focus:outline-none focus:ring-0"
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
                    className="h-8 text-xs"
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
      </div>
    </div>
  );
}
