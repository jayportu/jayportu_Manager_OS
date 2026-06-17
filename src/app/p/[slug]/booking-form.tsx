"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface BookingFormProps {
  userId: string;
  artistName: string;
}

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
      <div className="text-center py-6">
        <div className="text-2xl font-display text-accent mb-2">¡Gracias!</div>
        <p className="text-sm text-fg-muted">
          {artistName} te va a contactar pronto.
        </p>
      </div>
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
          <Label htmlFor="name" className="flex items-end min-h-[30px] leading-tight">Nombre *</Label>
          <Input
            id="name"
            required
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            placeholder="Tu nombre"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="event_date" className="flex items-end min-h-[30px] leading-tight">Fecha (si la tienes)</Label>
          <Input
            id="event_date"
            type="date"
            value={form.event_date}
            onChange={(e) => update("event_date", e.target.value)}
          />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4 items-end">
        <div className="space-y-2">
          <Label htmlFor="event_type" className="flex items-end min-h-[30px] leading-tight">Tipo de evento</Label>
          <Input
            id="event_type"
            value={form.event_type}
            onChange={(e) => update("event_type", e.target.value)}
            placeholder="Club, rooftop, evento privado…"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="venue" className="flex items-end min-h-[30px] leading-tight">Venue / lugar</Label>
          <Input
            id="venue"
            value={form.venue}
            onChange={(e) => update("venue", e.target.value)}
            placeholder="Nombre del club o lugar"
          />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4 items-end">
        <div className="space-y-2">
          <Label htmlFor="email" className="flex items-end min-h-[30px] leading-tight">Email</Label>
          <Input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            placeholder="tu@email.com"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone" className="flex items-end min-h-[30px] leading-tight">WhatsApp / Teléfono</Label>
          <Input
            id="phone"
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            placeholder="+56 9 ..."
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="message">Mensaje</Label>
        <Textarea
          id="message"
          rows={4}
          value={form.message}
          onChange={(e) => update("message", e.target.value)}
          placeholder="Cuéntame brevemente el evento."
        />
      </div>

      {error && (
        <div className="text-sm text-danger bg-danger/10 border border-danger/30 rounded px-3 py-2">
          {error}
        </div>
      )}

      <Button type="submit" disabled={isPending} className="w-full md:w-auto">
        {isPending ? "Enviando…" : "Enviar"}
      </Button>
    </form>
  );
}
