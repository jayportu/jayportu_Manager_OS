import Link from "next/link";
import { listInterestedDjs } from "@/lib/queries/booker";
import { relativeTime } from "@/lib/format";
import { Star, ArrowRight } from "lucide-react";

/**
 * Fase 3 booker — DJs que marcaron "me gustaría tocar acá" sobre este lugar.
 * El lugar los ve y puede contactarlos (abrir su press kit, mandar request).
 */
export const dynamic = "force-dynamic";

export default async function InteresadosPage() {
  const djs = await listInterestedDjs();

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      <div className="border-2 border-ink bg-white p-6 md:p-7 mb-6">
        <div className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-orange">
          — DJS INTERESADOS
        </div>
        <h1
          className="leading-none mt-2"
          style={{
            fontFamily: "var(--font-anton), Impact, system-ui, sans-serif",
            fontSize: "52px",
            letterSpacing: "-0.005em",
          }}
        >
          QUIEREN TOCAR<span className="text-orange">.</span>
        </h1>
        <p className="text-sm text-fg-muted mt-2 max-w-xl">
          DJs que marcaron tu lugar como uno donde les gustaría tocar. Mira su
          press kit y contáctalos cuando armes tu próximo evento.
        </p>
      </div>

      {djs.length === 0 ? (
        <div className="border-2 border-dashed border-ink bg-white p-10 text-center">
          <Star className="w-12 h-12 mx-auto text-fg-subtle mb-4" />
          <h2
            className="leading-tight mb-2"
            style={{
              fontFamily: "var(--font-anton), Impact, system-ui, sans-serif",
              fontSize: "30px",
            }}
          >
            TODAVÍA NADIE
          </h2>
          <p className="text-sm text-fg-muted max-w-md mx-auto">
            Cuando un DJ marque que le gustaría tocar en tu lugar, va a
            aparecer acá con su press kit.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {djs.map((dj) => {
            const initial = (dj.artist_name || "DJ").trim().charAt(0).toUpperCase();
            return (
              <article
                key={dj.dj_user_id}
                className="border-2 border-ink bg-white p-4 flex items-center gap-3"
              >
                {dj.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={dj.avatar_url}
                    alt={dj.artist_name}
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
                  <div className="font-bold truncate">{dj.artist_name || "DJ"}</div>
                  <div className="text-xs text-fg-muted truncate">
                    {[dj.city, dj.genres.slice(0, 2).join(" · ")]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </div>
                  <div className="font-mono text-[9px] text-fg-subtle uppercase tracking-wider mt-0.5">
                    Marcó {relativeTime(dj.created_at)}
                  </div>
                </div>
                {dj.public_slug && (
                  <Link
                    href={`/p/${dj.public_slug}`}
                    target="_blank"
                    className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 border-2 border-ink font-mono text-[10px] font-bold tracking-wider uppercase hover:bg-orange hover:border-orange transition-colors"
                  >
                    Press kit
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
