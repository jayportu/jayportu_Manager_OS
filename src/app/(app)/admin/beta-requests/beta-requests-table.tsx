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
  GlassPanel,
  ClayChipButton,
  Alert,
  Badge,
  TableShell,
  Th,
  Td,
  EmptyState,
  SELECT,
} from "@/components/hos";
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
        if (res.data.email_sent) {
          // Envío OK: no molestamos con el estado del correo.
          setMessage({
            type: "ok",
            text: `${res.data.artist_name} aprobado.`,
          });
        } else {
          // El correo NO salió: avisamos con la razón + fallback manual.
          setMessage({
            type: "err",
            text: `${res.data.artist_name} aprobado, pero el correo NO salió: ${
              res.data.email_error ?? "razón desconocida"
            }. Usa "Copiar invite" para enviarlo manual.`,
          });
        }
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
    const tone: Record<BetaRequestStatus, "up" | "warn" | "down" | "neutral"> = {
      new: "warn",
      approved: "up",
      rejected: "down",
      waitlist: "neutral",
    };
    return <Badge tone={tone[s]}>{BETA_REQUEST_STATUS_LABELS[s]}</Badge>;
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="font-mono text-[10px] uppercase tracking-wider text-white/45 mr-2">
          Filtrar:
        </div>
        {(["all", ...BETA_REQUEST_STATUSES] as const).map((s) => (
          <ClayChipButton
            key={s}
            active={filter === s}
            onClick={() => setFilter(s)}
          >
            {s === "all" ? "Todos" : BETA_REQUEST_STATUS_LABELS[s]} (
            {s === "all" ? requests.length : requests.filter((r) => r.status === s).length})
          </ClayChipButton>
        ))}
      </div>

      {message && (
        <Alert tone={message.type === "ok" ? "success" : "danger"}>
          {message.text}
        </Alert>
      )}

      {/* Tabla */}
      <GlassPanel padded={false}>
        <TableShell bare>
          <thead>
            <tr>
              <Th>Solicitud</Th>
              <Th>Géneros</Th>
              <Th>Estado</Th>
              <Th>Pedido</Th>
              <Th align="right">Acciones</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="p-4">
                  <EmptyState title="Sin solicitudes en este filtro." />
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
                  className="[&>td]:align-top hover:bg-white/[0.03]"
                >
                  <Td>
                    <button
                      type="button"
                      onClick={() => setExpanded(isExp ? null : r.id)}
                      className="text-left w-full"
                    >
                      <div className="font-semibold text-white/90">{r.artist_name}</div>
                      <div className="text-xs text-white/50 mt-0.5">
                        {r.instagram && `@${r.instagram} · `}
                        {r.city && `${r.city} · `}
                        <span className="font-mono">{r.email}</span>
                      </div>
                      {r.motivation && (
                        <div
                          className={`text-xs text-white/50 mt-1.5 italic ${
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
                  </Td>
                  <Td>
                    <div className="flex flex-wrap gap-1">
                      {r.genres.length === 0 && (
                        <span className="text-white/30 text-xs">—</span>
                      )}
                      {r.genres.slice(0, 4).map((g) => (
                        <span
                          key={g}
                          className="font-mono text-[10px] px-1.5 py-0.5 rounded-md border border-white/12 bg-white/[0.04] text-white/70"
                        >
                          {g}
                        </span>
                      ))}
                    </div>
                  </Td>
                  <Td className="whitespace-nowrap">
                    <SelectNative
                      value={r.status}
                      onChange={(e) =>
                        handleStatusChange(r, e.target.value as BetaRequestStatus)
                      }
                      disabled={isPending}
                      className={SELECT}
                    >
                      {BETA_REQUEST_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {BETA_REQUEST_STATUS_LABELS[s]}
                        </option>
                      ))}
                    </SelectNative>
                    <div className="mt-1.5">{statusBadge(r.status)}</div>
                  </Td>
                  <Td className="font-mono text-[10px] text-white/50 whitespace-nowrap">
                    {date}
                    {r.invite_sent_at && (
                      <div className="mt-1 text-success">
                        Invite enviado ✓
                      </div>
                    )}
                  </Td>
                  <Td align="right">
                    <div className="flex flex-col items-stretch gap-1 min-w-[180px]">
                      {r.status === "new" && (
                        <>
                          <Button
                            type="button"
                            variant="clayPrimary"
                            size="sm"
                            onClick={() => handleApprove(r)}
                            disabled={isPending}
                          >
                            Aprobar
                          </Button>
                          <Button
                            type="button"
                            variant="clay"
                            size="sm"
                            onClick={() => handleWaitlist(r)}
                            disabled={isPending}
                          >
                            Waitlist
                          </Button>
                          <Button
                            type="button"
                            variant="clay"
                            size="sm"
                            onClick={() => handleReject(r)}
                            disabled={isPending}
                            className="text-danger"
                          >
                            Rechazar
                          </Button>
                        </>
                      )}
                      {r.status === "approved" && r.invite_token && (
                        <Button
                          type="button"
                          variant="clayPrimary"
                          size="sm"
                          onClick={() => handleCopyInviteLink(r)}
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
                          variant="clayPrimary"
                          size="sm"
                          onClick={() => handleApprove(r)}
                          disabled={isPending}
                        >
                          Aprobar
                        </Button>
                      )}
                      {r.status === "rejected" && (
                        <Button
                          type="button"
                          variant="clay"
                          size="sm"
                          onClick={() => handleDelete(r)}
                          disabled={isPending}
                          className="text-danger"
                        >
                          <Trash2 className="w-3 h-3" /> Borrar
                        </Button>
                      )}
                    </div>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </TableShell>
      </GlassPanel>
    </div>
  );
}
