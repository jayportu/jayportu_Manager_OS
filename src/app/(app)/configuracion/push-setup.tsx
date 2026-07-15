"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge, Alert } from "@/components/hos";
import { Bell, BellOff, Check, AlertCircle, Send } from "lucide-react";
import {
  isPushSupported,
  getPushPermission,
  hasActiveSubscription,
  subscribeToPush,
  unsubscribeFromPush,
  type PushPermission,
} from "@/lib/push/client";

export function PushSetup() {
  const [supported, setSupported] = useState(true);
  const [permission, setPermission] = useState<PushPermission>("default");
  const [active, setActive] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);

  async function refresh() {
    const sup = isPushSupported();
    setSupported(sup);
    if (!sup) return;
    setPermission(getPushPermission());
    setActive(await hasActiveSubscription());
  }

  useEffect(() => {
    refresh();
  }, []);

  function handleSubscribe() {
    setMessage(null);
    startTransition(async () => {
      try {
        await subscribeToPush();
        setMessage({ type: "ok", text: "Notificaciones activadas en este dispositivo." });
        await refresh();
      } catch (e) {
        setMessage({
          type: "err",
          text: e instanceof Error ? e.message : "Error al activar",
        });
        await refresh();
      }
    });
  }

  function handleUnsubscribe() {
    setMessage(null);
    startTransition(async () => {
      try {
        await unsubscribeFromPush();
        setMessage({ type: "ok", text: "Notificaciones desactivadas en este dispositivo." });
        await refresh();
      } catch (e) {
        setMessage({
          type: "err",
          text: e instanceof Error ? e.message : "Error al desactivar",
        });
      }
    });
  }

  async function handleTest() {
    setMessage(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/push/test", { method: "POST" });
        const data = (await res.json()) as { ok?: boolean; sent?: number; error?: string };
        if (!res.ok || !data.ok) {
          throw new Error(data.error || "Error desconocido");
        }
        setMessage({
          type: "ok",
          text: `Push de prueba enviada (${data.sent ?? 0} dispositivo${(data.sent ?? 0) === 1 ? "" : "s"}). Revisa la barra de notificaciones.`,
        });
      } catch (e) {
        setMessage({
          type: "err",
          text: e instanceof Error ? e.message : "Error al enviar",
        });
      }
    });
  }

  if (!supported) {
    return (
      <Alert tone="warn">
        Tu navegador no soporta notificaciones push. En iPhone necesitas agregar
        la app a la pantalla de inicio (Safari → Compartir → Agregar) y abrirla
        desde ahí.
      </Alert>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 rounded-xl border border-white/12 bg-white/[0.04] p-4">
        <div
          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
            active
              ? "bg-success/15 border border-success/30"
              : "bg-white/[0.06] border border-white/12"
          }`}
        >
          {active ? (
            <Bell className="w-4 h-4 text-success" />
          ) : (
            <BellOff className="w-4 h-4 text-white/45" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-white/85">
              {active
                ? "Notificaciones activadas en este dispositivo"
                : "Notificaciones desactivadas"}
            </span>
            <Badge tone={active ? "up" : "neutral"}>
              {active ? "Activo" : "Inactivo"}
            </Badge>
          </div>
          <div className="text-xs text-white/45 mt-0.5">
            {permission === "denied"
              ? "Permiso bloqueado en el navegador. Tienes que habilitarlo en los ajustes del sitio."
              : active
              ? "Recibirás follow-ups vencidos, deltas de SoundCloud y recordatorio semanal."
              : "Te avisamos cuando hay follow-ups vencidos o crece tu audiencia."}
          </div>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {!active && (
          <Button
            variant="clayPrimary"
            onClick={handleSubscribe}
            disabled={isPending || permission === "denied"}
            size="sm"
          >
            {isPending ? "Activando…" : "Activar notificaciones"}
            <Bell className="w-3.5 h-3.5" />
          </Button>
        )}
        {active && (
          <>
            <Button
              variant="clay"
              onClick={handleTest}
              disabled={isPending}
              size="sm"
            >
              {isPending ? "Enviando…" : "Enviar prueba"}
              <Send className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="clay"
              onClick={handleUnsubscribe}
              disabled={isPending}
              size="sm"
            >
              Desactivar
              <BellOff className="w-3.5 h-3.5" />
            </Button>
          </>
        )}
      </div>

      {message && (
        <Alert tone={message.type === "ok" ? "success" : "danger"}>
          <span className="inline-flex items-start gap-1.5">
            {message.type === "ok" ? (
              <Check className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            )}
            <span>{message.text}</span>
          </span>
        </Alert>
      )}

      <p className="text-[11px] text-white/40">
        Las notificaciones se activan por dispositivo. Si quieres recibirlas
        en mobile, abre esta página desde el celular después de instalar la
        app en la pantalla de inicio.
      </p>
    </div>
  );
}
