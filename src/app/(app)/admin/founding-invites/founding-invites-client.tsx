"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send, Copy, Check, X, Star } from "lucide-react";
import type { FoundingInvite } from "@/lib/queries/founding-invites";
import {
  sendFoundingInviteAction,
  revokeFoundingInviteAction,
} from "./actions";
import { useConfirm } from "@/components/admin/confirm-dialog";
import {
  GlassPanel,
  Alert,
  EmptyState,
  TableShell,
  Th,
  Td,
  Badge,
  FIELD,
} from "@/components/hos";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

function inviteLink(token: string): string {
  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://dropgigs.com";
  return `${origin}/signup/booker?founding=${token}`;
}

/** Una invitación pendiente pero pasada su fecha de vencimiento ya no activa. */
function isExpired(inv: FoundingInvite): boolean {
  return (
    inv.status === "pending" &&
    !!inv.expires_at &&
    new Date(inv.expires_at).getTime() < Date.now()
  );
}

function shortDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("es-CL", { day: "2-digit", month: "short" });
  } catch {
    return "—";
  }
}

const STATUS_TONE: Record<string, "up" | "warn" | "down" | "info" | "neutral"> = {
  pending: "warn",
  accepted: "up",
  revoked: "neutral",
};
const STATUS_LABEL: Record<string, string> = {
  pending: "pendiente",
  accepted: "aceptada ★",
  revoked: "revocada",
};

export function FoundingInvitesClient({
  invites,
}: {
  invites: FoundingInvite[];
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<
    { type: "ok" | "err"; text: string; link?: string } | null
  >(null);
  const [copied, setCopied] = useState<string | null>(null);

  function copy(text: string, key: string) {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    startTransition(async () => {
      const res = await sendFoundingInviteAction(email, fullName);
      if (!res.ok) {
        setMsg({ type: "err", text: res.error });
        return;
      }
      setMsg({
        // Si el email NO se envió, lo marcamos como error (rojo) — la invitación
        // quedó creada pero hay que mandar el link a mano.
        type: res.data.emailSent ? "ok" : "err",
        text: res.data.emailSent
          ? `Invitación enviada a ${res.data.email}.`
          : `⚠ Invitación creada pero el email NO se envió (${res.data.emailError ?? "?"}). Copia el link y mándalo a mano.`,
        link: res.data.inviteUrl,
      });
      setEmail("");
      setFullName("");
      router.refresh();
    });
  }

  async function handleRevoke(inv: FoundingInvite) {
    const res = await confirm({
      title: "Revocar invitación",
      message: (
        <>
          ¿Revocar la invitación de <strong>{inv.email}</strong>? El link dejará de
          funcionar.
        </>
      ),
      variant: "danger",
      confirmLabel: "Revocar",
    });
    if (!res.ok) return;
    startTransition(async () => {
      const res = await revokeFoundingInviteAction(inv.id);
      if (!res.ok) setMsg({ type: "err", text: res.error });
      else router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {/* Form de invitación */}
      <GlassPanel>
        <form
          onSubmit={handleInvite}
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="founding-email">Email del booker</Label>
            <input
              id="founding-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="hola@venue.com"
              className={FIELD}
            />
          </div>
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="founding-name">Nombre (opcional)</Label>
            <input
              id="founding-name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Club X / Carlos"
              className={FIELD}
            />
          </div>
          <Button type="submit" variant="clayPrimary" disabled={pending}>
            <Send className="h-3.5 w-3.5" />
            {pending ? "Enviando…" : "Invitar"}
          </Button>
        </form>
      </GlassPanel>

      {msg && (
        <Alert tone={msg.type === "ok" ? "success" : "danger"}>
          {msg.text}
          {msg.link && (
            <button
              type="button"
              onClick={() => copy(msg.link!, "msg")}
              className="ml-2 inline-flex items-center gap-1 underline"
            >
              {copied === "msg" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              copiar link
            </button>
          )}
        </Alert>
      )}

      {/* Tabla de invitaciones */}
      {invites.length === 0 ? (
        <EmptyState icon={Star} title="Todavía no hay invitaciones Founding." />
      ) : (
        <GlassPanel padded={false}>
          <TableShell bare>
            <thead>
              <tr>
                <Th>Email</Th>
                <Th>Nombre</Th>
                <Th>Estado</Th>
                <Th>Enviada</Th>
                <Th>Vence</Th>
                <Th align="right">Acción</Th>
              </tr>
            </thead>
            <tbody>
              {invites.map((inv) => (
                <tr
                  key={inv.id}
                  className="transition-colors hover:bg-white/[0.02]"
                >
                  <Td>{inv.email}</Td>
                  <Td className="text-xs text-white/55">
                    {inv.full_name || "—"}
                  </Td>
                  <Td>
                    <div className="flex flex-wrap items-center gap-1">
                      <Badge tone={STATUS_TONE[inv.status] ?? "neutral"}>
                        {STATUS_LABEL[inv.status] ?? inv.status}
                      </Badge>
                      {isExpired(inv) && <Badge tone="down">caducada</Badge>}
                    </div>
                  </Td>
                  <Td className="whitespace-nowrap text-xs text-white/55">
                    {inv.invite_sent_at ? "Sí" : "—"}
                  </Td>
                  <Td
                    className={`whitespace-nowrap text-xs ${
                      isExpired(inv) ? "text-danger" : "text-white/55"
                    }`}
                  >
                    {inv.status === "pending" ? shortDate(inv.expires_at) : "—"}
                  </Td>
                  <Td align="right" className="whitespace-nowrap">
                    {inv.status === "pending" && inv.invite_token && (
                      <div className="inline-flex items-center gap-1.5">
                        <Button
                          type="button"
                          variant="clay"
                          size="sm"
                          onClick={() => copy(inviteLink(inv.invite_token!), inv.id)}
                          title="Copiar link de invitación"
                        >
                          {copied === inv.id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          link
                        </Button>
                        <Button
                          type="button"
                          variant="clay"
                          size="sm"
                          onClick={() => handleRevoke(inv)}
                          disabled={pending}
                          className="text-danger"
                        >
                          <X className="h-3 w-3" /> revocar
                        </Button>
                      </div>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        </GlassPanel>
      )}
    </div>
  );
}
