import Image from "next/image";
import { listReceivedPitches } from "@/lib/queries/booker";
import { relativeTime, isSupabaseStorageUrl } from "@/lib/format";
import { Send, CalendarClock } from "lucide-react";
import { PitchPressKitLink } from "./pitch-presskit-link";

/**
 * Fase 4a booker — Pitches recibidos por el lugar.
 * m8: el pitch se marca "visto" (consume el token del DJ) recién cuando el
 * booker abre el press kit de ESE DJ — no en bulk al cargar la pestaña.
 */
export const dynamic = "force-dynamic";

export default async function PitchesPage() {
  const pitches = await listReceivedPitches();

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      <div className="border-2 border-ink bg-white p-6 md:p-7 mb-6">
        <div className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-orange">
          — PITCHES RECIBIDOS
        </div>
        <h1
          className="leading-none mt-2"
          style={{
            fontFamily: "var(--font-anton), Impact, system-ui, sans-serif",
            fontSize: "52px",
            letterSpacing: "-0.005em",
          }}
        >
          PITCHES<span className="text-orange">.</span>
        </h1>
        <p className="text-sm text-fg-muted mt-2 max-w-xl">
          DJs que te mandaron un pitch para tocar en tu lugar. Lee su
          propuesta y abre su press kit (ahí está su contacto) si te interesa.
        </p>
      </div>

      {pitches.length === 0 ? (
        <div className="border-2 border-dashed border-ink bg-white p-10 text-center">
          <Send className="w-12 h-12 mx-auto text-fg-subtle mb-4" />
          <h2
            className="leading-tight mb-2"
            style={{
              fontFamily: "var(--font-anton), Impact, system-ui, sans-serif",
              fontSize: "30px",
            }}
          >
            SIN PITCHES TODAVÍA
          </h2>
          <p className="text-sm text-fg-muted max-w-md mx-auto">
            Cuando un DJ te mande un pitch, va a aparecer acá con su mensaje y
            su press kit.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {pitches.map((p) => {
            const initial = (p.artist_name || "DJ").trim().charAt(0).toUpperCase();
            return (
              <article key={p.id} className="border-2 border-ink bg-white p-5">
                <div className="flex items-start gap-3">
                  {isSupabaseStorageUrl(p.avatar_url) ? (
                    <Image
                      src={p.avatar_url}
                      alt={p.artist_name}
                      width={48}
                      height={48}
                      className="w-12 h-12 object-cover border-2 border-ink shrink-0"
                    />
                  ) : (
                    <div
                      className="w-12 h-12 bg-orange text-ink flex items-center justify-center border-2 border-ink shrink-0"
                      style={{
                        fontFamily: "var(--font-anton), Impact, system-ui, sans-serif",
                        fontSize: "22px",
                      }}
                    >
                      {initial}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold">{p.artist_name || "DJ"}</span>
                      <span className="font-mono text-[9px] text-fg-subtle uppercase tracking-wider">
                        {relativeTime(p.created_at)}
                      </span>
                    </div>
                    <div className="text-xs text-fg-muted">
                      {[p.city, p.genres.slice(0, 2).join(" · ")]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </div>
                  </div>
                  {p.public_slug && (
                    <PitchPressKitLink pitchId={p.id} slug={p.public_slug} />
                  )}
                </div>

                {p.message && (
                  <p className="text-sm whitespace-pre-wrap leading-relaxed mt-3 p-3 bg-cream/60 border border-ink/15">
                    {p.message}
                  </p>
                )}
                {p.availability && (
                  <div className="text-xs text-fg-muted mt-2 inline-flex items-center gap-1.5">
                    <CalendarClock className="w-3.5 h-3.5 text-orange" />
                    Disponible: {p.availability}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
