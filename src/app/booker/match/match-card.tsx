"use client";

/**
 * Card de resultado de Smart Match: igual que BuscarCard pero con el badge de
 * % de match y la lista de razones (el "por qué" del ranking). Reusa
 * FavoriteButtonClient, SetEmbed y next/image (egress).
 */
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Play, ArrowUpRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FavoriteButtonClient } from "@/components/booker/favorite-button-client";
import { SetEmbed } from "@/app/p/[slug]/embeds";
import { isSupabaseStorageUrl } from "@/lib/format";
import type { ScoredDj } from "@/lib/match/score";

export function MatchCard({
  scored,
  favorited = false,
}: {
  scored: ScoredDj;
  /** Estado de favorito provisto por el server (evita el fetch por-card). */
  favorited?: boolean;
}) {
  const { dj, score, reasons } = scored;
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
  // M5: bajo 70 el match es "parcial" (suele venir de criterios neutros, no de
  // coincidencias fuertes) → badge atenuado en gris, no el naranjo confiado.
  const strong = score >= 70;

  return (
    <div className="hos-glass hos-sweep-card group flex flex-col overflow-hidden rounded-2xl">
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
        {/* % de match — atenuado si es parcial (M5) */}
        <span
          className={`absolute top-2 right-2 rounded-full px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.1em] ${
            strong ? "bg-orange text-ink" : "bg-white/10 text-white/60"
          }`}
        >
          {score}% {strong ? "match" : "parcial"}
        </span>
        <div className="absolute top-2 left-2">
          <FavoriteButtonClient
            djUserId={dj.user_id}
            size="sm"
            redirectOnUnauth={false}
            initialCanFavorite
            initialFavorited={favorited}
          />
        </div>
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

        <div className="font-mono text-[10px] uppercase tracking-wider text-fg-muted">
          {dj.city || "—"}
          {dj.country ? ` · ${dj.country.toUpperCase()}` : ""}
        </div>

        {/* Por qué — las razones del match */}
        {reasons.length > 0 && (
          <ul className="flex flex-col gap-1 mt-0.5">
            {reasons.map((r, i) => (
              <li
                key={i}
                className={`flex items-start gap-1.5 text-[12px] leading-snug ${
                  r.positive ? "text-fg" : "text-fg-muted"
                }`}
              >
                {r.positive ? (
                  <Check className="w-3.5 h-3.5 text-orange shrink-0 mt-0.5" />
                ) : (
                  <span className="w-3.5 text-center shrink-0 text-fg-subtle">·</span>
                )}
                <span>{r.label}</span>
              </li>
            ))}
          </ul>
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
              className="[&_svg]:!size-3"
            >
              <Play className="w-3 h-3" />
              {showSet ? "Ocultar" : "Escuchar set"}
            </Button>
          )}
          <Button asChild variant="clay" size="sm" className="ml-auto [&_svg]:!size-3">
            <Link href={`/p/${dj.public_slug}`}>
              Ver press kit <ArrowUpRight className="w-3 h-3" />
            </Link>
          </Button>
        </div>

        {/* Player lazy */}
        {hasSet && showSet && (
          <div className="mt-1">
            <SetEmbed url={dj.featured_sets[0]} userId={dj.user_id} />
          </div>
        )}
      </div>
    </div>
  );
}
