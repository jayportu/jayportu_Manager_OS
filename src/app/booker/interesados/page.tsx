import Link from "next/link";
import Image from "next/image";
import { listInterestedDjs } from "@/lib/queries/booker";
import { relativeTime, isSupabaseStorageUrl } from "@/lib/format";
import { Star, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassPanel, MonoLabel, EmptyState } from "@/components/hos";

/**
 * Fase 3 booker — DJs que marcaron "me gustaría tocar acá" sobre este lugar.
 * El lugar los ve y puede contactarlos (abrir su press kit, mandar request).
 */
export const dynamic = "force-dynamic";

export default async function InteresadosPage() {
  const djs = await listInterestedDjs();

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      <GlassPanel padded={false} className="p-6 md:p-7 mb-6">
        <MonoLabel>DJS INTERESADOS</MonoLabel>
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
        <p className="text-sm text-white/55 mt-2 max-w-xl">
          DJs que marcaron tu lugar como uno donde les gustaría tocar. Abre su
          press kit — ahí tienes su contacto y su música — cuando armes tu
          próximo evento.
        </p>
      </GlassPanel>

      {djs.length === 0 ? (
        <EmptyState
          icon={Star}
          title="TODAVÍA NADIE"
          sub="Cuando un DJ marque que le gustaría tocar en tu lugar, va a aparecer acá con su press kit."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {djs.map((dj) => {
            const initial = (dj.artist_name || "DJ").trim().charAt(0).toUpperCase();
            return (
              <GlassPanel key={dj.dj_user_id} padded={false} className="p-4">
                <div className="flex items-center gap-3">
                  {isSupabaseStorageUrl(dj.avatar_url) ? (
                    <Image
                      src={dj.avatar_url}
                      alt={dj.artist_name}
                      width={48}
                      height={48}
                      className="w-12 h-12 object-cover rounded-xl border border-white/10 shrink-0"
                    />
                  ) : (
                    <div
                      className="w-12 h-12 rounded-xl bg-ink text-orange flex items-center justify-center border border-white/10 shrink-0"
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
                    <div className="text-xs text-white/55 truncate">
                      {[dj.city, dj.genres.slice(0, 2).join(" · ")]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </div>
                    <div className="font-mono text-[9px] text-white/40 uppercase tracking-wider mt-0.5">
                      Marcó {relativeTime(dj.created_at)}
                    </div>
                  </div>
                  {dj.public_slug && (
                    <Button asChild variant="clay" size="sm" className="shrink-0 gap-1.5 [&_svg]:!size-3.5">
                      <Link href={`/p/${dj.public_slug}`} target="_blank">
                        Press kit
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </Button>
                  )}
                </div>
              </GlassPanel>
            );
          })}
        </div>
      )}
    </div>
  );
}
