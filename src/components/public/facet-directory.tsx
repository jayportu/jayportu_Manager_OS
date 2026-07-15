/**
 * SEO #4 — Página de faceta del directorio (DJs por género / por ciudad).
 *
 * Páginas indexables de long-tail ("DJs de Techno", "DJs en Santiago"). A
 * diferencia de /dj?genres=... (noindex, trampa de crawler), estas rutas son
 * finitas (N géneros + M ciudades) y se indexan. Interlinkean entre sí y a los
 * press kits para que el crawler los descubra.
 */
import Link from "next/link";
import Image from "next/image";
import { SiteHeader, SiteFooter } from "@/components/public/site-chrome";
import { getInitials, isSupabaseStorageUrl } from "@/lib/format";
import type { PublicDjProfile } from "@/lib/queries/directory";

const ANTON = "var(--font-anton), Impact, system-ui, sans-serif";

interface RelatedLink {
  href: string;
  label: string;
}

interface Props {
  kicker: string;
  heading: string;
  intro: string;
  djs: PublicDjProfile[];
  related: RelatedLink[];
  relatedLabel: string;
  itemListName: string;
}

export function FacetDirectory({
  kicker,
  heading,
  intro,
  djs,
  related,
  relatedLabel,
  itemListName,
}: Props) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: itemListName,
    numberOfItems: Math.min(djs.length, 50),
    itemListElement: djs.slice(0, 50).map((d, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "MusicGroup",
        name: d.artist_name,
        url: `https://dropgigs.com/p/${d.public_slug}`,
        ...(d.genres.length > 0 ? { genre: d.genres } : {}),
        ...(d.city ? { location: { "@type": "Place", name: d.city } } : {}),
      },
    })),
  };

  return (
    <div className="min-h-screen bg-bg text-fg">
      <SiteHeader />
      <main className="p-6 md:p-10 max-w-6xl mx-auto">
        <div className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-orange">
          {kicker} · {djs.length} {djs.length === 1 ? "DJ" : "DJS"}
        </div>
        <h1 className="mt-2 leading-none" style={{ fontFamily: ANTON, fontSize: 52, letterSpacing: "-0.005em" }}>
          {heading}
          <span className="text-orange">.</span>
        </h1>
        <p className="text-sm text-fg-muted mt-2 max-w-2xl">{intro}</p>
        <div className="mt-3">
          <Link
            href="/dj"
            className="font-mono text-[11px] font-bold uppercase tracking-wider underline hover:text-orange"
          >
            ← Ver todo el directorio
          </Link>
        </div>

        {djs.length === 0 ? (
          <div className="hos-glass rounded-2xl p-10 text-center mt-6">
            <p className="text-sm text-fg-muted">
              Todavía no hay DJs en esta categoría. Mira{" "}
              <Link href="/dj" className="text-orange underline">
                todo el directorio
              </Link>
              .
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-6">
            {djs.map((dj) => (
              <FacetCard key={dj.user_id} dj={dj} />
            ))}
          </div>
        )}

        {related.length > 0 && (
          <div className="mt-12 border-t border-white/10 pt-5">
            <div className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-fg-muted mb-3">
              {relatedLabel}
            </div>
            <div className="flex flex-wrap gap-2">
              {related.map((r) => (
                <Link
                  key={r.href}
                  href={r.href}
                  className="rounded-full font-mono text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 border border-white/12 bg-white/[0.04] text-white/70 hover:border-orange hover:text-orange transition-colors"
                >
                  {r.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
      <SiteFooter />

      {/* JSON-LD ItemList. Escape de "<" para no romper el </script> (igual que /dj). */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
    </div>
  );
}

function FacetCard({ dj }: { dj: PublicDjProfile }) {
  const initials = getInitials(dj.artist_name);
  const cardImg = [dj.avatar_url, dj.hero_image_url].find(isSupabaseStorageUrl) ?? "";

  return (
    <Link
      href={`/p/${dj.public_slug}`}
      className="group hos-glass hos-sweep-card rounded-2xl overflow-hidden flex flex-col hover:shadow-[8px_8px_0_rgb(var(--drop-orange))] transition-all hover:-translate-x-1 hover:-translate-y-1"
    >
      <div className="bg-ink aspect-square flex items-center justify-center relative overflow-hidden">
        {cardImg ? (
          <Image
            src={cardImg}
            alt={dj.artist_name}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 280px"
            className="object-cover"
            quality={85}
          />
        ) : (
          <span style={{ fontFamily: ANTON, fontSize: "64px", color: "rgb(var(--drop-fg))", lineHeight: 0.85 }}>
            {initials || "DJ"}
            <span style={{ color: "rgb(var(--drop-orange))" }}>.</span>
          </span>
        )}
        {dj.is_available_now && (
          <span className="absolute top-2 right-2 rounded-full bg-orange text-ink px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider">
            ★ DISPONIBLE
          </span>
        )}
      </div>
      <div className="p-3 border-t border-white/10 flex flex-col gap-1.5">
        <div style={{ fontFamily: ANTON, fontSize: "18px", lineHeight: 0.95, textTransform: "uppercase" }}>
          {dj.artist_name}
        </div>
        <div className="font-mono text-[10px] uppercase tracking-wider text-fg-muted">
          {dj.city || "—"}
          {dj.country ? ` · ${dj.country.toUpperCase()}` : ""}
        </div>
        {dj.genres.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-0.5">
            {dj.genres.slice(0, 3).map((g) => (
              <span
                key={g}
                className="rounded-full font-mono text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 border border-white/12 bg-white/[0.04] text-white/70"
              >
                {g}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
