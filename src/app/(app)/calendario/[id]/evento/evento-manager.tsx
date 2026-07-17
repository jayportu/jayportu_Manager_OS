"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useConfirm } from "@/components/admin/confirm-dialog";
import { Button } from "@/components/ui/button";
import { GlassPanel, MonoLabel, Badge, Alert, FIELD } from "@/components/hos";
import { cn } from "@/lib/utils";
import {
  Globe,
  Copy,
  Check,
  Download,
  Users,
  Bell,
  Ticket,
  Eye,
} from "lucide-react";
import {
  publishEventAction,
  unpublishEventAction,
  setEventTicketUrlAction,
} from "./actions";
import type { MyEventInfo, EventRsvpRow } from "@/lib/queries/events";

function fmtWhen(iso: string): string {
  try {
    const s = new Date(iso).toLocaleString("es-CL", {
      timeZone: "America/Santiago",
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    });
    return s.charAt(0).toUpperCase() + s.slice(1);
  } catch {
    return "";
  }
}

/**
 * M15 — celda CSV segura: neutraliza inyección de fórmulas (=,+,-,@,tab,CR)
 * prefijando con comilla simple, y escapa comillas. Excel/Sheets, si no, podría
 * ejecutar `=...` desde el nombre que puso un fan anónimo.
 */
function csvCell(value: string): string {
  let v = value ?? "";
  if (/^[=+\-@\t\r]/.test(v)) v = `'${v}`;
  return `"${v.replace(/"/g, '""')}"`;
}

interface Props {
  event: MyEventInfo;
  rsvps: EventRsvpRow[];
  siteUrl: string;
}

