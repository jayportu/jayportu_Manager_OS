"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  Globe,
  Instagram,
  Star,
  Send,
  Clock,
  Eye,
} from "lucide-react";
import { BOOKER_TYPES } from "@/types/database";
import { Card } from "@/components/ui/card";
import type { DirectoryVenue, PitchStatus } from "@/lib/queries/booker";
import { toggleVenueInterestAction, sendPitchAction } from "./actions";

const TYPE_LABEL: Record<string, string> = Object.fromEntries(
  BOOKER_TYPES.map((t) => [t.value, t.label])
);

function normalizeUrl(v: string): string {
  if (!v) return "";
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
}
function instagramUrl(v: string): string {
  if (!v) return "";
  return /^https?:\/\//i.test(v) ? v : `https://instagram.com/${v.replace(/^@/, "")}`;
}

export function VenueCard({
  venue,
  tokensAvailable,
}: {
  venue: DirectoryVenue;
  tokensAvailable: number;
}) {
  const [interested, setInterested] = useState(venue.interested);
  const [pitchStatus, setPitchStatus] = useState<PitchStatus>(venue.pitch_status);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState("");
  const [availability, setAvailability] = useState("");
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  const loc = [venue.city, venue.country].filter(Boolean).join(", ");
  const site = normalizeUrl(venue.website_url);
  const ig = instagramUrl(venue.instagram_url);
  const noTokens = tokensAvailable <= 0;

  function toggleInterest() {
    setErr(null);
    startTransition(async () => {
      const res = await toggleVenueInterestAction(venue.user_id);
      if (!res.ok) return setErr(res.error);
      setInterested(res.interested);
    });
  }

  function submitPitch() {
    setErr(null);
    if (message.trim().length < 10) {
      setErr("Escribe un mensaje (mín. 10 caracteres).");
      return;
    }
    startTransition(async () => {
      const res = await sendPitchAction(venue.user_id, message, availability);
      if (!res.ok) return setErr(res.error);
      setPitchStatus("pending");
      setShowForm(false);
      // Refresca los server components → la barra de tokens (page.tsx) baja en 1.
      router.refresh();
    });
  }

  return (
    <Card className="flex flex-col overflow-hidden">
      <div className="p-4 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="font-semibold text-fg leading-tight flex items-center gap-1.5">
              {venue.full_name || "Lugar"}
              <BadgeCheck className="w-4 h-4 text-success shrink-0" />
            </div>
            <div className="text-xs text-fg-muted mt-0.5">
              {TYPE_LABEL[venue.booker_type] ?? venue.booker_type}
              {loc && ` · ${loc}`}
            </div>
          </div>
          {venue.accepts_pitches && (
            <span className="shrink-0 inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-accent bg-accent-soft border border-accent/30 rounded px-1.5 py-0.5">
              Acepta pitches
            </span>
          )}
        </div>

        {venue.bio && (
          <p className="text-sm text-fg-muted mt-3 leading-relaxed line-clamp-3">
            {venue.bio}
          </p>
        )}

        {(site || ig) && (
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
          </div>
        )}

        {/* Form de pitch inline */}
        {showForm && (
          <div className="mt-4 space-y-2 border-t border-border pt-3">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={600}
              rows={3}
              placeholder="Quién eres, tu sonido, por qué encajas en este lugar…"
              className="w-full border-2 border-border bg-bg-panel px-2.5 py-2 text-sm outline-none focus:border-accent resize-y"
            />
            <input
              type="text"
              value={availability}
              onChange={(e) => setAvailability(e.target.value)}
              maxLength={200}
              placeholder="Disponibilidad (ej. viernes y sábados de marzo)"
              className="w-full border-2 border-border bg-bg-panel px-2.5 py-2 text-sm outline-none focus:border-accent"
            />
            <div className="text-[11px] text-fg-subtle">
              Se adjunta tu press kit. Cuesta 🪙1 token (se devuelve si no lo ven en 14 días).
            </div>
          </div>
        )}
      </div>

      {/* Acciones */}
      <div className="border-t border-border">
        {/* Estado del pitch (si ya mandó) */}
        {pitchStatus === "viewed" && (
          <div className="flex items-center justify-center gap-2 px-4 py-2.5 bg-success/10 text-success font-mono text-[11px] font-bold uppercase tracking-wider">
            <Eye className="w-3.5 h-3.5" /> Pitch visto
          </div>
        )}
        {pitchStatus === "pending" && (
          <div className="flex items-center justify-center gap-2 px-4 py-2.5 bg-bg-subtle text-fg-muted font-mono text-[11px] font-bold uppercase tracking-wider">
            <Clock className="w-3.5 h-3.5" /> Pitch enviado · pendiente
          </div>
        )}

        {/* Botón de pitch (si acepta y no mandó aún) */}
        {venue.accepts_pitches && pitchStatus === "none" && !showForm && (
          <button
            type="button"
            onClick={() => (noTokens ? setErr("Sin tokens de pitch este mes. Renuevan el 1.") : setShowForm(true))}
            title={noTokens ? "Sin tokens este mes (renuevan el 1)" : undefined}
            className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 border-b border-border text-fg hover:bg-bg-subtle font-mono text-[11px] font-bold uppercase tracking-wider transition-colors ${
              noTokens ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            <Send className="w-3.5 h-3.5" /> Pitch · 🪙1
          </button>
        )}
        {showForm && (
          <div className="flex">
            <button
              type="button"
              onClick={() => { setShowForm(false); setErr(null); }}
              disabled={pending}
              className="flex-1 px-4 py-2.5 border-b border-r border-border text-fg-muted hover:bg-bg-subtle font-mono text-[11px] font-bold uppercase tracking-wider"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={submitPitch}
              disabled={pending}
              className="flex-1 px-4 py-2.5 border-b border-border bg-accent text-white hover:bg-accent/90 font-mono text-[11px] font-bold uppercase tracking-wider disabled:opacity-50"
            >
              {pending ? "Enviando…" : "Enviar pitch"}
            </button>
          </div>
        )}

        {/* Interés (siempre, gratis) */}
        <button
          type="button"
          onClick={toggleInterest}
          disabled={pending}
          className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 font-mono text-[11px] font-bold uppercase tracking-wider transition-colors disabled:opacity-50 ${
            interested ? "bg-accent text-white hover:bg-accent/90" : "text-fg hover:bg-bg-subtle"
          }`}
        >
          <Star className={`w-3.5 h-3.5 ${interested ? "fill-current" : ""}`} />
          {interested ? "Te interesa tocar acá" : "Me gustaría tocar acá"}
        </button>
      </div>

      {err && (
        <div className="text-[10px] text-danger px-4 py-1.5 text-center border-t border-border">
          {err}
        </div>
      )}
    </Card>
  );
}
