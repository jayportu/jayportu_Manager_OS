import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import {
  listPublicDjs,
  listPublicGenres,
  listPublicCities,
} from "@/lib/queries/directory";
import { FavoriteButtonClient } from "@/components/booker/favorite-button-client";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    q?: string;
    city?: string;
    genres?: string;
    avail?: string;
  }>;
}

export const metadata: Metadata = {
  title: "DROP. · Directorio de DJs en Latam",
  description:
    "Catálogo público de DJs en Chile, Argentina, Perú y resto de Latam. Filtra por género (techno, house, deep, tech, minimal, dnb), ciudad y disponibilidad. Contacta directo sin comisión.",
  openGraph: {
    title: "DROP. · Directorio de DJs",
    description:
      "Encuentra DJs de techno, house, deep y más en Latam. Sin intermediarios.",
    url: "https://drop.dj/dj",
    type: "website",
  },
  alternates: {
    canonical: "https://drop.dj/dj",
  },
};

function buildHref(
  current: Record<string, string | undefined>,
  override: Record<string, string | undefined>
): string {
  const params = new URLSearchParams();
  const merged = { ...current, ...override };
  for (const [k, v] of Object.entries(merged)) {
    if (v && v.trim().length > 0) params.set(k, v);
  }
  const qs = params.toString();
  return qs ? `/dj?${qs}` : "/dj";
}

