"use client";

/**
 * Card de un DJ en el buscador del booker (/booker/buscar).
 * Reusa FavoriteButtonClient (corazón) y SetEmbed (player). El set se monta
 * lazy al click para no cargar N iframes de golpe en una grilla larga.
 */
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Play, ArrowUpRight } from "lucide-react";
import { FavoriteButtonClient } from "@/components/booker/favorite-button-client";
import { Button } from "@/components/ui/button";
import { SetEmbed } from "@/app/p/[slug]/embeds";
import { isSupabaseStorageUrl } from "@/lib/format";
import type { PublicDjProfile } from "@/lib/queries/directory";

function fmtCLP(n: number): string {
  return "$" + n.toLocaleString("es-CL");
}

function feeLabel(dj: PublicDjProfile): string | null {
  if (!dj.show_fee) return null;
  const { fee_min, fee_max } = dj;
  if (fee_min != null && fee_max != null) return `${fmtCLP(fee_min)}–${fmtCLP(fee_max)}`;
  if (fee_min != null) return `desde ${fmtCLP(fee_min)}`;
  if (fee_max != null) return `hasta ${fmtCLP(fee_max)}`;
  return null;
}

type BuscarFilters = { q?: string; city?: string; avail?: string; budget?: string; date?: string };

/** href del chip de género preservando los filtros activos (no resetearlos). */
function genreHref(g: string, filters?: BuscarFilters): string {
  const p = new URLSearchParams();
  if (filters?.q) p.set("q", filters.q);
  if (filters?.city) p.set("city", filters.city);
  if (filters?.avail) p.set("avail", filters.avail);
  if (filters?.budget) p.set("budget", filters.budget);
  if (filters?.date) p.set("date", filters.date);
  p.set("genres", g.toLowerCase());
  return `/booker/buscar?${p.toString()}`;
}

export function BuscarCard({
  dj,
  filters,
  favorited = false,
  isLive = false,
}: {
  dj: PublicDjProfile;
  filters?: BuscarFilters;
  /** Estado de favorito provisto por el server (evita el fetch por-card). */
  favorited?: boolean;
  /** DJ activo en la app ahora mismo (heartbeat < 3 min) → badge "● LIVE". */
  isLive?: boolean;
}) {
  const [showSet, setShowSet] = useState(false);

  const cardImg =
    [dj.avatar_url, dj.hero_image_url].find(isSupabaseStorageUrl) ?? "";
  const initials = dj.artist_name
    .split(" ")
    .filter((s) => s.length > 0)
    .slice(0, 2)
    .map((s) => s[0])
    .join("")
    .toUpperCase();
  const hasSet = dj.featured_sets.length > 0;
  const fee = feeLabel(dj);

  return (
    <div className="group relative hos-glass hos-sweep-card rounded-2xl overflow-hidden flex flex-col">
      {/* Imagen + overlays */}
      <div className="relative aspect-[4/3] bg-ink border-b border-white/10 overflow-hidden">
        {cardImg ? (
          <Image
            src={cardImg}
            alt={dj.artist_name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 360px"
            className="object-cover"
            quality={85}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span
              style={{
                fontFamily: "var(--font-anton), Impact, system-ui, sans-serif",
                fontSize: "64px",
                color: "#F4EFE7",
                lineHeight: 0.85,
              }}
            >
              {initials || "DJ"}
              <span style={{ color: "rgb(var(--drop-orange))" }}>.</span>
            </span>
          </div>
        )}
        {dj.is_available_now && (
          <span className="absolute top-2 right-2 rounded-full bg-orange text-ink px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider">
            ★ DISPONIBLE
          </span>
        )}
        <div className="absolute top-2 left-2">
          <FavoriteButtonClient
            djUserId={dj.user_id}
            size="sm"
            redirectOnUnauth={false}
            initialCanFavorite
            initialFavorited={favorited}
          />
        </div>
        {/* Badge LIVE: el DJ está conectado ahora → respuesta al instante. */}
        {isLive && (
          <span className="absolute bottom-2 left-2 inline-flex items-center gap-1.5 rounded-full bg-ink text-orange border border-orange px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider">
            <span
              className="w-[6px] h-[6px] bg-orange rounded-full animate-blink"
              aria-hidden="true"
            />
            LIVE
          </span>
        )}
      </div>

      {/* Cuerpo */}
      <div className="p-3 flex flex-col gap-2 flex-1">
        <Link
          href={`/p/${dj.public_slug}`}
          className="block hover:text-orange transition-colors"
          style={{
            fontFamily: "var(--font-anton), Impact, system-ui, sans-serif",
            fontSize: "20px",
            lineHeight: 0.95,
            textTransform: "uppercase",
            letterSpacing: "0.01em",
          }}
        >
          {dj.artist_name}
        </Link>

        <div className="flex flex-wrap gap-1.5">
          {dj.is_drop_pick && (
            <span className="inline-flex items-center gap-1 rounded-full font-mono text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 bg-orange text-ink">
              ★ Pick
            </span>
          )}
          {dj.is_verified && (
            <span className="inline-flex items-center gap-1 rounded-full font-mono text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 border border-white/12 bg-white/[0.06] text-orange">
              ✓ Verificado
            </span>
          )}
        </div>

        <div className="font-mono text-[10px] uppercase tracking-wider text-fg-muted">
          {dj.city || "—"}
          {dj.country ? ` · ${dj.country.toUpperCase()}` : ""}
        </div>

        {fee && (
          <div className="inline-flex self-start items-center gap-1 rounded-full font-mono text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 border border-white/12 bg-white/[0.04] text-white/80">
            <span className="text-white/45">Fee ref.</span> {fee}
          </div>
        )}

        {/* Géneros (links al buscador filtrado) */}
        {dj.genres.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {dj.genres.slice(0, 3).map((g) => (
              <Link
                key={g}
                href={genreHref(g, filters)}
                className="rounded-full font-mono text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 border border-white/12 bg-white/[0.04] text-white/70 hover:border-orange hover:text-orange transition-colors"
              >
                {g}
              </Link>
            ))}
            {dj.genres.length > 3 && (
              <span className="font-mono text-[9px] text-fg-muted self-center">
                +{dj.genres.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Acciones */}
        <div className="mt-auto pt-1 flex items-center gap-2">
          {hasSet && (
            <Button
              type="button"
              variant={showSet ? "clayPrimary" : "clay"}
              size="sm"
              onClick={() => setShowSet((s) => !s)}
              aria-expanded={showSet}
              className="gap-1 [&_svg]:!size-3"
            >
              <Play className="w-3 h-3" />
              {showSet ? "Ocultar" : "Escuchar set"}
            </Button>
          )}
          <Button asChild variant="clay" size="sm" className="ml-auto gap-1 [&_svg]:!size-3">
            <Link href={`/p/${dj.public_slug}`}>
              Contactar <ArrowUpRight className="w-3 h-3" />
            </Link>
          </Button>
        </div>

        {/* Player lazy: solo se monta el iframe al abrir */}
        {hasSet && showSet && (
          <div className="mt-1">
            <SetEmbed url={dj.featured_sets[0]} userId={dj.user_id} />
          </div>
        )}
      </div>
    </div>
  );
}
