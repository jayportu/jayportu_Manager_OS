"use client";

/**
 * F2a — Wizard de bienvenida del booker (3 pasos). El layout de /booker lo
 * renderiza IN-PLACE cuando booker.onboarding_completed_at === null (mismo
 * patrón que BookerTosGate, para evitar loops de redirect). Al terminar guarda
 * el perfil + marca onboarding_completed_at y refresca → aparece el portal.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowLeft, Check, Search, Megaphone, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GlassPanel, Alert, FIELD, SELECT } from "@/components/hos";
import { completeBookerOnboarding, type BookerOnboardingInput } from "./actions";

const BOOKER_TYPES = [
  { value: "venue", label: "Venue / Club / Bar" },
  { value: "productora", label: "Productora de eventos" },
  { value: "agencia", label: "Agencia de booking" },
  { value: "evento_privado", label: "Evento privado" },
  { value: "casamiento", label: "Casamiento / Matrimonio" },
  { value: "corporativo", label: "Evento corporativo" },
  { value: "festival", label: "Festival" },
  { value: "otro", label: "Otro" },
];

type Step = 1 | 2 | 3;

export function BookerWelcomeWizard({ initial }: { initial: BookerOnboardingInput }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<BookerOnboardingInput>(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function set<K extends keyof BookerOnboardingInput>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function next() {
    setError(null);
    if (step === 1) {
      if (!form.fullName.trim()) {
        setError("Necesitamos tu nombre (o el de tu organización) para continuar.");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    } else {
      startTransition(async () => {
        const res = await completeBookerOnboarding(form);
        if (!res.ok) {
          setError(res.error || "No se pudo guardar. Intenta de nuevo.");
          return;
        }
        router.refresh();
      });
    }
  }

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-xl">
        {/* Progreso */}
        <div className="flex items-center justify-center gap-2 mb-5">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className={`h-1.5 rounded-full transition-all ${
                n === step ? "w-12 bg-orange" : n < step ? "w-8 bg-orange/60" : "w-8 bg-border"
              }`}
            />
          ))}
        </div>
        <div className="text-center font-mono text-[10px] uppercase tracking-widest text-fg-subtle mb-5">
          Paso {step} de 3
        </div>

        <GlassPanel padded={false} className="p-6 md:p-8">
          {step === 1 && <StepAbout form={form} set={set} />}
          {step === 2 && <StepContact form={form} set={set} />}
          {step === 3 && <StepDone name={form.fullName} />}

          {error && (
            <div className="mt-4">
              <Alert tone="danger">{error}</Alert>
            </div>
          )}

          <div className="flex gap-3 mt-6">
            {step > 1 && (
              <Button
                type="button"
                variant="clay"
                onClick={() => {
                  setError(null);
                  setStep((s) => (s - 1) as Step);
                }}
                disabled={pending}
              >
                <ArrowLeft className="w-4 h-4" />
                Atrás
              </Button>
            )}
            <Button type="button" variant="clayPrimary" onClick={next} disabled={pending} className="flex-1">
              {pending ? "Guardando…" : step === 3 ? "Empezar" : "Continuar"}
              {!pending && step < 3 && <ArrowRight className="w-4 h-4" />}
              {!pending && step === 3 && <Check className="w-4 h-4" />}
            </Button>
          </div>
        </GlassPanel>
      </div>
    </div>
  );
}

function StepAbout({
  form,
  set,
}: {
  form: BookerOnboardingInput;
  set: <K extends keyof BookerOnboardingInput>(key: K, value: string) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight mb-1">Bienvenido a DROP.</h1>
        <p className="text-sm text-fg-muted">
          Un par de datos para que los DJs sepan quién los contrata. Puedes ajustar todo
          después en tu perfil.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="full-name">Tu nombre o el de tu organización *</Label>
        <Input
          id="full-name"
          className={FIELD}
          placeholder="Club X / Carlos Pérez"
          value={form.fullName}
          onChange={(e) => set("fullName", e.target.value)}
          autoFocus
          maxLength={80}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="booker-type">¿Qué tipo de booker eres?</Label>
        <select
          id="booker-type"
          value={form.bookerType}
          onChange={(e) => set("bookerType", e.target.value)}
          className={SELECT}
        >
          {BOOKER_TYPES.map((t) => (
            <option key={t.value} value={t.value} className="bg-bg-panel">
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="city">Ciudad</Label>
        <Input
          id="city"
          className={FIELD}
          placeholder="Santiago"
          value={form.city}
          onChange={(e) => set("city", e.target.value)}
          maxLength={60}
        />
      </div>
    </div>
  );
}

function StepContact({
  form,
  set,
}: {
  form: BookerOnboardingInput;
  set: <K extends keyof BookerOnboardingInput>(key: K, value: string) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight mb-1">¿Cómo te encuentran?</h1>
        <p className="text-sm text-fg-muted">
          Opcional, pero ayuda: cuando envías una solicitud, el DJ ve tu ficha. Un
          Instagram o web hace que confíen más en tu evento.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="whatsapp">WhatsApp</Label>
        <Input
          id="whatsapp"
          className={FIELD}
          placeholder="+56 9 1234 5678"
          value={form.whatsapp}
          onChange={(e) => set("whatsapp", e.target.value)}
          maxLength={40}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="instagram">Instagram</Label>
        <Input
          id="instagram"
          className={FIELD}
          type="url"
          placeholder="https://instagram.com/tu_organizacion"
          value={form.instagramUrl}
          onChange={(e) => set("instagramUrl", e.target.value)}
          maxLength={200}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="website">Sitio web</Label>
        <Input
          id="website"
          className={FIELD}
          type="url"
          placeholder="https://tu-evento.com"
          value={form.websiteUrl}
          onChange={(e) => set("websiteUrl", e.target.value)}
          maxLength={200}
        />
      </div>
    </div>
  );
}

function StepDone({ name }: { name: string }) {
  const items = [
    {
      icon: Search,
      title: "Busca DJs",
      desc: "Filtra por ciudad, género y disponibilidad. Escucha sus sets.",
    },
    {
      icon: Megaphone,
      title: "Publica una convocatoria",
      desc: "Cuenta tu evento y deja que los DJs que calzan te postulen.",
    },
    {
      icon: Heart,
      title: "Guarda favoritos",
      desc: "Arma tu lista y sigue a los DJs que te interesan.",
    },
  ];
  const cleanName = name.trim();
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight mb-1">
          Listo{cleanName ? `, ${cleanName}` : ""}
        </h1>
        <p className="text-sm text-fg-muted">
          Esto es lo que puedes hacer en DROP. Contratar DJs es gratis y sin comisión.
        </p>
      </div>

      <div className="space-y-2">
        {items.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.title} className="flex gap-3 p-3 rounded-xl border border-white/10 bg-white/[0.04]">
              <div className="w-8 h-8 rounded-lg border border-orange/30 bg-orange/10 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-orange" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-fg">{s.title}</div>
                <div className="text-[12px] text-fg-muted leading-snug mt-0.5">{s.desc}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
