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
import { GlassPanel, MonoLabel, Alert, FIELD } from "@/components/hos";
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
    { ok: true; autoApproved: boolean } | { ok: false; error: string } | null
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
        | { ok: true; id: string; autoApproved?: boolean }
        | { ok: false; error: string };
      if (data.ok) {
        setResult({ ok: true, autoApproved: data.autoApproved === true });
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
      <GlassPanel padded={false} className="p-6">
        <MonoLabel className="text-[11px] tracking-[0.15em]">
          SOLICITUD ENVIADA
        </MonoLabel>
        <h2 className="font-display text-4xl leading-none mb-3 mt-3">
          {result.autoApproved ? "ESTÁS DENTRO" : "GRACIAS"}
          <span className="text-orange">.</span>
        </h2>
        <p className="text-sm leading-relaxed text-fg-muted">
          {result.autoApproved
            ? "Te mandamos tu acceso al correo — revísalo (también spam). Toca el link y armas tu press kit en minutos."
            : "La revisamos a mano (no es un bot) y te escribimos en 24-48 hrs. Si quedas, te llega un email con tu link de acceso."}
        </p>

        {/* Siguiente paso tangible mientras espera — para no enfriar al DJ */}
        <div className="mt-5 border-t border-white/10 pt-4">
          <div className="mb-3">
            <MonoLabel>Mientras tanto</MonoLabel>
          </div>
          <a
            href="/dj"
            className="flex items-center justify-between gap-3 rounded-xl border border-white/12 bg-white/[0.04] px-4 py-3 transition-colors hover:border-orange/50 hover:bg-white/[0.07] hover:text-orange"
          >
            <span className="text-sm font-bold">
              Mira cómo se ve un press kit real
            </span>
            <span aria-hidden>→</span>
          </a>
          <div className="mt-4">
            <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-fg-muted mb-2">
              Ten esto listo para armar el tuyo en 5 min:
            </div>
            <ul className="space-y-1 text-sm">
              {[
                "Tu bio corta",
                "1-2 links de tus sets (SoundCloud / YouTube)",
                "Una foto tuya",
                "Tus géneros",
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="text-orange font-bold">›</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="text-xs text-fg-muted mt-5">
          Y síguenos en{" "}
          <a
            href="https://instagram.com/drop.gigs"
            target="_blank"
            rel="noopener noreferrer"
            className="text-orange hover:underline"
          >
            @drop.gigs
          </a>{" "}
          para updates.
        </p>
        <button
          type="button"
          onClick={() => setResult(null)}
          className="mt-5 font-mono text-[10px] uppercase tracking-wider text-fg-muted hover:text-fg"
        >
          ← Enviar otra solicitud
        </button>
      </GlassPanel>
    );
  }

  return (
    <GlassPanel>
      <form onSubmit={handleSubmit} className="space-y-4">
        <MonoLabel>FORMULARIO DE SOLICITUD</MonoLabel>

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
            className={FIELD}
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
            className={FIELD}
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
              className={FIELD}
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
              className={FIELD}
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
            className={FIELD}
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
            className={FIELD}
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

        {result && !result.ok && <Alert tone="danger">{result.error}</Alert>}

        {TURNSTILE_ENABLED && (
          <TurnstileWidget
            key={captchaKey}
            onVerify={setCaptchaToken}
            onExpire={() => setCaptchaToken(null)}
          />
        )}

        <Button
          type="submit"
          variant="clayPrimary"
          disabled={submitting || (TURNSTILE_ENABLED && !captchaToken)}
          className="w-full"
        >
          {submitting ? "Enviando…" : "Enviar solicitud →"}
        </Button>

        <p className="text-[11px] text-fg-muted">
          Te respondemos en 24-48hrs.
        </p>
      </form>
    </GlassPanel>
  );
}
