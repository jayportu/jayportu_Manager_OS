"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BOOKER_TYPES } from "@/types/database";
import { updateBookerProfileAction, type BookerProfileInput } from "./actions";

interface Props {
  initial: BookerProfileInput & { email: string };
}

export function BookerProfileForm({ initial }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<BookerProfileInput>({
    full_name: initial.full_name,
    booker_type: initial.booker_type,
    city: initial.city,
    country: initial.country,
    whatsapp: initial.whatsapp,
    website_url: initial.website_url,
    instagram_url: initial.instagram_url,
    bio: initial.bio,
    in_directory: initial.in_directory,
    accepts_pitches: initial.accepts_pitches,
    newsletter_optin: initial.newsletter_optin,
  });
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<
    { kind: "ok" | "err"; text: string } | null
  >(null);

  function set<K extends keyof BookerProfileInput>(
    key: K,
    val: BookerProfileInput[K]
  ) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!form.full_name.trim()) {
      setMsg({ kind: "err", text: "El nombre es obligatorio." });
      return;
    }
    startTransition(async () => {
      const res = await updateBookerProfileAction(form);
      if (!res.ok) {
        setMsg({ kind: "err", text: res.error });
        return;
      }
      setMsg({ kind: "ok", text: "Perfil guardado ✓" });
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Datos básicos */}
      <Section title="Tus datos">
        <Field label="Nombre / Organización *">
          <input
            type="text"
            value={form.full_name}
            onChange={(e) => set("full_name", e.target.value)}
            maxLength={80}
            placeholder="Ej. Club Subterráneo"
            className={inputCls}
          />
        </Field>

        <Field label="Email (acceso)">
          <input
            type="email"
            value={initial.email}
            readOnly
            className={`${inputCls} bg-cream/60 text-fg-muted cursor-not-allowed`}
          />
        </Field>

        <Field label="Tipo de booker">
          <select
            value={form.booker_type}
            onChange={(e) => set("booker_type", e.target.value)}
            className={inputCls}
          >
            {BOOKER_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Ciudad">
            <input
              type="text"
              value={form.city}
              onChange={(e) => set("city", e.target.value)}
              maxLength={60}
              placeholder="Santiago"
              className={inputCls}
            />
          </Field>
          <Field label="País">
            <input
              type="text"
              value={form.country}
              onChange={(e) => set("country", e.target.value)}
              maxLength={60}
              placeholder="Chile"
              className={inputCls}
            />
          </Field>
        </div>

        <Field label="WhatsApp" hint="Se le revela al DJ solo cuando acepta tu request.">
          <input
            type="text"
            value={form.whatsapp}
            onChange={(e) => set("whatsapp", e.target.value)}
            maxLength={30}
            placeholder="+56 9 1234 5678"
            className={inputCls}
          />
        </Field>
      </Section>

      {/* Visible al DJ */}
      <Section title="Tu carta de presentación" hint="Esto es lo que ven los DJs cuando los contactas.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Sitio web">
            <input
              type="text"
              value={form.website_url}
              onChange={(e) => set("website_url", e.target.value)}
              maxLength={200}
              placeholder="clubsub.cl"
              className={inputCls}
            />
          </Field>
          <Field label="Instagram">
            <input
              type="text"
              value={form.instagram_url}
              onChange={(e) => set("instagram_url", e.target.value)}
              maxLength={200}
              placeholder="@clubsubterraneo"
              className={inputCls}
            />
          </Field>
        </div>
        <Field label="Sobre el lugar" hint="Una línea o dos: qué hacen, qué buscan, capacidad.">
          <textarea
            value={form.bio}
            onChange={(e) => set("bio", e.target.value)}
            maxLength={600}
            rows={3}
            placeholder="Club de 400 personas, techno y house. ~3 eventos/semana. Buscamos residentes."
            className={`${inputCls} resize-y`}
          />
        </Field>
      </Section>

      {/* Toggles */}
      <Section title="Visibilidad para DJs">
        <Toggle
          checked={form.in_directory}
          onChange={(v) => set("in_directory", v)}
          label="Aparecer en el directorio de lugares"
          hint="Los DJs pueden encontrarte explorando lugares. (Próximamente · requiere verificación de DROP.)"
        />
        <Toggle
          checked={form.accepts_pitches}
          onChange={(v) => set("accepts_pitches", v)}
          label="Aceptar pitches directos de DJs"
          hint="Si está apagado, los DJs solo pueden marcar “me gustaría tocar acá” y tú decides a quién contactar."
        />
        <Toggle
          checked={form.newsletter_optin}
          onChange={(v) => set("newsletter_optin", v)}
          label="Recibir novedades de DROP. por email"
        />
      </Section>

      {msg && (
        <div
          className={`border-2 px-4 py-2.5 font-mono text-[11px] font-bold uppercase tracking-wider ${
            msg.kind === "ok"
              ? "border-success bg-success/10 text-success"
              : "border-danger bg-danger/10 text-danger"
          }`}
        >
          {msg.text}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 bg-ink text-cream font-mono text-[11px] font-bold tracking-[0.14em] uppercase border-2 border-ink hover:bg-orange hover:text-ink hover:border-orange transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {pending ? "Guardando…" : "Guardar perfil"}
      </button>
    </form>
  );
}

const inputCls =
  "w-full border-2 border-ink bg-white px-3 py-2 text-[15px] outline-none focus:border-orange transition-colors";

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-2 border-ink bg-white p-5 space-y-4">
      <div>
        <h2 className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-orange">
          — {title}
        </h2>
        {hint && <p className="text-xs text-fg-muted mt-1">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-ink">
        {label}
      </span>
      {children}
      {hint && <span className="block text-[11px] text-fg-subtle">{hint}</span>}
    </label>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer select-none">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`mt-0.5 w-10 h-6 border-2 border-ink shrink-0 relative transition-colors ${
          checked ? "bg-orange" : "bg-cream"
        }`}
      >
        <span
          className={`absolute top-0.5 w-4 h-4 bg-white border border-ink transition-all ${
            checked ? "left-[18px]" : "left-0.5"
          }`}
        />
      </button>
      <span className="flex-1">
        <span className="text-sm font-semibold text-ink">{label}</span>
        {hint && <span className="block text-[11px] text-fg-muted mt-0.5">{hint}</span>}
      </span>
    </label>
  );
}
