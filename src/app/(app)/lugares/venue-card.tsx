"use client";

import { useState, useTransition } from "react";
import { BadgeCheck, Globe, Instagram, Star, MessageSquare } from "lucide-react";
import { BOOKER_TYPES } from "@/types/database";
import { Card } from "@/components/ui/card";
import type { DirectoryVenue } from "@/lib/queries/booker";
import { toggleVenueInterestAction } from "./actions";

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

export function VenueCard({ venue }: { venue: DirectoryVenue }) {
  const [interested, setInterested] = useState(venue.interested);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const loc = [venue.city, venue.country].filter(Boolean).join(", ");
  const site = normalizeUrl(venue.website_url);
  const ig = instagramUrl(venue.instagram_url);

  function toggle() {
    setErr(null);
    startTransition(async () => {
      const res = await toggleVenueInterestAction(venue.user_id);
      if (!res.ok) {
        setErr(res.error);
        return;
      }
      setInterested(res.interested);
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
              <MessageSquare className="w-2.5 h-2.5" /> Acepta pitches
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
              <a
                href={site}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-accent hover:underline inline-flex items-center gap-1"
              >
                <Globe className="w-3.5 h-3.5" /> Sitio
              </a>
            )}
            {ig && (
              <a
                href={ig}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-accent hover:underline inline-flex items-center gap-1"
              >
                <Instagram className="w-3.5 h-3.5" /> Instagram
              </a>
            )}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        className={`w-full flex items-center justify-center gap-2 px-4 py-3 border-t font-mono text-[11px] font-bold uppercase tracking-wider transition-colors disabled:opacity-50 ${
          interested
            ? "border-border bg-accent text-white hover:bg-accent/90"
            : "border-border text-fg hover:bg-bg-subtle"
        }`}
      >
        <Star className={`w-3.5 h-3.5 ${interested ? "fill-current" : ""}`} />
        {pending
          ? "…"
          : interested
            ? "Te interesa tocar acá"
            : "Me gustaría tocar acá"}
      </button>
      {err && (
        <div className="text-[10px] text-danger px-4 py-1.5 text-center">
          {err}
        </div>
      )}
    </Card>
  );
}
