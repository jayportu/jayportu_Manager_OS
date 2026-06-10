"use client";

/**
 * Sprint 23.5 — Form client del /beta. POST a /api/beta. Honeypot,
 * mensajes de éxito/error inline. Sin auth requerida.
 */

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { TurnstileWidget, TURNSTILE_ENABLED } from "@/components/turnstile-widget";

interface FormState {
  artist_name: string;
  email: string;
  instagram: string;
  city: string;
  genres: string;
  motivation: string;
  website: string; // honeypot
}

const EMPTY: FormState = {
  artist_name: "",
  email: "",
  instagram: "",
  city: "",
  genres: "",
  motivation: "",
  website: "",
};

export function BetaForm() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<
    { ok: true } | { ok: false; error: string } | null
  >(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaKey, setCaptchaKey] = useState(0);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    if (!form.artist_name.trim() || !form.email.trim()) {
      setResult({ ok: false, error: "Falta nombre artístico o email." });
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())) {
      setResult({ ok: false, error: "El email no tiene un formato válido." });
      return;
    }
    if (TURNSTILE_ENABLED && !captchaToken) {
      setResult({ ok: false, error: "Completa la verificación anti-bot." });
      return;
    }
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch("/api/beta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, captcha_token: captchaToken }),
      });
      const data = (await res.json()) as
        | { ok: true; id: string }
        | { ok: false; error: string };
      if (data.ok) {
        setResult({ ok: true });
        setForm(EMPTY);
      } else {
        setResult({ ok: false, error: data.error });
      }
    } catch {
      setResult({ ok: false, error: "Error de red. Intenta de nuevo." });
    } finally {
      // Token de un solo uso → re-montar el widget para el próximo intento.
      setCaptchaToken(null);
      setCaptchaKey((k) => k + 1);
      setSubmitting(false);
    }
  }

  // Estado de éxito (form se reemplaza con un thank-you)
  if (result?.ok) {
    return (
      <div className="border-2 border-ink bg-cream p-6">
        <div className="font-mono text-[11px] font-bold uppercase tracking-[0.15em] text-orange mb-3">
          — SOLICITUD ENVIADA
        </div>
        <h2 className="font-display text-4xl leading-none mb-3">
          GRACIAS<span className="text-orange">.</span>
        </h2>
        <p className="text-sm leading-relaxed">
          Recibimos tu solicitud. Te respondemos en 24-48hrs. Si quedas
          aprobado te llega un email con el link mágico para entrar.
        </p>
        <p className="text-xs text-fg-muted mt-4">
          Mientras tanto, síguenos en{" "}
          <a
            href="https://instagram.com/drop.gigs"
            target="_blank"
            rel="noopener noreferrer"
            className="text-orange hover:underline"
          >
            @drop.gigs
          </a>{" "}
          para updates de la beta.
        </p>
        <button
          type="button"
          onClick={() => setResult(null)}
          className="mt-5 font-mono text-[10px] uppercase tracking-wider text-fg-muted hover:text-ink"
        >
          ← Enviar otra solicitud
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border-2 border-ink bg-cream p-5 space-y-4"
    >
      <div className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-orange">
        — FORMULARIO DE SOLICITUD
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="artist_name" className="text-xs uppercase tracking-wider">
          Nombre artístico *
        </Label>
        <Input
          id="artist_name"
          required
          maxLength={120}
          value={form.artist_name}
          onChange={(e) => update("artist_name", e.target.value)}
          placeholder="ej: Lucía Vega"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email" className="text-xs uppercase tracking-wider">
          Email *
        </Label>
        <Input
          id="email"
          type="email"
          required
          maxLength={120}
          value={form.email}
          onChange={(e) => update("email", e.target.value)}
          placeholder="hola@tudominio.com"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="instagram" className="text-xs uppercase tracking-wider">
            Instagram
          </Label>
          <Input
            id="instagram"
            maxLength={80}
            value={form.instagram}
            onChange={(e) => update("instagram", e.target.value)}
            placeholder="@tuhandle"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="city" className="text-xs uppercase tracking-wider">
            Ciudad
          </Label>
          <Input
            id="city"
            maxLength={120}
            value={form.city}
            onChange={(e) => update("city", e.target.value)}
            placeholder="Santiago, Chile"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="genres" className="text-xs uppercase tracking-wider">
          Géneros (separados por coma)
        </Label>
        <Input
          id="genres"
          maxLength={200}
          value={form.genres}
          onChange={(e) => update("genres", e.target.value)}
          placeholder="techno, house, breakbeat"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="motivation" className="text-xs uppercase tracking-wider">
          ¿Qué problemáticas enfrentas hoy como DJ?
        </Label>
        <Textarea
          id="motivation"
          rows={3}
          maxLength={600}
          value={form.motivation}
          onChange={(e) => update("motivation", e.target.value)}
          placeholder="Cuéntanos qué te complica hoy y qué esperarías que una app te solucione…"
        />
        <div className="text-[10px] text-fg-subtle">
          {form.motivation.length}/600
        </div>
      </div>

      {/* Honeypot oculto, los bots tienden a llenarlo */}
      <input
        type="text"
        name="website"
        autoComplete="off"
        tabIndex={-1}
        value={form.website}
        onChange={(e) => update("website", e.target.value)}
        style={{
          position: "absolute",
          left: "-9999px",
          width: 1,
          height: 1,
          opacity: 0,
        }}
        aria-hidden="true"
      />

      {result && !result.ok && (
        <div className="border-2 border-danger bg-danger/10 p-3 text-sm text-danger">
          {result.error}
        </div>
      )}

      {TURNSTILE_ENABLED && (
        <TurnstileWidget
          key={captchaKey}
          onVerify={setCaptchaToken}
          onExpire={() => setCaptchaToken(null)}
        />
      )}

      <Button
        type="submit"
        variant="orange"
        disabled={submitting || (TURNSTILE_ENABLED && !captchaToken)}
        className="w-full"
      >
        {submitting ? "Enviando…" : "Enviar solicitud →"}
      </Button>

      <p className="text-[11px] text-fg-muted">
        Te respondemos en 24-48hrs.
      </p>
    </form>
  );
}
