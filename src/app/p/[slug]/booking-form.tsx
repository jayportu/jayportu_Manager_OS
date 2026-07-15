"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Alert, FIELD } from "@/components/hos";
import { cn } from "@/lib/utils";

interface BookingFormProps {
  userId: string;
  artistName: string;
}

const LABEL =
  "flex items-end min-h-[30px] leading-tight font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-white/60";

export function BookingForm({ userId, artistName }: BookingFormProps) {
  const [isPending, startTransition] = useTransition();
  const [opened, setOpened] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    event_type: "",
    event_date: "",
    venue: "",
    message: "",
  });

  function update<K extends keyof typeof form>(field: K, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleFocus() {
    if (opened) return;
    setOpened(true);
    void fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, event: "form_open" }),
      keepalive: true,
    }).catch(() => {});
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.name.trim()) {
      setError("Por favor pon tu nombre.");
      return;
    }
    if (!form.email.trim() && !form.phone.trim()) {
      setError("Déjanos un email o WhatsApp para poder responderte.");
      return;
    }
    startTransition(async () => {
      const res = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          ...form,
          event_date: form.event_date || null,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || "No se pudo enviar.");
        return;
      }
      // Track submit
      void fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, event: "form_submit" }),
        keepalive: true,
      }).catch(() => {});
      setSubmitted(true);
    });
  }

  if (submitted) {
    return (
      <Alert tone="success" title="¡Gracias!">
        {artistName} te va a contactar pronto.
      </Alert>
    );
  }

  return (
    <form onSubmit={handleSubmit} onFocus={handleFocus} className="space-y-4">
      {/* Orden "datos del gig primero": Nombre → Fecha → Tipo → Venue →
          Email → WhatsApp → Mensaje. Así el DJ ve al toque cuándo/qué/dónde. */}
      {/* items-stretch + label con altura fija (min-h) → los inputs de cada
          fila quedan alineados aunque una etiqueta ocupe 2 líneas. */}
      <div className="grid md:grid-cols-2 gap-4 items-end">
        <div className="space-y-2">
          <label htmlFor="name" className={LABEL}>Nombre *</label>
          <input
            id="name"
            required
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            placeholder="Tu nombre"
            className={FIELD}
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="event_date" className={LABEL}>Fecha (si la tienes)</label>
          {/* lang fija el formato del picker nativo a día-mes-año (audiencia
              LATAM); sin esto, un navegador en inglés muestra mm/dd/yyyy. */}
          <input
            id="event_date"
            type="date"
            lang="es-CL"
            value={form.event_date}
            onChange={(e) => update("event_date", e.target.value)}
            className={FIELD}
          />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4 items-end">
        <div className="space-y-2">
          <label htmlFor="event_type" className={LABEL}>Tipo de evento</label>
          <input
            id="event_type"
            value={form.event_type}
            onChange={(e) => update("event_type", e.target.value)}
            placeholder="Club, rooftop, evento privado…"
            className={FIELD}
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="venue" className={LABEL}>Venue / lugar</label>
          <input
            id="venue"
            value={form.venue}
            onChange={(e) => update("venue", e.target.value)}
            placeholder="Nombre del club o lugar"
            className={FIELD}
          />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4 items-end">
        <div className="space-y-2">
          <label htmlFor="email" className={LABEL}>Email</label>
          <input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            placeholder="tu@email.com"
            className={cn(FIELD, "font-mono")}
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="phone" className={LABEL}>WhatsApp / Teléfono</label>
          <input
            id="phone"
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            placeholder="+56 9 ..."
            className={FIELD}
          />
        </div>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="message"
          className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-white/60"
        >
          Mensaje
        </label>
        <textarea
          id="message"
          rows={4}
          value={form.message}
          onChange={(e) => update("message", e.target.value)}
          placeholder="Cuéntame brevemente el evento."
          className={cn(FIELD, "resize-none")}
        />
      </div>

      {error && <Alert tone="danger">{error}</Alert>}

      <Button
        type="submit"
        variant="clayPrimary"
        disabled={isPending}
        className="w-full md:w-auto"
      >
        {isPending ? "Enviando…" : "Enviar"}
      </Button>
    </form>
  );
}
