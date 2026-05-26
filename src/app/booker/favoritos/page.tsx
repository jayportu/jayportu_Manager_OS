import Link from "next/link";
import { listMyFavorites } from "@/lib/queries/booker";
import { FavoriteButton } from "@/components/booker/favorite-button";
import { Heart, Plus, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function BookerFavoritesPage() {
  const favorites = await listMyFavorites();

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      {/* Hero */}
      <div className="border-2 border-ink bg-white p-6 md:p-7 mb-6">
        <div className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-orange">
          — DJS GUARDADOS
        </div>
        <div className="mt-2 flex flex-wrap items-end gap-3 justify-between">
          <h1
            className="leading-none"
            style={{
              fontFamily: "var(--font-anton), Impact, system-ui, sans-serif",
              fontSize: "56px",
              letterSpacing: "-0.005em",
            }}
          >
            FAVORITOS<span className="text-orange">.</span>
          </h1>
          <Link
            href="/dj"
            className="inline-flex items-center gap-2 px-4 py-2 bg-ink text-cream font-mono text-[11px] font-bold tracking-[0.14em] uppercase border-2 border-ink hover:bg-orange hover:text-ink hover:border-orange transition-colors"
          >
            <Plus className="w-4 h-4" />
            Sumar DJs
          </Link>
        </div>
        <p className="text-sm text-fg-muted mt-2 max-w-xl">
          Los DJs que marcaste con el corazón en el directorio o en sus
          press kits. Acceso rápido para tu próximo evento.
        </p>
      </div>

      {favorites.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {favorites.map((dj) => (
            <article
              key={dj.dj_user_id}
              className="relative border-2 border-ink bg-white overflow-hidden hover:bg-cream/40 transition-colors"
            >
              {/* Hero image */}
              {dj.hero_image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={dj.hero_image_url}
                  alt={dj.artist_name}
                  className="w-full aspect-[4/3] object-cover border-b-2 border-ink"
                />
              ) : (
                <div className="w-full aspect-[4/3] bg-ink text-cream flex items-center justify-center border-b-2 border-ink">
                  <span
                    style={{
                      fontFamily:
                        "var(--font-anton), Impact, system-ui, sans-serif",
                      fontSize: "80px",
                      lineHeight: 0.85,
                      opacity: 0.4,
                    }}
                  >
                    {(dj.artist_name || "DJ").charAt(0).toUpperCase()}
                  </span>
                </div>
              )}

              {/* Favorite button (esquina) */}
              <div className="absolute top-3 right-3">
                <FavoriteButton
                  djUserId={dj.dj_user_id}
                  initialFavorited={true}
                />
              </div>

              {/* Info */}
              <div className="p-4">
                <h2
                  className="leading-tight truncate"
                  style={{
                    fontFamily:
                      "var(--font-anton), Impact, system-ui, sans-serif",
                    fontSize: "24px",
                  }}
                >
                  {dj.artist_name}
                </h2>
                <div className="font-mono text-[10px] text-fg-muted uppercase tracking-wider mt-1">
                  {dj.city || "—"}
                </div>
                {dj.genres.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {dj.genres.slice(0, 3).map((g) => (
                      <span
                        key={g}
                        className="font-mono text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-cream border border-ink"
                      >
                        {g}
                      </span>
                    ))}
                  </div>
                )}
                <Link
                  href={`/p/${dj.public_slug}`}
                  className="mt-3 inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-orange hover:underline"
                >
                  Ver press kit
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="border-2 border-dashed border-ink bg-white p-10 text-center">
      <Heart className="w-12 h-12 mx-auto text-fg-subtle mb-4" />
      <h2
        className="leading-tight mb-2"
        style={{
          fontFamily: "var(--font-anton), Impact, system-ui, sans-serif",
          fontSize: "32px",
        }}
      >
        SIN FAVORITOS TODAVÍA
      </h2>
      <p className="text-sm text-fg-muted max-w-md mx-auto mb-6">
        Cuando encuentres un DJ que te guste en el directorio, tocá el
        corazón para guardarlo y tenerlo a mano para tu próximo evento.
      </p>
      <Link
        href="/dj"
        className="inline-flex items-center gap-2 px-5 py-3 bg-ink text-cream font-mono text-[11px] font-bold tracking-[0.14em] uppercase border-2 border-ink hover:bg-orange hover:text-ink hover:border-orange transition-colors"
      >
        Explorar directorio
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
