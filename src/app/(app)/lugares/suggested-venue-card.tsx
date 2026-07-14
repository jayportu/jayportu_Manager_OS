"use client";

import { useState, useTransition } from "react";
import { Globe, Instagram, Phone, Plus, Check, Sparkle } from "lucide-react";
import { GlassPanel, Badge, Alert } from "@/components/hos";
import { Button } from "@/components/ui/button";
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
    <GlassPanel>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-display text-xl leading-tight">
            {venue.name}
          </h3>
          <div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-white/45">
            {venue.city}
          </div>
        </div>
        <span title="Traído de OpenStreetMap · verifica los datos antes de contactar">
          <Badge tone="neutral">
            {venue.highConfidence && (
              <Sparkle className="w-3 h-3 text-[rgb(var(--drop-orange))]" />
            )}
            Sugerido · sin verificar
          </Badge>
        </span>
      </div>

      {(site || ig || tel) && (
        <div className="mt-3 flex flex-wrap gap-3">
          {site && (
            <a
              href={site}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-[rgb(var(--drop-orange))] hover:underline"
            >
              <Globe className="w-3.5 h-3.5" /> Sitio
            </a>
          )}
          {ig && (
            <a
              href={ig}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-[rgb(var(--drop-orange))] hover:underline"
            >
              <Instagram className="w-3.5 h-3.5" /> Instagram
            </a>
          )}
          {tel && (
            <a
              href={tel}
              className="inline-flex items-center gap-1 text-xs text-[rgb(var(--drop-orange))] hover:underline"
            >
              <Phone className="w-3.5 h-3.5" /> Teléfono
            </a>
          )}
        </div>
      )}
      {!site && !ig && !tel && (
        <p className="mt-3 text-[11px] italic text-white/40">
          Sin contacto en OpenStreetMap — búscalo por nombre.
        </p>
      )}

      <Button
        type="button"
        variant={added ? "clay" : "clayPrimary"}
        size="sm"
        className={`mt-4 w-full ${added ? "text-success" : ""}`}
        onClick={add}
        disabled={pending || added}
      >
        {added ? (
          <>
            <Check /> En tu CRM
          </>
        ) : (
          <>
            <Plus /> {pending ? "Agregando…" : "Agregar a mi CRM"}
          </>
        )}
      </Button>

      {err && (
        <div className="mt-3">
          <Alert tone="danger">{err}</Alert>
        </div>
      )}
    </GlassPanel>
  );
}
