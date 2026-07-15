"use client";

/**
 * Editor del tech rider — formato simple IDEAL / ALTERNATIVO (+ hospitality).
 * Un equipo por línea; se muestra tal cual en el press kit público (cajas
 * IDEAL/ALTERNATIVO). Es el formato estándar de rider de DJ y el que el DJ
 * espera poder editar libremente.
 *
 * (Reemplazó al editor "estructurado por categorías" + stage plot, que producía
 * un layout distinto y dejaba estas notas de solo-lectura. La tabla
 * tech_rider_items y sus componentes siguen en el repo por si se retoman.)
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { GlassPanel, MonoLabel, Alert, FIELD } from "@/components/hos";
import { ListPlus } from "lucide-react";
import { saveProfileAction } from "./actions";
import { RiderVisualPreview } from "@/components/tech-rider/preview";

interface Props {
  initialIdeal: string;
  initialAlt: string;
  initialHospitality: string;
  artistName?: string;
}

const IDEAL_EXAMPLE = `1x Pioneer DJM-900NXS
2x CDJ 2000 Nexus 2 (linked)
1x Monitor booth disponible
1x Pioneer RMX1000`;

const ALT_EXAMPLE = `1x Pioneer DJM-750MK2
2x XDJ-1000MK2 (linked)
1x Monitor booth disponible
1x Pioneer RMX1000`;

const HOSPITALITY_EXAMPLE = `2x toalla blanca
6x agua sin gas
Pase +2 invitados`;

export function TechRiderSection({
  initialIdeal,
  initialAlt,
  initialHospitality,
  artistName,
}: Props) {
  const router = useRouter();
  const [ideal, setIdeal] = useState(initialIdeal ?? "");
  const [alt, setAlt] = useState(initialAlt ?? "");
  const [hospitality, setHospitality] = useState(initialHospitality ?? "");
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<
    { type: "ok" | "err"; text: string } | null
  >(null);

  const dirty =
    ideal !== (initialIdeal ?? "") ||
    alt !== (initialAlt ?? "") ||
    hospitality !== (initialHospitality ?? "");

  function save() {
    setMessage(null);
    startTransition(async () => {
      const res = await saveProfileAction({
        tech_rider_ideal: ideal.trim(),
        tech_rider_alt: alt.trim(),
        hospitality: hospitality.trim(),
      });
      if (res.ok) {
        setMessage({ type: "ok", text: "Tech rider guardado." });
        router.refresh();
      } else {
        setMessage({ type: "err", text: res.error });
      }
    });
  }

  function loadExample() {
    setIdeal(IDEAL_EXAMPLE);
    setAlt(ALT_EXAMPLE);
    setMessage(null);
  }

  return (
    <GlassPanel>
      <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-2">
          <MonoLabel>Tech rider</MonoLabel>
          <h2 className="font-display text-3xl leading-none">
            Tu rider<span className="text-orange">.</span>
          </h2>
          <p className="text-sm text-white/55 max-w-xl">
            Lo que necesitas en cabina. Escribe{" "}
            <strong>un equipo por línea</strong> — se muestra tal cual en tu
            press kit público, en los cuadros IDEAL y ALTERNATIVO.
          </p>
        </div>
        {!ideal.trim() && !alt.trim() && (
          <Button
            type="button"
            variant="clay"
            onClick={loadExample}
            disabled={isPending}
            className="shrink-0"
          >
            <ListPlus className="w-4 h-4 mr-2" />
            Cargar ejemplo
          </Button>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <RiderField
          label="IDEAL"
          value={ideal}
          onChange={setIdeal}
          placeholder={IDEAL_EXAMPLE}
          disabled={isPending}
        />
        <RiderField
          label="ALTERNATIVO"
          value={alt}
          onChange={setAlt}
          placeholder={ALT_EXAMPLE}
          disabled={isPending}
        />
      </div>

      <RiderField
        label="HOSPITALITY"
        value={hospitality}
        onChange={setHospitality}
        placeholder={HOSPITALITY_EXAMPLE}
        disabled={isPending}
        rows={4}
      />

      <RiderVisualPreview idealText={ideal} artistName={artistName} />

      <div className="space-y-3">
        <Button
          type="button"
          onClick={save}
          disabled={isPending || !dirty}
          variant="clayPrimary"
        >
          {isPending ? "Guardando…" : "Guardar tech rider"}
        </Button>
        {message && (
          <Alert tone={message.type === "ok" ? "success" : "danger"}>
            {message.text}
          </Alert>
        )}
      </div>
      </div>
    </GlassPanel>
  );
}

function RiderField({
  label,
  value,
  onChange,
  placeholder,
  disabled,
  rows = 6,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  disabled?: boolean;
  rows?: number;
}) {
  return (
    <div>
      <label className="font-mono text-[10px] font-bold uppercase tracking-wider text-white/50 mb-1.5 block">
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        rows={rows}
        className={`${FIELD} resize-y leading-relaxed disabled:opacity-50`}
      />
    </div>
  );
}
