import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import {
  listPublicDjs,
  listPublicGenres,
  listPublicCities,
  getDropPicks,
} from "@/lib/queries/directory";
import { FavoriteButtonClient } from "@/components/booker/favorite-button-client";
import { SiteHeader, SiteFooter } from "@/components/public/site-chrome";
import { isSupabaseStorageUrl } from "@/lib/format";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    q?: string;
    city?: string;
    genres?: string;
    avail?: string;
  }>;
}

export async function generateMetadata({
  searchParams,
}: PageProps): Promise<Metadata> {
  const sp = await searchParams;
  // Vistas filtradas (?q ?city ?genres ?avail): contenido duplicado + trampa de
  // crawler. noindex (pero follow, para que igual descubra los /p/[slug]). El
  // robots.txt ya las bloquea; esto saca de Google las combinaciones ya indexadas.
  const hasFilters = !!(
    sp.q ||
    sp.city ||
    (sp.genres && sp.genres.trim().length > 0) ||
    sp.avail === "1"
  );
  return {
    title: "DROP. · Directorio de DJs en Latam",
    description:
      "Catálogo público de DJs en Chile, Argentina, Perú y resto de Latam. Filtra por género (techno, house, deep, tech, minimal, dnb), ciudad y disponibilidad. Contacta directo sin comisión.",
    openGraph: {
      title: "DROP. · Directorio de DJs",
      description:
        "Encuentra DJs de techno, house, deep y más en Latam. Sin intermediarios.",
      url: "https://dropgigs.com/dj",
      type: "website",
    },
    alternates: {
      canonical: "https://dropgigs.com/dj",
    },
    ...(hasFilters ? { robots: { index: false, follow: true } } : {}),
  };
}

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

  const hasFilters = !!(
    sp.q ||
    sp.city ||
    activeGenres.length > 0 ||
    sp.avail === "1"
  );

  const [djs, allGenres, allCities, dropPicks] = await Promise.all([
    listPublicDjs({
      search: sp.q,
      city: sp.city,
      genres: activeGenres.length > 0 ? activeGenres : undefined,
      onlyAvailable: sp.avail === "1",
    }),
    listPublicGenres(),
    listPublicCities(),
    getDropPicks(),
  ]);

  const availableCount = djs.filter((d) => d.is_available_now).length;
  // La fila "DROP PICKS" solo en la vista sin filtros (tipo destacados de portada).
  const showPicks = !hasFilters && dropPicks.length > 0;
  // Fix B3: si mostramos la fila de picks, los sacamos de la grilla para que
  // no aparezcan dos veces (destacados arriba + resto abajo).
  const pickIds = new Set(dropPicks.map((p) => p.user_id));
  const gridDjs = showPicks ? djs.filter((d) => !pickIds.has(d.user_id)) : djs;

  return (
    <div className="min-h-screen bg-bg">
      {/* Header público compartido (mismo nav/CTA que el landing y /eventos) —
          antes /dj tenía un header propio sin nav y con un CTA "Soy DJ"→/login
          (audiencia y destino equivocados para quien busca DJs). */}
      <SiteHeader />

      <main className="max-w-7xl mx-auto px-6 md:px-10 py-8">
        {/* Hero */}
        <div className="border-2 border-border bg-bg-panel p-6 md:p-8 mb-6 relative overflow-hidden">
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
              <div
                className="mt-4 inline-flex items-center gap-2 border-2 border-border bg-orange text-ink px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wider"
                title="DJs con disponibilidad abierta para tocar en estas fechas. Usa el filtro «Solo disponibles» para verlos."
              >
                ★ {availableCount}{" "}
                {availableCount === 1 ? "disponible" : "disponibles"} para tocar
              </div>
            )}
          </div>
        </div>

        {/* Filtros */}
        <form
          action="/dj"
          method="get"
          className="border-2 border-border bg-bg-panel p-4 md:p-5 mb-6 space-y-4"
        >
          <div className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-orange">
            — FILTROS
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_180px_180px_auto] gap-2">
            <input
              type="search"
              name="q"
              aria-label="Buscar DJs por nombre, ciudad o tagline"
              placeholder="🔎  Buscar por nombre, ciudad, tagline..."
              defaultValue={sp.q ?? ""}
              className="border-2 border-border bg-bg-panel px-3 py-2 font-mono text-[12px] uppercase tracking-[0.04em] placeholder:text-fg-subtle focus:outline-none focus:border-orange"
            />
            <select
              name="city"
              aria-label="Filtrar por ciudad"
              defaultValue={sp.city ?? ""}
              className="border-2 border-border bg-bg-panel px-3 py-2 font-mono text-[11px] font-bold uppercase appearance-none focus:outline-none focus:border-orange"
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
              aria-label="Filtrar por disponibilidad"
              defaultValue={sp.avail ?? ""}
              className="border-2 border-border bg-bg-panel px-3 py-2 font-mono text-[11px] font-bold uppercase appearance-none focus:outline-none focus:border-orange"
            >
              <option value="">Todos</option>
              <option value="1">Solo disponibles</option>
            </select>
            <button
              type="submit"
              className="border-2 border-border bg-orange text-ink hover:bg-ink hover:text-orange transition-colors px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.08em]"
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
                      className={`inline-flex items-center gap-1.5 border-2 border-border font-mono text-[10px] font-bold uppercase tracking-[0.06em] px-2 py-0.5 transition-colors ${
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
                    className="font-mono text-[9px] uppercase tracking-wider underline text-fg-muted hover:text-fg"
                  >
                    Limpiar géneros
                  </Link>
                </div>
              )}
            </div>
          )}
        </form>

        {/* DROP PICKS — fila destacada curada por admin (RA-2A). Solo sin filtros. */}
        {showPicks && (
          <section className="mb-8">
            <div className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-orange mb-3 flex items-center gap-2">
              <span>★ DROP PICKS</span>
              <span className="flex-1 h-px bg-ink/20" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {dropPicks.map((d) => (
                <DjCard key={`pick-${d.user_id}`} dj={d} />
              ))}
            </div>
          </section>
        )}

        {/* Resultados */}
        <div className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-orange mb-3">
          — {gridDjs.length} {gridDjs.length === 1 ? "RESULTADO" : "RESULTADOS"}
        </div>

        {gridDjs.length === 0 ? (
          <div className="border-2 border-border bg-bg-panel p-10 text-center">
            <p className="text-sm text-fg-muted">
              No hay DJs que coincidan con los filtros. Intenta con menos
              filtros o busca otra ciudad.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {gridDjs.map((d) => (
              <DjCard key={d.user_id} dj={d} />
            ))}
          </div>
        )}
      </main>

      <SiteFooter />

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
            numberOfItems: Math.min(djs.length, 50),
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

  // Fix B9: solo URLs de Supabase Storage van a next/image (otras rompen el
  // render). Si no hay una válida, cae al placeholder de iniciales.
  const cardImg =
    [dj.avatar_url, dj.hero_image_url].find(isSupabaseStorageUrl) ?? "";

  return (
    <div className="group relative border-2 border-border bg-bg-panel flex flex-col hover:shadow-[8px_8px_0_#E85A0C] transition-all hover:-translate-x-1 hover:-translate-y-1">
      {/* Botón corazón FUERA del <Link> del card: un <button> dentro de un
          <a> es HTML inválido. Se posiciona sobre la esquina del card. */}
      <div className="absolute top-2 left-2 z-10">
        <FavoriteButtonClient
          djUserId={dj.user_id}
          size="sm"
          redirectOnUnauth={false}
        />
      </div>
      <Link href={`/p/${dj.public_slug}`} className="flex flex-col">
      <div className="bg-ink aspect-square flex items-center justify-center relative overflow-hidden">
        {/* Preferimos avatar_url (cuadrado, foto de perfil) para el card
            aspect-square. Caemos al hero_image_url solo si no hay avatar.
            Al final, placeholder con iniciales en Anton.
            <Image fill> + sizes da retina automática + WebP/AVIF — evita
            servir el JPEG original de 4 MB en un card de 280px. */}
        {cardImg ? (
          <Image
            src={cardImg}
            alt={dj.artist_name}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 360px"
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
            <span style={{ color: "#E85A0C" }}>.</span>
          </span>
        )}
        {dj.is_available_now && (
          <span className="absolute top-2 right-2 bg-orange text-ink px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider border border-border">
            ★ DISPONIBLE
          </span>
        )}
      </div>
      <div className="p-3 border-t-2 border-border flex flex-col gap-1.5">
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
        {dj.is_drop_pick && (
          <span className="inline-flex items-center gap-1 self-start font-mono text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 border border-border bg-orange text-ink">
            ★ Pick
          </span>
        )}
        {dj.is_verified && (
          <span className="inline-flex items-center gap-1 self-start font-mono text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 border border-border bg-ink text-orange">
            ✓ Verificado
          </span>
        )}
        <div className="font-mono text-[10px] uppercase tracking-wider text-fg-muted">
          {dj.city || "—"}
          {dj.country ? ` · ${dj.country.toUpperCase()}` : ""}
        </div>
      </div>
      </Link>
      {/* Géneros: links propios al listado filtrado, FUERA del <Link> del card
          (no se puede anidar <a> dentro de <a>). Más grandes + hover naranja
          para que se note que son clickeables. Href en minúscula para que
          calce con los chips del filtro de arriba. */}
      {dj.genres.length > 0 && (
        <div className="px-3 pb-3 -mt-0.5 flex flex-wrap gap-1.5">
          {dj.genres.slice(0, 3).map((g) => (
            <Link
              key={g}
              href={`/dj?genres=${encodeURIComponent(g.toLowerCase())}`}
              className="font-mono text-[10px] font-bold uppercase tracking-wider px-2 py-1 border border-border bg-cream hover:bg-orange hover:text-ink transition-colors"
            >
              {g}
            </Link>
          ))}
          {dj.genres.length > 3 && (
            <span className="font-mono text-[10px] text-fg-muted self-center">
              +{dj.genres.length - 3}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
