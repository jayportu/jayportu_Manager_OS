"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
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
      <div className="text-sm text-fg-muted bg-bg-subtle border border-border rounded-md px-3 py-3 flex gap-2 items-start">
        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-warning" />
        <div>
          Tu navegador no soporta notificaciones push. En iPhone necesitas
          agregar la app a la pantalla de inicio (Safari → Compartir → Agregar)
          y abrirla desde ahí.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 p-4 rounded-lg bg-bg border border-border">
        <div
          className={`w-9 h-9 rounded-md flex items-center justify-center shrink-0 ${
            active
              ? "bg-success/15 border border-success/30"
              : "bg-secondary border border-border"
          }`}
        >
          {active ? (
            <Bell className="w-4 h-4 text-success" />
          ) : (
            <BellOff className="w-4 h-4 text-fg-muted" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold">
            {active
              ? "Notificaciones activadas en este dispositivo"
              : "Notificaciones desactivadas"}
          </div>
          <div className="text-xs text-fg-muted mt-0.5">
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
              variant="outline"
              onClick={handleTest}
              disabled={isPending}
              size="sm"
            >
              {isPending ? "Enviando…" : "Enviar prueba"}
              <Send className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="outline"
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
        <div
          className={`text-xs rounded-md px-3 py-2 flex gap-2 items-start ${
            message.type === "ok"
              ? "bg-success/10 border border-success/30 text-success"
              : "bg-danger/10 border border-danger/30 text-danger"
          }`}
        >
          {message.type === "ok" ? (
            <Check className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <p className="text-[11px] text-fg-subtle">
        Las notificaciones se activan por dispositivo. Si quieres recibirlas
        en mobile, abre esta página desde el celular después de instalar la
        app en la pantalla de inicio.
      </p>
    </div>
  );
}
