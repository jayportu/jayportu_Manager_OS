"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send, Copy, Check, X } from "lucide-react";
import type { FoundingInvite } from "@/lib/queries/founding-invites";
import {
  sendFoundingInviteAction,
  revokeFoundingInviteAction,
} from "./actions";
import { useConfirm } from "@/components/admin/confirm-dialog";

function inviteLink(token: string): string {
  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://dropgigs.com";
  return `${origin}/signup/booker?founding=${token}`;
}

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-warning/15 border-warning/30 text-warning",
  accepted: "bg-success/15 border-success/30 text-success",
  revoked: "bg-fg-muted/15 border-fg-muted/30 text-fg-muted",
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
      <form
        onSubmit={handleInvite}
        className="border-2 border-border bg-bg-panel p-4 md:p-5 flex flex-col sm:flex-row gap-3 sm:items-end"
      >
        <div className="flex-1 space-y-1">
          <label className="font-mono text-[10px] font-bold uppercase tracking-wider text-fg-muted">
            Email del booker
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="hola@venue.com"
            className="w-full border-2 border-border bg-bg-panel px-3 py-2 text-sm focus:outline-none focus:border-orange"
          />
        </div>
        <div className="flex-1 space-y-1">
          <label className="font-mono text-[10px] font-bold uppercase tracking-wider text-fg-muted">
            Nombre (opcional)
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Club X / Carlos"
            className="w-full border-2 border-border bg-bg-panel px-3 py-2 text-sm focus:outline-none focus:border-orange"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center gap-2 h-10 px-4 border-2 border-border bg-orange text-ink hover:bg-ink hover:text-orange font-mono text-[11px] font-bold uppercase tracking-[0.08em] transition-colors disabled:opacity-50"
        >
          <Send className="w-3.5 h-3.5" />
          {pending ? "Enviando…" : "Invitar"}
        </button>
      </form>

      {msg && (
        <div
          className={`border-2 px-3 py-2 text-sm ${
            msg.type === "ok"
              ? "border-success/40 bg-success/10 text-success"
              : "border-danger/40 bg-danger/10 text-danger"
          }`}
        >
          {msg.text}
          {msg.link && (
            <button
              type="button"
              onClick={() => copy(msg.link!, "msg")}
              className="ml-2 inline-flex items-center gap-1 underline"
            >
              {copied === "msg" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              copiar link
            </button>
          )}
        </div>
      )}

      {/* Tabla de invitaciones */}
      {invites.length === 0 ? (
        <div className="border-2 border-dashed border-border/30 bg-cream p-8 text-center text-sm text-fg-muted">
          Todavía no hay invitaciones Founding.
        </div>
      ) : (
        <div className="border-2 border-border bg-bg-panel overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-bg-subtle border-b border-border">
              <tr className="text-left text-[10px] uppercase tracking-wider text-fg-muted">
                <th className="px-3 py-2.5 font-semibold">Email</th>
                <th className="px-3 py-2.5 font-semibold">Nombre</th>
                <th className="px-3 py-2.5 font-semibold">Estado</th>
                <th className="px-3 py-2.5 font-semibold">Enviada</th>
                <th className="px-3 py-2.5 font-semibold text-right">Acción</th>
              </tr>
            </thead>
            <tbody>
              {invites.map((inv) => (
                <tr
                  key={inv.id}
                  className="border-b border-border last:border-b-0 hover:bg-bg-subtle/40 transition-colors"
                >
                  <td className="px-3 py-2.5">{inv.email}</td>
                  <td className="px-3 py-2.5 text-fg-muted text-xs">
                    {inv.full_name || "—"}
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                        STATUS_STYLE[inv.status] ?? ""
                      }`}
                    >
                      {STATUS_LABEL[inv.status] ?? inv.status}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-fg-muted text-xs whitespace-nowrap">
                    {inv.invite_sent_at ? "Sí" : "—"}
                  </td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap">
                    {inv.status === "pending" && inv.invite_token && (
                      <>
                        <button
                          type="button"
                          onClick={() => copy(inviteLink(inv.invite_token!), inv.id)}
                          className="inline-flex items-center gap-1 px-2 py-1 border border-border/40 font-mono text-[9px] uppercase tracking-wider hover:bg-ink hover:text-white transition-colors mr-1"
                          title="Copiar link de invitación"
                        >
                          {copied === inv.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          link
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRevoke(inv)}
                          disabled={pending}
                          className="inline-flex items-center gap-1 px-2 py-1 border border-danger/50 text-danger font-mono text-[9px] uppercase tracking-wider hover:bg-danger hover:text-white transition-colors disabled:opacity-50"
                        >
                          <X className="w-3 h-3" /> revocar
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
