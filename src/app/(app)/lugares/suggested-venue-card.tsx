"use client";

import { useState, useTransition } from "react";
import { Globe, Instagram, Phone, Plus, Check, Sparkle } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { SuggestedVenue } from "@/lib/queries/suggested-venues";
import { addSuggestedVenueToCrmAction } from "./actions";

function igUrl(v: string): string {
  return v ? `https://instagram.com/${v.replace(/^@/, "")}` : "";
}
function webUrl(v: string): string {
  return v ? (/^https?:\/\//i.test(v) ? v : `https://${v}`) : "";
}
function telUrl(v: string): string {
  const d = (v || "").replace(/[^\d+]/g, "");
  return d ? `tel:${d}` : "";
}

/**
 * Card de un venue SUGERIDO (OSM). No verificado, no pitcheable: solo mostrar
 * contacto + "Agregar a mi CRM".
 */
export function SuggestedVenueCard({ venue }: { venue: SuggestedVenue }) {
  const [added, setAdded] = useState(false);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const site = webUrl(venue.website);
  const ig = igUrl(venue.instagram);
  const tel = telUrl(venue.phone);

  function add() {
    setErr(null);
    startTransition(async () => {
      const res = await addSuggestedVenueToCrmAction({
        name: venue.name,
        city: venue.city,
        instagram: venue.instagram,
        website: venue.website,
        phone: venue.phone,
      });
      if (!res.ok) return setErr(res.error);
      setAdded(true);
    });
  }

  return (
    <Card className="flex flex-col overflow-hidden">
      <div className="p-4 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="font-semibold text-fg leading-tight">
              {venue.name}
            </div>
            <div className="text-xs text-fg-muted mt-0.5">{venue.city}</div>
          </div>
          <span
            className="shrink-0 inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-fg-muted bg-bg-subtle border border-border rounded px-1.5 py-0.5"
            title="Traído de OpenStreetMap · verifica los datos antes de contactar"
          >
            {venue.highConfidence && <Sparkle className="w-3 h-3 text-orange" />}
            Sugerido · sin verificar
          </span>
        </div>

        {(site || ig || tel) && (
          <div className="flex flex-wrap gap-3 mt-3">
            {site && (
              <a href={site} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline inline-flex items-center gap-1">
                <Globe className="w-3.5 h-3.5" /> Sitio
              </a>
            )}
            {ig && (
              <a href={ig} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline inline-flex items-center gap-1">
                <Instagram className="w-3.5 h-3.5" /> Instagram
              </a>
            )}
            {tel && (
              <a href={tel} className="text-xs text-accent hover:underline inline-flex items-center gap-1">
                <Phone className="w-3.5 h-3.5" /> Teléfono
              </a>
            )}
          </div>
        )}
        {!site && !ig && !tel && (
          <p className="text-[11px] text-fg-subtle mt-3 italic">
            Sin contacto en OpenStreetMap — búscalo por nombre.
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={add}
        disabled={pending || added}
        className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 border-t border-border font-mono text-[11px] font-bold uppercase tracking-wider transition-colors disabled:opacity-60 ${
          added ? "bg-success/10 text-success" : "text-fg hover:bg-bg-subtle"
        }`}
      >
        {added ? (
          <>
            <Check className="w-3.5 h-3.5" /> En tu CRM
          </>
        ) : (
          <>
            <Plus className="w-3.5 h-3.5" /> {pending ? "Agregando…" : "Agregar a mi CRM"}
          </>
        )}
      </button>

      {err && (
        <div className="text-[10px] text-danger px-4 py-1.5 text-center border-t border-border">
          {err}
        </div>
      )}
    </Card>
  );
}
