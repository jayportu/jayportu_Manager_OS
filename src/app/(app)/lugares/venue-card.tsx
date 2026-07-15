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
  Coins,
} from "lucide-react";
import { BOOKER_TYPES } from "@/types/database";
import { GlassPanel, Badge, Alert, FIELD } from "@/components/hos";
import { Button } from "@/components/ui/button";
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
    <GlassPanel sweep>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="flex items-center gap-1.5 font-display text-xl leading-tight">
            <span className="truncate">{venue.full_name || "Lugar"}</span>
            <BadgeCheck className="w-4 h-4 shrink-0 text-success" />
          </h3>
          <div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-white/45">
            {TYPE_LABEL[venue.booker_type] ?? venue.booker_type}
            {loc && ` · ${loc}`}
          </div>
        </div>
        {venue.accepts_pitches && <Badge tone="info">Acepta pitches</Badge>}
      </div>

      {venue.bio && (
        <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-white/60">
          {venue.bio}
        </p>
      )}

      {(site || ig) && (
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
        </div>
      )}

      {/* Form de pitch inline */}
      {showForm && (
        <div className="mt-4 space-y-2 border-t border-white/10 pt-3">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={600}
            rows={3}
            placeholder="Quién eres, tu sonido, por qué encajas en este lugar…"
            className={`${FIELD} resize-y`}
          />
          <input
            type="text"
            value={availability}
            onChange={(e) => setAvailability(e.target.value)}
            maxLength={200}
            placeholder="Disponibilidad (ej. viernes y sábados de marzo)"
            className={FIELD}
          />
          <div className="flex items-center gap-1.5 text-[11px] text-white/40">
            <Coins className="w-3 h-3 shrink-0 text-[rgb(var(--drop-orange))]" />
            Se adjunta tu press kit. Cuesta 1 token (se devuelve si no lo ven en 14
            días).
          </div>
        </div>
      )}

      {/* Acciones */}
      <div className="mt-4 space-y-2 border-t border-white/10 pt-3">
        {/* Estado del pitch (si ya mandó) */}
        {pitchStatus === "viewed" && (
          <Badge tone="up" solid>
            <Eye className="w-3 h-3" /> Pitch visto
          </Badge>
        )}
        {pitchStatus === "pending" && (
          <Badge tone="neutral">
            <Clock className="w-3 h-3" /> Pitch enviado · pendiente
          </Badge>
        )}

        {/* Botón de pitch (si acepta y no mandó aún) */}
        {venue.accepts_pitches && pitchStatus === "none" && !showForm && (
          <Button
            type="button"
            variant="clay"
            size="sm"
            className={`w-full ${noTokens ? "cursor-not-allowed opacity-50" : ""}`}
            onClick={() =>
              noTokens
                ? setErr("Sin tokens de pitch este mes. Renuevan el 1.")
                : setShowForm(true)
            }
            title={noTokens ? "Sin tokens este mes (renuevan el 1)" : undefined}
          >
            <Send /> Pitch · 1 token
          </Button>
        )}
        {showForm && (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="clay"
              size="sm"
              className="flex-1"
              onClick={() => {
                setShowForm(false);
                setErr(null);
              }}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="clayPrimary"
              size="sm"
              className="flex-1"
              onClick={submitPitch}
              disabled={pending}
            >
              {pending ? "Enviando…" : "Enviar pitch"}
            </Button>
          </div>
        )}

        {/* Interés (siempre, gratis) */}
        <Button
          type="button"
          variant={interested ? "clayPrimary" : "clay"}
          size="sm"
          className="w-full"
          onClick={toggleInterest}
          disabled={pending}
        >
          <Star className={interested ? "fill-current" : ""} />
          {interested ? "Te interesa tocar acá" : "Me gustaría tocar acá"}
        </Button>
      </div>

      {err && (
        <div className="mt-3">
          <Alert tone="danger">{err}</Alert>
        </div>
      )}
    </GlassPanel>
  );
}