export function EventoManager({ event, rsvps, siteUrl }: Props) {
  const router = useRouter();
  const confirm = useConfirm();
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [ticketUrl, setTicketUrl] = useState(event.ticket_url ?? "");
  const [ticketSaved, setTicketSaved] = useState(false);

  const isPublic = event.is_public && !!event.public_token;
  const link = event.public_token ? `${siteUrl}/e/${event.public_token}` : "";
  const notifyCount = rsvps.filter((r) => r.notify_future).length;
  const isShow = event.type === "show";

  function saveTicket() {
    startTransition(async () => {
      const res = await setEventTicketUrlAction(event.id, ticketUrl);
      if (res.ok) {
        setTicketSaved(true);
        setTimeout(() => setTicketSaved(false), 1500);
        router.refresh();
      } else {
        setNotice(res.error);
      }
    });
  }

  function publish() {
    startTransition(async () => {
      const res = await publishEventAction(event.id);
      if (res.ok) {
        setNotice(
          res.notified > 0
            ? `Publicado. Avisamos a ${res.notified} fan${res.notified === 1 ? "" : "s"}.`
            : "Publicado. Ya puedes compartir el link."
        );
        router.refresh();
      } else {
        setNotice(res.error);
      }
    });
  }

  async function unpublish() {
    const { ok } = await confirm({
      title: "¿Despublicar el evento?",
      message: "El link público dejará de funcionar.",
      variant: "warning",
      confirmLabel: "Despublicar",
    });
    if (!ok) return;
    startTransition(async () => {
      await unpublishEventAction(event.id);
      setNotice(null);
      router.refresh();
    });
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  function exportCsv() {
    const header = "nombre,email,estado,avisos,fecha\n";
    const rows = rsvps
      .map((r) =>
        [
          csvCell(r.name),
          csvCell(r.email),
          csvCell(r.status),
          r.notify_future ? "si" : "no",
          csvCell(r.created_at),
        ].join(",")
      )
      .join("\n");
    // BOM (﻿) para que Excel reconozca UTF-8 y no rompa tildes/ñ.
    const blob = new Blob(["﻿" + header + rows], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rsvps-${event.id.slice(0, 8)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      <div>
        <MonoLabel className="tracking-[0.12em]">EVENTO PÚBLICO</MonoLabel>
        <h1 className="font-display text-3xl leading-none mt-2">{event.title}</h1>
      </div>

      {/* Publicación */}
      <GlassPanel>
        {!isPublic ? (
          <div className="text-center py-2">
            <Globe className="w-8 h-8 mx-auto text-white/40 mb-2" />
            <p className="text-sm text-white/60 mb-4 max-w-sm mx-auto">
              Publica este show como página pública para compartir por
              Instagram o WhatsApp. Los fans confirman asistencia y quedan como
              leads tuyos.
            </p>
            {isShow ? (
              <Button onClick={publish} disabled={pending} variant="clayPrimary">
                <Globe className="w-4 h-4" />
                {pending ? "Publicando…" : "Publicar como evento"}
              </Button>
            ) : (
              <p className="text-xs text-white/60 rounded-xl border border-dashed border-white/15 bg-white/[0.03] px-3 py-2 max-w-sm mx-auto">
                Solo los eventos de tipo <strong>show</strong> se pueden publicar.
                Cambia el tipo en el calendario para habilitarlo.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge tone="up">● En vivo</Badge>
              <span className="text-xs text-white/60">
                Cualquiera con el link puede ver y confirmar.
              </span>
            </div>
            <div className="flex gap-2">
              <input
                readOnly
                value={link}
                onFocus={(e) => e.currentTarget.select()}
                className={cn(FIELD, "flex-1")}
              />
              <Button onClick={copyLink} variant="clay">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copiado" : "Copiar"}
              </Button>
            </div>

            {/* Link de entradas (opcional) — antes era una feature muerta sin UI */}
            <div>
              <label className="font-mono text-[10px] font-bold uppercase tracking-wider text-white/50 flex items-center gap-1.5 mb-1">
                <Ticket className="w-3.5 h-3.5" /> Link de entradas (opcional)
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={ticketUrl}
                  onChange={(e) => setTicketUrl(e.target.value)}
                  placeholder="https://..."
                  className={cn(FIELD, "flex-1")}
                />
                <Button onClick={saveTicket} variant="clay" disabled={pending}>
                  {ticketSaved ? <Check className="w-4 h-4" /> : "Guardar"}
                </Button>
              </div>
            </div>

            <button
              type="button"
              onClick={unpublish}
              disabled={pending}
              className="font-mono text-[10px] font-bold uppercase tracking-wider text-white/50 hover:text-danger"
            >
              Despublicar
            </button>
          </div>
        )}
        {notice && <div className="text-sm text-success mt-3">{notice}</div>}
      </GlassPanel>

      {/* M11 — vista previa de lo que el público verá. Evita publicar la
          descripción del calendario (que puede tener notas privadas/fee) sin
          que el DJ se dé cuenta. */}
      <GlassPanel>
        <div className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-white/50 flex items-center gap-1.5 mb-2">
          <Eye className="w-3.5 h-3.5" /> Esto ve el público
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-1">
          <div className="font-display text-xl leading-none">{event.title}</div>
          <div className="text-xs text-white/60">
            {fmtWhen(event.start_at) || "Fecha por confirmar"}
            {event.location ? ` · ${event.location}` : ""}
          </div>
          {event.description ? (
            <p className="text-sm text-white/90 whitespace-pre-wrap pt-1">
              {event.description}
            </p>
          ) : (
            <p className="text-xs text-white/40 pt-1 italic">
              Sin descripción.
            </p>
          )}
        </div>
        {event.description && (
          <div className="mt-3">
            <Alert tone="warn">
              ⚠ La descripción sale tal cual del calendario. Si tiene notas
              privadas o tu fee, edítala en el calendario antes de compartir.
            </Alert>
          </div>
        )}
      </GlassPanel>

      {/* RSVPs */}
      <GlassPanel>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-white/50 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" /> Asistentes ({rsvps.length})
            {notifyCount > 0 && (
              <span className="inline-flex items-center gap-1 text-orange ml-1">
                <Bell className="w-3 h-3" /> {notifyCount} con avisos
              </span>
            )}
          </h2>
          {rsvps.length > 0 && (
            <Button onClick={exportCsv} variant="clay" size="sm">
              <Download className="w-3.5 h-3.5" /> CSV
            </Button>
          )}
        </div>
        {rsvps.length === 0 ? (
          <p className="text-sm text-white/60">
            {isPublic
              ? "Aún nadie confirmó. Comparte el link para empezar a recibir RSVPs."
              : "Publica el evento para empezar a recibir RSVPs."}
          </p>
        ) : (
          <div className="rounded-xl border border-white/10 divide-y divide-white/10 overflow-hidden">
            {rsvps.map((r) => (
              <div key={r.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                <span className="flex-1 min-w-0 truncate">
                  {r.name || "(sin nombre)"}
                  <span className="text-white/40"> · {r.email}</span>
                </span>
                <Badge tone={r.status === "going" ? "up" : "neutral"}>
                  {r.status === "going" ? "Voy" : "Quizás"}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </GlassPanel>
    </div>
  );
}