export default async function DjDirectoryPage({ searchParams }: PageProps) {
  const sp = await searchParams;

  const activeGenres = (sp.genres ?? "")
    .split(",")
    .map((g) => g.trim().toLowerCase())
    .filter((g) => g.length > 0);

  const [djs, allGenres, allCities] = await Promise.all([
    listPublicDjs({
      search: sp.q,
      city: sp.city,
      genres: activeGenres.length > 0 ? activeGenres : undefined,
      onlyAvailable: sp.avail === "1",
    }),
    listPublicGenres(),
    listPublicCities(),
  ]);

  const availableCount = djs.filter((d) => d.is_available_now).length;

  return (
    <div className="min-h-screen bg-cream">
      {/* Header público */}
      <header className="border-b-2 border-ink bg-cream px-6 md:px-10 py-5 flex items-center justify-between gap-4 flex-wrap">
        <Link href="/dj" className="select-none flex items-baseline gap-3">
          <span
            style={{
              fontFamily: "var(--font-anton), Impact, system-ui, sans-serif",
              fontSize: "36px",
              lineHeight: 0.85,
              color: "#0A0A0A",
            }}
          >
            DROP<span style={{ color: "#FF5C00" }}>.</span>
          </span>
          <span className="font-mono text-[10px] font-bold tracking-[0.15em] text-fg-muted hidden sm:inline">
            — THE DJ OS
          </span>
        </Link>
        <Link
          href="/login"
          className="font-mono text-[11px] font-bold uppercase tracking-[0.08em] px-3 py-2 border-2 border-ink bg-ink text-orange hover:bg-orange hover:text-ink transition-colors"
        >
          SOY DJ · CREAR PERFIL
        </Link>
      </header>

      <main className="max-w-7xl mx-auto px-6 md:px-10 py-8">
        {/* Hero */}
        <div className="border-2 border-ink bg-white p-6 md:p-8 mb-6 relative overflow-hidden">
          <span
            aria-hidden="true"
            className="absolute pointer-events-none select-none hidden md:inline"
            style={{
              top: "-50px",
              right: "-40px",
              fontFamily: "var(--font-anton), Impact, system-ui, sans-serif",
              fontSize: "220px",
              lineHeight: 0.85,
              color: "rgba(255,92,0,0.07)",
            }}
          >
            DJ.
          </span>
          <div className="relative">
            <div className="font-mono text-[11px] font-bold tracking-[0.12em] text-orange uppercase">
              — DIRECTORIO · {djs.length} DJs ACTIVOS
            </div>
            <h1
              className="mt-2 leading-none"
              style={{
                fontFamily: "var(--font-anton), Impact, system-ui, sans-serif",
                fontSize: "clamp(40px, 8vw, 80px)",
                letterSpacing: "-0.01em",
                textTransform: "uppercase",
              }}
            >
              ENCUENTRA TU<br />DJ<span className="text-orange">.</span>
            </h1>
            <p className="text-sm md:text-base mt-4 max-w-2xl">
              Catálogo público de DJs verificados en Latam. Filtra por género,
              ciudad y disponibilidad. Contacta directo · sin intermediarios ·
              sin comisión.
            </p>
            {availableCount > 0 && (
              <div className="mt-4 inline-flex items-center gap-2 border-2 border-ink bg-orange text-ink px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wider">
                ★ {availableCount} {availableCount === 1 ? "disponible" : "disponibles"} ahora
              </div>
            )}
          </div>
        </div>

        {/* Filtros */}
        <form
          action="/dj"
          method="get"
          className="border-2 border-ink bg-white p-4 md:p-5 mb-6 space-y-4"
        >
          <div className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-orange">
            — FILTROS
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_180px_180px_auto] gap-2">
            <input
              type="search"
              name="q"
              placeholder="🔎  Buscar por nombre, ciudad, tagline..."
              defaultValue={sp.q ?? ""}
              className="border-2 border-ink bg-white px-3 py-2 font-mono text-[12px] uppercase tracking-[0.04em] placeholder:text-fg-subtle focus:outline-none focus:border-orange"
            />
            <select
              name="city"
              defaultValue={sp.city ?? ""}
              className="border-2 border-ink bg-white px-3 py-2 font-mono text-[11px] font-bold uppercase appearance-none focus:outline-none focus:border-orange"
            >
              <option value="">Ciudad: todas</option>
              {allCities.map((c) => (
                <option key={c.city} value={c.city}>
                  {c.city.toUpperCase()} ({c.count})
                </option>
              ))}
            </select>
            <select
              name="avail"
              defaultValue={sp.avail ?? ""}
              className="border-2 border-ink bg-white px-3 py-2 font-mono text-[11px] font-bold uppercase appearance-none focus:outline-none focus:border-orange"
            >
              <option value="">Todos</option>
              <option value="1">Solo disponibles</option>
            </select>
            <button
              type="submit"
              className="border-2 border-ink bg-orange text-ink hover:bg-ink hover:text-orange transition-colors px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.08em]"
            >
              FILTRAR
            </button>
          </div>

          {/* Géneros chips (form submit con name=genres) */}
          {allGenres.length > 0 && (
            <div>
              <div className="font-mono text-[9px] font-bold uppercase tracking-wider text-fg-muted mb-2">
                Géneros:
              </div>
              <input type="hidden" name="genres" value={activeGenres.join(",")} />
              <div className="flex flex-wrap gap-1.5">
                {allGenres.slice(0, 24).map((g) => {
                  const active = activeGenres.includes(g.genre);
                  const newGenres = active
                    ? activeGenres.filter((x) => x !== g.genre)
                    : [...activeGenres, g.genre];
                  return (
                    <Link
                      key={g.genre}
                      href={buildHref(sp, {
                        genres:
                          newGenres.length > 0
                            ? newGenres.join(",")
                            : undefined,
                      })}
                      className={`inline-flex items-center gap-1.5 border-2 border-ink font-mono text-[10px] font-bold uppercase tracking-[0.06em] px-2 py-0.5 transition-colors ${
                        active ? "bg-orange text-ink" : "bg-cream hover:bg-orange"
                      }`}
                    >
                      {g.genre.toUpperCase()}
                      {!active && (
                        <span className="text-fg-muted">{g.count}</span>
                      )}
                    </Link>
                  );
                })}
              </div>
              {activeGenres.length > 0 && (
                <div className="mt-2">
                  <Link
                    href={buildHref(sp, { genres: undefined })}
                    className="font-mono text-[9px] uppercase tracking-wider underline text-fg-muted hover:text-ink"
                  >
                    Limpiar géneros
                  </Link>
                </div>
              )}
            </div>
          )}
        </form>

        {/* Resultados */}
        <div className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-orange mb-3">
          — {djs.length} {djs.length === 1 ? "RESULTADO" : "RESULTADOS"}
        </div>

        {djs.length === 0 ? (
          <div className="border-2 border-ink bg-white p-10 text-center">
            <p className="text-sm text-fg-muted">
              No hay DJs que coincidan con los filtros. Intenta con menos
              filtros o busca otra ciudad.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {djs.map((d) => (
              <DjCard key={d.user_id} dj={d} />
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-ink text-cream mt-12 py-8 px-6 md:px-10 border-t-4 border-orange">
        <div className="max-w-7xl mx-auto flex justify-between items-center flex-wrap gap-4">
          <Link href="/dj" className="select-none">
            <span
              style={{
                fontFamily: "var(--font-anton), Impact, system-ui, sans-serif",
                fontSize: "30px",
                color: "#F4EFE7",
              }}
            >
              DROP<span style={{ color: "#FF5C00" }}>.</span>
            </span>
          </Link>
          <div className="font-mono text-[10px] tracking-wider text-fg-subtle">
            DROP. · THE DJ OS · DIRECTORIO PÚBLICO LATAM
          </div>
        </div>
      </footer>

      {/* JSON-LD para SEO.
          Security: usamos dangerouslySetInnerHTML porque <script> es la
          única forma de inyectar JSON-LD. El JSON viene de user data
          (artist_name, city, country del DJ); JSON.stringify NO escapa
          "</script>" por default, así que un artist_name malicioso
          podría romper el contexto HTML. Reemplazamos "<" por "<"
          en el output JSON — sigue siendo JSON válido y previene el
          escape del <script>. Fix bug legacy: URL apunta a dropgigs.com
          (no drop.dj). */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: "Directorio de DJs DROP.",
            description:
              "Catálogo público de DJs en Latam buscable por género, ciudad y disponibilidad.",
            numberOfItems: djs.length,
            itemListElement: djs.slice(0, 50).map((d, i) => ({
              "@type": "ListItem",
              position: i + 1,
              item: {
                "@type": "Person",
                name: d.artist_name,
                jobTitle: "DJ",
                url: `https://dropgigs.com/p/${d.public_slug}`,
                address: {
                  "@type": "PostalAddress",
                  addressLocality: d.city,
                  addressCountry: d.country,
                },
              },
            })),
          }).replace(/</g, "\\u003c"),
        }}
      />
    </div>
  );
}

function DjCard({ dj }: { dj: Awaited<ReturnType<typeof listPublicDjs>>[number] }) {
  const initials = dj.artist_name
    .split(" ")
    .filter((s) => s.length > 0)
    .slice(0, 2)
    .map((s) => s[0])
    .join("")
    .toUpperCase();

  return (
    <Link
      href={`/p/${dj.public_slug}`}
      className="border-2 border-ink bg-white flex flex-col hover:shadow-[8px_8px_0_#FF5C00] transition-all hover:-translate-x-1 hover:-translate-y-1"
    >
      <div className="bg-ink aspect-square flex items-center justify-center relative overflow-hidden">
        {/* Preferimos avatar_url (cuadrado, foto de perfil) para el card
            aspect-square. Caemos al hero_image_url solo si no hay avatar.
            Al final, placeholder con iniciales en Anton.
            <Image fill> + sizes da retina automática + WebP/AVIF — evita
            servir el JPEG original de 4 MB en un card de 280px. */}
        {dj.avatar_url || dj.hero_image_url ? (
          <Image
            src={dj.avatar_url || dj.hero_image_url}
            alt={dj.artist_name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 360px"
            className="object-cover"
            quality={85}
          />
        ) : (
          <span
            style={{
              fontFamily: "var(--font-anton), Impact, system-ui, sans-serif",
              fontSize: "72px",
              color: "#F4EFE7",
              lineHeight: 0.85,
            }}
          >
            {initials || "DJ"}
            <span style={{ color: "#FF5C00" }}>.</span>
          </span>
        )}
        {dj.is_available_now && (
          <span className="absolute top-2 right-2 bg-orange text-ink px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider border border-ink">
            ★ DISPONIBLE
          </span>
        )}
        {/* Botón corazón (solo se muestra si el visitante es Booker logueado) */}
        <div className="absolute top-2 left-2">
          <FavoriteButtonClient
            djUserId={dj.user_id}
            size="sm"
            redirectOnUnauth={false}
          />
        </div>
      </div>
      <div className="p-3 border-t-2 border-ink flex flex-col gap-1.5">
        <div
          style={{
            fontFamily: "var(--font-anton), Impact, system-ui, sans-serif",
            fontSize: "20px",
            lineHeight: 0.95,
            textTransform: "uppercase",
            letterSpacing: "0.01em",
          }}
        >
          {dj.artist_name}
        </div>
        <div className="font-mono text-[10px] uppercase tracking-wider text-fg-muted">
          {dj.city || "—"}
          {dj.country ? ` · ${dj.country.toUpperCase()}` : ""}
        </div>
        {dj.genres.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {dj.genres.slice(0, 2).map((g) => (
              <span
                key={g}
                className="font-mono text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 border border-ink bg-cream"
              >
                {g}
              </span>
            ))}
            {dj.genres.length > 2 && (
              <span className="font-mono text-[9px] text-fg-muted">
                +{dj.genres.length - 2}
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
