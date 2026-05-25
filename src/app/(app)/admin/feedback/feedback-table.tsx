"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  FEEDBACK_STATUSES,
  FEEDBACK_STATUS_LABELS,
  FEEDBACK_KIND_LABELS,
  type FeedbackReport,
  type FeedbackStatus,
} from "@/types/database";
import { SelectNative } from "@/components/ui/select-native";
import { updateFeedbackAction } from "./actions";

interface Props {
  initialReports: FeedbackReport[];
}

export function FeedbackTable({ initialReports }: Props) {
  const router = useRouter();
  const [reports, setReports] = useState(initialReports);
  const [filter, setFilter] = useState<FeedbackStatus | "all">("all");
  const [isPending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered =
    filter === "all" ? reports : reports.filter((r) => r.status === filter);

  function handleStatusChange(r: FeedbackReport, status: FeedbackStatus) {
    startTransition(async () => {
      const res = await updateFeedbackAction(r.id, status);
      if (res.ok) {
        setReports((rs) =>
          rs.map((x) => (x.id === r.id ? { ...x, status } : x))
        );
        router.refresh();
      }
    });
  }

  function kindBadge(k: FeedbackReport["kind"]) {
    const bg = {
      bug: "bg-danger text-white border-danger",
      idea: "bg-info text-white border-info",
      copy: "bg-warning text-ink border-ink",
      otro: "bg-cream text-ink border-ink",
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
            className={`font-mono text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 border-2 border-ink transition-colors ${
              filter === s ? "bg-ink text-cream" : "bg-cream hover:bg-ink/10"
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

      <div className="border-2 border-ink bg-white">
        {filtered.length === 0 && (
          <div className="p-10 text-center text-fg-muted text-sm">
            Sin feedback en este filtro.
          </div>
        )}
        {filtered.map((r) => {
          const isExp = expanded === r.id;
          return (
            <div
              key={r.id}
              className="border-b border-ink/10 px-4 py-3"
            >
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
                  <div className="mt-1 flex flex-wrap gap-2 items-center font-mono text-[10px] text-fg-muted">
                    <span>{new Date(r.created_at).toLocaleString("es-CL", { timeZone: "America/Santiago" })}</span>
                    {r.page_url && <span>· URL: {r.page_url}</span>}
                    {r.user_id && (
                      <span className="text-fg-subtle">
                        user: {r.user_id.slice(0, 8)}…
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
