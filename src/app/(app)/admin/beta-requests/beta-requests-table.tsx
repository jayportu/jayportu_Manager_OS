"use client";

/**
 * Sprint 23.5 — Tabla de solicitudes beta con acciones inline.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  BETA_REQUEST_STATUSES,
  BETA_REQUEST_STATUS_LABELS,
  type BetaRequest,
  type BetaRequestStatus,
} from "@/types/database";
import { Button } from "@/components/ui/button";
import { SelectNative } from "@/components/ui/select-native";
import {
  approveBetaRequestAction,
  rejectBetaRequestAction,
  waitlistBetaRequestAction,
  markInviteSentAction,
  setBetaRequestStatusAction,
  deleteBetaRequestAction,
} from "./actions";
import { Copy, Check, Trash2 } from "lucide-react";
import { useConfirm } from "@/components/admin/confirm-dialog";

interface Props {
  initialRequests: BetaRequest[];
}

export function BetaRequestsTable({ initialRequests }: Props) {
  const router = useRouter();
  const confirm = useConfirm();
  const [requests, setRequests] = useState(initialRequests);
  const [isPending, startTransition] = useTransition();
  const [filter, setFilter] = useState<BetaRequestStatus | "all">("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [message, setMessage] = useState<
    { type: "ok" | "err"; text: string } | null
  >(null);

  const filtered =
    filter === "all" ? requests : requests.filter((r) => r.status === filter);

  function refresh() {
    router.refresh();
  }

  function handleApprove(r: BetaRequest) {
    setMessage(null);
    startTransition(async () => {
      const res = await approveBetaRequestAction(r.id);
      if (res.ok) {
        setRequests((rs) =>
          rs.map((x) =>
            x.id === r.id
              ? {
                  ...x,
                  status: "approved",
                  invite_token: res.data.invite_token,
                  approved_at: new Date().toISOString(),
                }
              : x
          )
        );
        setMessage({
          type: "ok",
          text: `${res.data.artist_name} aprobado. Copia el link y envíaselo.`,
        });
        refresh();
      } else {
        setMessage({ type: "err", text: res.error });
      }
    });
  }

  async function handleReject(r: BetaRequest) {
    const conf = await confirm({
      title: "Rechazar solicitud",
      message: (
        <>
          Rechazar la solicitud de <strong>{r.artist_name}</strong>. El motivo queda
          registrado.
        </>
      ),
      variant: "danger",
      confirmLabel: "Rechazar",
      requireReason: true,
      reasonPlaceholder: "Motivo del rechazo…",
    });
    if (!conf.ok) return;
    const reason = conf.reason;
    setMessage(null);
    startTransition(async () => {
      const res = await rejectBetaRequestAction(r.id, reason);
      if (res.ok) {
        setRequests((rs) =>
          rs.map((x) =>
            x.id === r.id
              ? {
                  ...x,
                  status: "rejected",
                  reject_reason: reason,
                  rejected_at: new Date().toISOString(),
                }
              : x
          )
        );
        refresh();
      } else {
        setMessage({ type: "err", text: res.error });
      }
    });
  }

  function handleWaitlist(r: BetaRequest) {
    startTransition(async () => {
      const res = await waitlistBetaRequestAction(r.id);
      if (res.ok) {
        setRequests((rs) =>
          rs.map((x) => (x.id === r.id ? { ...x, status: "waitlist" } : x))
        );
        refresh();
      } else {
        setMessage({ type: "err", text: res.error });
      }
    });
  }

  function handleStatusChange(r: BetaRequest, newStatus: BetaRequestStatus) {
    if (newStatus === r.status) return;
    // 'approved' debe pasar por approveBetaRequestAction (genera token + manda
    // el email). El <select> usaba setBetaRequestStatusAction, que cambiaba el
    // estado SIN invitar → el DJ nunca recibía el acceso.
    if (newStatus === "approved") {
      handleApprove(r);
      return;
    }
    startTransition(async () => {
      const res = await setBetaRequestStatusAction(r.id, newStatus);
      if (res.ok) {
        setRequests((rs) =>
          rs.map((x) => (x.id === r.id ? { ...x, status: newStatus } : x))
        );
        refresh();
      } else {
        setMessage({ type: "err", text: res.error });
      }
    });
  }

  async function handleDelete(r: BetaRequest) {
    const conf = await confirm({
      title: "Borrar solicitud",
      message: (
        <>
          ¿Borrar la solicitud de <strong>{r.artist_name}</strong>? Permanente.
        </>
      ),
      variant: "danger",
      confirmLabel: "Borrar",
    });
    if (!conf.ok) return;
    startTransition(async () => {
      const res = await deleteBetaRequestAction(r.id);
      if (res.ok) {
        setRequests((rs) => rs.filter((x) => x.id !== r.id));
        refresh();
      } else {
        setMessage({ type: "err", text: res.error });
      }
    });
  }

  async function handleCopyInviteLink(r: BetaRequest) {
    if (!r.invite_token) return;
    const siteUrl =
      typeof window !== "undefined"
        ? window.location.origin
        : "https://dropgigs.com";
    const link = `${siteUrl}/login?invite=${r.invite_token}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedId(r.id);
      setTimeout(() => setCopiedId(null), 2500);
      // marcar como enviado en background
      startTransition(async () => {
        await markInviteSentAction(r.id);
        refresh();
      });
    } catch {
      setMessage({ type: "err", text: "No se pudo copiar al portapapeles." });
    }
  }

  function statusBadge(s: BetaRequestStatus) {
    const bg = {
      new: "bg-orange text-ink border-border",
      approved: "bg-success text-white dark:text-ink border-success",
      rejected: "bg-danger text-white dark:text-ink border-danger",
      waitlist: "bg-warning text-fg dark:text-ink border-border",
    }[s];
    return (
      <span
        className={`inline-block font-mono text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border-2 ${bg}`}
      >
        {BETA_REQUEST_STATUS_LABELS[s]}
      </span>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="font-mono text-[10px] uppercase tracking-wider text-fg-muted mr-2">
          Filtrar:
        </div>
        {(["all", ...BETA_REQUEST_STATUSES] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={`font-mono text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 border-2 border-border transition-colors ${
              filter === s ? "bg-ink text-white" : "bg-cream hover:bg-ink/10"
            }`}
          >
            {s === "all" ? "Todos" : BETA_REQUEST_STATUS_LABELS[s]} (
            {s === "all" ? requests.length : requests.filter((r) => r.status === s).length})
          </button>
        ))}
      </div>

      {message && (
        <div
          className={`text-sm border-2 p-3 ${
            message.type === "ok"
              ? "border-success bg-success/10 text-success"
              : "border-danger bg-danger/10 text-danger"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Tabla */}
      <div className="border-2 border-border bg-bg-panel overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-cream border-b-2 border-border font-mono text-[10px] uppercase tracking-wider">
              <th className="text-left px-3 py-2.5">Solicitud</th>
              <th className="text-left px-3 py-2.5">Géneros</th>
              <th className="text-left px-3 py-2.5">Estado</th>
              <th className="text-left px-3 py-2.5">Pedido</th>
              <th className="text-right px-3 py-2.5">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-fg-muted text-sm">
                  Sin solicitudes en este filtro.
                </td>
              </tr>
            )}
            {filtered.map((r) => {
              const isExp = expanded === r.id;
              const date = new Date(r.created_at).toLocaleString("es-CL", {
                dateStyle: "short",
                timeStyle: "short",
                timeZone: "America/Santiago",
              });
              return (
                <tr
                  key={r.id}
                  className="border-b border-border/10 align-top hover:bg-cream/40"
                >
                  <td className="px-3 py-3">
                    <button
                      type="button"
                      onClick={() => setExpanded(isExp ? null : r.id)}
                      className="text-left w-full"
                    >
                      <div className="font-semibold">{r.artist_name}</div>
                      <div className="text-xs text-fg-muted mt-0.5">
                        {r.instagram && `@${r.instagram} · `}
                        {r.city && `${r.city} · `}
                        <span className="font-mono">{r.email}</span>
                      </div>
                      {r.motivation && (
                        <div
                          className={`text-xs text-fg-muted mt-1.5 italic ${
                            isExp ? "" : "line-clamp-1"
                          }`}
                        >
                          &ldquo;{r.motivation}&rdquo;
                        </div>
                      )}
                      {isExp && r.reject_reason && (
                        <div className="text-xs text-danger mt-2">
                          Motivo de rechazo: {r.reject_reason}
                        </div>
                      )}
                    </button>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-1">
                      {r.genres.length === 0 && (
                        <span className="text-fg-subtle text-xs">—</span>
                      )}
                      {r.genres.slice(0, 4).map((g) => (
                        <span
                          key={g}
                          className="font-mono text-[10px] px-1.5 py-0.5 border border-border/30 bg-cream"
                        >
                          {g}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <SelectNative
                      value={r.status}
                      onChange={(e) =>
                        handleStatusChange(r, e.target.value as BetaRequestStatus)
                      }
                      disabled={isPending}
                      className="h-8 text-xs"
                    >
                      {BETA_REQUEST_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {BETA_REQUEST_STATUS_LABELS[s]}
                        </option>
                      ))}
                    </SelectNative>
                    <div className="mt-1.5">{statusBadge(r.status)}</div>
                  </td>
                  <td className="px-3 py-3 font-mono text-[10px] text-fg-muted whitespace-nowrap">
                    {date}
                    {r.invite_sent_at && (
                      <div className="mt-1 text-success">
                        Invite enviado ✓
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <div className="flex flex-col items-stretch gap-1 min-w-[180px]">
                      {r.status === "new" && (
                        <>
                          <Button
                            type="button"
                            variant="orange"
                            onClick={() => handleApprove(r)}
                            disabled={isPending}
                            className="h-8 text-xs"
                          >
                            Aprobar
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleWaitlist(r)}
                            disabled={isPending}
                            className="h-8 text-xs"
                          >
                            Waitlist
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => handleReject(r)}
                            disabled={isPending}
                            className="h-8 text-xs border-2 border-danger text-danger hover:bg-danger hover:text-white dark:hover:text-ink"
                          >
                            Rechazar
                          </Button>
                        </>
                      )}
                      {r.status === "approved" && r.invite_token && (
                        <Button
                          type="button"
                          variant="orange"
                          onClick={() => handleCopyInviteLink(r)}
                          className="h-8 text-xs"
                        >
                          {copiedId === r.id ? (
                            <>
                              <Check className="w-3 h-3 mr-1" /> Copiado
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3 mr-1" /> Copiar invite
                            </>
                          )}
                        </Button>
                      )}
                      {r.status === "waitlist" && (
                        <Button
                          type="button"
                          variant="orange"
                          onClick={() => handleApprove(r)}
                          disabled={isPending}
                          className="h-8 text-xs"
                        >
                          Aprobar
                        </Button>
                      )}
                      {r.status === "rejected" && (
                        <button
                          type="button"
                          onClick={() => handleDelete(r)}
                          disabled={isPending}
                          className="h-8 px-2 border-2 border-border/30 text-fg-muted hover:border-danger hover:text-danger flex items-center justify-center gap-1 text-xs"
                        >
                          <Trash2 className="w-3 h-3" /> Borrar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
