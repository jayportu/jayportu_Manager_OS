import { GlassPanel, Badge } from "@/components/hos";
import { BadgeCheck, Globe, Instagram, ExternalLink, Star } from "lucide-react";
import { BOOKER_TYPES } from "@/types/database";
import type { BookerCredibility } from "@/lib/queries/booker";

const TYPE_LABEL: Record<string, string> = Object.fromEntries(
  BOOKER_TYPES.map((t) => [t.value, t.label])
);

function normalizeUrl(v: string): string {
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) return v;
  return `https://${v}`;
}

function instagramUrl(v: string): string {
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) return v;
  return `https://instagram.com/${v.replace(/^@/, "")}`;
}

/**
 * Fase 2 booker — Ficha de credibilidad del booker.
 * Se muestra en el detalle del booking del DJ SOLO si el request vino de
 * un booker con cuenta (booker_user_id). Da contexto de quién escribe.
 */
export function BookerCredibilityCard({ data }: { data: BookerCredibility }) {
  const initial = (data.full_name || "B").trim().charAt(0).toUpperCase();
  const loc = [data.city, data.country].filter(Boolean).join(", ");
  const site = normalizeUrl(data.website_url);
  const ig = instagramUrl(data.instagram_url);

  return (
    <div className="mb-5">
      <div className="text-[11px] uppercase tracking-wider text-fg-muted mb-2">
        Quién te escribe
      </div>
      <GlassPanel padded={false}>
        {/* Top */}
        <div className="flex items-center gap-3 p-4 border-b border-white/10">
          <div className="w-12 h-12 rounded-md bg-accent text-white flex items-center justify-center text-xl font-bold shrink-0">
            {initial}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-fg leading-tight">
              {data.full_name || "Booker"}
            </div>
            <div className="text-xs text-fg-muted mt-0.5">
              {TYPE_LABEL[data.booker_type] ?? data.booker_type}
              {loc && ` · ${loc}`}
            </div>
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              {data.is_founding && (
                <span className="inline-flex items-center gap-1 rounded-full bg-orange px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink">
                  <Star className="w-3 h-3 fill-current" /> Founding
                </span>
              )}
              {data.verified ? (
                <Badge tone="up">
                  <BadgeCheck className="w-3 h-3" /> Verificado por DROP.
                </Badge>
              ) : (
                <Badge tone="neutral">Cuenta sin verificar</Badge>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 border-b border-white/10 divide-x divide-white/10">
          <Stat n={data.requests_sent} l="Requests enviados" />
          <Stat n={data.djs_booked} l="DJs contratados" />
          <Stat n={data.member_since_year || "—"} l="Miembro desde" />
        </div>

        {/* Bio */}
        {data.bio && (
          <p className="text-sm text-fg-muted px-4 py-3 leading-relaxed">
            “{data.bio}”
          </p>
        )}

        {/* Links */}
        {(site || ig) && (
          <div className="flex flex-wrap gap-4 px-4 py-3 border-t border-white/10">
            {site && (
              <a
                href={site}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-accent hover:underline inline-flex items-center gap-1"
              >
                <Globe className="w-3.5 h-3.5" /> Sitio web
                <ExternalLink className="w-3 h-3" />
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
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        )}
      </GlassPanel>
    </div>
  );
}

function Stat({ n, l }: { n: number | string; l: string }) {
  return (
    <div className="px-2 py-3 text-center">
      <div className="text-xl font-bold tabular-nums leading-none">{n}</div>
      <div className="text-[10px] uppercase tracking-wider text-fg-muted mt-1">
        {l}
      </div>
    </div>
  );
}
